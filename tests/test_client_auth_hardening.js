/**
 * Automated Verification of Client-Side Auth Hardening in assets/js/main.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const mainJsPath = path.join(__dirname, '../assets/js/main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

console.log('--- STARTING CLIENT-SIDE AUTH HARDENING TESTS ---');

// Test 1: handleSocialLogin calls window.open('about:blank') synchronously before any await
{
  const fnMatch = mainJsContent.match(/async function handleSocialLogin\(provider\)\s*\{([\s\S]*?)\n\}\s*\nasync function handleEmailLogin/);
  assert(fnMatch, 'handleSocialLogin function must exist');
  const fnBody = fnMatch[1];

  const firstWindowOpenIdx = fnBody.indexOf("window.open(");
  const firstAwaitIdx = fnBody.indexOf("await ");

  assert(firstWindowOpenIdx !== -1, "window.open must be present in handleSocialLogin");
  assert(firstAwaitIdx !== -1, "await must be present in handleSocialLogin");
  assert(firstWindowOpenIdx < firstAwaitIdx, "CRITICAL: window.open must execute BEFORE the first await!");

  // Verify 'about:blank' is the target of the synchronous window.open
  const openCallSnippet = fnBody.substring(firstWindowOpenIdx, firstWindowOpenIdx + 50);
  assert(openCallSnippet.includes("'about:blank'"), "window.open must open 'about:blank' first");

  console.log('✓ Test 1 Passed: window.open("about:blank") executes synchronously before any await');
}

// Test 2: Error handling branches are distinctly defined
{
  assert(mainJsContent.includes('브라우저에 의해 팝업이 차단되었습니다'), 'Distinct toast for popup blocking');
  assert(mainJsContent.includes('인증 모듈을 초기화할 수 없습니다'), 'Distinct toast for auth init failure');
  assert(mainJsContent.includes('로그인 창이 닫혔습니다'), 'Distinct toast for user closing popup');
  assert(mainJsContent.includes('로그인이 취소되었습니다'), 'Distinct toast for user cancel');
  assert(mainJsContent.includes('보안 검증(CSRF state)에 실패했습니다'), 'Distinct toast for CSRF mismatch');
  console.log('✓ Test 2 Passed: Distinct user toasts for blocked popup, init failure, manual close, and auth errors');
}

// Test 3: postMessage error handling for both Kakao and Naver
{
  assert(mainJsContent.includes("expectedErrorType = provider === 'kakao' ? 'KAKAO_AUTH_ERROR' : 'NAVER_AUTH_ERROR'"), 'Listens for provider-specific error type');
  assert(mainJsContent.includes("event.data.type === expectedErrorType"), 'Branches immediately on error message');
  console.log('✓ Test 3 Passed: Explicit KAKAO_AUTH_ERROR and NAVER_AUTH_ERROR handlers present');
}

// Test 4: Email sign-up and login separation, password rules, and logout review locking
{
  assert(mainJsContent.includes("auth.signInWithEmailAndPassword"), 'signInWithEmailAndPassword used for login');
  assert(mainJsContent.includes("auth.createUserWithEmailAndPassword"), 'createUserWithEmailAndPassword used for signup');
  assert(mainJsContent.includes("password.length < 6"), 'Password minimum length 6 enforced');
  assert(mainJsContent.includes("protectedWrapper.classList.add('is-locked')"), 'Logout relocks reviews');
  assert(mainJsContent.includes("revokeActiveReviewBlobUrl"), 'Blob URLs revoked on logout');
  console.log('✓ Test 4 Passed: Email login/signup isolated, min 6 char password enforced, and reviews relocked on logout');
}

console.log('--- ALL CLIENT-SIDE AUTH HARDENING TESTS PASSED SUCCESSFULLY! ---');
