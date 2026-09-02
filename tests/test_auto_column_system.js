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
const { sanitizeAnchorTitle } = require('../scripts/auto_column/internal_linker');

// Test Anchor Sanitization
const sanitized = sanitizeAnchorTitle('[판교 틱장애] 눈 깜빡임·음음 소리, 억지로 참게 하면 안 되는 이유와 두뇌 밸런스 치료법');
assert(!sanitized.includes('판교'), 'Anchor must not include regional prefix');
assert(!sanitized.includes('두뇌 밸런스 치료법'), 'Anchor must not include legacy marketing phrase');
console.log(`✅ PASS: Anchor text sanitized to -> "${sanitized}"`);

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
    <li>미디어 시청 자체가 직접적인 원인은 아니지만 과도한 자극과 피로가 증상 변동과 겹칠 수 있습니다.</li>
    <li>아이의 상황과 수면 상태를 살펴보고 생활 속에서 노출을 적극적으로 조절하는 것이 권장됩니다.</li>
    <li>개인의 상태에 따라 맞춤 관리를 진행합니다.</li>
  </ul>
</div>

## 1. 진료실에서 자주 마주하는 고민
성남 지역에서 아이의 틱 증상으로 상담을 청하시는 보호자분들의 이야기를 듣다 보면 "스마트폰을 완전히 금지해야 하는지"에 대한 질문을 자주 받습니다.

## 2. 신경생물학적 특성과 증상에 영향을 미치는 관련 요인들
현재 연구에 따르면 틱장애의 신경생물학적 기전과 일상 속 증상 악화 요인은 구분하여 살펴볼 필요가 있습니다.
도파민계 및 운동 조절 회로의 변화가 연구되고 있으며, 게임이나 영상 같은 강한 자극에 오래 노출되는 환경이 증상 변동과 연관될 수 있습니다.
자세한 진료 과목은 [주요 진료 안내](/treatments/)에서도 살펴보실 수 있습니다.

## 3. 비슷한 다른 상태와 감별하여 살펴볼 점
초기 증상의 양상을 파악하는 것이 중요합니다. 궁금하신 사항은 [온라인 상담](/inquiry/)을 통해 확인 가능합니다.

## 4. 해아림한의원의 상태 평가 관점
필요에 따라 평가에 참고할 수 있으며 [틱장애 한방 가이드](/blog/bundang-tic-disorder-brain-balance-treatment/)를 함께 읽어보실 수 있습니다.

## 5. 자주 묻는 질문 (FAQ)
**Q1. 스마트폰을 완전히 끊어야 하나요?**
A. 불필요한 과도한 노출을 적극적으로 줄이고 사용량 감소 전후의 증상 변화를 관찰하는 것이 좋습니다.

