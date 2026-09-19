const fs = require('fs');
const path = require('path');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-healimbd-rules-test';
let testEnv;

describe('Healim Firebase Rules Emulator Verification', () => {
  before(async () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const storageRules = fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf-8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: firestoreRules,
        host: '127.0.0.1',
        port: 8080
      },
      storage: {
        rules: storageRules,
        host: '127.0.0.1',
        port: 9199
      }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
      await testEnv.clearStorage();
    }
  });

  // ==========================================================================
  // 1. FIRESTORE: treatment_reviews (Protected Patient Details)
  // ==========================================================================
  describe('Firestore: treatment_reviews/{reviewId}', () => {
    beforeEach(async () => {
      // Seed sample review doc as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('treatment_reviews').doc('tr_mock_rules_test').set({
          title: '[소아 틱장애] 임상 사례',
          category: 'tic',
          answers: { q1: '환자 초기 증상...', q2: '호전 경과...', q3: '환자 격려...' },
          createdAt: new Date()
        });
      });
    });

    test('Scenario 1 [Guest]: Unauthenticated user CANNOT read protected review', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();
      await assertFails(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 2 [localStorage forgery]: Client without valid Firebase token CANNOT read', async () => {
      // localStorage modification only sets browser storage, not request.auth
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();
      await assertFails(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 3 [Anonymous User]: Anonymous Firebase Auth user CANNOT read', async () => {
      const anonContext = testEnv.authenticatedContext('anon-user-123', {
        firebase: { sign_in_provider: 'anonymous' }
      });
      const db = anonContext.firestore();
      await assertFails(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 4 [Email Member]: Authenticated non-anonymous user CAN read review', async () => {
      const memberContext = testEnv.authenticatedContext('email-user-456', {
        email: 'patient@example.com',
        firebase: { sign_in_provider: 'password' }
      });
      const db = memberContext.firestore();
      await assertSucceeds(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 5 [Kakao Member]: Authenticated Kakao custom token user CAN read review', async () => {
      const kakaoContext = testEnv.authenticatedContext('kakao:999888777', {
        firebase: { sign_in_provider: 'custom' }
      });
      const db = kakaoContext.firestore();
      await assertSucceeds(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 5-B [Naver Member]: Authenticated Naver custom token user CAN read review', async () => {
      const naverContext = testEnv.authenticatedContext('naver:1122334455', {
        firebase: { sign_in_provider: 'custom' }
      });
      const db = naverContext.firestore();
      await assertSucceeds(db.collection('treatment_reviews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 6 [Regular Member Write Block]: Regular member CANNOT create/update/delete review', async () => {
      const memberContext = testEnv.authenticatedContext('email-user-456', {
        email: 'patient@example.com',
        firebase: { sign_in_provider: 'password' }
      });
      const db = memberContext.firestore();
      await assertFails(db.collection('treatment_reviews').doc('case-02-new').set({ title: 'hack' }));
      await assertFails(db.collection('treatment_reviews').doc('tr_mock_rules_test').delete());
    });

    test('Scenario 7 [Admin]: Verified Admin CAN write and delete review', async () => {
      const adminContext = testEnv.authenticatedContext('admin-user-001', {
        admin: true,
        firebase: { sign_in_provider: 'password' }
      });
      const db = adminContext.firestore();
      await assertSucceeds(db.collection('treatment_reviews').doc('case-02-new').set({
        title: 'New Case by Admin',
        createdAt: new Date()
      }));
    });
  });

  // ==========================================================================
  // 2. FIRESTORE: treatment_review_previews (Public Catalog)
  // ==========================================================================
  describe('Firestore: treatment_review_previews/{reviewId}', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('treatment_review_previews').doc('tr_mock_rules_test').set({
          title: '[소아 틱장애] 눈 깜빡임과 킁킁거림으로 시작된 임상 사례',
          category: 'tic',
          duration: '총 4개월',
          summary: '7세 무렵 시작된 눈 깜빡임 증상...'
        });
      });
    });

    test('Scenario 8 [Public Catalog Read]: Unauthenticated visitor CAN read catalog previews', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const db = unauthContext.firestore();
      await assertSucceeds(db.collection('treatment_review_previews').doc('tr_mock_rules_test').get());
    });

    test('Scenario 9 [Catalog Write]: Regular user CANNOT write catalog previews, only Admin', async () => {
      const memberContext = testEnv.authenticatedContext('member-123', {
        firebase: { sign_in_provider: 'password' }
      });
      const db = memberContext.firestore();
      await assertFails(db.collection('treatment_review_previews').doc('tr_mock_rules_test').update({ title: 'hack' }));

      const adminContext = testEnv.authenticatedContext('admin-user-001', { admin: true });
      const adminDb = adminContext.firestore();
      await assertSucceeds(adminDb.collection('treatment_review_previews').doc('tr_mock_rules_test').update({ duration: '총 5개월' }));
    });
  });

  // ==========================================================================
  // 3. STORAGE: treatment-reviews/** (Protected Handwriting Photos)
  // ==========================================================================
  describe('Storage: treatment-reviews/{reviewId}/{fileName}', () => {
    const testBytes = Buffer.from('fake-handwriting-image-binary-data');

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const storage = context.storage();
        const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
        await ref.put(testBytes, { contentType: 'image/webp' });
      });
    });

    test('Scenario 10 [Guest]: Unauthenticated user CANNOT read handwriting image', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const storage = unauthContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 11 [Anonymous User]: Anonymous Firebase user CANNOT read handwriting image', async () => {
      const anonContext = testEnv.authenticatedContext('anon-123', {
        firebase: { sign_in_provider: 'anonymous' }
      });
      const storage = anonContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 12 [Email Member Read Block]: Authenticated email member CANNOT read handwriting image directly', async () => {
      const memberContext = testEnv.authenticatedContext('user-456', {
        email: 'user@test.com',
        firebase: { sign_in_provider: 'password' }
      });
      const storage = memberContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 13 [Kakao Member Read Block]: Authenticated Kakao member CANNOT read handwriting image directly', async () => {
      const kakaoContext = testEnv.authenticatedContext('kakao:12345678', {
        firebase: { sign_in_provider: 'custom' }
      });
      const storage = kakaoContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 13-B [Naver Member Read Block]: Authenticated Naver member CANNOT read handwriting image directly', async () => {
      const naverContext = testEnv.authenticatedContext('naver:88776655', {
        firebase: { sign_in_provider: 'custom' }
      });
      const storage = naverContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 13-C [Admin Client Read Block]: Even Admin client CANNOT read handwriting image directly (Stream proxy only)', async () => {
      const adminContext = testEnv.authenticatedContext('admin-001', { admin: true });
      const storage = adminContext.storage();
      const ref = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(ref.getDownloadURL());
    });

    test('Scenario 14 [Member Write Block]: Regular member CANNOT upload/delete handwriting image', async () => {
      const memberContext = testEnv.authenticatedContext('user-456', {
        firebase: { sign_in_provider: 'password' }
      });
      const storage = memberContext.storage();
      const ref = storage.ref('treatment-reviews/case-02-new/hack.png');
      await assertFails(ref.put(testBytes, { contentType: 'image/png' }));
      const existingRef = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertFails(existingRef.delete());
    });

    test('Scenario 15 [Admin Write & Delete]: Verified Admin CAN upload and delete valid handwriting image', async () => {
      const adminContext = testEnv.authenticatedContext('admin-001', { admin: true });
      const storage = adminContext.storage();
      const ref = storage.ref('treatment-reviews/case-02-new/handwriting.webp');
      await assertSucceeds(ref.put(testBytes, { contentType: 'image/webp' }));
      const existingRef = storage.ref('treatment-reviews/tr_mock_rules_test/handwriting.webp');
      await assertSucceeds(existingRef.delete());
    });

    test('Scenario 15-B [Invalid MIME & Oversize Block]: Admin CANNOT upload invalid MIME or oversized file', async () => {
      const adminContext = testEnv.authenticatedContext('admin-001', { admin: true });
      const storage = adminContext.storage();
      const invalidMimeRef = storage.ref('treatment-reviews/case-02-new/script.exe');
      await assertFails(invalidMimeRef.put(testBytes, { contentType: 'text/plain' }));

      const oversizedBytes = Buffer.alloc(21 * 1024 * 1024); // 21MB exceeds 20MB limit
      const oversizedRef = storage.ref('treatment-reviews/case-02-new/giant.jpg');
      await assertFails(oversizedRef.put(oversizedBytes, { contentType: 'image/jpeg' }));
    });
  });

  // ==========================================================================
  // 4. STORAGE: public-review-previews/** (Public Graphic Previews)
  // ==========================================================================
  describe('Storage: public-review-previews/{fileName}', () => {
    const testBytes = Buffer.from('fake-public-badge-image');

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const storage = context.storage();
        const ref = storage.ref('public-review-previews/badge-tic.webp');
        await ref.put(testBytes, { contentType: 'image/webp' });
      });
    });

    test('Scenario 16 [Public Read]: Unauthenticated visitor CAN read public previews', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const storage = unauthContext.storage();
      const ref = storage.ref('public-review-previews/badge-tic.webp');
      await assertSucceeds(ref.getDownloadURL());
    });

    test('Scenario 17 [Public Write]: Regular user CANNOT write public previews, Admin CAN', async () => {
      const memberContext = testEnv.authenticatedContext('user-456', {
        firebase: { sign_in_provider: 'password' }
      });
      const storage = memberContext.storage();
      const ref = storage.ref('public-review-previews/badge-panic.webp');
      await assertFails(ref.put(testBytes, { contentType: 'image/webp' }));

      const adminContext = testEnv.authenticatedContext('admin-001', { admin: true });
      const adminStorage = adminContext.storage();
      const adminRef = adminStorage.ref('public-review-previews/badge-panic.webp');
      await assertSucceeds(adminRef.put(testBytes, { contentType: 'image/webp' }));
    });
  });

  // ==========================================================================
  // 5. STORAGE: Default Deny on All Other Paths
  // ==========================================================================
  describe('Storage: Default Deny /{allPaths=**}', () => {
    test('Scenario 18 [Default Deny]: Arbitrary Storage paths are blocked for all users', async () => {
      const unauthContext = testEnv.unauthenticatedContext();
      const unauthRef = unauthContext.storage().ref('unauthorized-folder/data.json');
      await assertFails(unauthRef.getDownloadURL());

      const adminContext = testEnv.authenticatedContext('admin-001', { admin: true });
      const adminRef = adminContext.storage().ref('unauthorized-folder/data.json');
      await assertFails(adminRef.getDownloadURL());
    });
  });
});
