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

const REGION = 'asia-northeast3'; // Seoul
const ALLOWED_ORIGINS = ['https://healimbd.com', 'http://localhost:1313', 'http://localhost:8085'];

/**
 * 1. kakaoAuthStart:
 * Generates cryptographically secure state, stores it in an HttpOnly SameSite=Lax cookie,
 * and 302 redirects user to Kakao OAuth authorization page.
 */
exports.kakaoAuthStart = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 10,
    secrets: [kakaoRestApiKey]
  },
  async (req, res) => {
    try {
      // 1. Generate 32-byte secure random state
      const state = crypto.randomBytes(32).toString('hex');

      // 2. Set HttpOnly, Secure, SameSite=Lax short-lived cookie (5 mins)
      res.cookie('kakao_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
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
      console.error('[KAKAO AUTH START ERROR]', err);
      res.status(500).send('카카오 인증 초기화에 실패했습니다.');
    }
  }
);

/**
 * 2. kakaoAuthCallback:
 * Validates state from cookie, exchanges code for Kakao token via server-to-server POST,
 * queries Kakao user profile, issues Firebase Custom Token via Admin SDK,
 * and securely transfers the token to window.opener using postMessage with strict CSP & no-store.
 */
exports.kakaoAuthCallback = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 10,
    secrets: [kakaoRestApiKey, kakaoClientSecret]
  },
  async (req, res) => {
    // Always enforce no-store headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    try {
      const code = req.query.code;
      const returnedState = req.query.state;

      // Extract cookie
      const cookieHeader = req.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      const storedState = cookies.kakao_oauth_state;

      // Invalidate cookie immediately (single use)
      res.cookie('kakao_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      // 1. Verify CSRF state token
      if (!returnedState || !storedState || returnedState !== storedState) {
        console.error('[CSRF STATE MISMATCH]', { returnedState, hasStored: !!storedState });
        res.status(400).send('보안 검증(CSRF state)에 실패했습니다. 창을 닫고 다시 시도해 주세요.');
        return;
      }

      if (!code) {
        res.status(400).send('카카오 인가 코드가 전달되지 않았습니다.');
        return;
      }

      // 2. Exchange authorization code for Kakao access token
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
        const errBody = await tokenRes.text();
        console.error('[KAKAO TOKEN EXCHANGE ERROR]', tokenRes.status, errBody);
        res.status(502).send('카카오 토큰 발급에 실패했습니다.');
        return;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 3. Query Kakao User Profile
      const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        console.error('[KAKAO USER INFO ERROR]', userRes.status);
        res.status(502).send('카카오 사용자 정보 조회에 실패했습니다.');
        return;
      }

      const kakaoUser = await userRes.json();
      const kakaoId = String(kakaoUser.id);
      const nickname = (kakaoUser.properties && kakaoUser.properties.nickname) ||
                       (kakaoUser.kakao_account && kakaoUser.kakao_account.profile && kakaoUser.kakao_account.profile.nickname) ||
                       '카카오 회원';

      // 4. Map to Firebase User with isolated UID (Never auto-merge with email accounts)
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

      // 5. Issue Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(firebaseUid, {
        provider: 'kakao'
      });

      // 6. Return secure postMessage HTML to window.opener
      // Never place customToken in URL, fragment, or localStorage!
      const nonce = crypto.randomBytes(16).toString('base64');
      res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';`);

      const safeOriginsJson = JSON.stringify(ALLOWED_ORIGINS);
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
      const allowedOrigins = ${safeOriginsJson};
      const token = ${safeTokenLiteral};
      if (window.opener && !window.opener.closed) {
        for (const origin of allowedOrigins) {
          try {
            window.opener.postMessage({ type: 'KAKAO_AUTH_SUCCESS', customToken: token }, origin);
          } catch(e) {}
        }
        window.close();
      } else {
        window.location.href = 'https://healimbd.com/reviews/';
      }
    })();
  </script>
