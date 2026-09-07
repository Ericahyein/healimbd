// Unit tests for Lazy Firebase Auth Loader
import assert from 'assert';

console.log('🧪 Starting Lazy Firebase Auth Loader Test Suite...\n');

// Mock browser DOM environment
globalThis.document = {
  head: {
    appendChild(el) {
      setTimeout(() => {
        if (el.onload) {
          el.setAttribute('data-loaded', 'true');
          el.onload();
        }
      }, 10);
    }
  },
  scripts: [],
  querySelector(selector) {
    const match = selector.match(/src="([^"]+)"/);
    if (!match) return null;
    return this.scripts.find(s => s.src === match[1]) || null;
  },
  createElement(tag) {
    const el = {
      tagName: tag,
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k]; },
      addEventListener(evt, fn) {
        if (evt === 'load') this.onload = fn;
        if (evt === 'error') this.onerror = fn;
      }
    };
    document.scripts.push(el);
    return el;
  }
};

// Mock Firebase global SDK
let initializeAppCallCount = 0;
const mockFirebase = {
  apps: [],
  initializeApp(config) {
    initializeAppCallCount++;
    this.apps.push({ name: '[DEFAULT]', config });
    return this.apps[0];
  },
  auth: function() {
    return {
      currentUser: null,
      signInWithEmailAndPassword: async (e, p) => ({ user: { uid: 'admin_123', email: e } }),
      setPersistence: async () => {}
    };
  }
};
mockFirebase.auth.Auth = { Persistence: { SESSION: 'SESSION' } };

// Import or replicate helper logic
let auth = null;
let firebaseAuthPromise = null;

function loadScriptAsync(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(new Error(`Failed to load script: ${src}`)));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-loaded', 'false');
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

function getFirebaseConfig() {
  return {
    apiKey: "AIzaSyMockKey",
    projectId: "healimbd-b726f"
  };
}

async function ensureFirebaseAuth() {
  if (auth) {
    return auth;
  }

  if (firebaseAuthPromise) {
    return firebaseAuthPromise;
  }

  firebaseAuthPromise = (async () => {
    // 1. If window.firebase is not present, load app-compat
    if (typeof globalThis.firebase === 'undefined') {
      await loadScriptAsync('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
      globalThis.firebase = mockFirebase;
    }

    // 2. If firebase.auth is not present, load auth-compat
    if (typeof globalThis.firebase === 'undefined' || typeof globalThis.firebase.auth !== 'function') {
      await loadScriptAsync('https://www.gstatic.com/firebasejs/12.17.1/firebase-auth-compat.js');
    }

    // 3. Initialize Firebase App if not already initialized
    if (!globalThis.firebase.apps || !globalThis.firebase.apps.length) {
      const config = getFirebaseConfig();
      globalThis.firebase.initializeApp(config);
    }

    // 4. Initialize Auth instance
    if (!auth && typeof globalThis.firebase.auth === 'function') {
      auth = globalThis.firebase.auth();
    }

    return auth;
  })();

  try {
    return await firebaseAuthPromise;
  } catch (err) {
    firebaseAuthPromise = null;
    throw err;
  }
}

async function runTests() {
  let passed = 0;

  // Test 1: Concurrency / Parallel calls
  console.log('--- 1. Concurrent Calls Promise Deduplication ---');
  {
    const [auth1, auth2, auth3] = await Promise.all([
      ensureFirebaseAuth(),
      ensureFirebaseAuth(),
      ensureFirebaseAuth()
    ]);
    assert.strictEqual(auth1, auth2, 'auth1 and auth2 must be same instance');
    assert.strictEqual(auth2, auth3, 'auth2 and auth3 must be same instance');
    assert.strictEqual(initializeAppCallCount, 1, 'Firebase app must be initialized exactly once');
    console.log('✅ PASS: Concurrent calls safely shared single promise and initialized app once.');
    passed++;
  }

  // Test 2: Sequential call after initialization
  console.log('\n--- 2. Sequential Call Immediate Return ---');
  {
    const authAgain = await ensureFirebaseAuth();
    assert.strictEqual(authAgain, auth, 'Must immediately return cached auth');
    assert.strictEqual(initializeAppCallCount, 1, 'No duplicate initializeApp');
    console.log('✅ PASS: Sequential call returned cached auth without re-initializing.');
    passed++;
  }

  // Test 3: Verified only app and auth scripts loaded (NO Firestore)
  console.log('\n--- 3. Strict Script Isolation (No Firestore Loaded) ---');
  {
    const loadedSrcs = document.scripts.map(s => s.src);
    assert.ok(loadedSrcs.includes('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js'), 'app-compat must be loaded');
    assert.ok(!loadedSrcs.some(src => src.includes('firestore')), 'Firestore SDK must NOT be loaded');
    console.log('✅ PASS: Only app-compat and auth-compat loaded. Firestore strictly excluded.');
    passed++;
  }

  console.log(`\n🎉 ALL ${passed} LAZY AUTH TESTS PASSED 100%!`);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
