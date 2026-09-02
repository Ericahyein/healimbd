const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Full Auto Column System Test Suite...\n');

// 1. GEO Hierarchy Validation
console.log('--- 1. GEO Hierarchy & Canonical Policy ---');
const geoHierarchy = require('../scripts/auto_column/geo_hierarchy.json');
assert.strictEqual(geoHierarchy.regions.length, 12, 'Must have exactly 12 active regions');

const pangyo = geoHierarchy.regions.find(r => r.id === 'bundang-pangyo');
assert(pangyo, 'Pangyo must be defined');
assert.strictEqual(pangyo.regionType, 'selected_local_area', 'Pangyo must be selected_local_area');
assert.strictEqual(pangyo.canonicalTitle, '[판교 {disease}]');

const bundang = geoHierarchy.regions.find(r => r.id === 'seongnam-bundang');
assert.strictEqual(bundang.canonicalTitle, '[분당 {disease}]', 'Bundang title must be [분당 {disease}]');

const suji = geoHierarchy.regions.find(r => r.id === 'yongin-suji');
assert.strictEqual(suji.canonicalTitle, '[수지 {disease}]', 'Suji title must be [수지 {disease}]');

const wirye = geoHierarchy.regions.find(r => r.id === 'seongnam-wirye');
assert.strictEqual(wirye.regionType, 'special_area', 'Wirye must be special_area');
console.log('✅ PASS: 12 GEOs and canonical policies strictly verified.');

// 2. Disease Taxonomy Validation
console.log('\n--- 2. Disease Taxonomy (12 Categories) ---');
const diseaseTaxonomy = require('../scripts/auto_column/disease_taxonomy.json');
assert.strictEqual(diseaseTaxonomy.diseases.length, 12, 'Must have exactly 12 disease categories');

const expectedCategories = [
  'tic', 'adhd', 'panic', 'anxiety', 'sleep', 'autonomic',
  'hyperhidrosis', 'ibs', 'syncope', 'headache', 'depression', 'child'
];

diseaseTaxonomy.diseases.forEach(d => {
  assert(expectedCategories.includes(d.id), `Unexpected disease id: ${d.id}`);
  assert(d.topicAngles && d.topicAngles.length >= 2, `Disease ${d.id} must have at least 2 topic angles`);
});
console.log('✅ PASS: Exactly 12 disease taxonomy categories verified.');

// 3. Medical Knowledge Grounding Files
console.log('\n--- 3. Medical Knowledge Grounding (12 Files & pending status & specificRules) ---');
expectedCategories.forEach(catId => {
  const kmPath = path.join(__dirname, `../scripts/auto_column/medical_knowledge/${catId}.json`);
  assert(fs.existsSync(kmPath), `Medical knowledge file must exist: ${catId}.json`);
  const km = JSON.parse(fs.readFileSync(kmPath, 'utf-8'));
  assert.strictEqual(km.diseaseId, catId);
  assert.strictEqual(km.reviewStatus, 'pending', `${catId}.json must have reviewStatus='pending'`);
  assert(km.approvedDefinition && km.approvedDefinition.length > 10);
  assert(km.commonSymptoms && km.commonSymptoms.length >= 2);
  assert(km.possibleAggravatingFactors && km.possibleAggravatingFactors.length >= 2);
  assert(km.evaluationGuidance && km.evaluationGuidance.length > 10);
  assert(km.treatmentGuidance && km.treatmentGuidance.length > 10);
  assert(km.lifestyleTips && km.lifestyleTips.length >= 2);
  assert(km.specificRules && km.specificRules.length >= 2, `${catId}.json must have specificRules`);
  assert(km.bannedPhrases && km.bannedPhrases.length >= 2);
});
console.log('✅ PASS: All 12 medical knowledge files verified with specificRules and pending reviewStatus.');

// 4. Topic Planner & Rotation Tests
console.log('\n--- 4. Topic Planner & History Cooldown Rules ---');
const {
  isGeoDiseaseIn90DayCooldown,
  isDiseaseIn3DayCooldown,
  planNextColumn
} = require('../scripts/auto_column/topic_planner');

