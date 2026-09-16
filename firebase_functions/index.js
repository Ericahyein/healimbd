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
