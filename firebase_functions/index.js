const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Declare secrets managed via Google Cloud Secret Manager / Firebase Secrets
const kakaoRestApiKey = defineSecret('KAKAO_REST_API_KEY');
const kakaoClientSecret = defineSecret('KAKAO_CLIENT_SECRET');
const naverClientId = defineSecret('NAVER_CLIENT_ID');
const naverClientSecret = defineSecret('NAVER_CLIENT_SECRET');

const REGION = 'asia-northeast3'; // Seoul
const ALLOWED_ORIGINS = ['https://healimbd.com', 'http://localhost:1313'];

/**
 * Validates caller origin against strict server allowlist.
 * Never blindly trusts query params, headers, or referers.
 */
function resolveAllowedOrigin(req) {
  const queryOrigin = req.query && typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
  if (ALLOWED_ORIGINS.includes(queryOrigin)) {
    return queryOrigin;
  }
  const headerOrigin = req.get('origin');
  if (headerOrigin && ALLOWED_ORIGINS.includes(headerOrigin)) {
    return headerOrigin;
  }
  const referer = req.get('referer');
  if (referer) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (referer.startsWith(allowed)) return allowed;
    }
  }
  // Default strictly to production domain
  return 'https://healimbd.com';
}

/**
 * Renders a secure, self-closing error page with strict CSP and no-store headers.
 * Dispatches an explicit AUTH_ERROR event to the validated targetOrigin opener.
 */
