/**
 * Comprehensive Automated Test Suite:
 * Tests OAuth lifecycle, cookie attributes, targetOrigin enforcement,
 * and immediate error postMessage handling in firebase_functions/index.js.
 */
const assert = require('assert');
const Module = require('module');

// 1. Mock external Firebase dependencies before requiring functions
const mockAdmin = {
  apps: [{ name: 'mock_app' }],
  initializeApp: () => {},
  auth: () => ({
    getUser: async (uid) => ({ uid }),
    createUser: async (data) => data,
    createCustomToken: async (uid, claims) => `mock_custom_token_for_${uid}`
  })
};

const mockFunctionsHttps = {
  onRequest: (opts, handler) => {
    const fn = (req, res) => handler(req, res);
    fn.__options = opts;
    return fn;
  }
};

const mockFunctionsParams = {
  defineSecret: (name) => ({
    value: () => `mock_secret_val_for_${name}`
  })
};

const origRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'firebase-admin') return mockAdmin;
  if (id === 'firebase-functions/v2/https') return mockFunctionsHttps;
  if (id === 'firebase-functions/params') return mockFunctionsParams;
  return origRequire.apply(this, arguments);
};

// 2. Mock external fetch
global.fetch = async (url, options) => {
  if (url.includes('kauth.kakao.com/oauth/token') || url.includes('nid.naver.com/oauth2.0/token')) {
    return {
      ok: true,
      json: async () => ({ access_token: 'mock_access_token_123' })
    };
  }
  if (url.includes('kapi.kakao.com/v2/user/me')) {
    return {
      ok: true,
      json: async () => ({ id: 987654321, properties: { nickname: '카카오테스터' } })
    };
  }
  if (url.includes('openapi.naver.com/v1/nid/me')) {
    return {
      ok: true,
      json: async () => ({ response: { id: 'naver_test_id_999', nickname: '네이버테스터' } })
    };
  }
  return { ok: false, status: 404, text: async () => 'not found' };
};

// Load functions
const functions = require('../firebase_functions/index.js');

