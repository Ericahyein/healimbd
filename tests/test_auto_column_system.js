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
console.log('\n--- 3. Medical Knowledge Grounding (12 Files & approved status & specificRules) ---');
expectedCategories.forEach(catId => {
  const kmPath = path.join(__dirname, `../scripts/auto_column/medical_knowledge/${catId}.json`);
  assert(fs.existsSync(kmPath), `Medical knowledge file must exist: ${catId}.json`);
  const km = JSON.parse(fs.readFileSync(kmPath, 'utf-8'));
  assert.strictEqual(km.diseaseId, catId);
  assert.strictEqual(km.reviewStatus, 'approved', `${catId}.json must have reviewStatus='approved'`);
  assert(km.approvedDefinition && km.approvedDefinition.length > 10);
  assert(km.commonSymptoms && km.commonSymptoms.length >= 2);
  assert(km.possibleAggravatingFactors && km.possibleAggravatingFactors.length >= 2);
  assert(km.evaluationGuidance && km.evaluationGuidance.length > 10);
  assert(km.treatmentGuidance && km.treatmentGuidance.length > 10);
  assert(km.lifestyleTips && km.lifestyleTips.length >= 2);
  assert(km.specificRules && km.specificRules.length >= 2, `${catId}.json must have specificRules`);
  assert(km.bannedPhrases && km.bannedPhrases.length >= 2);

  if (km.evidenceNotes) {
    km.evidenceNotes.forEach(note => {
      assert(note.claim, 'Evidence note must have claim');
      assert(note.evidenceLevel, 'Evidence note must have evidenceLevel');
      if (note.verified === true) {
        assert(note.sourceTitle, 'Verified note must have sourceTitle');
        assert(note.doi || note.pmid || note.sourceUrl, 'Verified note must have DOI, PMID, or sourceUrl');
      }
    });
  }
});
console.log('✅ PASS: All 12 medical knowledge files verified with specificRules and structured evidenceNotes.');