function renderErrorResponse(res, provider, errorCode, targetOrigin, displayMsg) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';`);

  const errorType = provider === 'kakao' ? 'KAKAO_AUTH_ERROR' : 'NAVER_AUTH_ERROR';
  const payload = JSON.stringify({
    type: errorType,
    provider: provider,
    status: 'error',
    error: errorCode
  });
  const safeOrigin = JSON.stringify(targetOrigin);
  const safeMsg = String(displayMsg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>인증 실패</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #334155; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 360px; }
    .icon { font-size: 28px; margin-bottom: 8px; }
    .msg { font-size: 14px; margin-bottom: 12px; line-height: 1.5; color: #475569; }
    .btn { background: #E2E8F0; color: #1E293B; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <div class="msg">${safeMsg}</div>
    <button class="btn" onclick="window.close()">창 닫기</button>
  </div>
  <script nonce="${nonce}">
    (function() {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${payload}, ${safeOrigin});
          setTimeout(function() { window.close(); }, 250);
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>`;
  res.status(200).send(html);
}

/**
 * 1. kakaoAuthStart:
 * Generates cryptographically secure state, validates caller origin against allowlist,
 * stores both in HttpOnly SameSite=Lax Path=/ cookies (maxAge: 300s),
 * and 302 redirects user to Kakao OAuth authorization page.
 */
exports.kakaoAuthStart = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 3,
    secrets: [kakaoRestApiKey]
  },
  async (req, res) => {
    try {
      // 1. Generate 32-byte secure random state
      const state = crypto.randomBytes(32).toString('hex');
      const targetOrigin = resolveAllowedOrigin(req);
      const isSecure = req.protocol === 'https' || !String(req.get('host')).includes('localhost');

      // 2. Set HttpOnly, Secure, SameSite=Lax, Path=/ short-lived cookies (300s)
      res.cookie('kakao_oauth_state', state, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 300 * 1000,
        path: '/'
      });
      res.cookie('kakao_oauth_origin', targetOrigin, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 300 * 1000,
        path: '/'
      });

      // 3. Resolve callback URL based on deployment host
      const host = req.get('host');
      const protocol = req.protocol || 'https';
      const callbackUrl = `${protocol}://${host}/kakaoAuthCallback`;

      const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', kakaoRestApiKey.value());
      authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('state', state);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.redirect(302, authorizeUrl.toString());
    } catch (err) {
      console.error('[KAKAO AUTH START ERROR]', err.message || 'init_failed');
      res.status(500).send('카카오 인증 초기화에 실패했습니다.');
    }
  }
);

/**
 * 2. kakaoAuthCallback:
 * Validates state from cookie, immediately purges state & origin cookies (preventing replay),
 * exchanges code for Kakao token via server POST, queries user profile,
 * issues Firebase Custom Token via Admin SDK,
 * and transfers token to window.opener using postMessage with exact targetOrigin, strict CSP, and no-store.
 */
exports.kakaoAuthCallback = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 3,
    secrets: [kakaoRestApiKey, kakaoClientSecret]
  },
  async (req, res) => {
    // Always enforce no-store headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    // Extract cookies
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    const storedState = cookies.kakao_oauth_state;
    const callerOrigin = cookies.kakao_oauth_origin;
    const targetOrigin = ALLOWED_ORIGINS.includes(callerOrigin) ? callerOrigin : 'https://healimbd.com';
    const isSecure = req.protocol === 'https' || !String(req.get('host')).includes('localhost');

    // Invalidate cookies immediately (single use & replay prevention)
    res.cookie('kakao_oauth_state', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    res.cookie('kakao_oauth_origin', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    try {
      // 1. Check if user cancelled or authorization error occurred
      if (req.query.error) {
        console.warn('[KAKAO AUTH CALLBACK CANCEL / ERROR]', req.query.error);
        const errCode = req.query.error === 'access_denied' ? 'access_denied' : 'oauth_error';
        return renderErrorResponse(res, 'kakao', errCode, targetOrigin, '카카오 로그인이 취소되었거나 거부되었습니다.');
      }

      const code = req.query.code;
      const returnedState = req.query.state;

      // 2. Verify CSRF state token
      if (!returnedState || !storedState || returnedState !== storedState) {
        console.error('[CSRF STATE MISMATCH]', { returnedState: !!returnedState, hasStored: !!storedState });
        return renderErrorResponse(res, 'kakao', 'state_mismatch', targetOrigin, '보안 검증(CSRF state)에 실패했습니다. 창을 닫고 다시 시도해 주세요.');
      }

      if (!code) {
        return renderErrorResponse(res, 'kakao', 'missing_code', targetOrigin, '카카오 인가 코드가 전달되지 않았습니다.');
      }

      // 3. Exchange authorization code for Kakao access token
      const host = req.get('host');
      const protocol = req.protocol || 'https';
      const callbackUrl = `${protocol}://${host}/kakaoAuthCallback`;

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoRestApiKey.value(),
        client_secret: kakaoClientSecret.value(),
        redirect_uri: callbackUrl,
        code: String(code)
      });

      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: tokenParams.toString()
      });

      if (!tokenRes.ok) {
        console.error('[KAKAO TOKEN EXCHANGE ERROR] Status:', tokenRes.status);
        return renderErrorResponse(res, 'kakao', 'token_exchange_failed', targetOrigin, '카카오 토큰 발급에 실패했습니다.');
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 4. Query Kakao User Profile
      const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        console.error('[KAKAO USER INFO ERROR] Status:', userRes.status);
        return renderErrorResponse(res, 'kakao', 'profile_fetch_failed', targetOrigin, '카카오 사용자 정보 조회에 실패했습니다.');
      }

      const kakaoUser = await userRes.json();
      const kakaoId = String(kakaoUser.id);
      const nickname = (kakaoUser.properties && kakaoUser.properties.nickname) ||
                       (kakaoUser.kakao_account && kakaoUser.kakao_account.profile && kakaoUser.kakao_account.profile.nickname) ||
                       '카카오 회원';

      // 5. Map to Firebase User with isolated UID (Never auto-merge with email accounts)
      const firebaseUid = `kakao:${kakaoId}`;

      try {
        await admin.auth().getUser(firebaseUid);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          await admin.auth().createUser({
            uid: firebaseUid,
            displayName: nickname
          });
        } else {
          throw err;
        }
      }

      // 6. Issue Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(firebaseUid, {
        provider: 'kakao'
      });

      // 7. Return secure postMessage HTML to window.opener with exact targetOrigin
      // Never place customToken in URL, fragment, or DOM!
      const nonce = crypto.randomBytes(16).toString('base64');
      res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';`);

      const safeTargetOriginJson = JSON.stringify(targetOrigin);
      const safeTokenLiteral = JSON.stringify(customToken);

      const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>카카오 인증 완료</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #334155; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .spinner { width: 24px; height: 24px; border: 3px solid #E2E8F0; border-top-color: #FEE500; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    .btn { margin-top: 12px; background: #E2E8F0; color: #1E293B; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div>카카오 인증이 완료되었습니다. 창이 닫힙니다...</div>
  </div>
  <script nonce="${nonce}">
    (function() {
      const targetOrigin = ${safeTargetOriginJson};
      const token = ${safeTokenLiteral};
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'KAKAO_AUTH_SUCCESS',
            provider: 'kakao',
            status: 'success',
            stateVerified: true,
            customToken: token
          }, targetOrigin);
        } catch(e) {}
        window.close();
      } else {
        document.body.innerHTML = '<div class="card"><p>인증이 완료되었습니다. 본 창을 닫고 원래 페이지로 돌아가 주세요.</p><button class="btn" onclick="window.close()">창 닫기</button></div>';
      }
    })();
  </script>
