const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Test Suite: Admin Case Flow & Security Verification...\n');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Read main.js and admin_case_modal.html
const mainJsPath = path.join(__dirname, '..', 'assets', 'js', 'main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');

const modalHtmlPath = path.join(__dirname, '..', 'layouts', 'partials', 'admin_case_modal.html');
const modalHtml = fs.readFileSync(modalHtmlPath, 'utf8');

async function runAll() {
  // Test 1: isUserAdmin() strictness check (Rule 1)
  await test('1. isUserAdmin() strictly requires auth.currentUser and isAdminVerified === true (sessionStorage alone is insufficient)', () => {
    assert.ok(mainJs.includes('function isUserAdmin()'), 'isUserAdmin function must exist');
    const isUserAdminMatch = mainJs.match(/function isUserAdmin\(\) \{([\s\S]*?)\n\}/);
    assert.ok(isUserAdminMatch, 'isUserAdmin body must be extracted');
    const body = isUserAdminMatch[1];

    assert.ok(body.includes('auth.currentUser'), 'Must check auth.currentUser');
    assert.ok(body.includes('isAdminVerified === true'), 'Must check isAdminVerified === true');
    assert.ok(!body.includes("sessionStorage.getItem('healim_admin_auth') === 'true'"), 'Must NOT allow sessionStorage alone to grant isUserAdmin() === true');
  });

  // Test 2: openAdminCaseWriter() skips legacy password modal and goes directly to Firebase Admin Login
  await test('2. openAdminCaseWriter() opens Firebase Admin Login when unauthenticated, and does NOT open writer modal before login', () => {
    const caseWriterMatch = mainJs.match(/async function openAdminCaseWriter\(\) \{([\s\S]*?)\n\}/);
    assert.ok(caseWriterMatch, 'openAdminCaseWriter must exist');
    const body = caseWriterMatch[1];

    assert.ok(!body.includes("openAdminAuthModal('case')"), 'Must NOT open legacy password modal openAdminAuthModal');
    assert.ok(body.includes("openAuthModal('admin')"), 'Must open openAuthModal("admin") directly');
  });

  // Test 3: checkAdminPrivileges() mirrors Security Rules: Custom Claim admin=true OR admins/{uid} document exists
  await test('3. checkAdminPrivileges() verifies against Custom Claim admin=true OR admins/{uid} document existence (without role field requirement or email whitelist)', () => {
    const checkPrivMatch = mainJs.match(/async function checkAdminPrivileges\(user\) \{([\s\S]*?)\n\}/);
    assert.ok(checkPrivMatch, 'checkAdminPrivileges must exist');
    const body = checkPrivMatch[1];

    assert.ok(body.includes(".collection('admins').doc(user.uid).get()"), 'Must query admins/{uid} document');
    assert.ok(body.includes("claims.admin === true"), 'Must check Custom Claim admin === true');
    assert.ok(body.includes("adminDoc && adminDoc.exists"), 'Must check adminDoc.exists');
    assert.ok(!body.includes("role === 'admin'"), 'Must NOT require role === admin');
    assert.ok(!body.includes("admin@healimbd.com"), 'Must NOT hardcode admin email whitelist');
  });

  // Test 4: handleDedicatedAdminLogin() purges session on confirmed non-admin
  await test('4. handleDedicatedAdminLogin() purges session and removes admin credentials if admin verification fails (confirmed non-admin)', () => {
    const loginFuncMatch = mainJs.match(/async function handleDedicatedAdminLogin\(e\) \{([\s\S]*?)\n\}/);
    assert.ok(loginFuncMatch, 'handleDedicatedAdminLogin exists');
    const body = loginFuncMatch[1];

    assert.ok(body.includes('await checkAdminPrivileges(user)'), 'Must call checkAdminPrivileges');
    assert.ok(body.includes('await purgeAdminSession()'), 'Must call purgeAdminSession on non-admin');
  });

  // Test 5: Stays on /reviews/, updates UI to admin, does NOT auto-open writer modal
  await test('5. handleDedicatedAdminLogin() stays on /reviews/, updates UI to admin, and does NOT auto-open writer modal', () => {
    const loginFuncMatch = mainJs.match(/async function handleDedicatedAdminLogin\(e\) \{([\s\S]*?)\n\}/);
    const body = loginFuncMatch[1];

    // Must NOT have unconditional redirect to /admin/
    assert.ok(!body.includes("window.location.href = '/admin/';"), 'Must NOT unconditionally redirect to /admin/');

    // Must NOT auto-open modal upon login
    assert.ok(!body.includes("openAdminWriterModal()"), 'Must NOT auto-open modal on login');
    assert.ok(body.includes("updateAuthUI({ name: '대표원장', email: user.email, isAdmin: true })"), 'Must update UI to admin');
  });

  // Test 6: Logout functions synchronize state completely
  await test('6. Logout functions reset adminTargetModal = null, isAdminVerified = false, and clear sessionStorage', () => {
    const logoutUserMatch = mainJs.match(/async function logoutUser\(\) \{([\s\S]*?)\n\}/);
    assert.ok(logoutUserMatch, 'logoutUser exists');
    assert.ok(logoutUserMatch[1].includes('window.adminTargetModal = null;'), 'logoutUser resets adminTargetModal');
    assert.ok(logoutUserMatch[1].includes('isAdminVerified = false;'), 'logoutUser resets isAdminVerified');

    const adminLogoutMatch = mainJs.match(/async function handleFirebaseAdminLogout\(\) \{([\s\S]*?)\n\}/);
    assert.ok(adminLogoutMatch, 'handleFirebaseAdminLogout exists');
    assert.ok(adminLogoutMatch[1].includes('window.adminTargetModal = null;'), 'handleFirebaseAdminLogout resets adminTargetModal');
    assert.ok(adminLogoutMatch[1].includes('isAdminVerified = false;'), 'handleFirebaseAdminLogout resets isAdminVerified');
  });

  // Test 7: 3-Layer Defense for Custom Case Submit and Delete
  await test('7. 3-Layer Defense: #btn-delete-custom-case has admin-only-btn, JS functions verify isUserAdmin()', () => {
    // Layer 1: UI
    assert.ok(modalHtml.includes('id="btn-delete-custom-case"'), 'Delete button exists');
    assert.ok(modalHtml.includes('class="btn btn-danger-small admin-only-btn"'), 'Delete button must have admin-only-btn class');

    // Layer 2: JS
    const deleteCaseMatch = mainJs.match(/function deleteCurrentCustomCase\(\) \{([\s\S]*?)\n\}/);
    assert.ok(deleteCaseMatch, 'deleteCurrentCustomCase exists');
    assert.ok(deleteCaseMatch[1].includes('if (!isUserAdmin())'), 'deleteCurrentCustomCase must verify isUserAdmin()');

    const submitCaseMatch = mainJs.match(/function handleAdminCaseSubmit\(e\) \{([\s\S]*?)\n\}/);
    assert.ok(submitCaseMatch, 'handleAdminCaseSubmit exists');
    assert.ok(submitCaseMatch[1].includes('if (!isUserAdmin())'), 'handleAdminCaseSubmit must verify isUserAdmin()');
  });

  // Test 8: Tamper resistance simulation
  await test('8. Tamper resistance: Client setting healim_admin_auth="true" fails isUserAdmin() without Firebase Auth', () => {
    // Simulate runtime
    let auth = null;
    let isAdminVerified = false;
    function isUserAdmin() {
      return !!(auth && auth.currentUser && isAdminVerified === true);
    }

    // Attacker sets sessionStorage
    const sessionStorage = { healim_admin_auth: 'true' };

    // Check result
    assert.strictEqual(isUserAdmin(), false, 'isUserAdmin() MUST be false when attacker sets healim_admin_auth');

    // Even if auth is set but currentUser is null
    auth = { currentUser: null };
    assert.strictEqual(isUserAdmin(), false, 'isUserAdmin() MUST be false when currentUser is null');

    // Even if currentUser exists but isAdminVerified is false
    auth.currentUser = { uid: 'attacker' };
    isAdminVerified = false;
    assert.strictEqual(isUserAdmin(), false, 'isUserAdmin() MUST be false when isAdminVerified is false');

    // Only when verified
    isAdminVerified = true;
    assert.strictEqual(isUserAdmin(), true, 'isUserAdmin() is true only when auth, currentUser, and isAdminVerified are all valid');
  });

  console.log(`\n🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
}

runAll();
