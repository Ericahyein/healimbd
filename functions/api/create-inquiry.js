import { getGoogleAccessToken, hashPassword, generateSaltHex } from '../_googleAuth.js';

const ALLOWED_CATEGORIES = [
  'tic', 'adhd', 'panic', 'anxiety', 'sleep',
  'autonomic', 'hyperhidrosis', 'ibs', 'headache',
  'depression', 'child', 'fatigue', 'etc'
];

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

  const { region, ageText, gender, category, title, content, deletePassword } = body || {};

  if (!region || typeof region !== 'string' || region.trim().length < 1 || region.trim().length > 30) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_REGION', message: '거주지역은 1~30자 이내여야 합니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!ageText || typeof ageText !== 'string' || ageText.trim().length < 1 || ageText.trim().length > 20) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_AGE', message: '나이는 1~20자 이내여야 합니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!['male', 'female'].includes(gender)) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_GENDER', message: '올바른 성별을 선택해주세요.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_CATEGORY', message: '유효한 상담과목을 선택해주세요.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!title || typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_TITLE', message: '제목은 2~100자 이내여야 합니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!content || typeof content !== 'string' || content.trim().length < 5 || content.trim().length > 3000) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_CONTENT', message: '상담 내용은 5~3000자 이내여야 합니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!deletePassword || typeof deletePassword !== 'string' || !/^\d{6}$/.test(deletePassword.trim())) {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_DELETE_PASSWORD', message: '삭제 비밀번호는 정확히 숫자 6자리여야 합니다.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const cleanRegion = region.trim();
  const cleanAge = ageText.trim();
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  const cleanPin = deletePassword.trim();

  const projectId = env.FIREBASE_PROJECT_ID || 'healimbd-b726f';
  const pepper = env.INQUIRY_PEPPER_SECRET || '';

  const inquiryId = `inq_${Date.now()}`;
  const saltHex = generateSaltHex();
  const passwordHash = await hashPassword(cleanPin, saltHex, pepper);

  try {
    // 3. Obtain Google OAuth2 Access Token for Firestore API
    const accessToken = await getGoogleAccessToken(env);

    // 4. Build Atomic Batch Commit Payload
    const nowIso = new Date().toISOString();
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

    const publicDocPath = `projects/${projectId}/databases/(default)/documents/online_inquiries/${inquiryId}`;
    const credentialDocPath = `projects/${projectId}/databases/(default)/documents/inquiry_delete_credentials/${inquiryId}`;

    const commitBody = {
      writes: [
        // Write 1: Public Inquiry Document
        {
          update: {
            name: publicDocPath,
            fields: {
              region: { stringValue: cleanRegion },
              ageText: { stringValue: cleanAge },
              gender: { stringValue: gender },
              category: { stringValue: category },
              title: { stringValue: cleanTitle },
              content: { stringValue: cleanContent },
              status: { stringValue: 'pending' },
              createdAt: { timestampValue: nowIso },
              hasDeletePassword: { booleanValue: true }
            }
          }
        },
        // Write 2: Private Credential Document (Salt & PBKDF2 Hash)
        {
          update: {
            name: credentialDocPath,
            fields: {
              passwordHash: { stringValue: passwordHash },
              salt: { stringValue: saltHex },
              createdAt: { timestampValue: nowIso },
              failedAttempts: { integerValue: '0' }
            }
          }
        }
      ]
    };

    const commitResp = await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitBody)
    });

    if (!commitResp.ok) {
      const errText = await commitResp.text();
      console.error('[CREATE INQUIRY FIRESTORE COMMIT ERROR]', commitResp.status, errText);
      return new Response(JSON.stringify({
        success: false,
        code: 'FIRESTORE_WRITE_FAILED',
        message: '데이터베이스 저장 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      inquiryId: inquiryId,
      message: '온라인 상담글이 성공적으로 등록되었습니다.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[CREATE INQUIRY SERVER EXCEPTION]', err);
    return new Response(JSON.stringify({
      success: false,
      code: 'SERVER_ERROR',
      message: '상담글 등록 처리 중 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