</body>
</html>`;

      res.status(200).send(html);
    } catch (err) {
      console.error('[KAKAO AUTH CALLBACK EXCEPTION]', err.message || 'internal_error');
      renderErrorResponse(res, 'kakao', 'server_error', targetOrigin, '카카오 인증 처리 중 서버 오류가 발생했습니다.');
    }
  }
);

/**
 * 3. naverAuthStart:
 * Generates cryptographically secure state, validates caller origin against allowlist,
 * stores both in HttpOnly SameSite=Lax Path=/ cookies (maxAge: 300s),
 * and 302 redirects user to Naver OAuth authorization page.
 */
exports.naverAuthStart = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 3,
    secrets: [naverClientId]
  },
  async (req, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const targetOrigin = resolveAllowedOrigin(req);
      const isSecure = req.protocol === 'https' || !String(req.get('host')).includes('localhost');

      res.cookie('naver_oauth_state', state, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 300 * 1000,
        path: '/'
      });
      res.cookie('naver_oauth_origin', targetOrigin, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 300 * 1000,
        path: '/'
      });

      const host = req.get('host');
      const protocol = req.protocol || 'https';
      const callbackUrl = `${protocol}://${host}/naverAuthCallback`;

      const authorizeUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
      authorizeUrl.searchParams.set('client_id', naverClientId.value());
      authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('state', state);

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.redirect(302, authorizeUrl.toString());
    } catch (err) {
      console.error('[NAVER AUTH START ERROR]', err.message || 'init_failed');
      res.status(500).send('네이버 인증 초기화에 실패했습니다.');
    }
  }
);

/**
 * 4. naverAuthCallback:
 * Validates state from cookie, immediately purges state & origin cookies (preventing replay),
 * exchanges code for Naver token via server POST, queries user profile,
 * issues Firebase Custom Token via Admin SDK,
 * and transfers token to window.opener using postMessage with exact targetOrigin, strict CSP, and no-store.
 */