function createMockReqRes({ method = 'GET', query = {}, headers = {}, protocol = 'https' } = {}) {
  const req = {
    method,
    query,
    headers: { host: 'asia-northeast3-healimbd-b726f.cloudfunctions.net', ...headers },
    protocol,
    get(headerName) {
      return this.headers[headerName.toLowerCase()] || this.headers[headerName];
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    body: null,
    redirectUrl: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    redirect(code, url) {
      this.statusCode = code;
      this.redirectUrl = url;
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
    }
  };

  return { req, res };
}

async function runTests() {
  console.log('--- STARTING OAUTH LIFECYCLE & SECURITY TESTS ---');

  // Test 1: kakaoAuthStart generates correct cookies and targetOrigin for localhost:1313
  {
    const { req, res } = createMockReqRes({ query: { origin: 'http://localhost:1313' } });
    await functions.kakaoAuthStart(req, res);

    assert.strictEqual(res.statusCode, 302, 'Should 302 redirect');
    assert(res.redirectUrl.includes('kauth.kakao.com/oauth/authorize'), 'Redirect to kakao authorize');
    
    // Cookie checks
    const stateCookie = res.cookies['kakao_oauth_state'];
    assert(stateCookie, 'kakao_oauth_state cookie must be set');
    assert.strictEqual(stateCookie.options.httpOnly, true, 'kakao_oauth_state must be httpOnly');
    assert.strictEqual(stateCookie.options.sameSite, 'lax', 'kakao_oauth_state must be sameSite: lax');
    assert.strictEqual(stateCookie.options.path, '/', 'kakao_oauth_state must have path: /');
    assert.strictEqual(stateCookie.options.maxAge, 300000, 'kakao_oauth_state maxAge must be <= 300s');

    const originCookie = res.cookies['kakao_oauth_origin'];
    assert(originCookie, 'kakao_oauth_origin cookie must be set');
    assert.strictEqual(originCookie.val, 'http://localhost:1313', 'Origin cookie must match validated localhost origin');
    assert.strictEqual(originCookie.options.path, '/', 'kakao_oauth_origin must have path: /');
    console.log('✓ Test 1 Passed: kakaoAuthStart sets HttpOnly, SameSite=Lax, Path=/, Max-Age=300s cookies');
  }

  // Test 2: kakaoAuthStart rejects rogue origin and falls back strictly to healimbd.com
  {
    const { req, res } = createMockReqRes({ query: { origin: 'https://malicious-site.com' } });
    await functions.kakaoAuthStart(req, res);

    const originCookie = res.cookies['kakao_oauth_origin'];
    assert.strictEqual(originCookie.val, 'https://healimbd.com', 'Rogue origin must fallback to production healimbd.com');
    console.log('✓ Test 2 Passed: Rogue origin query safely sanitized to https://healimbd.com');
  }

  // Test 3: kakaoAuthCallback handles user cancellation immediately (error=access_denied)
  {
    const { req, res } = createMockReqRes({
      query: { error: 'access_denied' },
      headers: { cookie: 'kakao_oauth_state=random_state_abc; kakao_oauth_origin=http://localhost:1313' }
    });
    await functions.kakaoAuthCallback(req, res);

    // Cookies must be cleared immediately
    assert.strictEqual(res.cookies['kakao_oauth_state'].options.maxAge, 0, 'State cookie must be purged');
    assert.strictEqual(res.cookies['kakao_oauth_state'].options.path, '/', 'State cookie purge path must be /');
    assert.strictEqual(res.cookies['kakao_oauth_origin'].options.maxAge, 0, 'Origin cookie must be purged');

    // PostMessage response check
    assert(res.body.includes('KAKAO_AUTH_ERROR'), 'Must post KAKAO_AUTH_ERROR');
    assert(res.body.includes('"error":"access_denied"'), 'Must specify error: access_denied');
    assert(res.body.includes('"http://localhost:1313"'), 'Must target exact origin http://localhost:1313');
    assert(!res.body.includes('"*"'), 'Never use wildcard origin');
    assert(res.headers['cache-control'].includes('no-store'), 'Must include no-store header');
    assert(res.headers['content-security-policy'].includes("default-src 'none'"), 'Must enforce strict CSP');
    console.log('✓ Test 3 Passed: User cancellation returns immediate KAKAO_AUTH_ERROR postMessage to targetOrigin');
  }

  // Test 4: kakaoAuthCallback detects CSRF state mismatch and cleans up immediately
  {
    const { req, res } = createMockReqRes({
      query: { code: 'auth_code_123', state: 'tampered_state' },
      headers: { cookie: 'kakao_oauth_state=legit_state_456; kakao_oauth_origin=https://healimbd.com' }
    });
    await functions.kakaoAuthCallback(req, res);

    assert.strictEqual(res.cookies['kakao_oauth_state'].options.maxAge, 0, 'State cookie must be purged on mismatch');
    assert(res.body.includes('KAKAO_AUTH_ERROR'), 'Must post KAKAO_AUTH_ERROR on state mismatch');
    assert(res.body.includes('"error":"state_mismatch"'), 'Must specify error: state_mismatch');
    assert(res.body.includes('"https://healimbd.com"'), 'Must target exact origin https://healimbd.com');
    console.log('✓ Test 4 Passed: CSRF state mismatch immediately dispatches KAKAO_AUTH_ERROR and purges cookies');
  }

  // Test 5: kakaoAuthCallback success flow: customToken issued, exact targetOrigin postMessage
  {
    const legitimateState = 'valid_state_secure_12345';
    const { req, res } = createMockReqRes({
      query: { code: 'valid_kakao_code', state: legitimateState },
      headers: { cookie: `kakao_oauth_state=${legitimateState}; kakao_oauth_origin=http://localhost:1313` }
    });
    await functions.kakaoAuthCallback(req, res);

    assert(res.body.includes('KAKAO_AUTH_SUCCESS'), 'Must post KAKAO_AUTH_SUCCESS');
    assert(res.body.includes('mock_custom_token_for_kakao:987654321'), 'Must include custom token in postMessage payload');
    assert(res.body.includes('"http://localhost:1313"'), 'Must target exact origin http://localhost:1313');
    assert(!res.body.includes('"*"'), 'Never use wildcard origin');
    assert(res.headers['cache-control'].includes('no-store'), 'Must enforce no-store header');
    console.log('✓ Test 5 Passed: kakaoAuthCallback success issues customToken to exact targetOrigin');
  }

  // Test 6: naverAuthStart & naverAuthCallback symmetrical verification
  {
    const legitimateState = 'naver_secret_state_999';
    const { req: startReq, res: startRes } = createMockReqRes({ query: { origin: 'https://healimbd.com' } });
    await functions.naverAuthStart(startReq, startRes);

    assert(startRes.cookies['naver_oauth_state'], 'naver_oauth_state cookie must be set');
    assert.strictEqual(startRes.cookies['naver_oauth_state'].options.path, '/', 'naver_oauth_state path must be /');
    assert.strictEqual(startRes.cookies['naver_oauth_origin'].val, 'https://healimbd.com');

    // Naver callback with user denial
    const { req: cbReq, res: cbRes } = createMockReqRes({
      query: { error: 'access_denied' },
      headers: { cookie: `naver_oauth_state=${legitimateState}; naver_oauth_origin=https://healimbd.com` }
    });
    await functions.naverAuthCallback(cbReq, cbRes);

    assert(cbRes.body.includes('NAVER_AUTH_ERROR'), 'Must post NAVER_AUTH_ERROR');
    assert(cbRes.body.includes('"error":"access_denied"'), 'Must specify error: access_denied');
    assert(cbRes.body.includes('"https://healimbd.com"'), 'Target origin must be https://healimbd.com');
    assert.strictEqual(cbRes.cookies['naver_oauth_state'].options.maxAge, 0, 'naver_oauth_state purged');
    console.log('✓ Test 6 Passed: Naver OAuth handlers enforce symmetrical security and cookie attributes');
  }

  console.log('--- ALL 6/6 OAUTH HARDENING TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test Failure:', err);
  process.exit(1);
});