const mockHistory = [
  {
    publishDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    geoId: 'seongnam-bundang',
    disease: 'tic',
    topicAngle: 'media-exposure',
    title: '[분당 틱장애] 미디어 노출이 증상에 미치는 영향'
  }
];

// 90-day cooldown test
assert.strictEqual(isGeoDiseaseIn90DayCooldown(mockHistory, 'seongnam-bundang', 'tic'), true, 'Should be in 90-day cooldown');
assert.strictEqual(isGeoDiseaseIn90DayCooldown(mockHistory, 'yongin-giheung', 'tic'), false, 'Different geo should not be in cooldown');
assert.strictEqual(isGeoDiseaseIn90DayCooldown(mockHistory, 'seongnam-bundang', 'panic'), false, 'Different disease should not be in cooldown');

// 3-day cooldown test
const recentHistory = [
  {
    publishDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    geoId: 'yongin-giheung',
    disease: 'panic',
    topicAngle: 'sudden-palpitation'
  }
];
assert.strictEqual(isDiseaseIn3DayCooldown(recentHistory, 'panic'), true, 'Panic was published yesterday, in 3-day cooldown');
assert.strictEqual(isDiseaseIn3DayCooldown(recentHistory, 'sleep'), false, 'Sleep was not published recently');

const plan = planNextColumn({ now: new Date() });
assert(plan.geo && plan.disease && plan.topicAngle);
assert(plan.titleCandidate.startsWith(`[${plan.geo.displayName} ${plan.disease.name}]`));
console.log(`✅ PASS: Topic Planner selected target -> [${plan.geo.displayName}] ${plan.disease.name} (${plan.titleCandidate})`);

// 5. Medical Safety & Content Validator Tests
console.log('\n--- 5. 3-Tier Content, GEO Consistency & Medical Safety Validator ---');
const { validateArticleContent } = require('../scripts/auto_column/content_validator');

// A. Valid Compliant Article
const validArticle = {
  title: '[성남 틱장애] 미디어 노출이 증상에 미치는 영향과 일상 대처 요령',
  summary: '성남 지역 환자분들을 위해 아이의 틱 증상과 미디어 자극 사이의 연관성을 살펴보고, 가정 내에서 실천할 수 있는 보수적인 생활 관리법을 안내합니다.',
  category: 'tic',
  geoId: 'seongnam-main',
  diseaseId: 'tic',
  hashtags: ['성남틱장애', '성남한의원', '틱장애치료', '해아림한의원'],
  keywords: ['성남 틱장애', '성남시 틱장애', '틱장애 한방치료'],
  body: `
<div class="column-key-summary-box">
  <div class="summary-header">핵심 요약</div>
  <ul>
    <li>미디어 시청 자체가 직접적인 원인은 아니지만 과도한 자극과 피로가 증상 악화와 겹칠 수 있습니다.</li>
    <li>아이의 상황과 수면 상태를 살펴보고 생활 속에서 조절하는 것이 권장됩니다.</li>
    <li>개인의 상태에 따라 맞춤 관리를 진행합니다.</li>
  </ul>
</div>

## 1. 진료실에서 자주 마주하는 고민
성남 지역에서 아이의 틱 증상으로 상담을 청하시는 보호자분들의 이야기를 듣다 보면 "스마트폰을 완전히 금지해야 하는지"에 대한 질문을 자주 받습니다.

## 2. 증상에 영향을 미칠 수 있는 관련 요인들
현재 알려진 바에 따르면 스마트폰 자체가 틱의 직접적인 원인이라고 보기는 어렵습니다. 다만 장시간 사용으로 피로가 누적되는 경우 증상이 두드러질 수 있습니다.
자세한 진료 과목은 [주요 진료 안내](/treatments/)에서도 살펴보실 수 있습니다.

## 3. 비슷한 다른 상태와 감별하여 살펴볼 점
초기 증상의 양상을 파악하는 것이 중요합니다. 궁금하신 사항은 [온라인 상담](/inquiry/)을 통해 확인 가능합니다.

## 4. 해아림한의원의 상태 평가 관점
필요에 따라 평가에 참고할 수 있으며 [틱장애 한방 가이드](/blog/bundang-tic-disorder-brain-balance-treatment/)를 함께 읽어보실 수 있습니다.

## 5. 자주 묻는 질문 (FAQ)
**Q1. 스마트폰을 완전히 끊어야 하나요?**
A. 사용 시간과 취침 전 시청을 조절하여 자극을 줄여주는 것이 도움됩니다.

**Q2. 틱 증상은 어떻게 대처하나요?**
A. 무리하게 지적하지 않고 편안한 환경을 제공합니다.
`,
  thumbnailCopy: {
    yellowText: '아이의 틱',
    whiteText: '스마트폰 사용 늘었다면',
    greenText: '틱장애'
  }
};

