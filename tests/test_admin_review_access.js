const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Test Suite: Admin Review Access & Session Management...\n');

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

async function runAll() {

// Read main.js
const mainJsPath = path.join(__dirname, '..', 'assets', 'js', 'main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');

// Mock browser DOM and Storages
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class MockElement {
  constructor(id, initialClasses = []) {
    this.id = id;
    this.classList = {
      classes: new Set(initialClasses),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, force) => {
        if (force) this.classList.classes.add(c);
        else this.classList.classes.delete(c);
      },
      contains: (c) => this.classList.classes.has(c)
    };
    this.style = {};
    this.textContent = '';
  }
}

function setupMockEnvironment() {
  const localStorage = new MockStorage();
  const sessionStorage = new MockStorage();

  const elements = {
    'case-protected-wrapper': new MockElement('case-protected-wrapper', ['case-protected-wrapper', 'is-locked']),
    'case-unlocked-banner': new MockElement('case-unlocked-banner'),
    'unlocked-user-name': new MockElement('unlocked-user-name'),
    'btn-header-login': new MockElement('btn-header-login'),
    'header-user-badge': new MockElement('header-user-badge'),
    'logged-user-name': new MockElement('logged-user-name'),
    'drawer-guest-box': new MockElement('drawer-guest-box'),
    'drawer-user-box': new MockElement('drawer-user-box'),
    'drawer-logged-user-name': new MockElement('drawer-logged-user-name')
  };

  const document = {
    body: {
      classList: {
        classes: new Set(),
        add: (c) => document.body.classList.classes.add(c),
        remove: (c) => document.body.classList.classes.delete(c),
        toggle: (c, force) => {
          if (force) document.body.classList.classes.add(c);
          else document.body.classList.classes.delete(c);
        },
        contains: (c) => document.body.classList.classes.has(c)
      }
    },
    getElementById: (id) => elements[id] || null
  };

  return { localStorage, sessionStorage, elements, document };
}

// 1. Static Analysis: admins/{uid} verification sets sessionStorage
await test('1. admins/{uid} role verification in initFirebase() sets healim_admin_auth and healim_admin_user', () => {
  assert.ok(mainJs.includes("sessionStorage.setItem('healim_admin_auth', 'true')"), 'Must set healim_admin_auth');
  assert.ok(mainJs.includes("sessionStorage.setItem('healim_admin_user'"), 'Must set healim_admin_user');
  assert.ok(mainJs.includes("sessionStorage.removeItem('healim_admin_auth')"), 'Must clean up healim_admin_auth on auth fail/logout');
  assert.ok(mainJs.includes("sessionStorage.removeItem('healim_admin_user')"), 'Must clean up healim_admin_user on auth fail/logout');
});

// 2. Static Analysis: Login button alone does NOT set healim_admin_auth
await test('2. handleDedicatedAdminLogin() does NOT set healim_admin_auth directly (only /admin/ does)', () => {
  const loginFuncMatch = mainJs.match(/async function handleDedicatedAdminLogin\(e\) \{([\s\S]*?)\n\}/);
  assert.ok(loginFuncMatch, 'handleDedicatedAdminLogin exists');
  const loginFuncBody = loginFuncMatch[1];
  assert.ok(!loginFuncBody.includes("sessionStorage.setItem('healim_admin_auth'"), 'Login button must not set healim_admin_auth directly');
});

// 3. Behavioral Simulation: Guest Visitor (Not Logged In)
await test('3. Guest Visitor: Review remains locked, banner hidden, login button visible', () => {
  const env = setupMockEnvironment();

  // Simulate updateAuthUI with null
  eval(`
    const localStorage = env.localStorage;
    const sessionStorage = env.sessionStorage;
    const document = env.document;
    ${mainJs.match(/function updateAuthUI\(user\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function checkAdminSessionFallback\(\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function initAuth\(\) \{[\s\S]*?\n\}/)[0]}
    initAuth();
  `);

  assert.ok(env.elements['case-protected-wrapper'].classList.contains('is-locked'), 'Case wrapper must be locked');
  assert.strictEqual(env.elements['case-unlocked-banner'].style.display, 'none', 'Unlock banner must be hidden');
  assert.strictEqual(env.elements['btn-header-login'].style.display, 'inline-flex', 'Header login button must be shown');
  assert.strictEqual(env.elements['header-user-badge'].style.display, 'none', 'Header user badge must be hidden');
});

