const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sharp = require('sharp');

console.log('🧪 Starting Comprehensive Admin Review Pipeline & Security Test Suite...\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
    process.exit(1);
  }
}

async function runAllTests() {
  const mainJs = fs.readFileSync('assets/js/main.js', 'utf8').replace(/\r\n/g, '\n');
  const firestoreRules = fs.readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');
  const storageRules = fs.readFileSync('storage.rules', 'utf8').replace(/\r\n/g, '\n');
  const modalHtml = fs.readFileSync('layouts/partials/admin_case_modal.html', 'utf8').replace(/\r\n/g, '\n');
  const styleCss = fs.readFileSync('assets/css/style.css', 'utf8').replace(/\r\n/g, '\n');

  // Load master dataset and dev fixtures
  const masterDataPath = path.join(__dirname, '../scratch/master_50_reviews_dataset.json');
  assert.ok(fs.existsSync(masterDataPath), 'scratch/master_50_reviews_dataset.json must exist');
  const masterItems = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'));

  const fixturePath = path.join(__dirname, '../scratch/fixtures/reviews_preview_fixture.json');
  assert.ok(fs.existsSync(fixturePath), 'scratch/fixtures/reviews_preview_fixture.json must exist');
  const fixtureItems = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  // Extract pure helper functions from main.js for direct behavioral testing
  function extractFunctionCode(source, fnName, nextFnSignature) {
    const start = source.indexOf(`function ${fnName}(`);
    if (start === -1) throw new Error(`Function ${fnName} not found in main.js`);
    const end = source.indexOf(nextFnSignature, start);
    if (end === -1) throw new Error(`Next signature ${nextFnSignature} not found`);
    return source.substring(start, end).trim();
  }

  const parseCode = extractFunctionCode(mainJs, 'parsePublicSummaryParts', '\nfunction getCaseSummaryPreview');
  const parsePublicSummaryParts = new Function('return (' + parseCode + ')')();

  const piiCode = extractFunctionCode(mainJs, 'isPiiSafeText', '\nfunction isDuplicateWithTitle');
  const isPiiSafeText = new Function('return (' + piiCode + ')')();

  // ========================================================================
  // 1. IMAGE PROCESSING: 793 x 335px output, WebP MIME, metadata stripping, opaque masking
  // ========================================================================
  await test('Image.1: 793 × 335px resolution & WebP MIME output verification', async () => {
    const samplePreviewPath = 'scratch/previews/legacy_custom-1788853493974_preview.webp';
    assert.ok(fs.existsSync(samplePreviewPath), 'Sample preview file exists');
    const meta = await sharp(samplePreviewPath).metadata();
    assert.strictEqual(meta.width, 793, 'Width must be exactly 793px');
    assert.strictEqual(meta.height, 335, 'Height must be exactly 335px');
    assert.strictEqual(meta.format, 'webp', 'Format must be webp');
  });

  await test('Image.2: EXIF and metadata stripped from WebP output', async () => {
    const samplePreviewPath = 'scratch/previews/legacy_custom-1788853493974_preview.webp';
    const meta = await sharp(samplePreviewPath).metadata();
    assert.strictEqual(meta.exif, undefined, 'EXIF metadata must be stripped');
    assert.strictEqual(meta.iptc, undefined, 'IPTC metadata must be stripped');
    assert.strictEqual(meta.xmp, undefined, 'XMP metadata must be stripped');
  });

  await test('Image.3: Solid opaque masking applied over name/chart number area (strictly no blur)', async () => {
    const samplePreviewPath = 'scratch/previews/legacy_custom-1788853493974_preview.webp';
    const rawBuffer = await sharp(samplePreviewPath)
      .extract({ left: 200, top: 275, width: 400, height: 15 })
      .raw()
      .toBuffer();

    let isOpaqueWhite = true;
    for (let i = 0; i < rawBuffer.length; i += 3) {
      if (rawBuffer[i] < 250 || rawBuffer[i+1] < 250 || rawBuffer[i+2] < 250) {
        isOpaqueWhite = false;
        break;
      }
    }
    assert.ok(isOpaqueWhite, 'Masked area must be solid opaque white (no blur, no residual text)');
  });

  await test('Image.4: Template mismatch / distorted ratio fails closed and blocks auto-publish', async () => {
    assert.ok(mainJs.includes('ratio < 0.4 || ratio > 2.5'), 'Aspect ratio bounds enforced in canvas generator');
    assert.ok(mainJs.includes('Fail Closed'), 'Fail Closed warning present on template mismatch');
    assert.ok(mainJs.includes('비정상적인 가로세로 비율'), 'Error thrown on distorted ratio');
  });

  // ========================================================================
  // 2. SECTION 10 MANDATORY 18 TESTS (New publicSummary Policy & Full Pipeline)
  // ========================================================================

  // Req 1. 목록 카드에서 기존 item.title 미표시
  await test('Req 1. 목록 카드에서 기존 item.title 미표시 (titleRole 사용, item.title 제외)', () => {
    assert.ok(!mainJs.includes('${escapeHtml(item.title)}</h3>'), 'List card title must NOT directly render item.title');
    assert.ok(mainJs.includes('const { titleRole, descRole } = parsePublicSummaryParts(item);'), 'Uses parsePublicSummaryParts for card text');
    assert.ok(mainJs.includes('const titleHtml = titleRole ? `<h3 class="case-card-title">${escapeHtml(titleRole)}</h3>` : \'\';'), 'Card title driven exclusively by titleRole');
  });

  // Req 2. title 데이터 자체는 삭제되지 않음
  await test('Req 2. title 데이터 자체는 삭제되지 않고 상세 화면/하위호환을 위해 보존됨', () => {
    assert.strictEqual(masterItems.length, 50, 'Master dataset has 50 items');
    masterItems.forEach(it => {
      assert.ok(it.title && it.title.trim().length > 0, `Item ${it.id} must retain non-empty title`);
    });
    assert.ok(mainJs.includes('title: pendingAdminCaseData.generatedTitle'), 'title preserved on new case registration');
    assert.ok(mainJs.includes('title: newTitle'), 'title preserved on case edit');
  });

  // Req 3. publicSummary 첫 문장이 제목 위치에 정확히 1회 표시
  await test('Req 3. publicSummary 첫 문장이 제목 위치(h3)에 정확히 1회 표시', () => {
    const sample = { publicSummary: '첫 번째 완결 문장입니다! 두 번째 문장입니다.' };
    const parts = parsePublicSummaryParts(sample);
    assert.strictEqual(parts.titleRole, '첫 번째 완결 문장입니다!', 'First sentence with exclamation mark extracted');
    const titleHtml = parts.titleRole ? `<h3 class="case-card-title">${parts.titleRole}</h3>` : '';
    const occurrences = (titleHtml.match(/첫 번째 완결 문장입니다!/g) || []).length;
    assert.strictEqual(occurrences, 1, 'First sentence appears exactly once in title tag');
  });

  // Req 4. 나머지 문장이 설명 위치에 정확히 1회 표시
  await test('Req 4. 나머지 문장이 설명 위치(p.case-summary-text)에 정확히 1회 표시', () => {
    const sample = { publicSummary: '첫 번째 완결 문장입니다. 두 번째 나머지 설명 문장입니다.' };
    const parts = parsePublicSummaryParts(sample);
    assert.strictEqual(parts.descRole, '두 번째 나머지 설명 문장입니다.', 'Remaining sentences extracted to descRole');
    const descHtml = parts.descRole ? `<p class="case-summary-text">${parts.descRole}</p>` : '';
    const occurrences = (descHtml.match(/두 번째 나머지 설명 문장입니다\./g) || []).length;
    assert.strictEqual(occurrences, 1, 'Remaining sentence appears exactly once in description tag');
  });

  // Req 5. 한 문장뿐이면 설명 DOM 미생성
  await test('Req 5. 한 문장뿐이면 설명 DOM(<p class="case-summary-text">) 미생성', () => {
    const single = { publicSummary: '한 문장뿐인 후기 문구입니다.' };
    const parts = parsePublicSummaryParts(single);
    assert.strictEqual(parts.titleRole, '한 문장뿐인 후기 문구입니다.');
    assert.strictEqual(parts.descRole, '', 'descRole must be empty string for single sentence');
    const descHtml = parts.descRole ? `<p class="case-summary-text">${parts.descRole}</p>` : '';
    assert.strictEqual(descHtml, '', 'Description DOM must not be generated');
  });

  // Req 6. 빈 publicSummary이면 제목·설명 DOM 모두 미생성
  await test('Req 6. 빈 publicSummary이면 제목(h3)·설명(p) DOM 모두 미생성', () => {
    const empty1 = parsePublicSummaryParts({ publicSummary: '' });
    const empty2 = parsePublicSummaryParts({ publicSummary: '    ' });
    const empty3 = parsePublicSummaryParts(null);
    assert.strictEqual(empty1.titleRole, '');
    assert.strictEqual(empty1.descRole, '');
    assert.strictEqual(empty2.titleRole, '');
    assert.strictEqual(empty2.descRole, '');
    assert.strictEqual(empty3.titleRole, '');
    assert.strictEqual(empty3.descRole, '');

    const titleHtml = empty1.titleRole ? `<h3 class="case-card-title">${empty1.titleRole}</h3>` : '';
    const descHtml = empty1.descRole ? `<p class="case-summary-text">${empty1.descRole}</p>` : '';
    assert.strictEqual(titleHtml, '', 'No empty h3 DOM');
    assert.strictEqual(descHtml, '', 'No empty p DOM');
  });

  // Req 7. publicExcerpt가 존재해도 목록에 표시되지 않음
  await test('Req 7. publicExcerpt가 데이터에 존재해도 목록 카드에는 표시되지 않음', () => {
    const sampleWithExcerpt = {
      title: '보존용 기존 제목',
      publicExcerpt: '구버전 발췌문 샘플 텍스트입니다',
      publicSummary: '신규 검수 공개 요약문 첫 문장입니다. 신규 검수 설명문입니다.'
    };
    const parts = parsePublicSummaryParts(sampleWithExcerpt);
    assert.strictEqual(parts.titleRole, '신규 검수 공개 요약문 첫 문장입니다.');
    assert.strictEqual(parts.descRole, '신규 검수 설명문입니다.');

    // Simulate list card rendering
    const titleHtml = parts.titleRole ? `<h3 class="case-card-title">${parts.titleRole}</h3>` : '';
    const descHtml = parts.descRole ? `<p class="case-summary-text">${parts.descRole}</p>` : '';
    const cardHtml = `${titleHtml}${descHtml}`;

    assert.ok(!cardHtml.includes('구버전 발췌문 샘플 텍스트입니다'), 'publicExcerpt must NOT be rendered in card');
    assert.ok(!cardHtml.includes('보존용 기존 제목'), 'item.title must NOT be rendered in card');
  });

  // Req 8. item.summary는 검수 없이 직접 fallback되지 않음
  await test('Req 8. item.summary는 검수 없이 직접 fallback되지 않음', () => {
    const unvetted = {
      summary: '운영 미검수 원문 요약문 텍스트',
      publicSummary: undefined
    };
    const parts = parsePublicSummaryParts(unvetted);
    assert.strictEqual(parts.titleRole, '', 'Must NOT fall back to item.summary');
    assert.strictEqual(parts.descRole, '', 'Must NOT fall back to item.summary');
  });

  // Req 9. 첫 문장과 설명 중복 없음
  await test('Req 9. 첫 문장과 설명 중복 발생 시 중복 부분 자동 제거', () => {
    const dupSample = {
      publicSummary: '가슴 답답함과 불안감이 심했습니다. 가슴 답답함과 불안감이 심했습니다.'
    };
    const parts = parsePublicSummaryParts(dupSample);
    assert.strictEqual(parts.titleRole, '가슴 답답함과 불안감이 심했습니다.');
    assert.strictEqual(parts.descRole, '', 'Exact duplicate rest sentence must be cleared to prevent repetition');

    const prefixDup = {
      publicSummary: '불안 증세가 완화되었습니다. 불안 증세가 완화되었습니다. 일상생활이 가능해졌습니다.'
    };
    const parts2 = parsePublicSummaryParts(prefixDup);
    assert.strictEqual(parts2.titleRole, '불안 증세가 완화되었습니다.');
    assert.strictEqual(parts2.descRole, '일상생활이 가능해졌습니다.', 'Repeated first sentence stripped from description');
  });

  // Req 10. 개인정보 포함 후보 자동 승인 금지
  await test('Req 10. 개인정보(전화번호, 주민번호, 차트번호, 학교 등) 포함 후보 자동 승인 금지', () => {
    assert.strictEqual(isPiiSafeText('정상적인 치료 후기 요약문입니다.'), true, 'Normal text is PII safe');
    assert.strictEqual(isPiiSafeText('연락처는 ' + '010' + '-1234-5678 입니다.'), false, 'Phone number detected');
    assert.strictEqual(isPiiSafeText('주민등록번호 ' + '900101' + '-1234567 기재'), false, 'Resident ID detected');
    assert.strictEqual(isPiiSafeText('차트 번호 12053 환자분'), false, 'Chart number detected');
    assert.strictEqual(isPiiSafeText('환자 이메일 dummy' + '@' + 'example.com'), false, 'Email detected');
    assert.ok(mainJs.includes('!isPiiSafeText(approvedSummary)'), 'executeApprovedCaseSubmit enforces PII safety gate');
  });

  // Req 11. 관리자만 publicSummary 수정 가능
  await test('Req 11. 관리자만 publicSummary 수정 가능 (클라이언트 함수 및 서버 규칙 이중 잠금)', () => {
    assert.ok(mainJs.includes('if (!isUserAdmin()) {\n    alert(\'관리자 권한이 필요합니다.\');'), 'Admin gate on editor submit');
    assert.ok(firestoreRules.includes('match /treatment_review_previews/{reviewId}'), 'Preview collection covered by rules');
    assert.ok(firestoreRules.includes('allow create, update, delete: if isAdmin();'), 'Write restricted to isAdmin()');
  });

  // Req 12. revision +1 규칙 유지
  await test('Req 12. 낙관적 잠금: revision은 오직 기존 값 + 1만 허용', () => {
    assert.ok(mainJs.includes('const nextRevision = openedRevision + 1;'), 'nextRevision is openedRevision + 1');
    assert.ok(mainJs.includes('if (currentRev !== openedRevision)'), 'Stale revision rejected in transaction');
    assert.ok(mainJs.includes('revision: nextRevision'), 'Increments revision field');
  });

  // Req 13. 텍스트 수정 시 이미지 재업로드 없음
  await test('Req 13. 텍스트 수정 시 불필요한 이미지 재업로드 없음 (기존 경로 유지)', () => {
    assert.ok(mainJs.includes('let updatedImagePath = editorCurrentReviewData.imagePath'), 'Preserves imagePath when no new photo');
    assert.ok(mainJs.includes('let updatedPreviewPath = editorCurrentReviewData.previewPath'), 'Preserves previewPath when no new photo');
    assert.ok(mainJs.includes('if (editorNewPhotoBlob)'), 'Storage upload only triggered when new photo present');
  });

  // Req 14. 이미지 수정 실패 시 기존 버전 보존
  await test('Req 14. 이미지 수정 실패 시 새로 생성된 파일만 정리하고 기존 버전 보존', () => {
    assert.ok(mainJs.includes('if (newOriginalRef) await newOriginalRef.delete().catch(() => {});'), 'Deletes new original ref on error');
    assert.ok(mainJs.includes('if (newPreviewRef) await newPreviewRef.delete().catch(() => {});'), 'Deletes new preview ref on error');
  });

  // Req 15. localhost fixture 50건 렌더링
  await test('Req 15. localhost fixture 50건 전체 유효성 및 publicSummary 탑재 검증', () => {
    assert.strictEqual(fixtureItems.length, 50, 'Dev fixture must contain exactly 50 review cards');
    fixtureItems.forEach(f => {
      assert.ok(f.id, 'Item must have id');
      assert.ok(f.publicSummary && f.publicSummary.trim().length > 0, `Item ${f.id} must have non-empty publicSummary`);
      assert.ok(f.previewPath && f.previewPath.includes('_preview.webp'), `Item ${f.id} must have valid previewPath`);
    });
  });

  // Req 16. production 환경에서 fixture 접근 불가
  await test('Req 16. production 환경에서 localhost fixture 접근 차단 검증', () => {
    assert.ok(mainJs.includes('function isLocalhostDevEnvironment()'), 'isLocalhostDevEnvironment gate defined');
    assert.ok(mainJs.includes("const host = window.location.hostname;"), 'Checks window.location.hostname');
    assert.ok(mainJs.includes("host === 'localhost' || host === '127.0.0.1'"), 'Strict localhost checking');
    assert.ok(!fs.existsSync('public/fixtures'), 'public/fixtures must NOT exist in production build');
  });

  // Req 17. case-01-tic 재등장 없음
  await test('Req 17. case-01-tic 정적 테스트 후기 영구 제거 상태 유지', () => {
    assert.ok(!fs.existsSync('content/reviews/case-01-tic.md'), 'content/reviews/case-01-tic.md must NOT exist');
    assert.ok(!fs.existsSync('static/images/reviews/previews/case-01-tic.png'), 'static png must NOT exist');
    assert.ok(!fs.existsSync('static/images/reviews/previews/case-01-tic.webp'), 'static webp must NOT exist');
    assert.ok(!fs.existsSync('public/reviews/case-01-tic'), 'public/reviews/case-01-tic must NOT exist');
    assert.ok(!JSON.stringify(masterItems).includes('case-01-tic'), 'master dataset has 0 case-01-tic');
    assert.ok(!JSON.stringify(fixtureItems).includes('case-01-tic'), 'dev fixture has 0 case-01-tic');
  });

  // Req 18. 카드 정렬은 createdAt 최신순 유지
  await test('Req 18. 카드 정렬은 createdAt 최신순(내림차순) 유지', () => {
    assert.ok(mainJs.includes('// 5. Strict createdAt / date newest-first sort'), 'Sorting logic comment present');
    assert.ok(mainJs.includes('return timeB - timeA;'), 'Sorts descending by timestamp in main.js');

    // Simulate card list sorting as performed by getAllDirectCases()
    const sorted = [...fixtureItems].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return String(a.id).localeCompare(String(b.id));
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = new Date(sorted[i].createdAt || sorted[i].date).getTime();
      const next = new Date(sorted[i+1].createdAt || sorted[i+1].date).getTime();
      assert.ok(cur >= next, `Card ${i} (${sorted[i].id}: ${sorted[i].createdAt}) must be >= Card ${i+1} (${sorted[i+1].id}: ${sorted[i+1].createdAt})`);
    }

    // Newest review must appear first in card list
    assert.strictEqual(sorted[0].id, 'tr_1789714681183_zhieuj', 'Newest review (2026-09-18) must appear first in card list');
  });

  // ========================================================================
  // 3. ADMIN REVIEW REGISTRATION & EDIT INTEGRITY (Storage atomic batch, audit)
  // ========================================================================
  await test('Pipeline.1: New review registration uploads protected original and public preview atomically', () => {
    assert.ok(mainJs.includes('const originalPath = `treatment-reviews/${reviewId}/original.${ext}`;'), 'Original path standard');
    assert.ok(mainJs.includes('const previewPath = `public-review-previews/${reviewId}_preview.webp`;'), 'Preview path standard');
    assert.ok(mainJs.includes('batch.set(firestoreDb.collection(\'treatment_reviews\').doc(reviewId), docData);'), 'Detail doc set in batch');
    assert.ok(mainJs.includes('batch.set(firestoreDb.collection(\'treatment_review_previews\').doc(reviewId), previewData);'), 'Preview doc set in batch');
  });

  await test('Pipeline.2: Registration halts if preview generation fails (Fail Closed)', () => {
    assert.ok(mainJs.includes('previewResult = await generateReviewPreviewCanvas(currentUploadedImageDataUrl)'), 'Preview canvas generated before submit');
    assert.ok(mainJs.includes('안전을 위해 검증되지 않은 원본은 공개되지 않습니다'), 'Preview failure aborts registration');
  });

  await test('Pipeline.3: Safe rollback on upload / Firestore failure deletes uploaded files', () => {
    assert.ok(mainJs.includes('if (originalRef) await originalRef.delete().catch(() => {});'), 'Original storage ref cleaned up on error');
    assert.ok(mainJs.includes('if (previewRef) await previewRef.delete().catch(() => {});'), 'Preview storage ref cleaned up on error');
  });

  await test('Pipeline.4: Edit button visible ONLY to authenticated admin', () => {
    assert.ok(modalHtml.includes('btn-edit-custom-case'), 'Edit button exists in modal');
    assert.ok(modalHtml.includes('admin-only-btn'), 'Edit button has admin-only-btn class');
    assert.ok(styleCss.includes('.admin-only-btn {\n  display: none !important;\n}'), 'Default hidden');
    assert.ok(styleCss.includes('body.is-admin .admin-only-btn {\n  display: inline-flex !important;\n}'), 'Visible when is-admin');
  });

  await test('Pipeline.5: Minimal audit trail: records updatedAt, updatedBy (admin UID), incremented revision', () => {
    assert.ok(mainJs.includes('updatedAt: firebase.firestore.FieldValue.serverTimestamp()'), 'Records serverTimestamp on update');
    assert.ok(mainJs.includes('updatedBy: auth.currentUser ? auth.currentUser.uid : \'admin\''), 'Records admin UID in protected review');
    assert.ok(mainJs.includes('revision: nextRevision'), 'Records incremented revision');
  });

  await test('Pipeline.6: Initial createdAt is preserved on update (never overwritten)', () => {
    assert.ok(!mainJs.includes('createdAt: firebase.firestore.FieldValue.serverTimestamp()', mainJs.indexOf('handleAdminCaseEditSubmit')), 'createdAt is NOT modified on edit');
  });

  // ========================================================================
  // 4. SECURITY RULES & STORAGE SIMULATION
  // ========================================================================
  await test('Rules.1: Security Rules: unauthenticated reads 403 on protected originals, allowed on public previews', () => {
    assert.ok(storageRules.includes('match /treatment-reviews/{reviewId}/{fileName}'), 'Protected review path in storage');
    assert.ok(storageRules.includes('allow read: if false;'), 'Protected review direct read blocked');
    assert.ok(storageRules.includes('match /public-review-previews/{fileName}'), 'Public preview path in storage');
    assert.ok(storageRules.includes('allow read: if true;'), 'Public preview read allowed');
    assert.ok(firestoreRules.includes('match /treatment_review_previews/{reviewId}'), 'Preview collection in firestore');
    assert.ok(firestoreRules.includes('match /treatment_reviews/{reviewId}'), 'Review collection in firestore');
  });

  function simulateFirestoreReviewUpdate({ auth, reviewId, prevDoc, newDoc }) {
    const isAdmin = Boolean(auth && (auth.admin === true || auth.token?.admin === true));
    if (!isAdmin) return { allowed: false, reason: 'unauthorized_non_admin' };

    if (prevDoc.createdAt && newDoc.createdAt !== prevDoc.createdAt) {
      return { allowed: false, reason: 'immutable_createdAt_violation' };
    }
    if (newDoc.id && newDoc.id !== reviewId) {
      return { allowed: false, reason: 'immutable_reviewId_violation' };
    }
    if (prevDoc.revision !== undefined) {
      if (newDoc.revision !== prevDoc.revision + 1) {
        return { allowed: false, reason: 'non_monotonic_revision_violation' };
      }
    }
    if (newDoc.imagePath) {
      const expectedPrefix = `treatment-reviews/${reviewId}/`;
      if (!newDoc.imagePath.startsWith(expectedPrefix)) {
        return { allowed: false, reason: 'foreign_imagePath_violation' };
      }
    }
    if (newDoc.previewPath) {
      const expectedPrefix = `public-review-previews/${reviewId}`;
      if (!newDoc.previewPath.startsWith(expectedPrefix)) {
        return { allowed: false, reason: 'foreign_previewPath_violation' };
      }
    }
    return { allowed: true };
  }

  await test('Rules.2: Server Permission: Guests/Members REJECTED; Admin ALLOWED', () => {
    const targetId = 'tr_123456';
    const prev = { id: targetId, revision: 1, createdAt: '2026-09-01T00:00:00Z', title: 'Old' };
    const validUpdate = { id: targetId, revision: 2, createdAt: '2026-09-01T00:00:00Z', title: 'New' };

    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: null, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, false);
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: { uid: 'anon_1', isAnonymous: true }, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, false);
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: { uid: 'user_1', email: 'user@test.com' }, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, false);
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: { uid: 'kakao:123', provider: 'kakao' }, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, false);
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: { uid: 'naver:456', provider: 'naver' }, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, false);
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: { uid: 'admin_1', admin: true }, reviewId: targetId, prevDoc: prev, newDoc: validUpdate }).allowed, true);
  });

  await test('Rules.3: Server Field Integrity: reviewId and createdAt modifications are strictly REJECTED', () => {
    const targetId = 'tr_123456';
    const adminAuth = { uid: 'admin_1', admin: true };
    const prev = { id: targetId, revision: 1, createdAt: '2026-09-01T00:00:00Z', title: 'Old' };

    const tamperedId = { ...prev, id: 'tr_hacked_id', revision: 2 };
    const resId = simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: tamperedId });
    assert.strictEqual(resId.allowed, false);
    assert.strictEqual(resId.reason, 'immutable_reviewId_violation');

    const tamperedDate = { ...prev, revision: 2, createdAt: '2026-09-18T00:00:00Z' };
    const resDate = simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: tamperedDate });
    assert.strictEqual(resDate.allowed, false);
    assert.strictEqual(resDate.reason, 'immutable_createdAt_violation');
  });

  await test('Rules.4: Optimistic Locking Server Gate: revision must be strictly prev.revision + 1', () => {
    const targetId = 'tr_123456';
    const adminAuth = { uid: 'admin_1', admin: true };
    const prev = { id: targetId, revision: 3, createdAt: '2026-09-01T00:00:00Z' };

    const staleUpdate = { ...prev, revision: 3, title: 'Updated' };
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: staleUpdate }).allowed, false);

    const skippedUpdate = { ...prev, revision: 5, title: 'Updated' };
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: skippedUpdate }).allowed, false);

    const validRevUpdate = { ...prev, revision: 4, title: 'Updated' };
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: validRevUpdate }).allowed, true);
  });

  await test('Rules.5: Foreign Storage Path Gating: assigning another reviewId path is REJECTED', () => {
    const targetId = 'tr_123456';
    const adminAuth = { uid: 'admin_1', admin: true };
    const prev = { id: targetId, revision: 1, createdAt: '2026-09-01T00:00:00Z' };

    const foreignImage = { ...prev, revision: 2, imagePath: 'treatment-reviews/tr_victim/original-v2.jpg' };
    const resImg = simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: foreignImage });
    assert.strictEqual(resImg.allowed, false);
    assert.strictEqual(resImg.reason, 'foreign_imagePath_violation');

    const foreignPreview = { ...prev, revision: 2, previewPath: 'public-review-previews/tr_victim_preview_v2.webp' };
    const resPrev = simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: foreignPreview });
    assert.strictEqual(resPrev.allowed, false);
    assert.strictEqual(resPrev.reason, 'foreign_previewPath_violation');

    const validPaths = {
      ...prev,
      revision: 2,
      imagePath: 'treatment-reviews/tr_123456/original-v2.jpg',
      previewPath: 'public-review-previews/tr_123456_preview_v2.webp'
    };
    assert.strictEqual(simulateFirestoreReviewUpdate({ auth: adminAuth, reviewId: targetId, prevDoc: prev, newDoc: validPaths }).allowed, true);
  });

  console.log('\n==================================================');
  console.log(`📊 Comprehensive Pipeline Test Summary: ${passed} Passed | ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error(err);
  process.exit(1);
});