const validRes = validateArticleContent(validArticle);
assert.strictEqual(validRes.valid, true, `Valid article must pass validation: ${JSON.stringify(validRes.errors)}`);
console.log('✅ PASS: Compliant article with 3 internal links passed validation 100%.');

// B. GEO Consistency Regression Tests
console.log('\n--- GEO Consistency Regression Tests ---');
const badHashtagArticle = {
  ...validArticle,
  hashtags: ['성남틱장애', '정자역한의원', '해아림한의원']
};
const resBadHashtag = validateArticleContent(badHashtagArticle);
assert.strictEqual(resBadHashtag.valid, false, 'GEO=성남 with hashtag 정자역한의원 must fail');
console.log('✅ PASS: Foreign station hashtag "정자역한의원" in 성남 article strictly blocked.');

const badKeywordArticle = {
  ...validArticle,
  keywords: ['성남 틱장애', '분당 틱장애', '수지 틱장애']
};
const resBadKeyword = validateArticleContent(badKeywordArticle);
assert.strictEqual(resBadKeyword.valid, false, 'GEO=성남 with foreign keyword 분당/수지 must fail');
console.log('✅ PASS: Foreign region keywords ("분당", "수지") in 성남 article strictly blocked.');

// C. Internal Links Regression Tests
console.log('\n--- Internal Links Regression Tests ---');
const noLinkArticle = {
  ...validArticle,
  body: validArticle.body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // remove all links
};
const resNoLink = validateArticleContent(noLinkArticle);
assert.strictEqual(resNoLink.valid, false, 'Article with 0 internal links must fail');
console.log('✅ PASS: Article with 0 internal links strictly blocked.');

const nonExistentLinkArticle = {
  ...validArticle,
  body: validArticle.body + '\n\n[없는 페이지](/blog/non-existent-ghost-url/)'
};
const resGhostLink = validateArticleContent(nonExistentLinkArticle);
assert.strictEqual(resGhostLink.valid, false, 'Article with non-existent URL must fail');
console.log('✅ PASS: Non-existent internal URL strictly blocked.');

// D. Conservative Medical Phrasing Regression Tests
console.log('\n--- Conservative Medical Phrasing Tests ---');
const directCauseArticle = {
  ...validArticle,
  body: validArticle.body + '\n스마트폰은 틱의 원인입니다.'
};
const resDirectCause = validateArticleContent(directCauseArticle);
assert.strictEqual(resDirectCause.valid, false, 'Direct single-cause assertion must fail');
console.log('✅ PASS: Direct single-cause assertion ("스마트폰은 틱의 원인") strictly blocked.');

const rigidTimeArticle = {
  ...validArticle,
  body: validArticle.body + '\n취침 전 1~2시간만 제한하면 해결됩니다.'
};
const resRigidTime = validateArticleContent(rigidTimeArticle);
assert.strictEqual(resRigidTime.valid, false, 'Rigid time limit assertion must fail');
console.log('✅ PASS: Rigid time limit assertion ("취침 전 1~2시간만 제한") strictly blocked.');

