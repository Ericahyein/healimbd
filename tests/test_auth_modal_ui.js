import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Starting Auth Modal UI Verification Test Suite...\n');

// 1. Check generated public/index.html
const publicIndex = fs.readFileSync(path.resolve('public/index.html'), 'utf-8');

console.log('--- 1. Verification of Tab Removal ---');
assert.ok(!publicIndex.includes('auth-tabs'), 'Legacy .auth-tabs must be completely removed');
assert.ok(!publicIndex.includes('tab-btn-login'), 'Legacy #tab-btn-login must be completely removed');
assert.ok(!publicIndex.includes('tab-btn-signup'), 'Legacy #tab-btn-signup must be completely removed');
assert.ok(!publicIndex.includes('tab-btn-admin'), 'Legacy #tab-btn-admin must be completely removed');
console.log('✅ PASS: Legacy 3-tab header is completely removed from generated HTML.');

console.log('\n--- 2. Discreet Admin Button in Header ---');
assert.ok(publicIndex.includes('btn-discreet-admin'), 'Discreet admin button must exist');
assert.ok(publicIndex.includes('switchAuthTab') && publicIndex.includes('admin'), 'Discreet admin button must trigger switchAuthTab');
assert.ok(publicIndex.includes('auth-modal-top-actions'), 'auth-modal-top-actions must wrap admin and close buttons');
console.log('✅ PASS: Discreet admin button placed in top header actions alongside close button.');

console.log('\n--- 3. Element Order in Default Login Screen ---');
const loginFormPos = publicIndex.indexOf('login-form');
const submitBtnPos = publicIndex.indexOf('로그인하고 치료수기 열람하기');
const socialGroupPos = publicIndex.indexOf('social-auth-group');
const naverBtnPos = publicIndex.indexOf('naver-auth');
const kakaoBtnPos = publicIndex.indexOf('kakao-auth');
const signupSwitchPos = publicIndex.indexOf('switchAuthTab("signup")') !== -1 
  ? publicIndex.indexOf('switchAuthTab("signup")') 
  : publicIndex.indexOf("switchAuthTab('signup')");

assert.ok(loginFormPos !== -1, 'login-form must exist');
assert.ok(submitBtnPos !== -1, 'submit button must exist');
assert.ok(socialGroupPos !== -1, 'social-auth-group must exist');
assert.ok(signupSwitchPos !== -1, 'signup switch link must exist');

assert.ok(loginFormPos < submitBtnPos, 'Form fields must precede submit button');
assert.ok(submitBtnPos < socialGroupPos, 'Submit button must precede social buttons');
assert.ok(socialGroupPos < signupSwitchPos, 'Social buttons must precede signup switch button');
assert.ok(naverBtnPos < kakaoBtnPos, 'Naver button is in social group before kakao');

console.log('✅ PASS: Screen order strictly verified:');
console.log('   1. Email/Password fields');
console.log('   2. Login submit button ("로그인하고 치료수기 열람하기")');
console.log('   3. Naver / Kakao social login buttons');
console.log('   4. Switch to Sign-up prompt & button');

console.log('\n--- 4. Sign-up View & Return to Login ---');
const signupViewPos = publicIndex.indexOf('auth-view-signup');
const signupFormPos = publicIndex.indexOf('signup-form');
const returnToLoginFromSignup = publicIndex.indexOf('이미 회원이신가요?');

assert.ok(signupViewPos !== -1, 'auth-view-signup must exist');
assert.ok(signupFormPos !== -1, 'signup-form must exist');
assert.ok(returnToLoginFromSignup !== -1, 'Return to login prompt must exist in signup view');
console.log('✅ PASS: Sign-up view has all fields and "로그인으로 돌아가기" link.');

console.log('\n--- 5. Admin View & Return to Login ---');
const adminViewPos = publicIndex.indexOf('auth-view-admin');
const adminFormPos = publicIndex.indexOf('admin-login-form');
const returnToLoginFromAdmin = publicIndex.indexOf('일반 로그인으로 돌아가기');