</body>
</html>`;

      res.status(200).send(html);
    } catch (err) {
      console.error('[KAKAO AUTH CALLBACK EXCEPTION]', err);
      res.status(500).send('카카오 인증 처리 중 서버 오류가 발생했습니다.');
    }
  }
);

// Declare Naver secrets managed via Google Cloud Secret Manager / Firebase Secrets
const naverClientId = defineSecret('NAVER_CLIENT_ID');
const naverClientSecret = defineSecret('NAVER_CLIENT_SECRET');

/**
 * 3. naverAuthStart:
 * Generates cryptographically secure state, stores it in an HttpOnly SameSite=Lax cookie,
 * and 302 redirects user to Naver OAuth authorization page.
 */
exports.naverAuthStart = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 10,
    secrets: [naverClientId]
  },
  async (req, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');

      res.cookie('naver_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
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
      console.error('[NAVER AUTH START ERROR]', err);
      res.status(500).send('네이버 인증 초기화에 실패했습니다.');
    }
  }
);

/**
 * 4. naverAuthCallback:
 * Validates state from cookie, exchanges code for Naver token via server-to-server POST,
 * queries Naver user profile, issues Firebase Custom Token via Admin SDK,
 * and securely transfers the token to window.opener using postMessage with strict CSP & no-store.
 */
exports.naverAuthCallback = onRequest(
  {
    region: REGION,
    minInstances: 0,
    maxInstances: 10,
    secrets: [naverClientId, naverClientSecret]
  },
  async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');

    try {
      const code = req.query.code;
      const returnedState = req.query.state;

      const cookieHeader = req.headers.cookie || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      const storedState = cookies.naver_oauth_state;

      // Invalidate cookie immediately
      res.cookie('naver_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });

      if (!returnedState || !storedState || returnedState !== storedState) {
        console.error('[NAVER CSRF STATE MISMATCH]', { returnedState, hasStored: !!storedState });
        res.status(400).send('보안 검증(CSRF state)에 실패했습니다. 창을 닫고 다시 시도해 주세요.');
        return;
      }

      if (!code) {
        res.status(400).send('네이버 인가 코드가 전달되지 않았습니다.');
        return;
      }

      // Exchange authorization code for Naver access token
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
        const errBody = await tokenRes.text();
        console.error('[NAVER TOKEN EXCHANGE ERROR]', tokenRes.status, errBody);
        res.status(502).send('네이버 토큰 발급에 실패했습니다.');
        return;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Query Naver User Profile
      const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        console.error('[NAVER USER INFO ERROR]', userRes.status);
        res.status(502).send('네이버 사용자 정보 조회에 실패했습니다.');
        return;
      }

      const userData = await userRes.json();
      const naverProfile = userData.response || {};
      const naverId = String(naverProfile.id);
      const nickname = naverProfile.nickname || naverProfile.name || '네이버 회원';

      // Map to Firebase User with isolated UID (naver:{id})
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

      // Issue Firebase Custom Token
      const customToken = await admin.auth().createCustomToken(firebaseUid, {
        provider: 'naver'
      });

      const nonce = crypto.randomBytes(16).toString('base64');
      res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';`);

      const safeOriginsJson = JSON.stringify(ALLOWED_ORIGINS);
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
      const allowedOrigins = ${safeOriginsJson};
      const token = ${safeTokenLiteral};
      if (window.opener && !window.opener.closed) {
        for (const origin of allowedOrigins) {
          try {
            window.opener.postMessage({ type: 'NAVER_AUTH_SUCCESS', customToken: token }, origin);
          } catch(e) {}
        }
        window.close();
      } else {
        window.location.href = 'https://healimbd.com/reviews/';
      }
    })();
  </script>
</body>
</html>`;

      res.status(200).send(html);
    } catch (err) {
      console.error('[NAVER AUTH CALLBACK EXCEPTION]', err);
      res.status(500).send('네이버 인증 처리 중 서버 오류가 발생했습니다.');
    }
  }
);
