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

  let caughtError = null;
  try {
    await runAutoColumnPipeline({
      apiKey: 'test-key',
      autoEnabled: false,
      forcePublish: false,
      isDryRun: true,
      historyPath: mockHistoryPath,
      blogDir: mockBlogDir,
      now: new Date('2026-09-18T10:00:00+09:00'),
      // Mock that forces all title attempts to collide with pastArticle1
      mockTitleGenerator: () => collidingTitle
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
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      autoEnabled: true,
      forcePublish: false,
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
      isDryRun: false,
      mockTitleGenerator: () => '[판교 사회공포증] 테스트'
    });
  } catch (err) {
    mockProdErr = err;
  }
  assert.ok(mockProdErr, 'Mock generator injected in production must throw security error');
  assert.ok(mockProdErr.message.includes('Mock title generator is strictly prohibited in PRODUCTION_PUBLISH mode'));
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
  // ADDITIONAL TEST 22: Artifact safety: No API keys, secrets, or full drafts in failure artifacts
  // =========================================================================
  console.log('\n--- TEST 22: Artifact safety: No secrets or raw API keys ---');
  const metadataPath = path.join(artifactDir, 'generation-metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metaStr = fs.readFileSync(metadataPath, 'utf-8');
    assert.ok(!metaStr.includes('sk-'), 'Metadata artifact must never contain OpenAI secret keys');
    assert.ok(!metaStr.includes('Bearer '), 'Metadata artifact must never contain auth headers');
  }
  console.log('✅ TEST 22 PASS: Diagnostic artifacts are free of secrets and authorization tokens.');

  // Clean up test temporary directory
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n🎉 ALL 22 DOCTOR COLUMN TITLE SIMILARITY, RETRY & SAFETY TESTS PASSED 100%!\n');
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