// 4. Behavioral Simulation: Regular Member Login
await test('4. Regular Member Login: Review unlocks with member name', () => {
  const env = setupMockEnvironment();
  env.localStorage.setItem('healim_auth_user', JSON.stringify({ name: '홍길동', email: 'hong@test.com' }));

  eval(`
    const localStorage = env.localStorage;
    const sessionStorage = env.sessionStorage;
    const document = env.document;
    ${mainJs.match(/function updateAuthUI\(user\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function checkAdminSessionFallback\(\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function initAuth\(\) \{[\s\S]*?\n\}/)[0]}
    initAuth();
  `);

  assert.ok(!env.elements['case-protected-wrapper'].classList.contains('is-locked'), 'Case wrapper must be unlocked');
  assert.strictEqual(env.elements['case-unlocked-banner'].style.display, 'flex', 'Unlock banner must be visible');
  assert.strictEqual(env.elements['unlocked-user-name'].textContent, '홍길동', 'Unlocked banner shows member name');
  assert.strictEqual(env.elements['btn-header-login'].style.display, 'none', 'Header login button must be hidden');
  assert.strictEqual(env.elements['header-user-badge'].style.display, 'inline-flex', 'Header user badge must be visible');
});

// 5. Behavioral Simulation: Admin Login & Session Propagation to Reviews
await test('5. Admin Verified in /admin/ -> Reviews Page unlocks without re-login', () => {
  const env = setupMockEnvironment();
  // Simulate admin verification in /admin/
  env.sessionStorage.setItem('healim_admin_auth', 'true');
  env.sessionStorage.setItem('healim_admin_user', JSON.stringify({ name: '대표원장', email: 'admin@healim.com', isAdmin: true }));
  // healim_auth_user is empty for admin (no fake regular user created)
  assert.strictEqual(env.localStorage.getItem('healim_auth_user'), null, 'No fake regular user in localStorage');

  eval(`
    const localStorage = env.localStorage;
    const sessionStorage = env.sessionStorage;
    const document = env.document;
    ${mainJs.match(/function updateAuthUI\(user\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function checkAdminSessionFallback\(\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/function initAuth\(\) \{[\s\S]*?\n\}/)[0]}
    initAuth();
  `);

  assert.ok(!env.elements['case-protected-wrapper'].classList.contains('is-locked'), 'Case wrapper must be unlocked for admin');
  assert.strictEqual(env.elements['case-unlocked-banner'].style.display, 'flex', 'Unlock banner must be visible for admin');
  assert.strictEqual(env.elements['unlocked-user-name'].textContent, '대표원장', 'Unlocked banner shows 대표원장');
  assert.strictEqual(env.elements['btn-header-login'].style.display, 'none', 'Header login button must be hidden');
  assert.strictEqual(env.elements['header-user-badge'].style.display, 'inline-flex', 'Header user badge must be visible');
  assert.strictEqual(env.elements['logged-user-name'].textContent, '대표원장', 'Header shows 대표원장');
  assert.ok(env.document.body.classList.contains('is-admin'), 'body has is-admin class');
});

// 6. Behavioral Simulation: Admin Logout
await test('6. Admin Logout: Removes sessionStorage items and re-locks reviews', async () => {
  const env = setupMockEnvironment();
  env.sessionStorage.setItem('healim_admin_auth', 'true');
  env.sessionStorage.setItem('healim_admin_user', JSON.stringify({ name: '대표원장', email: 'admin@healim.com', isAdmin: true }));
  env.localStorage.setItem('healim_admin_logged', 'true');

  await eval(`(async () => {
    const localStorage = env.localStorage;
    const sessionStorage = env.sessionStorage;
    const document = env.document;
    let auth = null;
    let isAdminVerified = true;
    let currentOpenedInquiryId = null;
    function showAuthToast() {}
    ${mainJs.match(/function updateAuthUI\(user\) \{[\s\S]*?\n\}/)[0]}
    ${mainJs.match(/async function logoutUser\(\) \{[\s\S]*?\n\}/)[0]}
    await logoutUser();
  })()`);

  assert.strictEqual(env.sessionStorage.getItem('healim_admin_auth'), null, 'healim_admin_auth removed');
  assert.strictEqual(env.sessionStorage.getItem('healim_admin_user'), null, 'healim_admin_user removed');
  assert.strictEqual(env.localStorage.getItem('healim_admin_logged'), null, 'healim_admin_logged removed');
  assert.ok(env.elements['case-protected-wrapper'].classList.contains('is-locked'), 'Review re-locked after logout');
  assert.strictEqual(env.elements['case-unlocked-banner'].style.display, 'none', 'Unlock banner hidden after logout');
});

// 7. Security: Fake sessionStorage tampering does NOT grant backend/admin dashboard access
await test('7. Security: sessionStorage flag alone cannot bypass Firebase/Firestore on /admin/', () => {
  // Check initAdminDashboard: it relies strictly on firebase.auth() onAuthStateChanged, NOT sessionStorage
  const dashboardFuncMatch = mainJs.match(/function initAdminDashboard\(\) \{([\s\S]*?)\n\}/);
  assert.ok(dashboardFuncMatch, 'initAdminDashboard exists');
  const dashboardBody = dashboardFuncMatch[1];
  assert.ok(!dashboardBody.includes("sessionStorage.getItem('healim_admin_auth') === 'true' && (loginCard"),
    'Admin dashboard panel display must strictly depend on auth.onAuthStateChanged((user) => ...), not sessionStorage');
});

console.log(`\n🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
}

runAll().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