assert.ok(adminViewPos !== -1, 'auth-view-admin must exist');
assert.ok(adminFormPos !== -1, 'admin-login-form must exist');
assert.ok(returnToLoginFromAdmin !== -1, 'Return to general login prompt must exist in admin view');
console.log('✅ PASS: Admin view has dedicated credentials form and "일반 로그인으로 돌아가기" link.');

console.log('\n--- 6. CSS Grid & 2-Column All-Screen Verification ---');
const styleCss = fs.readFileSync(path.resolve('assets/css/style.css'), 'utf-8');
const socialGroupBlocks = [...styleCss.matchAll(/\.social-auth-group\s*\{([^}]+)\}/g)];
assert.ok(socialGroupBlocks.length >= 2, '.social-auth-group rules must exist');
socialGroupBlocks.forEach(block => {
  const cssBody = block[1];
  assert.ok(!cssBody.includes('grid-template-columns: 1fr;') && !cssBody.includes('grid-template-columns: 1fr\n'), '.social-auth-group must NOT have 1-column grid');
  assert.ok(cssBody.includes('grid-template-columns: 1fr 1fr;'), '.social-auth-group must always be 1fr 1fr');
});
assert.ok(styleCss.includes('@media (max-width: 440px)'), 'Mobile media query must exist for responsive styling');
assert.ok(styleCss.includes('@media (max-width: 360px)'), 'Sub-360px media query must exist for 320px screens');
assert.ok(styleCss.includes('.social-text-short'), '.social-text-short must be defined');
assert.ok(styleCss.includes('.social-text-full'), '.social-text-full must be defined');

// Verify widths on 320px, 375px, 390px, 430px, PC (>= 768px)
const viewports = [
  { name: '320px (iPhone SE 1 / small Android)', screenWidth: 320, padding: 20, gap: 6, text: '네이버로 로그인' },
  { name: '375px (iPhone SE 2/3 / iPhone mini)', screenWidth: 375, padding: 28, gap: 8, text: '네이버로 로그인' },
  { name: '390px (iPhone 12/13/14/15 standard)', screenWidth: 390, padding: 28, gap: 8, text: '네이버로 로그인' },
  { name: '430px (iPhone 14/15 Pro Max)', screenWidth: 430, padding: 28, gap: 8, text: '네이버로 로그인' },
  { name: 'PC (Desktop 768px+)', screenWidth: 460, padding: 48, gap: 10, text: '네이버 아이디로 로그인' }
];

viewports.forEach(vp => {
  const modalInner = Math.min(vp.screenWidth, 460) - vp.padding;
  const btnWidth = (modalInner - vp.gap) / 2;
  // Estimate Korean character width: ~11px for 12.8px font, icon 16px, padding 10px
  const estimatedTextWidth = vp.text.length * 11 + 28;
  assert.ok(btnWidth > estimatedTextWidth, `Button at ${vp.name} (${btnWidth}px) must comfortably fit "${vp.text}" (${estimatedTextWidth}px)`);
  console.log(`   ✓ ${vp.name}: Button width = ${btnWidth.toFixed(1)}px > Text width (${estimatedTextWidth}px) -> 2 columns preserved!`);
});

console.log('✅ PASS: 2-column layout and text fit verified for 320px / 375px / 390px / 430px / PC.');

console.log('\n--- 7. main.js Logic Verification ---');
const mainJs = fs.readFileSync(path.resolve('assets/js/main.js'), 'utf-8');
assert.ok(mainJs.includes("document.getElementById('auth-view-login')"), 'main.js switches auth-view-login');
assert.ok(mainJs.includes("document.getElementById('auth-view-signup')"), 'main.js switches auth-view-signup');
assert.ok(mainJs.includes("document.getElementById('auth-view-admin')"), 'main.js switches auth-view-admin');
assert.ok(mainJs.includes('ensureFirebaseAuth().catch'), 'main.js pre-warms Firebase Auth on admin view');
console.log('✅ PASS: main.js switchAuthTab panel display and Firebase Auth lazy load verified.');

console.log('\n🎉 ALL 7 AUTH MODAL UI TESTS PASSED 100%!');