// 4. Topic Planner & History Cooldown Rules
console.log('\n--- 4. Topic Planner & History Cooldown Rules ---');
const {
  isGeoDiseaseIn90DayCooldown,
  isDiseaseIn3DayCooldown,
  getKstCalendarDate,
  getKstCalendarDayDiff,
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

// 4-A. KST Calendar Day Calculation Tests
const kstBase = '2026-09-07T00:07:00.000Z'; // 09:07 KST on 2026-09-07
const sameDayKst = '2026-09-07T08:07:00.000Z'; // 17:07 KST on 2026-09-07
const day1DiffKst = '2026-09-08T00:07:00.000Z'; // 09:07 KST on 2026-09-08
const day2DiffKst = '2026-09-09T08:07:00.000Z'; // 17:07 KST on 2026-09-09
const day3DiffKst = '2026-09-10T00:07:00.000Z'; // 09:07 KST on 2026-09-10
const day4DiffKst = '2026-09-11T00:07:00.000Z'; // 09:07 KST on 2026-09-11

assert.strictEqual(getKstCalendarDayDiff(kstBase, sameDayKst), 0, 'Same day diff must be 0');
assert.strictEqual(getKstCalendarDayDiff(kstBase, day1DiffKst), 1, 'Day 2 diff must be 1');
assert.strictEqual(getKstCalendarDayDiff(kstBase, day2DiffKst), 2, 'Day 3 diff must be 2');
assert.strictEqual(getKstCalendarDayDiff(kstBase, day3DiffKst), 3, 'Day 4 diff must be 3');
assert.strictEqual(getKstCalendarDayDiff(kstBase, day4DiffKst), 4, 'Day 5 diff must be 4');
console.log('✅ PASS: KST calendar date difference calculations strictly verified.');

// 4-A-1. KST Date Formatting & Boundary Regression Tests
const { getKstIsoString, getKstDateString } = require('../scripts/auto_column/topic_planner');

// Canary execution: 2026-09-06 16:30:00 UTC = 2026-09-07 01:30:00 KST -> 2026-09-07 PASS
const canaryUtcDate = new Date('2026-09-06T16:30:00.000Z');
assert.strictEqual(getKstDateString(canaryUtcDate), '2026-09-07', '2026-09-06 16:30 UTC must produce 2026-09-07 KST date');
assert(getKstIsoString(canaryUtcDate).startsWith('2026-09-07T01:30:00'), 'KST ISO string must start with 2026-09-07T01:30:00');
assert(getKstIsoString(canaryUtcDate).endsWith('+09:00'), 'KST ISO string must have +09:00 offset');

// Midnight boundary tests
// Just before midnight: 2026-09-06 14:59:59.999 UTC = 2026-09-06 23:59:59.999 KST -> 2026-09-06
const preMidnightDate = new Date('2026-09-06T14:59:59.999Z');
assert.strictEqual(getKstDateString(preMidnightDate), '2026-09-06', 'Pre-midnight UTC must be 2026-09-06 KST');

// Exactly midnight: 2026-09-06 15:00:00.000 UTC = 2026-09-07 00:00:00.000 KST -> 2026-09-07
const midnightDate = new Date('2026-09-06T15:00:00.000Z');
assert.strictEqual(getKstDateString(midnightDate), '2026-09-07', 'Midnight UTC boundary must be 2026-09-07 KST');

// Scheduled times (09:07 and 17:07 KST)
const morningSchedule = new Date('2026-09-07T00:07:00.000Z'); // 09:07 KST
const eveningSchedule = new Date('2026-09-07T08:07:00.000Z'); // 17:07 KST
assert.strictEqual(getKstDateString(morningSchedule), '2026-09-07', '09:07 KST schedule must be 2026-09-07');
assert.strictEqual(getKstDateString(eveningSchedule), '2026-09-07', '17:07 KST schedule must be 2026-09-07');
console.log('✅ PASS: KST calendar date boundary and canary date regression tests verified 100%.');


// 4-B. Hard 3-Day Disease Cooldown Tests (0, 1, 2 days -> BLOCK, >=3 days -> ALLOWED)
const kstHistory = [{ disease: 'tic', publishDate: kstBase }];
assert.strictEqual(isDiseaseIn3DayCooldown(kstHistory, 'tic', new Date(sameDayKst)), true, '0-day diff MUST be blocked');
assert.strictEqual(isDiseaseIn3DayCooldown(kstHistory, 'tic', new Date(day1DiffKst)), true, '1-day diff MUST be blocked');
assert.strictEqual(isDiseaseIn3DayCooldown(kstHistory, 'tic', new Date(day2DiffKst)), true, '2-day diff MUST be blocked');
assert.strictEqual(isDiseaseIn3DayCooldown(kstHistory, 'tic', new Date(day3DiffKst)), false, '3-day diff MUST be allowed');
assert.strictEqual(isDiseaseIn3DayCooldown(kstHistory, 'tic', new Date(day4DiffKst)), false, '4-day diff MUST be allowed');
console.log('✅ PASS: Hard 3-day disease cooldown boundaries strictly verified (1d BLOCK, 2d BLOCK, 3d ALLOWED).');

// 4-C. planNextColumn Hard Exclusion Regression Test
const testTempHistoryPath = path.join(__dirname, '../scratch/test_plan_hard_block_history.json');
fs.writeFileSync(testTempHistoryPath, JSON.stringify([
  {
    publishDate: kstBase,
    geoId: 'seongnam-main',
    disease: 'tic',
    topicAngle: 'media-exposure'
  }
]));

try {
  // Day 2 (diff 1): tic MUST NOT be candidate
  const day2Plan = planNextColumn({
    historyPath: testTempHistoryPath,
    now: new Date(day1DiffKst)
  });
  assert.notStrictEqual(day2Plan.disease.id, 'tic', 'Day 2 plan must not pick tic');

  // Day 3 (diff 2): tic MUST NOT be candidate
  const day3Plan = planNextColumn({
    historyPath: testTempHistoryPath,
    now: new Date(day2DiffKst)
  });
  assert.notStrictEqual(day3Plan.disease.id, 'tic', 'Day 3 plan must not pick tic');
  console.log('✅ PASS: planNextColumn strictly excludes tic on Day 2 and Day 3 (Hard Block).');
} finally {
  if (fs.existsSync(testTempHistoryPath)) fs.unlinkSync(testTempHistoryPath);
}

const plan = planNextColumn({ now: new Date() });
assert(plan.geo && plan.disease && plan.topicAngle);
const expectedDiseaseName = plan.titleDisease || plan.disease.name;
assert(plan.titleCandidate.startsWith(`[${plan.geo.displayName} ${expectedDiseaseName}]`));
console.log(`✅ PASS: Topic Planner selected target -> [${plan.geo.displayName}] ${expectedDiseaseName} (${plan.titleCandidate})`);

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

const mixedConstitutionArticle = {
  ...validArticle,
  body: validArticle.body + '\n틱은 신경생물학적·체질적 특성이 관여하는 상태입니다.'
};
const resMixedConstitution = validateArticleContent(mixedConstitutionArticle);
assert.strictEqual(resMixedConstitution.valid, false, 'Mixing neurobiology and constitution in etiology must fail');
console.log('✅ PASS: Mixing neurobiology and constitution in etiology strictly blocked.');

const arbitraryDurationArticle = {
  ...validArticle,
  body: validArticle.body + '\n일주일 정도 기록해 보십시오.'
};
const resArbitraryDuration = validateArticleContent(arbitraryDurationArticle);
assert.strictEqual(resArbitraryDuration.valid, false, 'Arbitrary duration ("일주일 정도 기록") must fail validation');
console.log('✅ PASS: Arbitrary duration ("일주일 정도 기록") strictly blocked.');

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

// Duplicate H1 in Markdown Body Regression Tests
console.log('\n--- Duplicate H1 in Markdown Body Regression Tests ---');
const duplicateH1Article = {
  ...validArticle,
  body: `# [성남 틱장애] 미디어 노출이 증상에 미치는 영향과 일상 대처 요령\n\n` + validArticle.body
};
const resDuplicateH1 = validateArticleContent(duplicateH1Article);
assert.strictEqual(resDuplicateH1.valid, false, 'Article with duplicate H1 matching front matter title must fail');
assert(resDuplicateH1.errors.some(e => e.includes('Duplicate H1 violation')), 'Error must specify Duplicate H1 violation');
console.log('✅ PASS: Duplicate H1 matching front matter title strictly blocked.');

const noDuplicateH1Res = validateArticleContent(validArticle);
assert.strictEqual(noDuplicateH1Res.valid, true, 'Clean markdown body without duplicate H1 must pass');
console.log('✅ PASS: Clean markdown body without duplicate H1 passes validation.');

// Clinic Brand / Branch Identity Regression Tests (A ~ E)
console.log('\n--- Clinic Brand / Branch Identity Regression Tests (A ~ E) ---');
const { checkClinicBranchName } = require('../scripts/auto_column/content_validator');

// Test A: Title with GEO, Body with official "해아림한의원 분당점" -> PASS
const testA = checkClinicBranchName('[성남 틱장애] 미디어 노출 영향\n\n해아림한의원 분당점에서는 증상을 다각도로 살핍니다.');
assert.strictEqual(testA.valid, true, 'Test A: GEO title + "해아림한의원 분당점" MUST PASS');
console.log('✅ PASS [Test A]: "[성남 틱장애] ..." + "해아림한의원 분당점" passed.');

// Test B: Fabricated branch "성남 해아림한의원" -> FAIL
const testB = checkClinicBranchName('성남 해아림한의원에서는 진료를 진행합니다.');
assert.strictEqual(testB.valid, false, 'Test B: "성남 해아림한의원" MUST FAIL');
assert(testB.errors.some(e => e.includes('Clinic Branch Identity violation')), 'Test B must flag Clinic Branch Identity violation');
console.log('✅ PASS [Test B]: Fabricated branch "성남 해아림한의원" strictly blocked.');

// Test C: Fabricated branch "용인 해아림한의원" -> FAIL
const testC = checkClinicBranchName('용인 해아림한의원에서는 진료를 진행합니다.');
assert.strictEqual(testC.valid, false, 'Test C: "용인 해아림한의원" MUST FAIL');
assert(testC.errors.some(e => e.includes('Clinic Branch Identity violation')), 'Test C must flag Clinic Branch Identity violation');
console.log('✅ PASS [Test C]: Fabricated branch "용인 해아림한의원" strictly blocked.');

// Test D: General GEO context "판교에서 틱장애를 상담하다 보면..." -> PASS
const testD = checkClinicBranchName('판교에서 틱장애를 상담하다 보면 다양한 증상을 만납니다.');
assert.strictEqual(testD.valid, true, 'Test D: General GEO context "판교에서..." MUST PASS');
console.log('✅ PASS [Test D]: General GEO SEO context "판교에서..." allowed.');

// Test E: Official branch name "해아림한의원 분당점" -> PASS
const testE = checkClinicBranchName('해아림한의원 분당점');
assert.strictEqual(testE.valid, true, 'Test E: Official clinic name "해아림한의원 분당점" MUST PASS');
console.log('✅ PASS [Test E]: Official branch name "해아림한의원 분당점" passed.');


// 6. Thumbnail Engine Synthesis (High Impact Typography, Smooth Natural Vignette & 16~20px Stroke)
console.log('\n--- 6. Thumbnail Synthesis Engine (High-Impact Typography & Natural Vignette) ---');
const { compositeThumbnail, generateSvgOverlay } = require('../scripts/auto_column/thumbnail_engine');

async function testThumbnail() {
  const svg = generateSvgOverlay('원인 모를', '어지럼증·소화불량', '자율신경실조증');
  assert(svg.includes('Noto Sans CJK KR'), 'SVG must specify Noto Sans CJK KR');
  assert(svg.includes('font-weight: 900'), 'SVG must use heavy font-weight 900');
  assert(svg.includes('paint-order: stroke fill'), 'SVG must use stroke fill paint order');
  assert(svg.includes('heavy-text-shadow'), 'SVG must apply heavy drop shadow filter');
  assert(svg.includes('natural-vignette'), 'SVG must apply smooth natural vignette gradient');
  assert(!svg.includes('height="460"'), 'SVG must NOT contain flat dark rectangular band');
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
  console.log(`✅ PASS: Natural vignette 800x800 Sharp+SVG composite thumbnail generated successfully (${buffer.length} bytes).`);
}

// 7. Disease + TopicAngle Tailored Single-Photo Prompt & Fallback Check in gpt-image-2
console.log('\n--- 7. gpt-image-2 Disease + TopicAngle Tailored Safe Photo & Fallback Tests ---');
const { buildImagePrompt, buildFallbackImagePrompt } = require('../scripts/auto_column/ai_generator');

const ticMediaPrompt = buildImagePrompt('tic', '틱장애', 'media-exposure', '미디어 및 스마트폰 사용이 증상에 미치는 영향');
assert(ticMediaPrompt.includes('Korean school-age child'), 'Tic image prompt must feature a Korean school-age child');
assert(ticMediaPrompt.includes('tablet or smartphone resting quietly on a side table'), 'Tic+media prompt must reflect turned-off tablet/smartphone background');
assert(ticMediaPrompt.includes('NOT depict or simulate a medical symptom'), 'Tic prompt must not simulate symptoms');
assert(ticMediaPrompt.includes('no forced blinking or facial tic simulation'), 'Tic prompt must ban forced blinking');

const panicTransitPrompt = buildImagePrompt('panic', '공황장애', 'subway', '지하철 등 밀폐 공간');
assert(panicTransitPrompt.includes('transit or commute environment'), 'Panic+transit prompt must reflect transit environment');

const ticFallback = buildFallbackImagePrompt('tic', '틱장애', 'media-exposure', '미디어 노출');
assert(ticFallback.includes('Korean school-age child'), 'Fallback must feature Korean school-age child');
assert(ticFallback.includes('no medical symptoms'), 'Fallback must state no medical symptoms');

const adultPrompt = buildImagePrompt('autonomic', '자율신경', 'general', '어지럼증');
assert(adultPrompt.includes('Korean adult'), 'Autonomic prompt must feature adult context');

// Validation failure check when tic has adult clutching chest prompt
const badTicImageRes = validateArticleContent(validArticle, { imagePrompt: 'A photo of ONE adult woman clutching chest and stomach in pain' });
assert.strictEqual(badTicImageRes.valid, false, 'Tic validation must fail if adult woman clutching chest is in image prompt');

console.log('✅ PASS: Disease + TopicAngle tailored image prompts & neutral fallbacks strictly verified.');

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