exports.naverAuthCallback = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 3,
    secrets: [naverClientId, naverClientSecret]
  },
  async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    const storedState = cookies.naver_oauth_state;
    const callerOrigin = cookies.naver_oauth_origin;
    const targetOrigin = ALLOWED_ORIGINS.includes(callerOrigin) ? callerOrigin : 'https://healimbd.com';
    const isSecure = req.protocol === 'https' || !String(req.get('host')).includes('localhost');

    // Invalidate cookies immediately
    res.cookie('naver_oauth_state', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    res.cookie('naver_oauth_origin', '', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    try {
      // 1. Check if user cancelled or authorization error occurred
      if (req.query.error) {
        console.warn('[NAVER AUTH CALLBACK CANCEL / ERROR]', req.query.error);
        const errCode = req.query.error === 'access_denied' ? 'access_denied' : 'oauth_error';
        return renderErrorResponse(res, 'naver', errCode, targetOrigin, '네이버 로그인이 취소되었거나 거부되었습니다.');
      }

      const code = req.query.code;
      const returnedState = req.query.state;

      // 2. Verify CSRF state token
      if (!returnedState || !storedState || returnedState !== storedState) {
        console.error('[NAVER CSRF STATE MISMATCH]', { returnedState: !!returnedState, hasStored: !!storedState });
        return renderErrorResponse(res, 'naver', 'state_mismatch', targetOrigin, '보안 검증(CSRF state)에 실패했습니다. 창을 닫고 다시 시도해 주세요.');
      }

      if (!code) {
        return renderErrorResponse(res, 'naver', 'missing_code', targetOrigin, '네이버 인가 코드가 전달되지 않았습니다.');
      }

      // 3. Exchange authorization code for Naver access token
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: naverClientId.value(),
        client_secret: naverClientSecret.value(),
        code: String(code),
        state: String(returnedState)
      });

      const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: tokenParams.toString()
      });

      if (!tokenRes.ok) {
        console.error('[NAVER TOKEN EXCHANGE ERROR] Status:', tokenRes.status);
        return renderErrorResponse(res, 'naver', 'token_exchange_failed', targetOrigin, '네이버 토큰 발급에 실패했습니다.');
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 4. Query Naver User Profile
      const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        console.error('[NAVER USER INFO ERROR] Status:', userRes.status);
        return renderErrorResponse(res, 'naver', 'profile_fetch_failed', targetOrigin, '네이버 사용자 정보 조회에 실패했습니다.');
      }

      const userData = await userRes.json();
      const naverProfile = userData.response || {};
      const naverId = String(naverProfile.id);
      const nickname = naverProfile.nickname || naverProfile.name || '네이버 회원';

      // 5. Map to Firebase User with isolated UID (naver:{id})
      const firebaseUid = `naver:${naverId}`;

      try {
        await admin.auth().getUser(firebaseUid);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          await admin.auth().createUser({
            uid: firebaseUid,
            displayName: nickname
          });
        } else {
          throw err;
        }
      }

      // 6. Issue Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(firebaseUid, {
        provider: 'naver'
      });

      // 7. Return secure postMessage HTML to window.opener with exact targetOrigin
      const nonce = crypto.randomBytes(16).toString('base64');
      res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';`);

      const safeTargetOriginJson = JSON.stringify(targetOrigin);
      const safeTokenLiteral = JSON.stringify(customToken);

      const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>네이버 인증 완료</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F8FAFC; color: #334155; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .spinner { width: 24px; height: 24px; border: 3px solid #E2E8F0; border-top-color: #03C75A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    .btn { margin-top: 12px; background: #E2E8F0; color: #1E293B; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div>네이버 인증이 완료되었습니다. 창이 닫힙니다...</div>
  </div>
  <script nonce="${nonce}">
    (function() {
      const targetOrigin = ${safeTargetOriginJson};
      const token = ${safeTokenLiteral};
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({
            type: 'NAVER_AUTH_SUCCESS',
            provider: 'naver',
            status: 'success',
            stateVerified: true,
            customToken: token
          }, targetOrigin);
        } catch(e) {}
        window.close();
      } else {
        document.body.innerHTML = '<div class="card"><p>인증이 완료되었습니다. 본 창을 닫고 원래 페이지로 돌아가 주세요.</p><button class="btn" onclick="window.close()">창 닫기</button></div>';
      }
    })();
  </script>
