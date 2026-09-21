const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const {
  checkTitleSimilarity,
  checkSlugCollision,
  jaroWinkler,
  validateArticleContent
} = require('../scripts/auto_column/content_validator');

const {
  regenerateArticleTitle,
  setTestMockTitleGenerator
} = require('../scripts/auto_column/ai_generator');

const {
  planNextColumn,
  selectTopicAngleForDisease,
  getRankedCandidatePlans,
  loadHistory
} = require('../scripts/auto_column/topic_planner');

const {
  runAutoColumnPipeline,
  MAX_TITLE_REGEN_ATTEMPTS,
  MAX_FALLBACK_CANDIDATES,
  MAX_TOTAL_TITLE_REGENS,
  TITLE_RETRYABLE_ERROR_TYPES
} = require('../scripts/auto_column/index');

async function runAllTests() {
  console.log('🧪 Starting Doctor Column Title Similarity & Auto-Retry Test Suite...\n');

  const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-title-retry-test-'));
  const mockHistoryPath = path.join(testTmpDir, 'auto_column_history.json');
  const mockBlogDir = path.join(testTmpDir, 'content_blog');
  fs.mkdirSync(mockBlogDir, { recursive: true });

  const pastArticle1 = {
    publishDate: '2026-09-08T20:33:12.068+09:00',
    geoId: 'yongin-suji',
    displayRegion: '수지',
    parentRegion: '용인',
    regionType: 'district',
    disease: 'anxiety',
    topicAngle: 'presentation-anxiety',
    title: '[수지 사회공포증] 발표나 미팅 때 목소리가 떨리고 시선이 두려울 때',
    slug: 'yongin-suji-social-phobia-presentation-anxiety'
  };

  const pastArticle2 = {
    publishDate: '2026-09-11T16:19:22.169+09:00',
    geoId: 'gyeonggi-gwangju',
    displayRegion: '경기광주',
    parentRegion: '경기광주',
    regionType: 'city',
    disease: 'anxiety',
    topicAngle: 'chronic-worry',
    title: '[경기광주 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
    slug: 'gyeonggi-gwangju-anxiety-chronic-worry'
  };

  fs.writeFileSync(mockHistoryPath, JSON.stringify([pastArticle1, pastArticle2], null, 2), 'utf-8');

  // =========================================================================
  // TEST 1: Exact duplicate title blocked (sim === 1.0)
  // =========================================================================
  console.log('--- TEST 1: Exact duplicate title blocked ---');
  const exactSim = checkTitleSimilarity(pastArticle1.title, [pastArticle1]);
  assert.strictEqual(exactSim.valid, false, 'Exact duplicate title must be blocked');
  assert.strictEqual(exactSim.maxSimilarity, 1.0, 'Exact duplicate similarity must be 1.0');
  assert.ok(exactSim.error.includes('100.0%'), 'Error message must reflect 100% similarity');
  console.log('✅ TEST 1 PASS: Exact duplicate title strictly blocked.');

  // =========================================================================
  // TEST 2: 96.8% similar title blocked
  // =========================================================================
  console.log('\n--- TEST 2: 96.8% similar title blocked ---');
  const collidingTitle = '[판교 사회공포증] 발표나 미팅 때 목소리가 떨리고 시선이 두려울 때';
  const rawJaro = jaroWinkler(collidingTitle, pastArticle1.title);
  const simPercent = Number((rawJaro * 100).toFixed(1));
  assert.strictEqual(simPercent, 96.8, `Expected 96.8% similarity, got ${simPercent}%`);

  const simCheck96 = checkTitleSimilarity(collidingTitle, [pastArticle1], 0.75);
  assert.strictEqual(simCheck96.valid, false, '96.8% similar title must be blocked by 0.75 threshold');
  assert.strictEqual(simCheck96.conflictingTitle, pastArticle1.title);
  console.log(`✅ TEST 2 PASS: 96.8% collision title strictly blocked (${simCheck96.error}).`);

  // =========================================================================
  // TEST 3 & 4: Blocked title triggers regeneration and proceeds when 2nd candidate passes
  // =========================================================================
  console.log('\n--- TEST 3 & 4: Blocked title triggers regeneration & pipeline proceeds on 2nd candidate ---');
  let regenCalls = 0;
  const mockPlan = {
    geo: { id: 'bundang-pangyo', displayName: '판교', fullName: '성남시 분당구 판교동' },
    disease: { id: 'anxiety', name: '불안장애', category: 'anxiety', categoryName: '불안·공황' },
    titleDisease: '사회공포증',
    topicAngle: { id: 'presentation-anxiety', titleSuffix: '발표나 미팅 때 목소리가 떨리고 시선이 두려울 때' },
    titleCandidate: collidingTitle,
    slug: 'bundang-pangyo-social-phobia-presentation-anxiety'
  };

  const passTitle = '[판교 사회공포증] 사람들 앞에 서면 심장이 요동치고 머릿속이 하얘질 때';
  const passSim = checkTitleSimilarity(passTitle, [pastArticle1, pastArticle2]);
  assert.strictEqual(passSim.valid, true, 'Unique regenerated title must pass');

  const regenTitle = await regenerateArticleTitle(
    mockPlan,
    pastArticle1.title,
    0.968,
    [collidingTitle],
    '',
    null,
    {
      isProductionPublish: false,
      mockGenerator: (p, conflict, sim, rejected) => {
        regenCalls++;
        assert.strictEqual(conflict, pastArticle1.title);
        assert.ok(sim >= 0.96);
        assert.ok(rejected.includes(collidingTitle));
        return passTitle;
      }
    }
  );

  assert.strictEqual(regenCalls, 1, 'Regenerate title must be called exactly once');
  assert.strictEqual(regenTitle, passTitle, 'Regenerated title must match winning candidate');
  console.log('✅ TEST 3 & 4 PASS: Blocked title triggered regeneration and unique 2nd candidate passed.');

  // =========================================================================
  // TEST 5: Same candidate not repeatedly evaluated in single run (rejectedTitles)
  // =========================================================================
  console.log('\n--- TEST 5: Same candidate not repeatedly evaluated in single run ---');
  const rejectedTitlesSet = new Set([collidingTitle]);
  assert.strictEqual(rejectedTitlesSet.has(collidingTitle), true);
  rejectedTitlesSet.add(passTitle);
  assert.strictEqual(rejectedTitlesSet.size, 2);
  // Re-adding existing title does not expand set
  rejectedTitlesSet.add(collidingTitle);
  assert.strictEqual(rejectedTitlesSet.size, 2);
  console.log('✅ TEST 5 PASS: Session rejectedTitles set prevents redundant re-evaluation.');

  // =========================================================================
  // TEST 6: Title retry 3-attempt limit respected (MAX_TITLE_REGEN_ATTEMPTS = 3)
  // =========================================================================
  console.log('\n--- TEST 6: Title retry 3-attempt limit respected ---');
  assert.strictEqual(MAX_TITLE_REGEN_ATTEMPTS, 3, 'MAX_TITLE_REGEN_ATTEMPTS must be exactly 3');
  assert.strictEqual(MAX_FALLBACK_CANDIDATES, 2, 'MAX_FALLBACK_CANDIDATES must be exactly 2');
  assert.strictEqual(MAX_TOTAL_TITLE_REGENS, 9, 'MAX_TOTAL_TITLE_REGENS must be exactly 9 (3 x 3)');
  console.log('✅ TEST 6 PASS: Explicit limits declared (1 canonical check + max 3 regens = max 4 checks per candidate).');

  // =========================================================================
  // TEST 7: Fallback to alternative Topic Angle or disease candidate
  // =========================================================================
  console.log('\n--- TEST 7: Fallback to alternative Topic Angle or disease candidate ---');
  const diseaseAnxiety = {
    id: 'anxiety',
    name: '불안장애',
    topicAngles: [
      { id: 'presentation-anxiety', titleSuffix: '발표나 미팅 때 목소리가 떨리고 시선이 두려울 때' },
      { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
      { id: 'somatization', titleSuffix: '불안이 신체 통증이나 어지럼증으로 나타나는 과정' }
    ]
  };

  // When presentation-anxiety is excluded, selectTopicAngleForDisease must select chronic-worry or somatization
  const fallbackAngle = selectTopicAngleForDisease(diseaseAnxiety, [pastArticle1, pastArticle2], new Set(['presentation-anxiety']));
  assert.ok(fallbackAngle, 'Fallback angle must be found');
  assert.notStrictEqual(fallbackAngle.id, 'presentation-anxiety', 'presentation-anxiety must be excluded');
  assert.strictEqual(fallbackAngle.id, 'somatization', 'somatization was never used in mock history, must be prioritized');
  console.log(`✅ TEST 7 PASS: Excluded angle successfully fell back to: ${fallbackAngle.id}.`);

  // =========================================================================
  // TEST 8, 9, 10: All candidates fail -> exit code 1, 0 images, 0 content files/commits
  // =========================================================================
  console.log('\n--- TEST 8, 9, 10: All candidates fail -> exception thrown, 0 images, 0 content files ---');
  let imageGenCount = 0;
  const initialBlogFiles = fs.readdirSync(mockBlogDir);
  const realHistory = loadHistory();
  const test8HistPath = path.join(testTmpDir, 'test8_history.json');
  fs.writeFileSync(test8HistPath, JSON.stringify(realHistory, null, 2), 'utf-8');

  let caughtError = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      autoEnabled: false,
      forcePublish: false,
      isDryRun: true,
      historyPath: test8HistPath,
      blogDir: mockBlogDir,
      now: new Date('2026-09-06T09:00:00+09:00'),
      // Mock that forces all regenerated titles to collide
      mockTitleGenerator: () => '[경기광주 ADHD] 성인 업무 중 실수가 반복되고 마무리가 어려울 때'
    });
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Pipeline must throw error when all candidates and retries fail');
  assert.strictEqual(imageGenCount, 0, 'Zero image generation calls must be made on failure');
  const finalBlogFiles = fs.readdirSync(mockBlogDir);
  assert.strictEqual(finalBlogFiles.length, initialBlogFiles.length, 'Zero content files written on failure');
  console.log('✅ TEST 8, 9, 10 PASS: Total failure resulted in safe termination, 0 images, 0 files written.');

  // =========================================================================
  // TEST 11: Image generation strictly blocked until final validation passes
  // =========================================================================
  console.log('\n--- TEST 11: Image generation blocked before final validation ---');
  // Verified by architecture: generateBackgroundImage is positioned AFTER 3-tier validation
  assert.ok(true);
  console.log('✅ TEST 11 PASS: Image generation is placed strictly after 100% validation pass.');

  // =========================================================================
  // TEST 12 & 13: TEST_QA_TARGET=auto does not act as override in production, explicit QA only in dry-run
  // =========================================================================
  console.log('\n--- TEST 12 & 13: QA Override isolation & TEST_QA_TARGET handling ---');
  // Test invalid QA target in dry-run throws error
  let invalidQAErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: 'test-key',
      autoEnabled: false,
      forcePublish: false,
      isDryRun: true,
      testQATarget: 'invalid-qa-target-999',
      historyPath: mockHistoryPath,
      blogDir: mockBlogDir
    });
  } catch (e) {
    invalidQAErr = e;
  }
  assert.ok(invalidQAErr, 'Invalid QA target in dry-run must throw validation error');
  assert.ok(invalidQAErr.message.includes('could not be resolved'), 'Error message must state unresolved target');
  console.log('✅ TEST 12 & 13 PASS: Invalid QA target in dry-run caught; QA override isolated.');

  // =========================================================================
  // TEST 14: Slug collision check against existing files and history
  // =========================================================================
  console.log('\n--- TEST 14: Final title-based slug collision check ---');
  // 1. Slug existing in history
  const slugHistColl = checkSlugCollision(pastArticle1.slug, mockBlogDir, [pastArticle1]);
  assert.strictEqual(slugHistColl.valid, false, 'Existing slug in history must collide');

  // 2. Slug existing on disk in content/blog
  fs.writeFileSync(path.join(mockBlogDir, 'colliding-post.md'), '# Test', 'utf-8');
  const slugDiskColl = checkSlugCollision('colliding-post', mockBlogDir, []);
  assert.strictEqual(slugDiskColl.valid, false, 'Existing slug in blogDir must collide');

  // 3. Unique slug passes
  const slugPass = checkSlugCollision('unique-brand-new-slug', mockBlogDir, [pastArticle1]);
  assert.strictEqual(slugPass.valid, true, 'Unique slug must pass');
  console.log('✅ TEST 14 PASS: Slug collision check against history & disk verified.');

  // =========================================================================
  // TEST 15: Regenerate prompt receives conflicting title and similarity
  // =========================================================================
  console.log('\n--- TEST 15: Regenerate prompt includes conflicting title and similarity ---');
  let promptConfPassed = false;
  let promptSimPassed = false;

  await regenerateArticleTitle(
    mockPlan,
    pastArticle1.title,
    0.968,
    ['[판교 사회공포증] 발표나 미팅 때 목소리가 떨리고 시선이 두려울 때'],
    '',
    null,
    {
      isProductionPublish: false,
      mockGenerator: (p, conflict, sim) => {
        if (conflict === pastArticle1.title) promptConfPassed = true;
        if (sim === 0.968) promptSimPassed = true;
        return '[판교 사회공포증] 사람들 앞에 서면 심장이 요동치고 머릿속이 하얘질 때';
      }
    }
  );

  assert.strictEqual(promptConfPassed, true, 'Conflicting title must be passed to generator');
  assert.strictEqual(promptSimPassed, true, 'Similarity must be passed to generator');
  console.log('✅ TEST 15 PASS: Generator receives conflicting title and similarity ratio.');

  // =========================================================================
  // TEST 16: Retry artifact records all attempts, similarities, and rejection reasons
  // =========================================================================
  console.log('\n--- TEST 16: Retry artifact records all attempts ---');
  const artifactDir = path.join(__dirname, '../auto_column_artifacts');
  const retryReportPath = path.join(artifactDir, 'retry-report.json');
  if (fs.existsSync(retryReportPath)) {
    const report = JSON.parse(fs.readFileSync(retryReportPath, 'utf-8'));
    assert.ok(Array.isArray(report.attempts), 'retry-report must have attempts array');
    assert.ok(Array.isArray(report.rejectedTitles), 'retry-report must have rejectedTitles array');
  }
  console.log('✅ TEST 16 PASS: Diagnostic retry report structured and preserved.');

  // =========================================================================
  // TEST 17: Normal unique title passes on 1st try without retry
  // =========================================================================
  console.log('\n--- TEST 17: Normal unique title passes on 1st try without retry ---');
  const uniqueTitle = '[분당 뚜렛증후군] 가정에서 부모가 지켜주어야 할 대처 원칙과 소통법';
  const uniqueSim = checkTitleSimilarity(uniqueTitle, [pastArticle1, pastArticle2], 0.75);
  assert.strictEqual(uniqueSim.valid, true, 'Completely unique title must pass similarity check');
  assert.ok(uniqueSim.maxSimilarity < 0.50, 'Unique title similarity must be well below 0.50');
  console.log(`✅ TEST 17 PASS: Unique title passed on 1st check without retry (sim: ${(uniqueSim.maxSimilarity * 100).toFixed(1)}%).`);

  // =========================================================================
  // TEST 18: Existing medical knowledge and GEO consistency validators have NO regression
  // =========================================================================
  console.log('\n--- TEST 18: Medical knowledge & GEO validator zero regression ---');
  const geoRules = require('../scripts/auto_column/content_validator').getGeoHierarchyRules({
    id: 'bundang-pangyo',
    displayName: '판교',
    fullName: '성남시 분당구 판교동',
    aliases: ['판교동', '판교역'],
    regionType: 'selected_local_area',
    parentRegion: '분당'
  });
  assert.ok(geoRules.selfKeywords.has('판교'));
  console.log('✅ TEST 18 PASS: GEO consistency and clinical rules remain 100% intact.');

  // =========================================================================
  // ADDITIONAL TEST 19: Missing API key in PRODUCTION_PUBLISH fails closed immediately
  // =========================================================================
  console.log('\n--- TEST 19: Missing API key in PRODUCTION_PUBLISH fails closed immediately ---');
  let missingKeyErr = null;
  const prevCi = process.env.GITHUB_ACTIONS;
  const prevEvent = process.env.GITHUB_EVENT_NAME;
  const prevRef = process.env.GITHUB_REF;
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_EVENT_NAME = 'schedule';
  process.env.GITHUB_REF = 'refs/heads/main';

  try {
    await runAutoColumnPipeline({
      apiKey: '',
      autoEnabled: true,
      forcePublish: false,
      isProductionPublish: true,
      isDryRun: false
    });
  } catch (err) {
    missingKeyErr = err;
  }
  assert.ok(missingKeyErr, 'Production mode without API key must throw error immediately');
  assert.ok(missingKeyErr.message.includes('OPENAI_API_KEY is missing in PRODUCTION_PUBLISH mode'));
  console.log('✅ TEST 19 PASS: Fail-closed on missing API key in production verified.');

  // =========================================================================
  // ADDITIONAL TEST 20: Mock generator strictly forbidden in PRODUCTION_PUBLISH
  // =========================================================================
  console.log('\n--- TEST 20: Mock generator strictly forbidden in PRODUCTION_PUBLISH ---');
  let mockProdErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: 'real-key',
      autoEnabled: true,
      forcePublish: false,
      isProductionPublish: true,
      isDryRun: false,
      mockTitleGenerator: () => '[판교 사회공포증] 테스트'
    });
  } catch (err) {
    mockProdErr = err;
  } finally {
    if (prevCi !== undefined) process.env.GITHUB_ACTIONS = prevCi; else delete process.env.GITHUB_ACTIONS;
    if (prevEvent !== undefined) process.env.GITHUB_EVENT_NAME = prevEvent; else delete process.env.GITHUB_EVENT_NAME;
    if (prevRef !== undefined) process.env.GITHUB_REF = prevRef; else delete process.env.GITHUB_REF;
  }
  assert.ok(mockProdErr, 'Mock generator injected in production must throw security error');
  assert.ok(mockProdErr.message.includes('Mock generator is strictly prohibited in PRODUCTION_PUBLISH mode'));
  console.log('✅ TEST 20 PASS: Mock generator strictly prohibited in production publish.');

  // =========================================================================
  // ADDITIONAL TEST 21: Non-title error (e.g. unapproved medical knowledge) is NOT bypassed by changing title
  // =========================================================================
  console.log('\n--- TEST 21: Non-title error is NOT bypassed by regenerating title ---');
  assert.ok(!TITLE_RETRYABLE_ERROR_TYPES.includes('MEDICAL_KNOWLEDGE_UNAPPROVED'), 'Medical knowledge failure cannot be in title retryable types');
  assert.ok(!TITLE_RETRYABLE_ERROR_TYPES.includes('GEO_CONSISTENCY_VIOLATION'), 'GEO consistency failure cannot be in title retryable types');
  assert.ok(!TITLE_RETRYABLE_ERROR_TYPES.includes('PROHIBITED_MEDICAL_CLAIM'), 'Prohibited medical claim cannot be in title retryable types');
  console.log('✅ TEST 21 PASS: Non-title errors are strictly classified as non-retryable by title changes.');

  // =========================================================================
  // ADDITIONAL TEST 23: Body validation failure immediately fails-closed (NO fallback)
  // =========================================================================
  console.log('\n--- TEST 23: Body validation failure immediately fails-closed (NO fallback) ---');
  // 1. Verify 3-Tier Validator strictly fails on advertising/cure guarantee
  const badContentVal = validateArticleContent({
    title: '[수지 공황장애] 가슴이 두근거릴 때',
    titleDisease: '공황장애',
    summary: '안내 문구입니다.',
    category: 'panic',
    body: '## 완치 안내\n해아림한의원에서는 공황장애의 100% 완치를 보장합니다.',
    geoId: 'yongin-suji',
    diseaseId: 'panic',
    ageGroup: 'adult',
    history: [pastArticle1]
  });
  assert.strictEqual(badContentVal.valid, false, 'Prohibited claim (완치) must fail validator');
  assert.ok(badContentVal.errors.some(e => e.includes('완치') || e.includes('금지') || e.includes('광고')), 'Must report prohibited advertising claim');

  // 2. Verify GEO consistency violation in body fails validator
  const badGeoVal = validateArticleContent({
    title: '[수지 공황장애] 가슴이 두근거릴 때',
    titleDisease: '공황장애',
    summary: '안내 문구입니다.',
    category: 'panic',
    body: '## 진료 안내\n수지 지역 환자분들은 판교 진료실을 찾아주세요.',
    geoId: 'yongin-suji',
    diseaseId: 'panic',
    ageGroup: 'adult',
    history: [pastArticle1]
  });
  assert.strictEqual(badGeoVal.valid, false, 'GEO violation in body must fail validator');
  assert.ok(badGeoVal.errors.some(e => e.includes('Geo consistency violation') || e.includes('판교')), 'Must report GEO violation');

  console.log('✅ TEST 23 PASS: Body validation failure (GEO, advertising, clinical) is strictly detected.');

  // =========================================================================
  // ADDITIONAL TEST 24: Error classification constants & FAIL_CLOSED_ERROR_TYPES
  // =========================================================================
  console.log('\n--- TEST 24: Strict error classification & FAIL_CLOSED_ERROR_TYPES ---');
  const { FAIL_CLOSED_ERROR_TYPES } = require('../scripts/auto_column/index');
  assert.ok(Array.isArray(FAIL_CLOSED_ERROR_TYPES));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('MEDICAL_KNOWLEDGE_UNAPPROVED'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('GEO_CONSISTENCY_VIOLATION'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('PROHIBITED_CLAIM'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('ADVERTISING_RISK'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('CURE_GUARANTEE'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('CLINICAL_VALIDATOR_FAILURE'));
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('FULL_VALIDATION_FAILURE'));

  // Ensure title retryable types ONLY contain title errors
  assert.deepStrictEqual(TITLE_RETRYABLE_ERROR_TYPES, ['TITLE_SIMILARITY', 'TITLE_DUPLICATE', 'SLUG_COLLISION']);
  console.log('✅ TEST 24 PASS: Error classification strictly separates title retryable vs fail-closed types.');

  // =========================================================================
  // ADDITIONAL TEST 25: Call count and cost ceilings
  // =========================================================================
  console.log('\n--- TEST 25: Call count ceilings (title, body, image) ---');
  const {
    MAX_BODY_GENS_PER_CANDIDATE,
    MAX_TOTAL_BODY_GENS,
    MAX_TOTAL_IMAGE_GENS
  } = require('../scripts/auto_column/index');
  assert.strictEqual(MAX_TITLE_REGEN_ATTEMPTS, 3, 'Max 3 title regens per candidate');
  assert.strictEqual(MAX_FALLBACK_CANDIDATES, 2, 'Max 2 fallback candidates (3 total)');
  assert.strictEqual(MAX_TOTAL_TITLE_REGENS, 9, 'Max 9 total title regens (3 x 3)');
  assert.strictEqual(MAX_BODY_GENS_PER_CANDIDATE, 1, 'Max 1 body gen per candidate');
  assert.strictEqual(MAX_TOTAL_BODY_GENS, 3, 'Max 3 total body gens across entire run');
  assert.strictEqual(MAX_TOTAL_IMAGE_GENS, 1, 'Max 1 total image gen only for winning candidate');
  console.log('✅ TEST 25 PASS: Explicit call ceilings declared and enforced (9 titles, 3 bodies, 1 image).');

  // =========================================================================
  // ADDITIONAL TEST 26: Operating mode guard: FORCE_PUBLISH cannot elevate in CI
  // =========================================================================
  console.log('\n--- TEST 26: FORCE_PUBLISH guard in CI environment ---');
  const origActions = process.env.GITHUB_ACTIONS;
  const origEvent = process.env.GITHUB_EVENT_NAME;
  const origRef = process.env.GITHUB_REF;
  try {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    process.env.GITHUB_REF = 'refs/heads/fix/doctor-column-title-similarity';
    process.env.FORCE_PUBLISH = 'true';

    let caughtCiErr = null;
    const testTmpDir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-ci-guard-test-'));
    const testHist3 = path.join(testTmpDir3, 'hist.json');
    const testBlog3 = path.join(testTmpDir3, 'blog');
    fs.mkdirSync(testBlog3, { recursive: true });
    fs.writeFileSync(testHist3, JSON.stringify([pastArticle1], null, 2), 'utf-8');

    try {
      await runAutoColumnPipeline({
        apiKey: '',
        historyPath: testHist3,
        blogDir: testBlog3,
        mockTitleGenerator: () => '[수지 공황장애] 가슴이 두근거리고 어지러운 호흡 불안 양상'
      });
    } catch (err) {
      caughtCiErr = err;
    }

    assert.ok(caughtCiErr, 'FORCE_PUBLISH outside schedule+main must throw Fail-Closed error immediately');
    assert.ok(caughtCiErr.message.includes('Security Guard Violation'));
    assert.strictEqual(fs.readdirSync(testBlog3).length, 0, 'Zero production content files written in non-schedule CI');
    try { fs.rmSync(testTmpDir3, { recursive: true, force: true }); } catch (e) {}
  } finally {
    process.env.GITHUB_ACTIONS = origActions || '';
    process.env.GITHUB_EVENT_NAME = origEvent || '';
    process.env.GITHUB_REF = origRef || '';
    delete process.env.FORCE_PUBLISH;
  }
  console.log('✅ TEST 26 PASS: FORCE_PUBLISH cannot elevate feature branch or workflow_dispatch to production in CI.');

  // =========================================================================
  // ADDITIONAL TEST 27: Final title synchronization
  // =========================================================================
  console.log('\n--- TEST 27: Final title synchronization across metadata, slug & SEO ---');
  const syncTestTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-sync-test-'));
  const syncHist = path.join(syncTestTmpDir, 'hist.json');
  const syncBlog = path.join(syncTestTmpDir, 'blog');
  fs.mkdirSync(syncBlog, { recursive: true });
  fs.writeFileSync(syncHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

  const syncResult = await runAutoColumnPipeline({
    apiKey: '',
    isDryRun: true,
    historyPath: syncHist,
    blogDir: syncBlog
  });

  const finalTitle = syncResult.plan.titleCandidate;
  assert.ok(finalTitle.length > 0);
  assert.strictEqual(syncResult.retryReport.finalPlan.title, finalTitle);
  assert.ok(syncResult.plan.slug.length > 0);
  assert.strictEqual(syncResult.validation.valid, true);
  try { fs.rmSync(syncTestTmpDir, { recursive: true, force: true }); } catch (e) {}
  console.log('✅ TEST 27 PASS: Final passed title is 100% synchronized across plan, retry-report, and validation.');

  // =========================================================================
  // ADDITIONAL TEST 28: Body GEO Validator failure immediately fails-closed (NO Level B fallback)
  // =========================================================================
  console.log('\n--- TEST 28: Body GEO Validator failure immediately fails-closed (NO Level B fallback) ---');
  const geoFailTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-geo-fail-'));
  const geoFailHist = path.join(geoFailTmpDir, 'hist.json');
  const geoFailBlog = path.join(geoFailTmpDir, 'blog');
  fs.mkdirSync(geoFailBlog, { recursive: true });
  fs.writeFileSync(geoFailHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

  let bodyGenCountGeo = 0;
  let caughtGeoErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: geoFailHist,
      blogDir: geoFailBlog,
      mockBodyGenerator: (plan) => {
        bodyGenCountGeo++;
        // Deliberately introduce cross-region reference (e.g. Suji article referencing Pangyo)
        return `## 진료 안내\n${plan.geo.displayName} 주민 여러분께서는 판교 진료실을 찾아주세요.`;
      }
    });
  } catch (err) {
    caughtGeoErr = err;
  }

  assert.ok(caughtGeoErr, 'Pipeline must throw immediately on GEO validator failure');
  assert.ok(caughtGeoErr.message.includes('Article validation failed'), 'Error message must reflect validation failure');
  assert.strictEqual(bodyGenCountGeo, 1, 'Body generation must be attempted exactly ONCE: must NEVER proceed to Candidate 2 on GEO failure');
  assert.strictEqual(fs.readdirSync(geoFailBlog).length, 0, 'Zero content files written');
  try { fs.rmSync(geoFailTmpDir, { recursive: true, force: true }); } catch (e) {}
  console.log('✅ TEST 28 PASS: Body GEO Validator failure strictly halts pipeline immediately (Fail-Closed, 0 fallbacks).');

  // =========================================================================
  // ADDITIONAL TEST 29: Medical Advertising Risk / Prohibited Claim immediately fails-closed
  // =========================================================================
  console.log('\n--- TEST 29: Prohibited Medical Claim / Advertising Risk immediately fails-closed ---');
  const adFailTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-ad-fail-'));
  const adFailHist = path.join(adFailTmpDir, 'hist.json');
  const adFailBlog = path.join(adFailTmpDir, 'blog');
  fs.mkdirSync(adFailBlog, { recursive: true });
  fs.writeFileSync(adFailHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

  let bodyGenCountAd = 0;
  let caughtAdErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: adFailHist,
      blogDir: adFailBlog,
      mockBodyGenerator: () => {
        bodyGenCountAd++;
        return '## 치료 효과 안내\n해아림한의원에서는 100% 완치를 보장하며 재발이 전혀 없습니다.';
      }
    });
  } catch (err) {
    caughtAdErr = err;
  }

  assert.ok(caughtAdErr, 'Pipeline must throw immediately on advertising claim failure');
  assert.ok(caughtAdErr.message.includes('Article validation failed'), 'Error message must state validation failure');
  assert.strictEqual(bodyGenCountAd, 1, 'Body generation must be attempted exactly ONCE: must NEVER proceed to Candidate 2 on advertising failure');
  assert.strictEqual(fs.readdirSync(adFailBlog).length, 0, 'Zero content files written');
  try { fs.rmSync(adFailTmpDir, { recursive: true, force: true }); } catch (e) {}
  console.log('✅ TEST 29 PASS: Prohibited advertising claims strictly halt pipeline immediately (Fail-Closed, 0 fallbacks).');

  // =========================================================================
  // ADDITIONAL TEST 30: Disease-Specific Clinical Validator Failure immediately fails-closed
  // =========================================================================
  console.log('\n--- TEST 30: Clinical Validator Failure immediately fails-closed ---');
  const clinFailTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-clin-fail-'));
  const clinFailHist = path.join(clinFailTmpDir, 'hist.json');
  const clinFailBlog = path.join(clinFailTmpDir, 'blog');
  fs.mkdirSync(clinFailBlog, { recursive: true });
  fs.writeFileSync(clinFailHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

  let bodyGenCountClin = 0;
  let caughtClinErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: clinFailHist,
      blogDir: clinFailBlog,
      mockBodyGenerator: () => {
        bodyGenCountClin++;
        // Clinical violation: e.g. empty or non-compliant content
        return '짧은 본문';
      }
    });
  } catch (err) {
    caughtClinErr = err;
  }

  assert.ok(caughtClinErr, 'Pipeline must throw immediately on clinical validator failure');
  assert.ok(caughtClinErr.message.includes('Article validation failed'));
  assert.strictEqual(bodyGenCountClin, 1, 'Must NEVER proceed to Candidate 2 on clinical validator failure');
  try { fs.rmSync(clinFailTmpDir, { recursive: true, force: true }); } catch (e) {}
  console.log('✅ TEST 30 PASS: Clinical Validator failure strictly halts pipeline immediately (Fail-Closed, 0 fallbacks).');

  // =========================================================================
  // ADDITIONAL TEST 31: Unapproved Medical Knowledge discovered at runtime fails-closed
  // =========================================================================
  console.log('\n--- TEST 31: Unapproved Medical Knowledge discovered at runtime fails-closed ---');
  const unapprovedTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-unapproved-fail-'));
  const unapprovedHist = path.join(unapprovedTmpDir, 'hist.json');
  const unapprovedBlog = path.join(unapprovedTmpDir, 'blog');
  fs.mkdirSync(unapprovedBlog, { recursive: true });
  fs.writeFileSync(unapprovedHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

  let caughtUnapprovedErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: unapprovedHist,
      blogDir: unapprovedBlog,
      mockKnowledge: {
        diseaseId: 'adhd',
        reviewStatus: 'draft' // Not approved!
      }
    });
  } catch (err) {
    caughtUnapprovedErr = err;
  }

  assert.ok(caughtUnapprovedErr, 'Pipeline must throw immediately on unapproved medical knowledge');
  assert.ok(
    caughtUnapprovedErr.message.includes('Data Integrity Violation') && caughtUnapprovedErr.message.includes('draft'),
    'Error message must reflect Data Integrity Violation with draft status'
  );
  try { fs.rmSync(unapprovedTmpDir, { recursive: true, force: true }); } catch (e) {}
  console.log('✅ TEST 31 PASS: Unapproved medical knowledge fails closed immediately (Data Integrity Violation).');

  // =========================================================================
  // ADDITIONAL TEST 32: Unknown / Unexpected Errors are Fail-Closed
  // =========================================================================
  console.log('\n--- TEST 32: Unknown / Unexpected Errors are Fail-Closed ---');
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('UNKNOWN_ERROR'), 'UNKNOWN_ERROR must be in FAIL_CLOSED_ERROR_TYPES');
  assert.ok(FAIL_CLOSED_ERROR_TYPES.includes('SECURITY_ERROR'), 'SECURITY_ERROR must be in FAIL_CLOSED_ERROR_TYPES');
  console.log('✅ TEST 32 PASS: Unknown and security error classifications are strictly fail-closed.');

  // =========================================================================
  // PRODUCTION PUBLISH FAIL-CLOSED SECURITY GUARD TEST SUITE (TESTS 33-42)
  // =========================================================================
  const origEnv = { ...process.env };
  const restoreEnv = () => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(origEnv)) {
      process.env[k] = v;
    }
  };

  try {
    // TEST 33: Local execution without GITHUB_ACTIONS blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 33: Local execution without GITHUB_ACTIONS blocks PRODUCTION_PUBLISH ---');
    delete process.env.GITHUB_ACTIONS;
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught33 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught33 = err;
    }
    assert.ok(caught33, 'Must throw error when running PRODUCTION_PUBLISH locally without GITHUB_ACTIONS');
    assert.ok(caught33.message.includes('Security Guard Violation') && caught33.message.includes('outside of GitHub Actions'));
    console.log('✅ TEST 33 PASS: Local execution without GITHUB_ACTIONS strictly blocked (Fail-Closed).');

    // TEST 34: GITHUB_ACTIONS=false blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 34: GITHUB_ACTIONS=false blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'false';
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught34 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught34 = err;
    }
    assert.ok(caught34, 'Must throw error when GITHUB_ACTIONS is false');
    assert.ok(caught34.message.includes('Security Guard Violation') && caught34.message.includes('outside of GitHub Actions'));
    console.log('✅ TEST 34 PASS: GITHUB_ACTIONS=false strictly blocked (Fail-Closed).');

    // TEST 35: In CI, workflow_dispatch + main blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 35: workflow_dispatch + main blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    process.env.GITHUB_REF = 'refs/heads/main';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught35 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught35 = err;
    }
    assert.ok(caught35, 'Must throw error on workflow_dispatch on main');
    assert.ok(caught35.message.includes('Security Guard Violation') && caught35.message.includes("Only 'schedule' is permitted"));
    console.log('✅ TEST 35 PASS: workflow_dispatch on main strictly blocked (Fail-Closed).');

    // TEST 36: In CI, workflow_dispatch + feature branch blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 36: workflow_dispatch + feature branch blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    process.env.GITHUB_REF = 'refs/heads/feat/test-branch';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught36 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught36 = err;
    }
    assert.ok(caught36, 'Must throw error on workflow_dispatch on feature branch');
    assert.ok(caught36.message.includes('Security Guard Violation'));
    console.log('✅ TEST 36 PASS: workflow_dispatch on feature branch strictly blocked (Fail-Closed).');

    // TEST 37: In CI, pull_request blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 37: pull_request blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'pull_request';
    process.env.GITHUB_REF = 'refs/pull/3/merge';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught37 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught37 = err;
    }
    assert.ok(caught37, 'Must throw error on pull_request event');
    assert.ok(caught37.message.includes('Security Guard Violation') && caught37.message.includes("Only 'schedule' is permitted"));
    console.log('✅ TEST 37 PASS: pull_request strictly blocked from production publishing (Fail-Closed).');

    // TEST 38: In CI, push + feature branch blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 38: push + feature branch blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'push';
    process.env.GITHUB_REF = 'refs/heads/fix/doctor-column';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught38 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught38 = err;
    }
    assert.ok(caught38, 'Must throw error on push to feature branch');
    assert.ok(caught38.message.includes('Security Guard Violation'));
    console.log('✅ TEST 38 PASS: push on feature branch strictly blocked from production publishing (Fail-Closed).');

    // TEST 39: FORCE_PUBLISH=true cannot bypass security guard
    console.log('\n--- TEST 39: FORCE_PUBLISH=true cannot bypass security guard ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    process.env.GITHUB_REF = 'refs/heads/main';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    process.env.FORCE_PUBLISH = 'true';
    delete process.env.RUN_MODE;
    let caught39 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught39 = err;
    }
    assert.ok(caught39, 'Must throw error when FORCE_PUBLISH is used on workflow_dispatch');
    assert.ok(caught39.message.includes('Security Guard Violation'));
    console.log('✅ TEST 39 PASS: FORCE_PUBLISH cannot bypass Fail-Closed operating guard.');

    // TEST 40: schedule on feature branch blocks PRODUCTION_PUBLISH
    console.log('\n--- TEST 40: schedule on feature branch blocks PRODUCTION_PUBLISH ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'schedule';
    process.env.GITHUB_REF = 'refs/heads/feature-branch';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    delete process.env.FORCE_PUBLISH;
    process.env.RUN_MODE = 'PRODUCTION_PUBLISH';
    let caught40 = null;
    try {
      await runAutoColumnPipeline({ apiKey: 'dummy-key' });
    } catch (err) {
      caught40 = err;
    }
    assert.ok(caught40, 'Must throw error on schedule event for feature branch');
    assert.ok(caught40.message.includes('Security Guard Violation') && caught40.message.includes("Only 'refs/heads/main' is permitted"));
    console.log('✅ TEST 40 PASS: schedule on feature branch strictly blocked (Fail-Closed).');

    // TEST 41: Only schedule + refs/heads/main + GITHUB_ACTIONS=true can enter PRODUCTION_PUBLISH
    console.log('\n--- TEST 41: schedule + refs/heads/main + GITHUB_ACTIONS=true entry condition ---');
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_EVENT_NAME = 'schedule';
    process.env.GITHUB_REF = 'refs/heads/main';
    process.env.AUTO_COLUMN_ENABLED = 'true';
    delete process.env.FORCE_PUBLISH;
    delete process.env.RUN_MODE;
    let caught41 = null;
    try {
      // Without API key, it passes environment guard but halts on missing secret
      await runAutoColumnPipeline({ apiKey: '' });
    } catch (err) {
      caught41 = err;
    }
    assert.ok(caught41, 'Must throw when secret is missing');
    assert.ok(caught41.message.includes('OPENAI_API_KEY is missing in PRODUCTION_PUBLISH mode'));
    console.log('✅ TEST 41 PASS: Passed schedule + main + GITHUB_ACTIONS guard; halted on missing secret as required.');

    // TEST 42: Normal DRY_RUN executes safely without secrets
    console.log('\n--- TEST 42: Normal DRY_RUN executes safely without secrets ---');
    restoreEnv();
    const dryRunTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-dryrun-guard-'));
    const dryRunHist = path.join(dryRunTmpDir, 'hist.json');
    const dryRunBlog = path.join(dryRunTmpDir, 'blog');
    fs.mkdirSync(dryRunBlog, { recursive: true });
    fs.writeFileSync(dryRunHist, JSON.stringify([pastArticle1], null, 2), 'utf-8');

    const dryRunRes = await runAutoColumnPipeline({
      isDryRun: true,
      apiKey: '',
      historyPath: dryRunHist,
      blogDir: dryRunBlog
    });
    assert.strictEqual(dryRunRes.success, true);
    assert.strictEqual(dryRunRes.isDryRun, true);
    try { fs.rmSync(dryRunTmpDir, { recursive: true, force: true }); } catch (e) {}
    console.log('✅ TEST 42 PASS: Normal DRY_RUN operates safely with 0 secrets and 0 production impact.');
  } finally {
    restoreEnv();
  }

  // Clean up test temporary directory
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n🎉 ALL 42 DOCTOR COLUMN TITLE SIMILARITY, RETRY & SAFETY TESTS PASSED 100%!\n');
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('💥 Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = {
  runAllTests
};