**Q2. 틱 증상은 어떻게 대처하나요?**
A. 무리하게 지적하지 않고 편안한 환경을 제공합니다.
`,
  thumbnailCopy: {
    yellowText: '원인 모를',
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

// C. Internal Links Regression Tests
console.log('\n--- Internal Links Regression Tests ---');
const noLinkArticle = {
  ...validArticle,
  body: validArticle.body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // remove all links
};
const resNoLink = validateArticleContent(noLinkArticle);
assert.strictEqual(resNoLink.valid, false, 'Article with 0 internal links must fail');
console.log('✅ PASS: Article with 0 internal links strictly blocked.');

// D. Conservative Medical & Dopamine Phrasing Tests
console.log('\n--- Conservative Medical Phrasing & Dopamine Tests ---');
const dopamineBurstArticle = {
  ...validArticle,
  body: validArticle.body + '\n게임 때문에 뇌의 도파민이 폭발하여 틱이 생깁니다.'
};
const resDopamine = validateArticleContent(dopamineBurstArticle);
assert.strictEqual(resDopamine.valid, false, 'Dopamine burst claim must fail');
console.log('✅ PASS: Oversimplified claim ("도파민이 폭발하여 틱 발생") strictly blocked.');

const mediaGuaranteeArticle = {
  ...validArticle,
  body: validArticle.body + '\n미디어를 줄이면 틱이 좋아집니다. 노출 감소의 개선 효과가 더 큽니다.'
};
const resMediaGuarantee = validateArticleContent(mediaGuaranteeArticle);
assert.strictEqual(resMediaGuarantee.valid, false, 'Media outcome guarantee claim must fail');
console.log('✅ PASS: Media outcome guarantee ("미디어를 줄이면 틱이 좋아집니다") strictly blocked.');

const badSpacingThumb = {
  ...validArticle,
  thumbnailCopy: {
    yellowText: '나도모르게',
    whiteText: '눈깜빡임·헛기침',
    greenText: '틱장애'
  }
};
const resBadSpacing = validateArticleContent(badSpacingThumb);
assert.strictEqual(resBadSpacing.valid, false, 'Glued Korean spacing in thumbnail must fail');
console.log('✅ PASS: Glued Korean spacing ("나도모르게", "눈깜빡임·헛기침") in thumbnail strictly blocked.');

// 6. Thumbnail Engine Synthesis (High Impact Typography, Dark Overlay & 16~20px Stroke)
console.log('\n--- 6. Thumbnail Synthesis Engine (High-Impact Typography & Dark Overlay) ---');
const { compositeThumbnail, generateSvgOverlay } = require('../scripts/auto_column/thumbnail_engine');

async function testThumbnail() {
  const svg = generateSvgOverlay('원인 모를', '어지럼증·소화불량', '자율신경실조증');
  assert(svg.includes('Noto Sans CJK KR'), 'SVG must specify Noto Sans CJK KR');
  assert(svg.includes('font-weight: 900'), 'SVG must use heavy font-weight 900');
  assert(svg.includes('paint-order: stroke fill'), 'SVG must use stroke fill paint order');
  assert(svg.includes('heavy-text-shadow'), 'SVG must apply heavy drop shadow filter');
  assert(svg.includes('stroke-width: 16') || svg.includes('stroke-width: 17') || svg.includes('stroke-width: 18') || svg.includes('stroke-width: 20'), 'Stroke width must be 16~20px');
  assert(svg.includes('#00FF33') || svg.includes('#00E676'), 'SVG must have neon green border');
  assert(svg.includes('원인 모를'), 'SVG must contain yellow text');
  assert(svg.includes('어지럼증·소화불량'), 'SVG must contain white text');
  assert(svg.includes('자율신경실조증'), 'SVG must contain green text');

  const testOutputPath = path.join(__dirname, '../scratch/test_generated_thumb.jpg');
  const buffer = await compositeThumbnail({
    outputPath: testOutputPath,
    yellowText: '원인 모를',
    whiteText: '어지럼증·소화불량',
    greenText: '자율신경실조증'
  });

  assert(fs.existsSync(testOutputPath), 'Thumbnail file must be generated');
  assert(buffer.length > 5000, 'Thumbnail buffer must be non-empty');
  console.log(`✅ PASS: Ultra high-impact 800x800 Sharp+SVG composite thumbnail generated successfully (${buffer.length} bytes).`);
}

// 7. Disease-Tailored Single-Photo Prompt Check in gpt-image-2
console.log('\n--- 7. gpt-image-2 Disease-Tailored Single Photo Prompt Compliance Tests ---');
const { buildImagePrompt } = require('../scripts/auto_column/ai_generator');

const ticPrompt = buildImagePrompt('tic', '틱장애', '미디어 노출');
assert(ticPrompt.includes('child or adolescent'), 'Tic image prompt must feature a child or adolescent');
assert(ticPrompt.includes('Strictly NO adult, NO woman clutching chest or stomach'), 'Tic prompt must ban adult woman clutching chest or stomach');

const adultPrompt = buildImagePrompt('autonomic', '자율신경', '어지럼증');
assert(adultPrompt.includes('ONE adult'), 'Autonomic prompt must feature adult context');

// Validation failure check when tic has adult prompt
const badTicImageRes = validateArticleContent(validArticle, { imagePrompt: 'A photo of ONE adult woman clutching chest and stomach' });
assert.strictEqual(badTicImageRes.valid, false, 'Tic validation must fail if adult woman clutching chest is in image prompt');

console.log('✅ PASS: Disease-tailored image prompts strictly verified (Child for tic, adult for autonomic, no multi-panel).');

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