</body>
</html>`;

      res.status(200).send(html);
    } catch (err) {
      console.error('[NAVER AUTH CALLBACK EXCEPTION]', err.message || 'internal_error');
      renderErrorResponse(res, 'naver', 'server_error', targetOrigin, '네이버 인증 처리 중 서버 오류가 발생했습니다.');
    }
  }
);

/**
 * Detects actual image MIME type from binary magic bytes.
 * Never prints or leaks buffer contents.
 */
function detectImageMagicMime(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // 3. WebP: 0..3 'RIFF' and 8..11 'WEBP'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Derives expected MIME type from validated file extension.
 */
function getExpectedMimeFromExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const match = filePath.match(/\.(png|jpe?g|webp)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return null;
}

/**
 * streamReviewOriginal:
 * Authenticated HTTP streaming proxy for protected handwritten reviews (asia-northeast3).
 * Streams raw binary image directly from Google Cloud Storage to authenticated, non-anonymous members.
 * Strictly verifies Origin, OPTIONS preflight, Firebase ID Token, App Check Token,
 * reviewId regex, Firestore imagePath ownership, file extension, metadata contentType,
 * and actual file binary magic bytes before sending response headers.
 */
exports.streamReviewOriginal = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 5,
    serviceAccount: 'healimbd-review-streamer@healimbd-b726f.iam.gserviceaccount.com'
  },
  async (req, res) => {
    // 1. Origin & Method Check
    const origin = req.get('origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    // Strict OPTIONS Preflight
    if (req.method === 'OPTIONS') {
      if (!isAllowedOrigin) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_origin');
        return res.status(403).json({ error: 'Origin not allowed' });
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Firebase-AppCheck, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
      return res.status(204).send('');
    }

    // Strict GET Method Requirement
    if (req.method !== 'GET') {
      console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_method');
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Verify Origin for GET
    let matchedOrigin = '';
    if (origin) {
      if (!isAllowedOrigin) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_origin');
        return res.status(403).json({ error: 'Origin not allowed' });
      }
      matchedOrigin = origin;
    } else {
      const referer = req.get('referer') || '';
      for (const allowed of ALLOWED_ORIGINS) {
        if (referer.startsWith(allowed)) {
          matchedOrigin = allowed;
          break;
        }
      }
      if (!matchedOrigin) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_origin');
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }

    res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
    res.setHeader('Vary', 'Origin');

    try {
      // 2. Firebase ID Token Verification
      const authHeader = req.get('authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'auth_failed');
        return res.status(401).json({ error: 'Authentication required' });
      }
      const idToken = authHeader.slice(7).trim();
      if (!idToken) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'auth_failed');
        return res.status(401).json({ error: 'Authentication required' });
      }

      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authErr) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'auth_failed');
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // 3. Non-anonymous user verification
      if (!decodedToken || !decodedToken.firebase || decodedToken.firebase.sign_in_provider === 'anonymous') {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'auth_failed');
        return res.status(403).json({ error: 'Anonymous access forbidden' });
      }

      // 4. Firebase App Check Token Verification
      const appCheckHeader = req.get('x-firebase-appcheck') || '';
      if (!appCheckHeader) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'app_check_failed');
        return res.status(401).json({ error: 'App Check token required' });
      }

      try {
        await admin.appCheck().verifyToken(appCheckHeader);
      } catch (appCheckErr) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'app_check_failed');
        return res.status(401).json({ error: 'Invalid App Check token' });
      }

      // 5. reviewId Parameter Format Validation
      const reviewId = req.query && typeof req.query.reviewId === 'string' ? req.query.reviewId.trim() : '';
      if (!reviewId || !/^(tr_\d+_[a-zA-Z0-9_-]+|legacy_custom-\d+)$/.test(reviewId)) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_review_id');
        return res.status(400).json({ error: 'Invalid review identifier' });
      }

      // 6. Firestore Document Retrieval (Only executed AFTER all authentications succeed)
      const docSnap = await admin.firestore().collection('treatment_reviews').doc(reviewId).get();
      if (!docSnap.exists) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'document_not_found');
        return res.status(404).json({ error: 'Review not found' });
      }

      // 7. imagePath Validation from Server Document
      const docData = docSnap.data() || {};
      const imagePath = docData.imagePath;
      if (!imagePath || typeof imagePath !== 'string') {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_image_path');
        return res.status(500).json({ error: 'Invalid image path specification' });
      }

      // Strict containment check: must be inside treatment-reviews/${reviewId}/
      const expectedPrefix = `treatment-reviews/${reviewId}/`;
      if (!imagePath.startsWith(expectedPrefix)) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_image_path');
        return res.status(403).json({ error: 'Path mismatch violation' });
      }

      // Reject path traversal, backslashes, null bytes
      if (imagePath.includes('..') || imagePath.includes('\\') || imagePath.includes('\0')) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_image_path');
        return res.status(400).json({ error: 'Illegal path traversal sequence' });
      }

      // Extension validation
      const expectedMimeFromExt = getExpectedMimeFromExtension(imagePath);
      if (!expectedMimeFromExt) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'invalid_image_path');
        return res.status(400).json({ error: 'Unsupported file extension' });
      }

      // 8. Storage Object Metadata & MIME Type Validation
      const bucketName = process.env.STORAGE_BUCKET || 'healimbd-b726f.firebasestorage.app';
      const bucket = admin.storage().bucket(bucketName);
      const file = bucket.file(imagePath);

      const [exists] = await file.exists();
      if (!exists) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'object_not_found');
        return res.status(404).json({ error: 'Image object not found' });
      }

      const [metadata] = await file.getMetadata();
      const contentType = (metadata.contentType || '').toLowerCase();
      const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedMimes.includes(contentType) || contentType !== expectedMimeFromExt) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'unsupported_image_type');
        return res.status(415).json({ error: 'Unsupported media type' });
      }

      // Maximum file size defense (15MB maximum for handwriting reviews) and minimum header size
      const fileSize = Number(metadata.size || 0);
      if (fileSize < 12 || fileSize > 15 * 1024 * 1024) {
        console.warn('[STREAM_REVIEW_ORIGINAL]', 'unsupported_image_type');
        return res.status(415).json({ error: 'Unsupported media type' });
      }

      // 9. Inspect Binary Magic Bytes & Stream with Intact First Bytes
      return new Promise((resolve) => {
        const stream = file.createReadStream();
        let validated = false;
        let headerChunks = [];
        let totalHeaderBytes = 0;

        if (res.destroyed || res.writableEnded) {
          stream.destroy();
          return resolve();
        }

        res.on('finish', resolve);
        res.on('close', () => {
          if (!res.writableEnded) {
            stream.destroy();
          }
          resolve();
        });

        stream.on('data', function onData(chunk) {
          if (!validated) {
            headerChunks.push(chunk);
            totalHeaderBytes += chunk.length;

            // Need at least 12 bytes to inspect all magic signatures (WebP requires 12 bytes)
            if (totalHeaderBytes < 12) {
              return;
            }

            // Stop listening for initial validation and pause
            stream.removeListener('data', onData);
            stream.pause();

            const combinedHeader = Buffer.concat(headerChunks);
            const detectedMagicMime = detectImageMagicMime(combinedHeader);

            // 3-Way Consistency Check: Extension, Storage metadata contentType, and Magic bytes must agree
            if (
              !detectedMagicMime ||
              detectedMagicMime !== expectedMimeFromExt ||
              detectedMagicMime !== contentType
            ) {
              stream.destroy();
              console.warn('[STREAM_REVIEW_ORIGINAL]', 'unsupported_image_type');
              if (!res.headersSent) {
                res.status(415).json({ error: 'Unsupported media type' });
              }
              return resolve();
            }

            validated = true;

            // Send secure response headers
            res.setHeader('Content-Type', detectedMagicMime);
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Cache-Control', 'private, no-store, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Send the full accumulated header bytes so no bytes are lost
            res.write(combinedHeader);

            // Pipe remaining data and resume stream
            stream.pipe(res);
            stream.resume();
          }
        });

        stream.on('end', () => {
          // In case stream ended before 12 bytes could be read (truncated header)
          if (!validated && !res.headersSent) {
            console.warn('[STREAM_REVIEW_ORIGINAL]', 'unsupported_image_type');
            res.status(415).json({ error: 'Unsupported media type' });
          }
          resolve();
        });

        stream.on('error', (streamErr) => {
          console.error('[STREAM_REVIEW_ORIGINAL]', 'stream_failed');
          if (!res.headersSent) {
            res.status(500).json({ error: 'Image streaming failed' });
          } else {
            res.destroy(streamErr);
          }
          resolve();
        });
      });
    } catch (err) {
      console.error('[STREAM_REVIEW_ORIGINAL]', 'internal_error');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);