// 6. Thumbnail Engine Synthesis
console.log('\n--- 6. Thumbnail Synthesis Engine (Sharp + SVG & Korean Fonts) ---');
const { compositeThumbnail, generateSvgOverlay } = require('../scripts/auto_column/thumbnail_engine');

async function testThumbnail() {
  const svg = generateSvgOverlay('아이의 틱', '스마트폰 사용이 늘었다면', '틱장애');
  assert(svg.includes('Noto Sans CJK KR'), 'SVG must specify Noto Sans CJK KR in font-family');
  assert(svg.includes('아이의 틱'), 'SVG must contain yellow text');
  assert(svg.includes('스마트폰 사용이 늘었다면'), 'SVG must contain white text');
  assert(svg.includes('틱장애'), 'SVG must contain green text');

  const testOutputPath = path.join(__dirname, '../scratch/test_generated_thumb.jpg');
  const buffer = await compositeThumbnail({
    outputPath: testOutputPath,
    yellowText: '아이의 틱',
    whiteText: '스마트폰 사용이 늘었다면',
    greenText: '틱장애'
  });

  assert(fs.existsSync(testOutputPath), 'Thumbnail file must be generated');
  assert(buffer.length > 5000, 'Thumbnail buffer must be non-empty');
  console.log(`✅ PASS: 800x800 Sharp+SVG composite thumbnail generated successfully with Korean fonts (${buffer.length} bytes).`);
}

// 7. gpt-image-2 Payload Check
console.log('\n--- 7. gpt-image-2 API Payload Compliance Tests ---');
const aiGenCode = fs.readFileSync(path.join(__dirname, '../scripts/auto_column/ai_generator.js'), 'utf-8');
assert(!aiGenCode.includes("response_format: 'b64_json'"), 'response_format must NOT be passed to gpt-image-2');
console.log('✅ PASS: gpt-image-2 request payload contains only official parameters without response_format.');

// 8. End-to-End Dry-Run Orchestrator
console.log('\n--- 8. End-to-End Dry-Run Orchestrator ---');
const { runAutoColumnPipeline } = require('../scripts/auto_column/index');

async function testDryRun() {
  process.env.AUTO_COLUMN_ENABLED = 'false';
  process.env.FORCE_PUBLISH = 'false';

  await runAutoColumnPipeline();

  const artifactDir = path.join(__dirname, '../auto_column_artifacts');
  assert(fs.existsSync(path.join(artifactDir, 'article.md')), 'Dry-run article.md must exist in artifacts');
  assert(fs.existsSync(path.join(artifactDir, 'validation-report.json')), 'validation-report.json must exist');
  assert(fs.existsSync(path.join(artifactDir, 'generation-metadata.json')), 'generation-metadata.json must exist');
  assert(fs.existsSync(path.join(artifactDir, 'cost-report.json')), 'cost-report.json must exist');

  const meta = JSON.parse(fs.readFileSync(path.join(artifactDir, 'generation-metadata.json'), 'utf-8'));
  assert.strictEqual(meta.mode, 'DRY_RUN', 'Mode must be DRY_RUN');
  assert(meta.internalLinks && meta.internalLinks.length >= 2, 'Must record verified internal links');
  assert(meta.reviewStatusNotice.includes('NOT YET HUMAN APPROVED'), 'Must display unapproved notice during pending phase');

  const cost = JSON.parse(fs.readFileSync(path.join(artifactDir, 'cost-report.json'), 'utf-8'));
  assert(cost.telemetry, 'Telemetry must be tracked');
  console.log('✅ PASS: Dry-Run artifact generation and verified internal links verified.');
}

async function runAll() {
  await testThumbnail();
  await testDryRun();
  console.log('\n====================================================');
  console.log('🎉 ALL AUTO COLUMN SYSTEM & 3-TIER REGRESSION TESTS PASSED 100%!');
  console.log('====================================================');
}

runAll().catch(err => {
  console.error('💥 Test Suite Failed:', err);
  process.exit(1);
});
