import { getGoogleAccessToken, hashPassword, checkRateLimit } from '../_googleAuth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Validate App Check Header
  const appCheckToken = request.headers.get('X-Firebase-AppCheck');
  if (!appCheckToken) {
    return new Response(JSON.stringify({
      success: false,
      code: 'APPCHECK_REQUIRED',
      message: 'App Check 보안 토큰이 필요합니다.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Parse & Validate JSON Body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      code: 'INVALID_JSON',
      message: '올바른 JSON 요청이 아닙니다.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { inquiryId, password } = body || {};

  // Strict format validation to prevent injection or arbitrary path traversal
  if (!inquiryId || typeof inquiryId !== 'string' || !/^inq_[0-9A-Za-z_-]{1,64}$/.test(inquiryId.trim())) {
    return new Response(JSON.stringify({
      success: false,
      code: 'INVALID_INQUIRY_ID',
      message: '유효한 문의 식별자가 아닙니다.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!password || typeof password !== 'string' || !/^\d{6}$/.test(password.trim())) {
    return new Response(JSON.stringify({
      success: false,
      code: 'INVALID_PASSWORD_FORMAT',
      message: '삭제 비밀번호는 숫자 6자리여야 합니다.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cleanId = inquiryId.trim();
  const cleanPin = password.trim();

  // 3. Client + Inquiry Rate Limiting (DoS resistant: keyed by client IP + inquiry ID)
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown-ip';
  const rateLimitKey = `${clientIp}:${cleanId}`;
  const rateCheck = checkRateLimit(rateLimitKey, 5, 600); // 5 attempts per 10 minutes

  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `비밀번호 입력 시도가 너무 많습니다. 잠시 후 (${rateCheck.remainingSeconds}초 뒤) 다시 시도해주세요.`
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const projectId = env.FIREBASE_PROJECT_ID || 'healimbd-b726f';
  const pepper = env.INQUIRY_PEPPER_SECRET || '';

  try {
    // 4. Obtain Google OAuth2 Access Token
    const accessToken = await getGoogleAccessToken(env);

    // 5. Fetch Credential Document from Firestore REST API
    const credentialDocUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/inquiry_delete_credentials/${cleanId}`;
    const credResp = await fetch(credentialDocUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (credResp.status === 404) {
      return new Response(JSON.stringify({
        success: false,
        code: 'NO_CREDENTIAL',
        message: '작성자 비밀번호 삭제가 지원되지 않는 문의글입니다. (대표원장/관리자에게 삭제를 요청해주세요)'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!credResp.ok) {
      const errText = await credResp.text();
      console.error('[FETCH CREDENTIAL ERROR]', credResp.status, errText);
      return new Response(JSON.stringify({
        success: false,
        code: 'FIRESTORE_READ_FAILED',
        message: '삭제 인증 정보를 확인하는 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const credDoc = await credResp.json();
    const fields = credDoc.fields || {};
    const storedHash = fields.passwordHash?.stringValue;
    const storedSalt = fields.salt?.stringValue;

    if (!storedHash || !storedSalt) {
      return new Response(JSON.stringify({
        success: false,
        code: 'INVALID_CREDENTIAL_DATA',
        message: '삭제 인증 정보 형식이 유효하지 않습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Compute & Compare Password Hash using Web Crypto PBKDF2
    const computedHash = await hashPassword(cleanPin, storedSalt, pepper);

    if (computedHash !== storedHash) {
      return new Response(JSON.stringify({
        success: false,
        code: 'INVALID_PASSWORD',
        message: '삭제 비밀번호가 일치하지 않습니다.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Atomic Batch Delete of both Public Inquiry and Private Credential Documents
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
    const publicDocPath = `projects/${projectId}/databases/(default)/documents/online_inquiries/${cleanId}`;
    const credentialDocPath = `projects/${projectId}/databases/(default)/documents/inquiry_delete_credentials/${cleanId}`;

    const batchDeleteBody = {
      writes: [
        { delete: publicDocPath },
        { delete: credentialDocPath }
      ]
    };

    const deleteResp = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchDeleteBody)
    });

    if (!deleteResp.ok) {
      const errText = await deleteResp.text();
      console.error('[BATCH DELETE ERROR]', deleteResp.status, errText);
      return new Response(JSON.stringify({
        success: false,
        code: 'DELETE_FAILED',
        message: '문의글 삭제 처리 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      inquiryId: cleanId,
      message: '문의글이 성공적으로 삭제되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[DELETE INQUIRY SERVER EXCEPTION]', err);
    return new Response(JSON.stringify({
      success: false,
      code: 'SERVER_ERROR',
      message: '문의 삭제 처리 중 서버 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
