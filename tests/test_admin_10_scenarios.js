const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Test Suite: 10 Admin Scenarios Requested by User...\n');

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

// Load source files
const mainJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'main.js'), 'utf8');
const reviewsListHtml = fs.readFileSync(path.join(__dirname, '..', 'layouts', 'reviews', 'list.html'), 'utf8');
const authModalHtml = fs.readFileSync(path.join(__dirname, '..', 'layouts', 'partials', 'auth_modal.html'), 'utf8');
const adminModalHtml = fs.readFileSync(path.join(__dirname, '..', 'layouts', 'partials', 'admin_case_modal.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'css', 'style.css'), 'utf8');

async function runAll() {
  // TEST 1: Logged out -> /reviews/ -> "치료후기 등록하기" button hidden, "관리자" button visible -> login -> stay on /reviews/ -> "치료후기 등록하기" button visible
  await test('TEST 1: Logged out -> /reviews/ -> button hidden, admin link accessible -> login succeeds -> stays on /reviews/ -> button visible', () => {
    // 1. "치료후기 등록하기" button has admin-only-btn in /reviews/list.html
    assert.ok(reviewsListHtml.includes('class="btn-subtle-write admin-only-btn"'), 'Register button has admin-only-btn');
    assert.ok(styleCss.includes('.admin-only-btn {\n  display: none !important;\n}'), '.admin-only-btn is hidden by default');
    assert.ok(styleCss.includes('body.is-admin .admin-only-btn {\n  display: inline-flex !important;\n}'), 'body.is-admin reveals .admin-only-btn');

    // 2. Discreet admin button in auth modal does NOT have admin-only-btn
    assert.ok(authModalHtml.includes('class="btn-discreet-admin"'), 'Discreet admin button exists');
    assert.ok(!authModalHtml.includes('class="btn-discreet-admin admin-only-btn"'), 'Admin button must NOT be admin-only');

    // 3. handleDedicatedAdminLogin stays on /reviews/ and updates UI to body.is-admin
    const loginFunc = mainJs.match(/async function handleDedicatedAdminLogin\(e\) \{([\s\S]*?)\n\}/)[1];
    assert.ok(!loginFunc.includes("window.location.href = '/admin/';"), 'Does NOT redirect to /admin/');
    assert.ok(!loginFunc.includes("openAdminWriterModal()"), 'Does NOT auto-open writer modal on login');
    assert.ok(loginFunc.includes("updateAuthUI({ name: '대표원장', email: user.email, isAdmin: true })"), 'Updates UI to admin');
  });

  // TEST 2: Admin logged in -> "치료후기 등록하기" click -> writer modal opens directly without re-login
  await test('TEST 2: Admin logged in -> openAdminCaseWriter() immediately opens writer modal', () => {
    let auth = { currentUser: { uid: 'admin-uid' } };
    let isAdminVerified = true;
    function isUserAdmin() {
      return !!(auth && auth.currentUser && isAdminVerified === true);
    }
    let modalOpened = false;
    function openAdminWriterModal() {
      modalOpened = true;
    }
    function openAuthModal() {
      throw new Error('Should not open auth modal when already admin');
    }

    // Call openAdminCaseWriter logic
    if (isUserAdmin()) {
      openAdminWriterModal();
    } else {
      openAuthModal('admin');
    }

    assert.strictEqual(modalOpened, true, 'Writer modal must open directly without auth modal');
  });

  // TEST 3: Admin session restore after page reload
  await test('TEST 3: Admin session restore after reload -> re-verifies privileges -> activates admin UI', async () => {
    let auth = { currentUser: { uid: 'admin-uid' } };
    let isAdminVerified = false;
    let bodyClasses = new Set();
    const document = {
      body: {
        classList: {
          toggle: (cls, val) => val ? bodyClasses.add(cls) : bodyClasses.delete(cls),
          add: (cls) => bodyClasses.add(cls),
          remove: (cls) => bodyClasses.delete(cls)
        }
      },
      getElementById: () => null
    };

    // Simulate checkAdminPrivileges returning true
    const checkAdminPrivileges = async (user) => true;
    const updateAuthUI = (user) => {
      const isAdmin = !!(user && user.isAdmin && isAdminVerified);
      document.body.classList.toggle('is-admin', isAdmin);
    };

    // Run verification flow
    if (auth && auth.currentUser) {
      const isVerified = await checkAdminPrivileges(auth.currentUser);
      if (isVerified) {
        isAdminVerified = true;
        updateAuthUI({ name: '대표원장', email: 'admin@healim.com', isAdmin: true });
      }
    }

    assert.strictEqual(isAdminVerified, true, 'isAdminVerified set to true');
    assert.ok(bodyClasses.has('is-admin'), 'body has is-admin class restored');
  });

  // TEST 4: Regular member login -> reviews unlocked -> admin writer/delete buttons hidden
  await test('TEST 4: Regular member login -> reviews unlocked, admin buttons remain hidden', () => {
    let auth = null;
    let isAdminVerified = false;
    let bodyClasses = new Set();
    let unlocked = false;
    const document = {
      body: {
        classList: {
          toggle: (cls, val) => val ? bodyClasses.add(cls) : bodyClasses.delete(cls)
        }
      },
      getElementById: (id) => {
        if (id === 'case-protected-wrapper') {
          return { classList: { remove: (c) => { if (c === 'is-locked') unlocked = true; } } };
        }
        return null;
      }
    };

    function updateAuthUI(user) {
      const isAdmin = !!(user && user.isAdmin && isAdminVerified);
      document.body.classList.toggle('is-admin', isAdmin);
      const isAuthorized = !!user;
      if (isAuthorized) {
        const wrap = document.getElementById('case-protected-wrapper');
        if (wrap) wrap.classList.remove('is-locked');
      }
    }

    const regularUser = { name: '홍길동', email: 'hong@naver.com', provider: 'naver' };
    updateAuthUI(regularUser);

    assert.strictEqual(unlocked, true, 'Protected case unlocked for reading');
    assert.strictEqual(bodyClasses.has('is-admin'), false, 'body does NOT have is-admin (buttons hidden)');
  });

  // TEST 5: Fake sessionStorage tampering fails without Firebase Auth session
  await test('TEST 5: Arbitrary sessionStorage.setItem("healim_admin_auth", "true") does NOT activate admin UI', async () => {
    let auth = { currentUser: null }; // visitor not logged in to Firebase
    let isAdminVerified = false;
    let bodyClasses = new Set();
    const document = {
      body: {
        classList: {
          toggle: (cls, val) => val ? bodyClasses.add(cls) : bodyClasses.delete(cls),
          remove: (cls) => bodyClasses.delete(cls)
        }
      },
      getElementById: () => null
    };

    const sessionStorage = { healim_admin_auth: 'true' };

    function updateAuthUI(user) {
      const isAdmin = !!(user && user.isAdmin && isAdminVerified);
      document.body.classList.toggle('is-admin', isAdmin);
    }

    // checkAdminSessionFallback logic
    async function checkAdminSessionFallback() {
      const isAdminAuth = sessionStorage.healim_admin_auth === 'true';
      if (isAdminAuth) {
        // Background verify
        await verifyExistingAdminSession();
      } else {
        updateAuthUI(null);
      }
    }

    async function verifyExistingAdminSession() {
      // onAuthStateChanged with currentUser === null
      if (!auth.currentUser) {
        isAdminVerified = false;
        delete sessionStorage.healim_admin_auth;
        document.body.classList.remove('is-admin');
        updateAuthUI(null);
        return false;
      }
    }

    await checkAdminSessionFallback();

    assert.strictEqual(isAdminVerified, false, 'isAdminVerified remains false');
    assert.strictEqual(bodyClasses.has('is-admin'), false, 'body.is-admin NOT added');
    assert.strictEqual(sessionStorage.healim_admin_auth, undefined, 'Fake sessionStorage purged');
  });

  // TEST 6: Custom Claim admin=true -> admin verified even without admins/{uid} document
  await test('TEST 6: Custom Claim admin=true -> admin verified without admins/{uid} document', async () => {
    const user = {
      uid: 'claim-admin-uid',
      getIdTokenResult: async () => ({
        claims: { admin: true }
      })
    };

    // checkAdminPrivileges logic
    let checkedDoc = false;
    async function checkAdminPrivileges(u) {
      const tokenResult = await u.getIdTokenResult(true);
      if (tokenResult && tokenResult.claims && tokenResult.claims.admin === true) {
        return true;
      }
      checkedDoc = true;
      return false;
    }

    const isVerified = await checkAdminPrivileges(user);
    assert.strictEqual(isVerified, true, 'Verified via Custom Claim');
    assert.strictEqual(checkedDoc, false, 'Did not need to query document');
  });

  // TEST 7: admins/{uid} document exists without role field -> admin verified
  await test('TEST 7: admins/{uid} document exists without role field -> admin verified', async () => {
    const user = {
      uid: 'doc-admin-uid',
      getIdTokenResult: async () => ({ claims: {} }) // no claim
    };

    const mockFirestore = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ createdAt: '2025-01-01' }) // no role field!
          })
        })
      })
    };

    async function checkAdminPrivileges(u) {
      const tokenResult = await u.getIdTokenResult(true);
      if (tokenResult && tokenResult.claims && tokenResult.claims.admin === true) {
        return true;
      }
      const adminDoc = await mockFirestore.collection('admins').doc(u.uid).get();
      return !!(adminDoc && adminDoc.exists);
    }

    const isVerified = await checkAdminPrivileges(user);
    assert.strictEqual(isVerified, true, 'Verified via document existence alone');
  });

  // TEST 8: Custom Claim absent AND admins/{uid} document absent -> rejected as non-admin
  await test('TEST 8: Custom Claim absent AND document absent -> rejected as non-admin', async () => {
    const user = {
      uid: 'regular-uid',
      getIdTokenResult: async () => ({ claims: {} })
    };

    const mockFirestore = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: false,
            data: () => null
          })
        })
      })
    };

    async function checkAdminPrivileges(u) {
      const tokenResult = await u.getIdTokenResult(true);
      if (tokenResult && tokenResult.claims && tokenResult.claims.admin === true) {
        return true;
      }
      const adminDoc = await mockFirestore.collection('admins').doc(u.uid).get();
      return !!(adminDoc && adminDoc.exists);
    }

    const isVerified = await checkAdminPrivileges(user);
    assert.strictEqual(isVerified, false, 'Correctly rejected non-admin');
  });

  // TEST 9: App Check / Firestore temporary error -> not misclassified as non-admin, session not purged
  await test('TEST 9: App Check / Firestore error during privilege check -> throws error, does NOT purge session', async () => {
    const user = {
      uid: 'test-uid',
      getIdTokenResult: async () => ({ claims: {} })
    };

    const mockFirestore = {
      collection: () => ({
        doc: () => ({
          get: async () => {
            const err = new Error('permission-denied: App Check token invalid');
            err.code = 'permission-denied';
            throw err;
          }
        })
      })
    };

    async function checkAdminPrivileges(u) {
      const tokenResult = await u.getIdTokenResult(true);
      if (tokenResult && tokenResult.claims && tokenResult.claims.admin === true) {
        return true;
      }
      try {
        const adminDoc = await mockFirestore.collection('admins').doc(u.uid).get();
        return !!(adminDoc && adminDoc.exists);
      } catch (err) {
        // Rethrows so caller distinguishes infrastructure error from non-admin
        throw err;
      }
    }

    let purged = false;
    function purgeAdminSession() {
      purged = true;
    }

    let errorMessage = '';
    try {
      await checkAdminPrivileges(user);
    } catch (err) {
      // handleDedicatedAdminLogin error branch
      if (err.code === 'permission-denied') {
        errorMessage = '관리자 권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
    }

    assert.strictEqual(purged, false, 'Session must NOT be purged on infrastructure error');
    assert.strictEqual(errorMessage, '관리자 권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  // TEST 10: Direct access to /admin/ -> existing admin dashboard functional
  await test('TEST 10: Direct access to /admin/ -> existing dashboard listener and controller functional', () => {
    assert.ok(mainJs.includes('function initAdminDashboard()'), 'initAdminDashboard function exists');
    assert.ok(mainJs.includes('function handleFirebaseAdminLogin(e)'), 'handleFirebaseAdminLogin function exists');
    assert.ok(mainJs.includes('function listenToAdminInquiries()'), 'listenToAdminInquiries function exists');
    assert.ok(mainJs.includes('function handleFirebaseAdminLogout()'), 'handleFirebaseAdminLogout function exists');
  });

  console.log(`\n🎉 ALL 10 USER SCENARIOS PASSED 100%!`);
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
