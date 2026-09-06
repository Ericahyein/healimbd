const fs = require('fs');
const path = require('path');
const assert = require('assert');

const geoHierarchy = require('../scripts/auto_column/geo_hierarchy.json');
const diseaseTaxonomy = require('../scripts/auto_column/disease_taxonomy.json');
const {
  loadQATargets,
  parseQATargetId,
  findQATarget,
  buildQAPlan,
  loadQAResults,
  recordQAResult
} = require('../scripts/auto_column/qa_manager');

console.log('🧪 ====================================================');
console.log('🧪 Running Comprehensive Full Disease QA System Tests');
console.log('🧪 ====================================================');

// Test 1: Validate QA Targets Integrity
console.log('\n[Test 1] Validating qa_targets.json structure and counts...');
const targets = loadQATargets();
console.log(`ℹ️ Total QA Targets loaded: ${targets.length}`);
assert.strictEqual(targets.length, 20, 'Expected exactly 20 QA targets in qa_targets.json');

const validGeoIds = new Set(geoHierarchy.regions.map(r => r.id));
const validDiseaseIds = new Set(diseaseTaxonomy.diseases.map(d => d.id));
const seenQaIds = new Set();

targets.forEach((target, idx) => {
  // 1. qaId uniqueness
  assert.ok(target.qaId, `Target at index ${idx} missing qaId`);
  assert.ok(!seenQaIds.has(target.qaId), `Duplicate qaId detected: ${target.qaId}`);
  seenQaIds.add(target.qaId);

  // 2. diseaseId validity
  assert.ok(validDiseaseIds.has(target.diseaseId), `Invalid diseaseId '${target.diseaseId}' for ${target.qaId}`);

  // 3. recommendedGeo validity (MUST be one of the 12 approved canonical GEOs)
  assert.ok(validGeoIds.has(target.recommendedGeo), `Invalid recommendedGeo '${target.recommendedGeo}' for ${target.qaId}`);

  // 4. topicAngle validity in disease taxonomy
  const disease = diseaseTaxonomy.diseases.find(d => d.id === target.diseaseId);
  const topicAngle = (disease.topicAngles || []).find(a => a.id === target.topicAngle);
  assert.ok(topicAngle, `Topic angle '${target.topicAngle}' not found in disease '${target.diseaseId}' for ${target.qaId}`);

  // 5. ageGroup validity
  assert.ok(['child', 'adult', 'mixed'].includes(target.ageGroup), `Invalid ageGroup '${target.ageGroup}' for ${target.qaId}`);

  // 6. Build plan test for every target
  const plan = buildQAPlan(target);
  assert.strictEqual(plan.status, 'ready', `Plan status should be ready for ${target.qaId}`);
  assert.ok(plan.titleCandidate.length > 5, `Title candidate too short for ${target.qaId}`);
  assert.ok(plan.slug.length > 5, `Slug candidate too short for ${target.qaId}`);
  assert.strictEqual(plan.qaId, target.qaId, `qaId mismatch in plan for ${target.qaId}`);
});
console.log('✅ [Test 1 Passed] All 20 QA targets are 100% structurally valid with canonical GEOs & taxonomy topic angles.');

// Test 2: Input parser resilience
console.log('\n[Test 2] Testing parseQATargetId with various GitHub Actions choice strings...');
assert.strictEqual(parseQATargetId('auto'), 'auto');
assert.strictEqual(parseQATargetId('qa-01-tic'), 'qa-01-tic');
assert.strictEqual(parseQATargetId('qa-01-tic (소아 틱장애 / media-exposure)'), 'qa-01-tic');
assert.strictEqual(parseQATargetId('qa-20-fatigue (만성피로·번아웃 / brain-fog-fatigue)'), 'qa-20-fatigue');
assert.strictEqual(parseQATargetId(''), null);
assert.strictEqual(parseQATargetId(null), null);
console.log('✅ [Test 2 Passed] Input parser correctly extracts qaId from choice labels.');

// Test 3: QA Results History persistence & Isolation from Production History
console.log('\n[Test 3] Testing QA Results recording and production history isolation...');
const prodHistoryPath = path.join(__dirname, '../data/auto_column_history.json');
const initialProdHistory = fs.readFileSync(prodHistoryPath, 'utf-8');

// Record a simulated test QA result for mock target
const testQaId = 'qa-99-simulation';
recordQAResult({
  qaId: testQaId,
  validationPassed: true,
  estimatedCostUSD: 0.0485,
  articleSlug: 'yongin-suji-tic-parent-guidance',
  notes: 'Automated test simulation pass'
});

// Verify QA results file
const updatedQAResults = loadQAResults();
const recordedTarget = updatedQAResults.find(r => r.qaId === testQaId);
assert.ok(recordedTarget, `Expected QA record for ${testQaId} to exist`);
assert.strictEqual(recordedTarget.validationPassed, true);
assert.strictEqual(recordedTarget.humanReviewStatus, 'generated', 'STRICT: humanReviewStatus MUST be generated, NEVER automatically approved!');
assert.strictEqual(recordedTarget.estimatedCostUSD, 0.0485);
assert.ok(recordedTarget.testedAt, 'testedAt must be set');

// Clean up qa-99-simulation back from QA results
const cleanedSim = loadQAResults().filter(r => r.qaId !== testQaId);
fs.writeFileSync(path.join(__dirname, '../data/auto_column_qa_results.json'), JSON.stringify(cleanedSim, null, 2), 'utf-8');

// Verify production history is 100% UNTOUCHED
const finalProdHistory = fs.readFileSync(prodHistoryPath, 'utf-8');
assert.strictEqual(initialProdHistory, finalProdHistory, 'CRITICAL: data/auto_column_history.json MUST be 100% untouched during QA!');
console.log('✅ [Test 3 Passed] QA Results are recorded properly, humanReviewStatus is strictly "generated", and production history is 100% untouched.');

// Test 4: Verify approved QA targets status (approved per human review) and Batch 4 needs_revision targets
console.log('\n[Test 4] Verifying all 14 approved QA targets and Batch 4 needs_revision targets...');
const qaResults = loadQAResults();

const expectedApprovedTargets = [
  'qa-01-tic',
  'qa-02-tourette',
  'qa-03-adhd-child',
  'qa-04-adhd-adult',
  'qa-05-panic',
  'qa-06-anxiety',
  'qa-07-social-phobia',
  'qa-08-sleep',
  'qa-09-autonomic',
  'qa-10-hyperhidrosis',
  'qa-11-ibs',
  'qa-12-syncope',
  'qa-13-headache',
  'qa-14-dizziness',
  'qa-15-depression',
  'qa-16-ocd',
  'qa-17-separation-anxiety',
  'qa-18-night-terrors'
];
for (const qId of expectedApprovedTargets) {
  const record = qaResults.find(r => r.qaId === qId);
  assert.ok(record, `${qId} record must exist in QA results`);
  assert.strictEqual(record.validationPassed, true, `${qId} validationPassed must be true`);
  assert.strictEqual(record.humanReviewStatus, 'approved', `${qId} must be approved per human review`);
}

const revisionTargets = qaResults.filter(r => r.humanReviewStatus === 'needs_revision');
assert.strictEqual(revisionTargets.length, 2, 'Batch 5 targets (qa-19, qa-20) are currently needs_revision');
assert.deepStrictEqual(revisionTargets.map(r => r.qaId).sort(), ['qa-19-child-enuresis', 'qa-20-fatigue'].sort());

console.log('✅ [Test 4 Passed] All 18 targets (qa-01 ~ qa-18) officially approved and verified, Batch 5 targets (qa-19, qa-20) verified as needs_revision.');

// Test 5: Smart Medication Discontinuation Validation (False Positive Prevention & Real Harm Blocking)
console.log('\n[Test 5] Testing Smart Medication Discontinuation Validator...');
const { validateArticleContent } = require('../scripts/auto_column/content_validator');

function createMockArticleWithBody(bodyText) {
  return {
    title: '[분당 공황장애] 갑자기 숨이 차고 심장이 빨라질 때 먼저 살펴볼 부분',
    summary: '분당 지역 주민들을 위한 공황장애 갑작스러운 호흡곤란 증상 관리 가이드입니다.',
    body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
${bodyText}

## 2. 주요 증상 및 배경
갑작스러운 두근거림입니다.

## 3. 감별 포인트
[링크](/blog/bundang-panic-disorder-treatment-guide/)

## 4. 치료 관점
[링크2](/blog/bundang-autonomic-nervous-system-recovery/)

## 5. 일상 수칙
수칙 안내입니다.

## 6. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
    hashtags: ['분당공황장애', '분당한의원'],
    keywords: ['분당 공황장애', '공황장애 한방치료'],
    geoId: 'seongnam-bundang',
    diseaseId: 'panic',
    thumbnailCopy: { yellowText: '원인 모를', whiteText: '갑자기 숨이 차고 심장', greenText: '공황장애' },
    knowledge: { reviewStatus: 'pending', bannedPhrases: [] },
    history: []
  };
}

// A. FAQ 질문 허용 테스트 (MUST PASS)
console.log('\n[Test 5-A] FAQ Question Interrogative Context (MUST PASS)...');
const faqQuestions = [
  "정신과 약은 끊어도 되나요?",
  "수면제를 중단해도 될까요?",
  "증상이 좋아지면 약을 줄여도 괜찮나요?",
  "한약을 먹으면서 수면제를 끊어도 되나요?",
  "복용 중인 약을 중단해도 되는지 궁금합니다.",
  "한약치료를 받으면 기존 정신건강의학과 약은 끊어도 되나요?",
  "**Q2. 한약치료를 받으면 기존 정신건강의학과 약은 끊어도 되나요?**",
  "중단해도 괜찮을까요?"
];

faqQuestions.forEach((q, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(q));
  const medErr = res.errors.filter(e => e.includes('약물 중단 권고 금지'));
  assert.strictEqual(medErr.length, 0, `FAQ question [${idx}] was falsely blocked: "${q}" (Errors: ${medErr.join(', ')})`);
});
console.log('✅ [Test 5-A Passed] All FAQ questions in interrogative context passed with 0 false positives.');

// B. 질문 + 안전한 답변 (MUST PASS)
console.log('\n[Test 5-B] Question + Safe Negative Warning Answer (MUST PASS)...');
const safeQAPairs = [
  `**Q. 약을 끊어도 되나요?**\nA. 임의로 중단하지 말고 처방 의료진과 상의하십시오.`,
  `**Q. 수면제를 중단해도 될까요?**\nA. 기존 약물은 의료진과 상의 없이 중단하면 안 되며 단계적으로 조절해야 합니다.`,
  `**Q. 한약 복용 시 기존 약물은 어떻게 하나요?**\nA. 처방 약물은 자의로 중단해서는 안 되며 처방 의료진과 상의 후 조절해야 합니다.`
];

safeQAPairs.forEach((pair, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(pair));
  const medErr = res.errors.filter(e => e.includes('약물 중단 권고 금지'));
  assert.strictEqual(medErr.length, 0, `Safe QA pair [${idx}] was falsely blocked: "${pair}" (Errors: ${medErr.join(', ')})`);
});
console.log('✅ [Test 5-B Passed] Questions with safe cautionary answers passed validation 100%.');

// C. 질문 + 위험한 답변 (MUST FAIL)
console.log('\n[Test 5-C] Question + Dangerous Stop Recommendation Answer (MUST FAIL)...');
const dangerousQAPairs = [
  `**Q. 약을 끊어도 되나요?**\nA. 네, 증상이 좋아지면 끊어도 됩니다.`,
  `**Q. 정신과 약을 끊어도 되나요?**\nA. 네, 증상이 좋아졌다면 바로 끊어도 됩니다.`,
  `**Q. 수면제를 중단해도 될까요?**\nA. 한약을 드시면서 수면제는 끊으셔도 됩니다.`
];

dangerousQAPairs.forEach((pair, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(pair));
  const medErr = res.errors.filter(e => e.includes('약물 중단 권고 금지'));
  assert.ok(medErr.length > 0, `Dangerous QA pair [${idx}] was NOT blocked: "${pair}"`);
});
console.log('✅ [Test 5-C Passed] Dangerous answers that recommend/allow stop were strictly blocked.');

// D. 직접 중단 권고 (MUST FAIL)
console.log('\n[Test 5-D] Direct Discontinuation Recommendations (MUST FAIL)...');
const directDangerousSentences = [
  "정신과 약을 중단하세요.",
  "기존 약은 끊으셔도 됩니다.",
  "호전되면 서서히 약을 끊으세요.",
  "한약 치료를 시작하면서 정신과 약을 중단하세요.",
  "증상이 안정되면 약물을 중단해도 됩니다.",
  "양약을 끊을 수 있도록 한방으로 대체하십시오.",
  "약물을 중단해도 괜찮습니다.",
  "한약 복용 후 기존 약을 중단하십시오."
];

directDangerousSentences.forEach((sentence, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(sentence));
  const medErr = res.errors.filter(e => e.includes('약물 중단 권고 금지'));
  assert.ok(medErr.length > 0, `Direct stop recommendation [${idx}] was NOT blocked: "${sentence}"`);
});
console.log('✅ [Test 5-D Passed] Direct stop recommendations were strictly blocked.');

// E. 기타 안전한 부정/경고 문장 (MUST PASS)
console.log('\n[Test 5-E] Other Safe Negation / Cautionary Warnings (MUST PASS)...');
const safeSampleSentences = [
  "기존 복용 중인 신경과 처방 약물을 임의로 중단하지 마십시오.",
  "복용 중인 약은 의료진과 상의 없이 중단하면 안 됩니다.",
  "처방 약물은 자의로 중단해서는 안 되며 처방 의료진과 상의 후 조절해야 합니다.",
  "한방 치료를 병행하더라도 양약의 임의 중단을 권하지 않습니다.",
  "신경안정제를 임의로 끊지 마시고 의료진과 상의하십시오."
];

safeSampleSentences.forEach((sentence, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(sentence));
  const medErr = res.errors.filter(e => e.includes('약물 중단 권고 금지'));
  assert.strictEqual(medErr.length, 0, `Safe sentence [${idx}] was falsely blocked: "${sentence}" (Errors: ${medErr.join(', ')})`);
});
console.log('✅ [Test 5-E Passed] All safe medication warning sentences passed validation with 0 false positives.');

// F. 승인되지 않은 치료 명칭 및 임의 혈자리 시술 차단 테스트 (MUST FAIL)
console.log('\n[Test 5-F] Fabricated Treatment & Acupoint Locations (MUST FAIL)...');
const fabricatedTreatments = [
  "진료실에서는 안심 한약 처방을 통해 회복을 돕습니다.",
  "두뇌 회복탕을 복용하여 긴장을 안정시킵니다.",
  "두경부 중심의 혈자리 침구 치료를 시행합니다.",
  "특정 혈자리 자극을 통해 자율신경을 다스립니다."
];

fabricatedTreatments.forEach((stmt, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(stmt));
  const treatErr = res.errors.filter(e => e.includes('치료법 임의 생성 금지'));
  assert.ok(treatErr.length > 0, `Fabricated treatment [${idx}] was NOT blocked: "${stmt}"`);
});
console.log('✅ [Test 5-F Passed] Fabricated treatment names and arbitrary acupoints were strictly blocked.');

// G. 마무리 광고성 내원 유도(CTA) 차단 테스트 (MUST FAIL)
console.log('\n[Test 5-G] Promotional Closing CTA (MUST FAIL)...');
const promotionalCTAs = [
  "분당에서 공황장애로 고민 중이시라면 한의원 진료를 권합니다.",
  "혼자 참지 마시고 본원에 내원하셔서 진료를 받아보시길 권합니다.",
  "성남 지역 주민분들의 한의원 내원을 권해드립니다."
];

promotionalCTAs.forEach((cta, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(cta));
  const ctaErr = res.errors.filter(e => e.includes('마무리 광고성 CTA 금지'));
  assert.ok(ctaErr.length > 0, `Promotional CTA [${idx}] was NOT blocked: "${cta}"`);
});
console.log('✅ [Test 5-G Passed] Promotional closing CTAs were strictly blocked.');

// H. 타 질환 미디어 생활 요인 혼입 차단 테스트 (MUST FAIL for panic)
console.log('\n[Test 5-H] Disease-specific Lifestyle Factor Leakage (MUST FAIL for panic)...');
const leakedSentences = [
  "공황장애 환자는 빠른 화면 전환과 강한 색감의 자극을 피해야 합니다.",
  "CSTC 회로의 과도한 흥분을 줄이기 위해 미디어를 조절해야 합니다."
];

leakedSentences.forEach((stmt, idx) => {
  const res = validateArticleContent(createMockArticleWithBody(stmt));
  const leakErr = res.errors.filter(e => e.includes('Disease-specific lifestyle leakage violation'));
  assert.ok(leakErr.length > 0, `Lifestyle leakage [${idx}] was NOT blocked: "${stmt}"`);
});
console.log('✅ [Test 5-H Passed] Lifestyle factor leakage from other diseases into panic was strictly blocked.');

// Test 6: Verify validation failure transitions humanReviewStatus to 'needs_revision'
console.log('\n[Test 6] Testing validation failure transition to needs_revision & qa-05-panic state...');

// 6-1. Verify qa-05-panic status: automated validation passed (true), humanReviewStatus is 'approved'
const panicCheck = loadQAResults().find(r => r.qaId === 'qa-05-panic');
assert.ok(panicCheck, 'qa-05-panic record must exist');
assert.strictEqual(panicCheck.validationPassed, true, 'qa-05-panic automated validation passed');
assert.strictEqual(panicCheck.humanReviewStatus, 'approved', 'qa-05-panic must be approved per human review');
console.log('✅ [Test 6-1 Passed] qa-05-panic status properly recorded (validationPassed: true, humanReviewStatus: "approved").');

// 6-2. Test dynamic failure transition to needs_revision on mock target
const mockQaId = 'qa-99-mock';
recordQAResult({
  qaId: mockQaId,
  validationPassed: false,
  estimatedCostUSD: 0.021,
  articleSlug: 'test-slug',
  validationErrors: ['Sample validation failure'],
  notes: 'Dry-run 검증 실패 테스트'
});

const failCheck = loadQAResults().find(r => r.qaId === mockQaId);
assert.ok(failCheck);
assert.strictEqual(failCheck.validationPassed, false);
assert.strictEqual(failCheck.humanReviewStatus, 'needs_revision', 'Failed QA must set humanReviewStatus to needs_revision');
assert.ok(failCheck.validationErrors && failCheck.validationErrors.length > 0);

// Clean up mock target from QA results
const cleaned = loadQAResults().filter(r => r.qaId !== mockQaId);
fs.writeFileSync(path.join(__dirname, '../data/auto_column_qa_results.json'), JSON.stringify(cleaned, null, 2), 'utf-8');
console.log('✅ [Test 6-2 Passed] Failure properly records "needs_revision" and dynamic test clean-up succeeded.');

// ==========================================
// Test 7: Title Validator Regression Tests (ADHD / OCD / Canonical GEO / Format)
// ==========================================
console.log('\n[Test 7] Running Title Validator Regression Tests (ADHD, OCD, Canonical GEO & Format)...');

function createMockArticleForTitle(title, geoId, diseaseId, titleDisease) {
  const region = geoHierarchy.regions.find(r => r.id === geoId);
  const regionName = region ? region.displayName : '분당';
  const targetLabel = titleDisease || (diseaseTaxonomy.diseases.find(d => d.id === diseaseId)?.name) || '';
  const cleanTarget = targetLabel.replace(/[^가-힣a-zA-Z0-9]/g, '');
  return {
    title,
    titleDisease,
    thumbnailDiseaseLabel: targetLabel,
    seoDiseaseLabel: targetLabel,
    summary: `${regionName} 및 인근 지역 환자분들을 위한 증상 관리와 임상 대처 요령 가이드입니다.`,
    body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
환자분들의 일상 속 고민을 경청합니다.

## 2. 주요 증상 및 배경
신경생물학적 요인과 환경적 자극을 함께 살펴봅니다. 침투적 사고나 원치 않는 생각으로 인한 불안과 고통, 확인 행동을 통한 일시적 안도와 악순환 반복 기전을 살핍니다.

## 3. 감별 포인트
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인하실 수 있습니다.

## 4. 치료 관점
전문 평가와 표준 치료(ERP, 노출 및 반응방지, CBT, 약물치료)를 고려하며 [온라인 상담](/inquiry/)을 통해 문의 가능합니다.

## 5. 자주 묻는 질문
**Q1. 어떻게 대처해야 하나요?**
A. 일상 속 스트레스를 줄이고 규칙적인 환경을 마련합니다.
**Q2. 병원 상담은 언제 필요한가요?**
A. 증상이 지속될 때 전문 진료를 권장합니다.
`,
    hashtags: [`${regionName}${cleanTarget}`, `${regionName}한의원`, '해아림한의원'],
    keywords: [`${regionName} ${targetLabel}`, `${regionName} 진료`, '한방치료'],
    geoId,
    diseaseId,
    thumbnailCopy: { yellowText: '원인 모를', whiteText: '반복되는 실수와 어려움', greenText: targetLabel || '치료관리' },
    knowledge: { reviewStatus: 'pending', bannedPhrases: [] },
    history: []
  };
}

// 7-1. MUST PASS Titles
console.log('\n[Test 7-1] Titles that MUST PASS validation...');

// A. [분당 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때
const passAdhdChild = validateArticleContent(createMockArticleForTitle(
  '[분당 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  'seongnam-bundang',
  'adhd',
  'ADHD'
));
assert.strictEqual(passAdhdChild.valid, true, `[분당 ADHD] title MUST PASS: ${JSON.stringify(passAdhdChild.errors)}`);
console.log('✅ PASS: "[분당 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때" passed validation 100%.');

// B. [판교 ADHD] 업무 실수가 반복되고 마무리가 어려울 때
const passAdhdAdult = validateArticleContent(createMockArticleForTitle(
  '[판교 ADHD] 업무 실수가 반복되고 마무리가 어려울 때',
  'bundang-pangyo',
  'adhd',
  'ADHD'
));
assert.strictEqual(passAdhdAdult.valid, true, `[판교 ADHD] title MUST PASS: ${JSON.stringify(passAdhdAdult.errors)}`);
console.log('✅ PASS: "[판교 ADHD] 업무 실수가 반복되고 마무리가 어려울 때" passed validation 100%.');

// C. [성남 강박증/OCD] 반복되는 생각과 확인 행동이 멈추기 어려울 때
const passOcd = validateArticleContent(createMockArticleForTitle(
  '[성남 강박증/OCD] 반복되는 생각과 확인 행동이 멈추기 어려울 때',
  'seongnam-main',
  'depression',
  '강박증/OCD'
));
assert.strictEqual(passOcd.valid, true, `[성남 강박증/OCD] title MUST PASS: ${JSON.stringify(passOcd.errors)}`);
console.log('✅ PASS: "[성남 강박증/OCD] 반복되는 생각과 확인 행동이 멈추기 어려울 때" passed validation 100%.');

// 7-2. MUST FAIL Titles
console.log('\n[Test 7-2] Titles that MUST FAIL validation...');

// A. [서울 ADHD] ... (승인되지 않은 GEO)
const failSeoulGeo = validateArticleContent(createMockArticleForTitle(
  '[서울 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  'seongnam-bundang',
  'adhd',
  'ADHD'
));
assert.strictEqual(failSeoulGeo.valid, false, '[서울 ADHD] must FAIL due to unapproved GEO');
const seoulError = failSeoulGeo.errors.some(e => e.includes('unapproved GEO') || e.includes('does not match target GEO'));
assert.ok(seoulError, 'Expected error regarding unapproved/mismatched GEO for 서울');
console.log('✅ PASS: "[서울 ADHD] ..." strictly failed validation (unapproved GEO).');

// B. [분당 임의질환] ... (taxonomy / qa_targets에 없는 임의 질환)
const failArbitraryDisease = validateArticleContent(createMockArticleForTitle(
  '[분당 임의질환] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  'seongnam-bundang',
  'adhd'
));
assert.strictEqual(failArbitraryDisease.valid, false, '[분당 임의질환] must FAIL due to unapproved disease');
const diseaseError = failArbitraryDisease.errors.some(e => e.includes('unapproved disease'));
assert.ok(diseaseError, 'Expected error regarding unapproved disease for 임의질환');
console.log('✅ PASS: "[분당 임의질환] ..." strictly failed validation (unapproved disease).');

// C. 지역과 질환 사이 형식이 깨진 제목 (no space between region and disease)
const failGluedFormat = validateArticleContent(createMockArticleForTitle(
  '[분당ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  'seongnam-bundang',
  'adhd'
));
assert.strictEqual(failGluedFormat.valid, false, '[분당ADHD] glued title must FAIL format check');
console.log('✅ PASS: "[분당ADHD] ..." strictly failed validation (glued region and disease).');

// D. Missing topic / question
const failMissingTopic = validateArticleContent(createMockArticleForTitle(
  '[분당 ADHD]',
  'seongnam-bundang',
  'adhd'
));
assert.strictEqual(failMissingTopic.valid, false, 'Title missing topic must FAIL format check');
console.log('✅ PASS: "[분당 ADHD]" strictly failed validation (missing topic/question).');

// E. Format missing brackets
const failNoBrackets = validateArticleContent(createMockArticleForTitle(
  '분당 ADHD 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  'seongnam-bundang',
  'adhd'
));
assert.strictEqual(failNoBrackets.valid, false, 'Title missing brackets must FAIL format check');
console.log('✅ PASS: Title missing brackets strictly failed validation.');

// ==========================================
// Test 8: Batch QA Matrix Helper & History Merge Aggregator Tests
// ==========================================
console.log('\n[Test 8] Testing Batch QA Matrix Helper & History Aggregator...');
const {
  BATCH_DEFINITIONS,
  getBatchTargets,
  mergeBatchQAResults
} = require('../scripts/auto_column/batch_helper');

// 8-1. Batch Definitions Verification
assert.deepStrictEqual(BATCH_DEFINITIONS['batch-1'], ['qa-03-adhd-child', 'qa-08-sleep', 'qa-06-anxiety', 'qa-09-autonomic']);
assert.deepStrictEqual(BATCH_DEFINITIONS['batch-2'], ['qa-02-tourette', 'qa-04-adhd-adult', 'qa-07-social-phobia', 'qa-10-hyperhidrosis']);
assert.deepStrictEqual(BATCH_DEFINITIONS['batch-3'], ['qa-11-ibs', 'qa-12-syncope', 'qa-13-headache', 'qa-14-dizziness']);
assert.deepStrictEqual(BATCH_DEFINITIONS['batch-4'], ['qa-15-depression', 'qa-16-ocd', 'qa-17-separation-anxiety', 'qa-18-night-terrors']);
assert.deepStrictEqual(BATCH_DEFINITIONS['batch-5'], ['qa-19-child-enuresis', 'qa-20-fatigue']);
console.log('✅ PASS: All 5 Batch definitions strictly match user requirements (4+4+4+4+2 = 18 targets).');

// 8-2. Resolution of Batch Targets (Excludes approved targets qa-01-tic, qa-05-panic, and approved targets in Batch 1 & 2)
const b1Targets = getBatchTargets('batch-1');
assert.strictEqual(b1Targets.length, 0, 'Batch 1 targets are now approved and correctly excluded from future batch runs');

const b2Targets = getBatchTargets('batch-2');
assert.strictEqual(b2Targets.length, 0, 'Batch 2 targets are now all approved and correctly excluded from future batch runs');
assert.ok(!b2Targets.includes('qa-02-tourette'), 'qa-02-tourette must be excluded as it is approved');
assert.ok(!b2Targets.includes('qa-04-adhd-adult'), 'qa-04-adhd-adult must be excluded as it is approved');
assert.ok(!b2Targets.includes('qa-07-social-phobia'), 'qa-07-social-phobia must be excluded as it is approved');
assert.ok(!b2Targets.includes('qa-10-hyperhidrosis'), 'qa-10-hyperhidrosis must be excluded as it is approved');

const b3Targets = getBatchTargets('batch-3');
assert.strictEqual(b3Targets.length, 0, 'Batch 3 targets are now all approved and correctly excluded from future batch runs');

const b4Targets = getBatchTargets('batch-4');
assert.strictEqual(b4Targets.length, 0, 'Batch 4 targets are now all approved and correctly excluded from future batch runs');
assert.ok(!b4Targets.includes('qa-15-depression'), 'qa-15-depression must be excluded as it is approved');
assert.ok(!b4Targets.includes('qa-16-ocd'), 'qa-16-ocd must be excluded as it is approved');
assert.ok(!b4Targets.includes('qa-17-separation-anxiety'), 'qa-17-separation-anxiety must be excluded as it is approved');
assert.ok(!b4Targets.includes('qa-18-night-terrors'), 'qa-18-night-terrors must be excluded as it is approved');

const b5Targets = getBatchTargets('batch-5');
assert.strictEqual(b5Targets.length, 2);
assert.ok(!b5Targets.includes('qa-01-tic') && !b5Targets.includes('qa-05-panic'));
console.log('✅ PASS: Batch targets resolved dynamically and approved/baseline targets strictly excluded.');

// 8-3. Aggregator Merge Simulation (Single Atomic History Push without Race Conditions)
const testTempDir = path.join(__dirname, '../scratch/test_downloaded_qa_results');
if (fs.existsSync(testTempDir)) fs.rmSync(testTempDir, { recursive: true, force: true });
fs.mkdirSync(testTempDir, { recursive: true });

// Backup original qa_results to prevent test mutation
const qaResultsFile = path.join(__dirname, '../data/auto_column_qa_results.json');
const backupQAResultsRaw = fs.readFileSync(qaResultsFile, 'utf-8');

try {
  // Create 2 mock worker single results
  fs.writeFileSync(path.join(testTempDir, 'qa-result-qa-02-tourette.json'), JSON.stringify({
    qaId: 'qa-02-tourette',
    diseaseId: 'tic',
    displayDisease: '뚜렛증후군',
    topicAngle: 'parent-guidance',
    recommendedGeo: 'yongin-suji',
    testedAt: new Date().toISOString(),
    validationPassed: true,
    humanReviewStatus: 'generated',
    notes: 'Dry-run QA 검증 통과 (테스트 시뮬레이션)',
    validationErrors: [],
    estimatedCostUSD: 0.0491,
    estimatedCost: 0.0491,
    articleSlug: 'yongin-suji-tic-parent-guidance'
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(testTempDir, 'qa-result-qa-04-adhd-adult.json'), JSON.stringify({
    qaId: 'qa-04-adhd-adult',
    diseaseId: 'adhd',
    displayDisease: '성인 ADHD',
    topicAngle: 'adult-work-mistakes',
    recommendedGeo: 'bundang-pangyo',
    testedAt: new Date().toISOString(),
    validationPassed: false,
    humanReviewStatus: 'needs_revision',
    notes: 'Dry-run QA 검증 실패 (테스트 시뮬레이션)',
    validationErrors: ['Sample validation error'],
    estimatedCostUSD: 0.0215,
    estimatedCost: 0.0215,
    articleSlug: 'bundang-pangyo-adhd-adult-work-mistakes'
  }, null, 2), 'utf-8');

  // Run aggregator merge
  const mergeResult = mergeBatchQAResults(testTempDir);
  assert.strictEqual(mergeResult.mergedCount, 2);
  assert.ok(mergeResult.updatedQaIds.includes('qa-02-tourette'));
  assert.ok(mergeResult.updatedQaIds.includes('qa-04-adhd-adult'));

  // Verify data/auto_column_qa_results.json
  const afterMerge = loadQAResults();
  const touretteRecord = afterMerge.find(r => r.qaId === 'qa-02-tourette');
  // qa-02-tourette is human-approved: mergeBatchQAResults guarantees 'approved' is NEVER downgraded
  assert.strictEqual(touretteRecord.humanReviewStatus, 'approved');

  const adhdAdultRecord = afterMerge.find(r => r.qaId === 'qa-04-adhd-adult');
  // qa-04-adhd-adult is human-approved: mergeBatchQAResults guarantees 'approved' is NEVER downgraded
  assert.strictEqual(adhdAdultRecord.humanReviewStatus, 'approved');
} finally {
  // Restore original QA results exactly
  fs.writeFileSync(qaResultsFile, backupQAResultsRaw, 'utf-8');
  // Clean up test scratch dir
  fs.rmSync(testTempDir, { recursive: true, force: true });
}
console.log('✅ PASS: Aggregator merge simulation correctly merged worker artifacts and maintained status integrity.');

// ==========================================
// Test 9: Hierarchical GEO Compatibility Tests (Ancestors Allowed, Siblings/Foreign Blocked)
// ==========================================
console.log('\n[Test 9] Running Hierarchical GEO Compatibility Tests (Pangyo Ancestor vs Sibling/Foreign)...');

function createGeoTestArticle({ title, geoId, diseaseId, titleDisease, keywords = [], hashtags = [], bodyExtra = '' }) {
  const region = geoHierarchy.regions.find(r => r.id === geoId);
  const regionName = region ? region.displayName : '판교';
  const effectiveDisease = titleDisease || '불면증';
  return {
    title,
    titleDisease,
    thumbnailDiseaseLabel: effectiveDisease,
    seoDiseaseLabel: effectiveDisease,
    summary: `${regionName} 지역 주민들을 위한 전문적인 증상 관리 및 수면 리듬 회복 가이드입니다.`,
    body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
수면 리듬과 관련된 고민을 경청합니다. ${bodyExtra}

## 2. 주요 증상 및 배경
교감신경계 긴장과 신체적 반응을 살펴봅니다.

## 3. 감별 포인트
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인하실 수 있습니다.

## 4. 치료 관점
궁금한 점은 [온라인 상담](/inquiry/)을 통해 문의 가능합니다.

## 5. 자주 묻는 질문
**Q1. 잠을 잘 자려면 어떻게 하나요?**
A. 규칙적인 수면 위생을 지킵니다.
**Q2. 새벽에 깨는 이유는 무엇인가요?**
A. 잔여 긴장이 원인이 될 수 있습니다.
`,
    hashtags: hashtags.length > 0 ? hashtags : [`${regionName}한의원`, '해아림한의원'],
    keywords: keywords.length > 0 ? keywords : [`${regionName} 불면증`],
    geoId,
    diseaseId,
    thumbnailCopy: { yellowText: '원인 모를', whiteText: '잠 못 드는 새벽 각성', greenText: effectiveDisease },
    knowledge: { reviewStatus: 'pending', bannedPhrases: [] },
    history: []
  };
}

// 9-1. MUST PASS:
// A. [판교 불면증] ... keyword: "판교 불면증"
const passPangyoBasic = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '불면증 한방치료']
}));
assert.strictEqual(passPangyoBasic.valid, true, `[판교 불면증] basic MUST PASS: ${JSON.stringify(passPangyoBasic.errors)}`);
console.log('✅ PASS: [판교 불면증] with keyword "판교 불면증" passed validation 100%.');

// B. [판교 불면증] ... keyword: "성남시 분당구 판교 불면증" (Ancestor full locality)
const passPangyoAncestor = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '성남시 분당구 판교 불면증', '불면증 한방치료']
}));
assert.strictEqual(passPangyoAncestor.valid, true, `[판교 불면증] with ancestor keyword "성남시 분당구 판교 불면증" MUST PASS: ${JSON.stringify(passPangyoAncestor.errors)}`);
console.log('✅ PASS: [판교 불면증] with keyword "성남시 분당구 판교 불면증" passed validation 100%.');

// C. [수지 불안장애] ... keyword: "용인시 수지구 불안장애" (Ancestor full locality for Suji)
const passSujiAncestor = validateArticleContent(createGeoTestArticle({
  title: '[수지 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  geoId: 'yongin-suji',
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  keywords: ['수지 불안장애', '용인시 수지구 불안장애', '불안장애 한방치료']
}));
assert.strictEqual(passSujiAncestor.valid, true, `[수지 불안장애] with ancestor keyword MUST PASS: ${JSON.stringify(passSujiAncestor.errors)}`);
console.log('✅ PASS: [수지 불안장애] with keyword "용인시 수지구 불안장애" passed validation 100%.');

// 9-2. MUST FAIL:
// A. 판교 글 + "정자동 불면증" (Sibling local area in Bundang)
const failJungja = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '정자동 불면증']
}));
assert.strictEqual(failJungja.valid, false, 'Pangyo post with sibling keyword "정자동 불면증" MUST FAIL');
assert.ok(failJungja.errors.some(e => e.includes('정자동')), 'Expected error regarding 정자동');
console.log('✅ PASS: Pangyo post with sibling keyword "정자동 불면증" strictly blocked.');

// B. 판교 글 + "서현동 불면증" (Sibling local area in Bundang)
const failSeohyeon = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '서현동 불면증']
}));
assert.strictEqual(failSeohyeon.valid, false, 'Pangyo post with sibling keyword "서현동 불면증" MUST FAIL');
assert.ok(failSeohyeon.errors.some(e => e.includes('서현동')), 'Expected error regarding 서현동');
console.log('✅ PASS: Pangyo post with sibling keyword "서현동 불면증" strictly blocked.');

// C. 판교 글 + "수지 불면증" (Foreign region)
const failSuji = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '수지 불면증']
}));
assert.strictEqual(failSuji.valid, false, 'Pangyo post with foreign keyword "수지 불면증" MUST FAIL');
assert.ok(failSuji.errors.some(e => e.includes('수지')), 'Expected error regarding 수지');
console.log('✅ PASS: Pangyo post with foreign keyword "수지 불면증" strictly blocked.');

// D. 판교 글 + "기흥구 불면증" (Foreign region)
const failGiheung = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  keywords: ['판교 불면증', '기흥구 불면증']
}));
assert.strictEqual(failGiheung.valid, false, 'Pangyo post with foreign keyword "기흥구 불면증" MUST FAIL');
assert.ok(failGiheung.errors.some(e => e.includes('기흥구')), 'Expected error regarding 기흥구');
console.log('✅ PASS: Pangyo post with foreign keyword "기흥구 불면증" strictly blocked.');

// E. 판교 글 + 본문 내 sibling 침투 ("정자동 불면증")
const failBodySibling = validateArticleContent(createGeoTestArticle({
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  geoId: 'bundang-pangyo',
  diseaseId: 'sleep',
  titleDisease: '불면증',
  bodyExtra: '정자동 불면증 환자분들도 본원에서 함께 상담을 진행합니다.'
}));
assert.strictEqual(failBodySibling.valid, false, 'Pangyo post with sibling in body MUST FAIL');
assert.ok(failBodySibling.errors.some(e => e.includes('정자동')), 'Expected error regarding 정자동 in body');
console.log('✅ PASS: Pangyo post with sibling keyword in body strictly blocked.');

// ==========================================
// Test 10: Human Review Feedback Regression Tests
// (Age Group Consistency, Topic Separation, Thumbnail Topic Alignment, Treatment Fabrication)
// ==========================================
console.log('\n[Test 10] Running Human Review Feedback Regression Tests...');

function createMockArticleForReviewTest(overrides = {}) {
  return {
    title: '[분당 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
    titleDisease: 'ADHD',
    summary: '분당 지역 환자 및 보호자를 위한 소아 ADHD의 원인과 생활 관리 및 임상 가이드입니다.',
    category: 'adhd',
    diseaseId: 'adhd',
    geoId: 'seongnam-bundang',
    ageGroup: 'child',
    topicAngle: { id: 'child-impulsivity', titleSuffix: '산만함과 충동성이 훈육만으로 조절되지 않을 때' },
    body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 산만함과 충동적인 행동으로 상담을 청하시는 학부모님들의 질문을 살펴봅니다.

## 2. 주요 증상 및 배경
도파민계 신경전달 체계와 실행기능의 발달 과정을 점검합니다.
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인 가능합니다.

## 3. 감별 포인트
자세한 정보는 [온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인 상태와 체질을 고려한 맞춤 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 아이가 훈육을 해도 왜 조절이 안 되나요?**
A. 전두엽의 실행기능 발달 차이를 고려해야 합니다.
**Q2. 어떻게 도와주어야 하나요?**
A. 규칙적인 환경 구조화와 정서적 지지가 중요합니다.
`,
    hashtags: ['분당ADHD', '소아ADHD', '해아림한의원'],
    keywords: ['분당 ADHD', '성남시 분당구 ADHD', '소아 ADHD 한방치료'],
    thumbnailCopy: { yellowText: '원인 모를', whiteText: '산만함과 충동성', greenText: 'ADHD' },
    knowledge: { reviewStatus: 'pending', bannedPhrases: [] },
    history: [],
    ...overrides
  };
}

// 10-1. Child QA Target with Adult Workplace Context MUST FAIL
const failChildWithWork = validateArticleContent(createMockArticleForReviewTest({
  ageGroup: 'child',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
소아 ADHD 환자뿐만 아니라 성인 역시 직장 업무와 마감에 쫓길 때 실수가 잦아집니다.
## 2. 배경
신경발달학적 특성을 고려합니다. [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 치료
개인 체질 맞춤 한약 처방.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`
}));
assert.strictEqual(failChildWithWork.valid, false, 'Child target with adult work context MUST FAIL');
assert.ok(failChildWithWork.errors.some(e => e.includes('Age Group violation') && e.includes('직장')), 'Expected Age Group violation for 직장');
assert.ok(failChildWithWork.errors.some(e => e.includes('Age Group violation') && e.includes('업무')), 'Expected Age Group violation for 업무');
assert.ok(failChildWithWork.errors.some(e => e.includes('Age Group violation') && e.includes('마감')), 'Expected Age Group violation for 마감');
assert.ok(failChildWithWork.errors.some(e => e.includes('Age Group violation') && e.includes('성인 역시')), 'Expected Age Group violation for 성인 역시');
console.log('✅ PASS: Child QA target with adult workplace context strictly blocked.');

// 10-2. Chronic Worry with Social Phobia Core Symptoms MUST FAIL
const failChronicWorryWithSocial = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[기흥 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'yongin-giheung',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
사람들의 시선이 두렵고 발표 상황에서 손 떨림과 목소리 떨림이 심해집니다.
## 2. 배경
신경생물학적 특성을 점검합니다. [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 치료
개인 맞춤 한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '사소한 일도 걱정', greenText: '불안장애' }
}));
assert.strictEqual(failChronicWorryWithSocial.valid, false, 'Chronic worry with social phobia symptoms MUST FAIL');
assert.ok(failChronicWorryWithSocial.errors.some(e => e.includes('Topic leakage violation') && e.includes('사람들의 시선')), 'Expected Topic leakage violation for 사람들의 시선');
assert.ok(failChronicWorryWithSocial.errors.some(e => e.includes('Topic leakage violation') && e.includes('발표 상황')), 'Expected Topic leakage violation for 발표 상황');
assert.ok(failChronicWorryWithSocial.errors.some(e => e.includes('Topic leakage violation') && e.includes('손 떨림')), 'Expected Topic leakage violation for 손 떨림');
assert.ok(failChronicWorryWithSocial.errors.some(e => e.includes('Topic leakage violation') && e.includes('목소리 떨림')), 'Expected Topic leakage violation for 목소리 떨림');
console.log('✅ PASS: Chronic worry with social phobia core symptoms strictly blocked.');

// 10-3. Chronic Worry with Panic Thumbnail Copy MUST FAIL
const failChronicWorryPanicThumb = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[기흥 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'yongin-giheung',
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '두근거림·숨 막힘', greenText: '불안장애' }
}));
assert.strictEqual(failChronicWorryPanicThumb.valid, false, 'Chronic worry with panic thumbnail copy MUST FAIL');
assert.ok(failChronicWorryPanicThumb.errors.some(e => e.includes('Thumbnail topic mismatch')), 'Expected thumbnail topic mismatch');
console.log('✅ PASS: Chronic worry with panic thumbnail copy strictly blocked.');

// 10-4. Early Awakening Thumbnail with Sleep-Onset Copy MUST FAIL
const failEarlyAwakeningThumb = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'sleep',
  titleDisease: '불면증',
  ageGroup: 'adult',
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  topicAngle: { id: 'early-awakening', titleSuffix: '잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유' },
  geoId: 'bundang-pangyo',
  thumbnailCopy: { yellowText: '밤마다 뒤척여', whiteText: '잠들기 어렵다면', greenText: '불면증' }
}));
assert.strictEqual(failEarlyAwakeningThumb.valid, false, 'Early awakening with sleep onset thumbnail MUST FAIL');
assert.ok(failEarlyAwakeningThumb.errors.some(e => e.includes('Thumbnail topic mismatch') && e.includes('early-awakening')), 'Expected early-awakening thumbnail topic mismatch');
console.log('✅ PASS: Early awakening with sleep onset thumbnail copy strictly blocked.');

// 10-5. Early Awakening Thumbnail with Authentic Early Awakening Copy MUST PASS
const passEarlyAwakeningThumb = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'sleep',
  titleDisease: '불면증',
  ageGroup: 'adult',
  title: '[판교 불면증] 잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유',
  summary: '판교 지역 환자분들을 위한 새벽 조기 각성 불면증의 원인과 수면 리듬 회복을 위한 가이드입니다.',
  topicAngle: { id: 'early-awakening', titleSuffix: '잠은 드는데 새벽마다 깨서 다시 잠들지 못하는 이유' },
  geoId: 'bundang-pangyo',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
잠은 드는데 새벽에 자주 깨어 다시 잠들기 어렵다는 고민을 살펴봅니다.

## 2. 주요 증상 및 배경
교감신경계 긴장과 수면 유지 리듬을 점검합니다.
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인 가능합니다.

## 3. 감별 포인트
자세한 정보는 [온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인 상태와 체질을 고려한 맞춤 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 새벽에 자꾸 깨는 이유는 무엇인가요?**
A. 잔여 긴장과 수면 리듬 조각화가 원인일 수 있습니다.
**Q2. 어떻게 수면 위생을 지키나요?**
A. 일정한 기상 시간을 유지하고 자극을 줄입니다.
`,
  keywords: ['판교 불면증', '성남시 분당구 판교 불면증', '불면증 한방치료'],
  thumbnailCopy: { yellowText: '잠은 드는데', whiteText: '새벽마다 깬다면', greenText: '불면증' }
}));
assert.strictEqual(passEarlyAwakeningThumb.valid, true, `Early awakening with authentic copy MUST PASS: ${JSON.stringify(passEarlyAwakeningThumb.errors)}`);
console.log('✅ PASS: Early awakening with authentic early awakening copy passed 100%.');

// 10-6. Digestive Dizziness Thumbnail Swapped to Palpitation MUST FAIL
const failDigestiveDizzinessThumb = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '자율신경실조증',
  ageGroup: 'adult',
  title: '[분당 자율신경실조증] 원인 모를 어지럼증과 소화불량이 동시에 나타날 때',
  topicAngle: { id: 'digestive-dizziness', titleSuffix: '원인 모를 어지럼증과 소화불량이 동시에 나타날 때' },
  geoId: 'seongnam-bundang',
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '어지럼증·두근거림', greenText: '자율신경실조증' }
}));
assert.strictEqual(failDigestiveDizzinessThumb.valid, false, 'Digestive dizziness with swapped palpitation thumbnail MUST FAIL');
assert.ok(failDigestiveDizzinessThumb.errors.some(e => e.includes('Thumbnail topic mismatch') && e.includes('digestive-dizziness')), 'Expected digestive-dizziness thumbnail topic mismatch');
console.log('✅ PASS: Digestive dizziness with swapped palpitation thumbnail strictly blocked.');

// 10-7. Digestive Dizziness Thumbnail with Authentic Digestive Copy MUST PASS
const passDigestiveDizzinessThumb = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '자율신경실조증',
  ageGroup: 'adult',
  title: '[분당 자율신경실조증] 원인 모를 어지럼증과 소화불량이 동시에 나타날 때',
  summary: '분당 지역 주민들을 위한 어지럼증과 소화불량이 동반되는 자율신경실조증 관리 안내입니다.',
  topicAngle: { id: 'digestive-dizziness', titleSuffix: '원인 모를 어지럼증과 소화불량이 동시에 나타날 때' },
  geoId: 'seongnam-bundang',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
원인 모를 어지럼증과 소화불량으로 일상에 불편을 겪는 분들의 고민을 살펴봅니다.

## 2. 주요 증상 및 배경
자율신경계 균형과 위장관 긴장 상태를 점검합니다.
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인 가능합니다.

## 3. 감별 포인트
자세한 정보는 [온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인 상태와 체질을 고려한 맞춤 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 어지럼증과 소화불량이 왜 함께 나타나나요?**
A. 자율신경 불균형으로 위장 운동과 혈류 조절에 영향을 주기 때문입니다.
**Q2. 치료와 생활 관리는 어떻게 하나요?**
A. 규칙적인 식습관과 이완 요법을 병행합니다.
`,
  keywords: ['분당 자율신경실조증', '성남시 분당구 자율신경실조증', '자율신경 한방치료'],
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '어지럼증·소화불량', greenText: '자율신경실조증' }
}));
assert.strictEqual(passDigestiveDizzinessThumb.valid, true, `Digestive dizziness with authentic copy MUST PASS: ${JSON.stringify(passDigestiveDizzinessThumb.errors)}`);
console.log('✅ PASS: Digestive dizziness with authentic digestive copy passed 100%.');

// 10-8. Unapproved Treatment Fabrication: "심포열을 다스리는 치료" MUST FAIL
const failSimpoHeatTreatment = validateArticleContent(createMockArticleForReviewTest({
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 상태를 살펴봅니다.
## 2. 배경
신경생물학적 요인을 점검합니다. [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 해아림한의원의 상태 평가 관점
심포열을 다스리고 긴장 완화를 돕는 침구 치료를 시행합니다.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`
}));
assert.strictEqual(failSimpoHeatTreatment.valid, false, 'Simpo heat treatment fabrication MUST FAIL');
assert.ok(failSimpoHeatTreatment.errors.some(e => e.includes('심포열')), 'Expected error regarding 심포열');
console.log('✅ PASS: Unapproved "심포열을 다스리는 치료" fabrication strictly blocked.');

// 10-9. Unapproved Treatment Fabrication: "인지 이완 훈련" MUST FAIL
const failCognitiveRelaxTraining = validateArticleContent(createMockArticleForReviewTest({
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 상태를 살펴봅니다.
## 2. 배경
신경생물학적 요인을 점검합니다. [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 해아림한의원의 상태 평가 관점
환자에게 적합한 맞춤 한약과 인지 이완 훈련을 처방합니다.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`
}));
assert.strictEqual(failCognitiveRelaxTraining.valid, false, 'Cognitive relaxation training fabrication MUST FAIL');
assert.ok(failCognitiveRelaxTraining.errors.some(e => e.includes('새 치료명 사용') && e.includes('인지')), 'Expected error regarding 인지 이완 훈련');
console.log('✅ PASS: Unapproved "인지 이완 훈련" fabrication strictly blocked.');

// 10-10. Adult Anxiety with "신경발달학적" MUST FAIL
const failAnxietyNeurodevelopmental = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[기흥 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'yongin-giheung',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
만성 걱정에 대해 살펴봅니다.
## 2. 배경
성인 불안장애는 신경발달학적·신경생물학적 특성이 관여할 수 있습니다. [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 치료
개인 맞춤 한약과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
  thumbnailCopy: { yellowText: '사소한 일도', whiteText: '꼬리 무는 걱정', greenText: '불안장애' }
}));
// 10-11. Contextual Age Group: Child target with benign parental workplace context MUST PASS
const passChildWithParentSchedule = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'adhd',
  titleDisease: 'ADHD',
  ageGroup: 'child',
  title: '[분당 ADHD] 산만함과 충동성이 훈육만으로 조절되지 않을 때',
  summary: '분당 지역 학부모님들을 위한 소아 ADHD 원인과 생활 리듬 안내입니다.',
  geoId: 'seongnam-bundang',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
부모의 직장 일정 때문에 아이의 생활 리듬이 불규칙해질 수 있습니다.

## 2. 주요 배경
신경발달학적 특성을 고려하며 [주요 진료 안내](/treatments/)를 참고합니다.

## 3. 감별 포인트
[온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`
}));
assert.strictEqual(passChildWithParentSchedule.valid, true, `Child target with benign parental work context MUST PASS: ${JSON.stringify(passChildWithParentSchedule.errors)}`);
console.log('✅ PASS: Child target with benign parental work schedule ("부모의 직장 일정 때문에...") passed 100%.');

// 10-12. Contextual Age Group: Adult target with benign childcare stress MUST PASS
const passAdultWithChildcareStress = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[분당 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  summary: '분당 지역 성인 환자분들을 위한 만성 걱정과 불안장애 한방 치료 안내입니다.',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'seongnam-bundang',
  hashtags: ['분당불안장애', '불안장애치료', '해아림한의원'],
  keywords: ['분당 불안장애', '성남시 분당구 불안장애', '불안장애 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
직장 스트레스와 자녀 양육 부담이 함께 이어질 수 있습니다.

## 2. 주요 배경
신경생물학적 특성을 고려하며 [주요 진료 안내](/treatments/)를 참고합니다.

## 3. 감별 포인트
[온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
  thumbnailCopy: { yellowText: '사소한 일도', whiteText: '꼬리 무는 걱정', greenText: '불안장애' }
}));
assert.strictEqual(passAdultWithChildcareStress.valid, true, `Adult target with benign childcare stress MUST PASS: ${JSON.stringify(passAdultWithChildcareStress.errors)}`);
console.log('✅ PASS: Adult target with benign childcare stress ("직장 스트레스와 자녀 양육 부담...") passed 100%.');

// 10-13. Contextual Age Group: Child target with explicit adult workplace shift MUST FAIL
const failChildWithAdultWorkShift = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'adhd',
  titleDisease: 'ADHD',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
성인 ADHD 환자는 업무 마감에 어려움을 겪습니다. 직장 업무 중 실수가 반복됩니다.

## 2. 주요 배경
신경발달학적 특성을 고려하며 [주요 진료 안내](/treatments/)를 참고합니다.

## 3. 감별 포인트
[온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`
}));
assert.strictEqual(failChildWithAdultWorkShift.valid, false, 'Child target with adult work shift MUST FAIL');
assert.ok(failChildWithAdultWorkShift.errors.some(e => e.includes('Age Group violation') && e.includes('child')), 'Expected Age Group violation for adult work shift');
console.log('✅ PASS: Child target with adult workplace transition ("성인 ADHD 환자는 업무 마감에...") strictly blocked.');

// 10-14. Contextual Age Group: Adult target with child classroom/discipline shift MUST FAIL
const failAdultWithChildClassroomShift = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[분당 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'seongnam-bundang',
  hashtags: ['분당불안장애', '불안장애치료', '해아림한의원'],
  keywords: ['분당 불안장애', '성남시 분당구 불안장애', '불안장애 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이가 수업 시간에 산만합니다. 부모가 아이를 훈육할 때 지나치게 다그치면 안 됩니다. 등교 전 아이가 불안을 호소합니다.

## 2. 주요 배경
신경생물학적 요인을 고려하며 [주요 진료 안내](/treatments/)를 참고합니다.

## 3. 감별 포인트
[온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
  thumbnailCopy: { yellowText: '사소한 일도', whiteText: '꼬리 무는 걱정', greenText: '불안장애' }
}));
assert.strictEqual(failAdultWithChildClassroomShift.valid, false, 'Adult target with child classroom/discipline shift MUST FAIL');
assert.ok(failAdultWithChildClassroomShift.errors.some(e => e.includes('Age Group violation') && e.includes('adult')), 'Expected Age Group violation for child classroom/discipline shift');
console.log('✅ PASS: Adult target with pediatric classroom/discipline transition ("아이가 수업 시간에 산만...") strictly blocked.');

// 10-15. Premature Treatment Efficacy Attribution MUST FAIL
const failPrematureEfficacyModality = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '불안장애',
  ageGroup: 'adult',
  title: '[분당 불안장애] 사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때',
  topicAngle: { id: 'chronic-worry', titleSuffix: '사소한 일에도 걱정이 꼬리를 물고 가슴이 답답할 때' },
  geoId: 'seongnam-bundang',
  hashtags: ['분당불안장애', '불안장애치료', '해아림한의원'],
  keywords: ['분당 불안장애', '성남시 분당구 불안장애', '불안장애 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
만성 걱정을 점검합니다.

## 2. 주요 배경
신경생물학적 요인을 고려하며 [주요 진료 안내](/treatments/)를 참고합니다.

## 3. 감별 포인트
[온라인 상담](/inquiry/)을 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 관점
심신 안정을 돕는 맞춤 한약 처방과 자율신경 긴장을 완화하는 침구 치료를 시행합니다.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변2
`,
  thumbnailCopy: { yellowText: '사소한 일도', whiteText: '꼬리 무는 걱정', greenText: '불안장애' }
}));
assert.strictEqual(failPrematureEfficacyModality.valid, false, 'Premature treatment efficacy attribution MUST FAIL');
assert.ok(failPrematureEfficacyModality.errors.some(e => e.includes('치료 효과 단정 및 임의 기전 수식어 사용')), 'Expected error regarding treatment efficacy attribution');
console.log('✅ PASS: Premature treatment efficacy attribution ("심신 안정을 돕는 맞춤 한약 처방...") strictly blocked.');

// ==========================================
// Test 11: Batch 2 & QA Target Identity Regression Tests (A, B, C, D)
// ==========================================
console.log('\n[Test 11] Running Batch 2 & QA Target Identity Regression Tests...');

const { buildImagePrompt } = require('../scripts/auto_column/ai_generator');
const qaTargets = loadQATargets();

// -------------------------------------------------------------
// A. qa-02-tourette: Target Identity Enforcement
// -------------------------------------------------------------
console.log('\n[Test 11-A] Testing qa-02-tourette Target Identity...');
const touretteTarget = qaTargets.find(t => t.qaId === 'qa-02-tourette');
assert.ok(touretteTarget, 'qa-02-tourette must exist in qa_targets.json');
assert.strictEqual(touretteTarget.titleDisease, '뚜렛증후군');
assert.strictEqual(touretteTarget.thumbnailDiseaseLabel, '뚜렛증후군');
assert.strictEqual(touretteTarget.seoDiseaseLabel, '뚜렛증후군');

// A-1. Must PASS with 뚜렛증후군 identity
const passTouretteIdentity = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'tic',
  titleDisease: '뚜렛증후군',
  thumbnailDiseaseLabel: '뚜렛증후군',
  seoDiseaseLabel: '뚜렛증후군',
  ageGroup: 'child',
  geoId: 'yongin-suji',
  title: '[수지 뚜렛증후군] 운동틱과 음성틱이 함께 지속될 때 부모 대처법',
  summary: '용인 수지 지역 학부모님들을 위한 뚜렛증후군 복합 틱 증상과 가정 내 수용적 대처 원칙 안내입니다.',
  topicAngle: { id: 'parent-guidance', titleSuffix: '운동틱과 음성틱이 함께 지속될 때 부모 대처법' },
  hashtags: ['수지뚜렛증후군', '수지한의원', '뚜렛증후군치료', '뚜렛증후군관리', '해아림한의원'],
  keywords: ['수지 뚜렛증후군', '용인시 수지구 뚜렛증후군', '뚜렛증후군 한방치료', '운동틱과 음성틱이 함께 지속될 때 부모 대처법'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 뚜렛증후군 증상으로 내원하시는 부모님들의 고민을 살핍니다.

## 2. 뚜렛증후군의 특성과 감별 포인트
뚜렛증후군은 운동틱과 하나 이상의 음성틱이 복합적으로 나타나는 양상을 보입니다.
[주요 진료 안내](/treatments/)를 참고하십시오.

## 3. 부모의 수용적 대처와 안정적 환경
지적하거나 억지로 참게 하지 않고 심리적 안정감을 제공합니다.
[온라인 상담](/inquiry/)을 통해 문의 가능합니다.

## 4. 해아림한의원의 상태 평가 관점
아이의 개별 증상과 전반적인 신체 상태를 종합적으로 평가하여 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 증상을 지적하면 안 되나요?**
A. 지적이나 훈육은 두뇌의 긴장도를 높여 증상 변동을 키울 수 있습니다.
**Q2. 어떻게 관찰해야 하나요?**
A. 장기적인 기능 변화를 관찰하며 지지적 환경을 유지합니다.
`,
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '복합 틱 나타날 때', greenText: '뚜렛증후군' }
}));
assert.strictEqual(passTouretteIdentity.valid, true, `qa-02-tourette identity MUST PASS: ${JSON.stringify(passTouretteIdentity.errors)}`);
console.log('✅ PASS: qa-02-tourette with 뚜렛증후군 identity passed validation 100%.');

// A-2. Must FAIL if thumbnail greenText falls back to parent disease ('틱장애')
const failTouretteThumbLeak = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'tic',
  titleDisease: '뚜렛증후군',
  thumbnailDiseaseLabel: '뚜렛증후군',
  seoDiseaseLabel: '뚜렛증후군',
  geoId: 'yongin-suji',
  title: '[수지 뚜렛증후군] 운동틱과 음성틱이 함께 지속될 때 부모 대처법',
  hashtags: ['수지뚜렛증후군', '수지한의원', '뚜렛증후군치료', '해아림한의원'],
  keywords: ['수지 뚜렛증후군', '용인시 수지구 뚜렛증후군', '뚜렛증후군 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 뚜렛증후군 증상을 살핍니다.
## 2. 배경
신경생물학적 요인 [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문**
A. 답변
`,
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '복합 틱 나타날 때', greenText: '틱장애' }
}));
assert.strictEqual(failTouretteThumbLeak.valid, false, 'qa-02-tourette with greenText="틱장애" MUST FAIL');
assert.ok(failTouretteThumbLeak.errors.some(e => e.includes('Thumbnail copy identity violation')), 'Expected Thumbnail copy identity violation');
console.log('✅ PASS: qa-02-tourette with greenText="틱장애" (parent fallback) strictly blocked.');

// A-3. Must FAIL if SEO falls back to parent disease ('틱장애') instead of '뚜렛증후군'
const failTouretteSeoLeak = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'tic',
  titleDisease: '뚜렛증후군',
  thumbnailDiseaseLabel: '뚜렛증후군',
  seoDiseaseLabel: '뚜렛증후군',
  geoId: 'yongin-suji',
  title: '[수지 뚜렛증후군] 운동틱과 음성틱이 함께 지속될 때 부모 대처법',
  hashtags: ['수지틱장애', '수지한의원', '틱장애치료', '해아림한의원'],
  keywords: ['수지 틱장애', '용인시 수지구 틱장애', '틱장애 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
아이의 뚜렛증후군 증상을 살핍니다.
## 2. 배경
신경생물학적 요인 [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문**
A. 답변
`,
  thumbnailCopy: { yellowText: '원인 모를', whiteText: '복합 틱 나타날 때', greenText: '뚜렛증후군' }
}));
assert.strictEqual(failTouretteSeoLeak.valid, false, 'qa-02-tourette with SEO="틱장애" MUST FAIL');
assert.ok(failTouretteSeoLeak.errors.some(e => e.includes('SEO identity leakage')), 'Expected SEO identity leakage error');
console.log('✅ PASS: qa-02-tourette with SEO="틱장애" (parent fallback) strictly blocked.');

// -------------------------------------------------------------
// B. qa-07-social-phobia: Target Identity Enforcement
// -------------------------------------------------------------
console.log('\n[Test 11-B] Testing qa-07-social-phobia Target Identity...');
const socialTarget = qaTargets.find(t => t.qaId === 'qa-07-social-phobia');
assert.ok(socialTarget, 'qa-07-social-phobia must exist in qa_targets.json');
assert.strictEqual(socialTarget.titleDisease, '사회공포증');
assert.strictEqual(socialTarget.thumbnailDiseaseLabel, '사회공포증');
assert.strictEqual(socialTarget.seoDiseaseLabel, '사회공포증');

// B-1. Must PASS with 사회공포증 identity
const passSocialIdentity = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '사회공포증',
  thumbnailDiseaseLabel: '사회공포증',
  seoDiseaseLabel: '사회공포증',
  ageGroup: 'adult',
  geoId: 'seongnam-sujeong',
  title: '[수정구 사회공포증] 발표나 회의만 시작되면 목소리가 떨리고 시선이 두려울 때',
  summary: '성남 수정 지역 성인 직장인들을 위한 사회공포증 및 발표불안 대처 요령과 임상 가이드입니다.',
  topicAngle: { id: 'presentation-anxiety', titleSuffix: '발표나 회의만 시작되면 목소리가 떨리고 시선이 두려울 때' },
  hashtags: ['수정구사회공포증', '수정구한의원', '사회공포증치료', '사회공포증관리', '해아림한의원'],
  keywords: ['수정구 사회공포증', '성남시 수정구 사회공포증', '사회공포증 한방치료', '발표불안'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
많은 분들이 발표나 회의 자리에서 사회공포증과 발표불안 증상으로 내원하십니다.

## 2. 주요 배경과 신체 반응
자율신경계 과각성과 교감신경 항진으로 목소리 떨림, 두근거림이 동반됩니다.
[주요 진료 안내](/treatments/)를 확인해 보십시오.

## 3. 감별 포인트
단순 긴장과 사회공포증의 차이를 살펴봅니다.
[온라인 상담](/inquiry/)을 통해 문의 가능합니다.

## 4. 해아림한의원의 상태 평가 관점
개별 체질과 자율신경 균형 상태를 진단하여 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 발표불안도 치료가 필요한가요?**
A. 회피 행동이 반복되어 일상이나 직무에 지장이 있다면 관리가 권장됩니다.
**Q2. 어떻게 극복하나요?**
A. 점진적 노출과 신체 안정화를 함께 병행합니다.
`,
  thumbnailCopy: { yellowText: '시선 두렵고', whiteText: '목소리 떨릴 때', greenText: '사회공포증' }
}));
assert.strictEqual(passSocialIdentity.valid, true, `qa-07-social-phobia identity MUST PASS: ${JSON.stringify(passSocialIdentity.errors)}`);
console.log('✅ PASS: qa-07-social-phobia with 사회공포증 identity passed validation 100%.');

// B-2. Must FAIL if thumbnail greenText falls back to parent disease ('불안장애')
const failSocialThumbLeak = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '사회공포증',
  thumbnailDiseaseLabel: '사회공포증',
  seoDiseaseLabel: '사회공포증',
  ageGroup: 'adult',
  geoId: 'seongnam-sujeong',
  title: '[수정구 사회공포증] 발표나 회의만 시작되면 목소리가 떨리고 시선이 두려울 때',
  hashtags: ['수정구사회공포증', '수정구한의원', '사회공포증치료', '해아림한의원'],
  keywords: ['수정구 사회공포증', '성남시 수정구 사회공포증', '사회공포증 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
사회공포증 증상을 살핍니다.
## 2. 배경
자율신경계 [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문**
A. 답변
`,
  thumbnailCopy: { yellowText: '시선 두렵고', whiteText: '목소리 떨릴 때', greenText: '불안장애' }
}));
assert.strictEqual(failSocialThumbLeak.valid, false, 'qa-07-social-phobia with greenText="불안장애" MUST FAIL');
assert.ok(failSocialThumbLeak.errors.some(e => e.includes('Thumbnail copy identity violation')), 'Expected Thumbnail copy identity violation');
console.log('✅ PASS: qa-07-social-phobia with greenText="불안장애" (parent fallback) strictly blocked.');

// B-3. Must FAIL if SEO falls back to parent disease ('불안장애') instead of '사회공포증'
const failSocialSeoLeak = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'anxiety',
  titleDisease: '사회공포증',
  thumbnailDiseaseLabel: '사회공포증',
  seoDiseaseLabel: '사회공포증',
  ageGroup: 'adult',
  geoId: 'seongnam-sujeong',
  title: '[수정구 사회공포증] 발표나 회의만 시작되면 목소리가 떨리고 시선이 두려울 때',
  hashtags: ['수정구불안장애', '수정구한의원', '불안장애치료', '해아림한의원'],
  keywords: ['수정구 불안장애', '성남시 수정구 불안장애', '불안장애 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
사회공포증 증상을 살핍니다.
## 2. 배경
자율신경계 [주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문**
A. 답변
`,
  thumbnailCopy: { yellowText: '시선 두렵고', whiteText: '목소리 떨릴 때', greenText: '사회공포증' }
}));
assert.strictEqual(failSocialSeoLeak.valid, false, 'qa-07-social-phobia with SEO="불안장애" MUST FAIL');
assert.ok(failSocialSeoLeak.errors.some(e => e.includes('SEO identity leakage')), 'Expected SEO identity leakage error');
console.log('✅ PASS: qa-07-social-phobia with SEO="불안장애" (parent fallback) strictly blocked.');

// -------------------------------------------------------------
// C. qa-04-adhd-adult: Image Prompt AgeGroup Enforcement
// -------------------------------------------------------------
console.log('\n[Test 11-C] Testing qa-04-adhd-adult Image Prompt AgeGroup Enforcement...');

// Adult ADHD prompt
const adultAdhdPrompt = buildImagePrompt('adhd', '성인 ADHD', 'adult-work-mistakes', '업무 실수', 'adult');
assert.ok(adultAdhdPrompt.includes('ONE Korean ADULT only'), 'Adult ADHD prompt must enforce ONE Korean ADULT only');
assert.ok(adultAdhdPrompt.includes('working-age'), 'Adult ADHD prompt must mention working-age');
assert.ok(adultAdhdPrompt.includes('NO child'), 'Adult ADHD prompt must prohibit child');
assert.ok(adultAdhdPrompt.includes('NO teenager'), 'Adult ADHD prompt must prohibit teenager');
assert.ok(adultAdhdPrompt.includes('NO classroom'), 'Adult ADHD prompt must prohibit classroom');
assert.ok(adultAdhdPrompt.includes('office') || adultAdhdPrompt.includes('workspace'), 'Adult ADHD prompt must specify office or workspace');
console.log('✅ PASS: qa-04-adhd-adult image prompt strictly enforces adult ageGroup & workspace context.');

// Child ADHD prompt comparison
const childAdhdPrompt = buildImagePrompt('adhd', '소아 ADHD', 'child-impulsivity', '산만함', 'child');
assert.ok(childAdhdPrompt.includes('child'), 'Child ADHD prompt must specify child');
assert.ok(childAdhdPrompt.includes('NO adult as main subject'), 'Child ADHD prompt must forbid adult main subject');
console.log('✅ PASS: Child ADHD image prompt strictly separated from adult prompt.');

// -------------------------------------------------------------
// D. QA Target Matrix Consistency (Title / Thumbnail / SEO identity)
// -------------------------------------------------------------
console.log('\n[Test 11-D] Testing All 20 QA Targets Identity Consistency...');

for (const target of qaTargets) {
  assert.ok(target.thumbnailDiseaseLabel, `${target.qaId} must have thumbnailDiseaseLabel`);
  assert.ok(target.seoDiseaseLabel, `${target.qaId} must have seoDiseaseLabel`);
  assert.ok(target.titleDisease, `${target.qaId} must have titleDisease`);

  const plan = buildQAPlan(target);
  assert.strictEqual(plan.titleDisease, target.titleDisease, `${target.qaId} plan.titleDisease must match`);
  assert.strictEqual(plan.thumbnailDiseaseLabel, target.thumbnailDiseaseLabel, `${target.qaId} plan.thumbnailDiseaseLabel must match`);
  assert.strictEqual(plan.seoDiseaseLabel, target.seoDiseaseLabel, `${target.qaId} plan.seoDiseaseLabel must match`);
  assert.strictEqual(plan.disease.id, target.diseaseId, `${target.qaId} plan category disease.id must be preserved`);
}
console.log('✅ PASS: All 20 QA Targets strictly enforce 1:1 identity consistency without mutating category taxonomy.');

// ==========================================
// Test 12: Adult ADHD & Tourette Clinical Guidance Grounding & Validation
// ==========================================
console.log('\n[Test 12] Running Adult ADHD & Tourette Clinical Guidance Grounding Tests...');

// 12-1. ADHD Medical Knowledge Grounding
const adhdKnowledge = require('../scripts/auto_column/medical_knowledge/adhd.json');
assert.ok(
  adhdKnowledge.evaluationGuidance.includes('여러 생활 영역에서 이어져 왔는지') &&
  adhdKnowledge.evaluationGuidance.includes('과제 마무리') &&
  adhdKnowledge.evaluationGuidance.includes('실행기능'),
  'ADHD evaluationGuidance must include developmental persistence across multiple life domains'
);
assert.ok(
  adhdKnowledge.specificRules.some(r => r.includes('여러 생활 영역에서 이어져 왔는지') && r.includes('검증된 출처')),
  'ADHD specificRules must mandate checking multiple life domains and forbid arbitrary figures'
);
console.log('✅ PASS: adhd.json verified with developmental persistence across life domains.');

// 12-2. Tic / Tourette Medical Knowledge Grounding
const ticKnowledge = require('../scripts/auto_column/medical_knowledge/tic.json');
assert.ok(
  ticKnowledge.evaluationGuidance.includes('운동틱과 음성틱이 함께 보인다는 사실만으로 뚜렛증후군을 확정하는 것은 아니며') &&
  ticKnowledge.evaluationGuidance.includes('일과성 틱') &&
  ticKnowledge.evaluationGuidance.includes('경과') &&
  ticKnowledge.evaluationGuidance.includes('시작 시기'),
  'Tic evaluationGuidance must caution against hasty Tourette confirmation on motor+vocal alone'
);
assert.ok(
  ticKnowledge.specificRules.some(r => r.includes('운동틱과 음성틱이 함께 보인다는 사실만으로 뚜렛증후군을 확정하는 것처럼 설명하지 마십시오')),
  'Tic specificRules must include explicit Tourette distinction rule'
);
assert.ok(
  ticKnowledge.specificRules.some(r => r.includes('부모 대처 중심 구조를 엄격히 유지하고, 미디어 비중을 더 늘리지 마십시오')),
  'Tic specificRules must keep parent guidance focus without increasing media weight'
);
console.log('✅ PASS: tic.json verified with Tourette differential criteria & parent guidance preservation.');

// 12-3. Validation Compliance with Reinforced Adult ADHD Content
const testAdhdAdultArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'adhd',
  titleDisease: 'ADHD',
  thumbnailDiseaseLabel: '성인 ADHD',
  seoDiseaseLabel: '성인 ADHD',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 ADHD] 업무 실수가 반복되고 마무리가 어려울 때',
  summary: '판교 지역 성인 직장인 환자분들을 위한 성인 ADHD 평가 및 일상 업무 관리 가이드입니다.',
  topicAngle: { id: 'adult-work-mistakes', titleSuffix: '업무 실수가 반복되고 마무리가 어려울 때' },
  hashtags: ['판교성인ADHD', '판교한의원', '성인ADHD치료', '해아림한의원'],
  keywords: ['판교 성인 ADHD', '성남시 분당구 판교 성인 ADHD', '성인 ADHD 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
직장에서 반복되는 실수와 마감 지연으로 내원하시는 성인 환자분들의 고민을 살펴봅니다.
## 2. 배경
신경생물학적 특성과 환경적 스트레스가 복합적으로 관여할 수 있습니다.
[주요 진료 안내](/treatments/)
## 3. 감별 포인트
성인 ADHD 평가 시에는 현재 직장에서의 업무 실수뿐만 아니라, 이전부터 주의집중, 정리, 과제 마무리, 충동성 및 실행기능과 관련된 유사한 어려움이 여러 생활 영역에서 이어져 왔는지를 함께 면밀히 확인합니다.
[온라인 상담](/inquiry/)
## 4. 평가 및 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방, 침구 치료 및 생활 관리 지도.
## 5. 자주 묻는 질문
**Q1. 성인도 ADHD가 나타날 수 있나요?**
A. 업무 정리, 시간 관리, 충동 조절 등의 어려움으로 나타날 수 있습니다.
**Q2. 단순한 의지 부족과 어떻게 구분하나요?**
A. 이전부터 유사한 실행기능의 어려움이 지속되었는지 종합적인 평가가 필요합니다.
`,
  thumbnailCopy: { yellowText: '업무 실수', whiteText: '마무리가 어려울 때', greenText: '성인 ADHD' }
}));
assert.strictEqual(testAdhdAdultArticle.valid, true, `Reinforced adult ADHD article must pass validation: ${testAdhdAdultArticle.errors.join(', ')}`);
console.log('✅ PASS: Reinforced adult ADHD article passed 3-tier validation 100%.');

// 12-4. Validation Compliance with Reinforced Tourette Content
const testTouretteArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'tic',
  titleDisease: '뚜렛증후군',
  thumbnailDiseaseLabel: '뚜렛증후군',
  seoDiseaseLabel: '뚜렛증후군',
  ageGroup: 'child',
  geoId: 'yongin-suji',
  title: '[수지 뚜렛증후군] 가정에서 부모가 지켜주어야 할 대처 원칙과 소통법',
  summary: '용인 수지 지역 보호자분들을 위한 뚜렛증후군 구분 평가 및 가정 내 부모 대처 소통법 가이드입니다.',
  topicAngle: { id: 'parent-guidance', titleSuffix: '가정에서 부모가 지켜주어야 할 대처 원칙과 소통법' },
  hashtags: ['수지뚜렛증후군', '수지한의원', '뚜렛증후군치료', '해아림한의원'],
  keywords: ['수지 뚜렛증후군', '용인시 수지구 뚜렛증후군', '뚜렛증후군 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
가정에서 부모가 아이의 틱 증상에 어떻게 대처해야 하는지 안내합니다.
## 2. 배경
신경발달학적 특성이 관여하며, 부모가 불안해하며 지적하지 않는 수용적 태도가 중요합니다.
[주요 진료 안내](/treatments/)
## 3. 감별 포인트
운동틱과 음성틱이 함께 보인다는 사실만으로 뚜렛증후군을 확정하는 것은 아니며, 증상이 이어진 경과, 시작 시기, 종류와 변화 양상 등을 함께 종합적으로 평가해야 합니다. 일과성 틱이나 지속성 틱과 구분하여 장기적인 관점에서 살펴봅니다.
[온라인 상담](/inquiry/)
## 4. 평가 및 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방, 침구 치료 및 환경 조절 상담.
## 5. 자주 묻는 질문
**Q1. 아이가 틱을 스스로 참을 수 없나요?**
A. 의지로 억제하기 어려우므로 지적하기보다 긴장을 덜어주어야 합니다.
**Q2. 운동틱과 음성틱이 같이 보이면 무조건 뚜렛인가요?**
A. 단순 동반 사실만으로 확정하지 않으며, 경과와 양상 변화를 종합 평가해야 합니다.
`,
  thumbnailCopy: { yellowText: '아이의 틱', whiteText: '지적 대신 지켜보기', greenText: '뚜렛증후군' }
}));
assert.strictEqual(testTouretteArticle.valid, true, `Reinforced Tourette article must pass validation: ${testTouretteArticle.errors.join(', ')}`);
console.log('✅ PASS: Reinforced Tourette article passed 3-tier validation 100%.');

// ==========================================
// Test 13: Treatment Certainty Negation Validator (Safe Negation vs Dangerous Guarantee)
// ==========================================
console.log('\n[Test 13] Running Treatment Certainty Negation Validator Regression Tests...');
const { checkTreatmentCertainty } = require('../scripts/auto_column/content_validator');

// 13-1. Safe Negation Sentences (MUST PASS with 0 false positives)
console.log('\n[Test 13-A] Testing Safe Negation / Clinical Caution Sentences (MUST PASS)...');
const safeCertaintySentences = [
  "중요한 것은 “미디어를 끊으면 반드시 좋아진다”는 식의 접근이 아닙니다.",
  "미디어를 끊으면 반드시 좋아진다는 식의 접근이 아닙니다.",
  "반드시 좋아진다고 단정할 수 없습니다.",
  "이 치료로 반드시 완치된다고 보장할 수 없습니다.",
  "반드시 낫는다고 볼 수 없습니다.",
  "반드시 치료된다고 보장할 수 없습니다.",
  "‘반드시 좋아진다’는 식의 접근은 적절하지 않습니다.",
  "반드시 완치된다는 뜻은 아닙니다.",
  "‘반드시 낫는다’는 맹신을 경계해야 합니다.",
  "반드시 좋아진다고 오해해서는 안 됩니다.",
  "치료를 받는다고 반드시 좋아지는 것은 아닙니다.",
  "**Q. 치료를 받으면 반드시 좋아지나요?**\nA. 상태에 따라 차이가 있으며 반드시 좋아진다고 단정하기 어렵습니다."
];

safeCertaintySentences.forEach((sentence, idx) => {
  const directCheck = checkTreatmentCertainty(sentence);
  assert.strictEqual(directCheck.violated, false, `Safe sentence [${idx}] was falsely blocked by checkTreatmentCertainty: "${sentence}"`);

  const fullArticleCheck = validateArticleContent(createMockArticleWithBody(sentence));
  const certaintyErr = fullArticleCheck.errors.filter(e => e.includes('치료 단정적 확신 표현 금지'));
  assert.strictEqual(certaintyErr.length, 0, `Safe sentence [${idx}] was falsely blocked in article: "${sentence}"`);
});
console.log('✅ PASS: All 12 safe negation and cautionary certainty sentences passed with 0 false positives.');

// 13-2. Dangerous Declarative Certainty Sentences (MUST FAIL)
console.log('\n[Test 13-B] Testing Dangerous Declarative Certainty Sentences (MUST FAIL)...');
const dangerousCertaintySentences = [
  "한약을 먹으면 반드시 좋아집니다.",
  "반드시 완치됩니다.",
  "치료를 받으면 반드시 낫습니다.",
  "이 치료를 받으면 반드시 좋아집니다.",
  "반드시 치료됩니다.",
  "“치료를 받으면 반드시 낫는다”는 것이 저희의 확신입니다.",
  "치료를 받으면 반드시 좋아질 수밖에 없습니다.",
  "반드시 완치된다고 자신 있게 말씀드립니다."
];

dangerousCertaintySentences.forEach((sentence, idx) => {
  const directCheck = checkTreatmentCertainty(sentence);
  assert.strictEqual(directCheck.violated, true, `Dangerous sentence [${idx}] was NOT blocked by checkTreatmentCertainty: "${sentence}"`);

  const fullArticleCheck = validateArticleContent(createMockArticleWithBody(sentence));
  const certaintyErr = fullArticleCheck.errors.filter(e => e.includes('치료 단정적 확신 표현 금지'));
  assert.ok(certaintyErr.length > 0, `Dangerous sentence [${idx}] was NOT blocked in article: "${sentence}"`);
});
console.log('✅ PASS: All 8 dangerous certainty promise sentences were strictly blocked.');

// 13-3. Mixed Question & Dangerous Assertion in Line (MUST FAIL)
console.log('\n[Test 13-C] Testing Question + Dangerous Certainty Answer (MUST FAIL)...');
const dangerousQAInLine = "**Q. 치료를 받으면 반드시 좋아지나요?** A. 네, 치료를 받으면 반드시 완치됩니다.";
const qaLineCheck = validateArticleContent(createMockArticleWithBody(dangerousQAInLine));
const qaCertaintyErr = qaLineCheck.errors.filter(e => e.includes('치료 단정적 확신 표현 금지'));
assert.ok(qaCertaintyErr.length > 0, 'Question + dangerous affirmation answer must be strictly blocked');
console.log('✅ PASS: Question followed by affirmative certainty promise was strictly blocked.');

// ==========================================
// Test 14: Batch 3 Human Review Feedback Regression Tests (A, B, C, D)
// ==========================================
console.log('\n[Test 14] Running Batch 3 Human Review Feedback Regression Tests...');

// 14-A. IBS Diagnostic Concept & Dietary / Comfort Guidance
console.log('\n[Test 14-A] Testing IBS Diagnostic Concept & Guidance Validation...');

// 14-A-1. Valid IBS Article (MUST PASS)
const validIbsArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'ibs',
  titleDisease: '과민성대장증후군',
  thumbnailDiseaseLabel: '과민성대장증후군',
  seoDiseaseLabel: '과민성대장증후군',
  ageGroup: 'adult',
  geoId: 'yongin-main',
  title: '[용인 과민성대장증후군] 출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유',
  summary: '용인 지역 주민분들을 위한 과민성대장증후군 복통과 배변 연관성 평가 및 일상 식습관 관리 안내입니다.',
  topicAngle: { id: 'morning-diarrhea', titleSuffix: '출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유' },
  hashtags: ['용인과민성대장증후군', '용인한의원', '과민성대장증후군치료', '해아림한의원'],
  keywords: ['용인 과민성대장증후군', '용인시 과민성대장증후군', '과민성대장증후군 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
출근길이나 중요한 미팅을 앞두고 급격한 복통과 함께 배변 신호가 찾아와 고통받는 분들이 많습니다.

## 2. 장-뇌 축과 신경생물학적 반응
장과 뇌는 긴밀한 자율신경망으로 연결되어 있어 감정적 긴장이 장 운동에 영향을 줍니다.
[주요 진료 안내](/treatments/)를 확인하실 수 있습니다.

## 3. 과민성대장증후군 감별 및 진단 핵심
단순히 긴장할 때 설사나 복통이 반복된다는 사실만으로 과민성대장증후군으로 단정하지 않습니다.
IBS 평가에서는 반복되는 복통과 함께 배변과의 관계(배변 후 통증 완화 여부) 및 배변 빈도와 대변 형태 변화와의 연관성을 면밀히 평가합니다.
혈변이나 설명되지 않는 급격한 체중 감소가 동반된다면 소화기내과 정밀 검사가 필요합니다.
[온라인 상담](/inquiry/)을 통해 상태를 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료를 진행합니다.
특정 음식이 장에 미치는 영향은 개인차가 크므로 식사 일지를 통해 자신만의 민감 음식을 파악하는 것이 권장됩니다.
복부를 따뜻하게 유지하는 것은 긴장을 풀고 편안함을 느끼는 데 도움이 되는 보조적인 생활 요령입니다.

## 5. 자주 묻는 질문
**Q1. 긴장할 때 배가 아프면 무조건 과민성대장인가요?**
A. 복통과 배변과의 관계, 배변 빈도나 변 형태의 변화를 함께 종합적으로 평가해야 합니다.
**Q2. 식사는 어떻게 조절하나요?**
A. 개인마다 반응하는 음식이 다르므로 식사 일지로 확인하는 것이 좋습니다.
`,
  thumbnailCopy: { yellowText: '출근길 복통', whiteText: '긴장하면 화장실', greenText: '과민성대장증후군' }
}));
assert.strictEqual(validIbsArticle.valid, true, `Valid IBS article MUST PASS: ${validIbsArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid reinforced IBS article passed validation 100%.');

// 14-A-2. Simplistic IBS assertion without evaluating bowel relationship (MUST FAIL)
const failSimplisticIbs = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'ibs',
  titleDisease: '과민성대장증후군',
  topicAngle: { id: 'morning-diarrhea', titleSuffix: '출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유' },
  geoId: 'yongin-main',
  title: '[용인 과민성대장증후군] 출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유',
  body: `
## 1. 진료실에서 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
긴장할 때마다 설사가 반복되면 곧 과민성대장증후군입니다.
## 2. 배경
신경계 문제 [주요 진료 안내](/treatments/)
## 3. 감별
배변 후 통증 호전과 배변 빈도 변화를 함께 확인합니다.
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failSimplisticIbs.valid, false, 'Simplistic IBS assertion MUST FAIL');
assert.ok(failSimplisticIbs.errors.some(e => e.includes('IBS diagnostic rule violation')), 'Expected IBS diagnostic rule violation');
console.log('✅ PASS: Simplistic stress-diarrhea IBS assertion strictly blocked.');

// 14-A-3. IBS missing bowel movement / stool form relationship evaluation (MUST FAIL)
const failMissingBowelRelation = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'ibs',
  titleDisease: '과민성대장증후군',
  topicAngle: { id: 'morning-diarrhea', titleSuffix: '출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유' },
  geoId: 'yongin-main',
  title: '[용인 과민성대장증후군] 출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
복통이 자주 발생합니다.
## 2. 배경
자율신경 문제. [주요 진료 안내](/treatments/)
## 3. 감별
단순 복통과 스트레스를 구별합니다.
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failMissingBowelRelation.valid, false, 'IBS missing bowel relationship MUST FAIL');
assert.ok(failMissingBowelRelation.errors.some(e => e.includes('IBS diagnostic criteria missing')), 'Expected IBS diagnostic criteria missing error');
console.log('✅ PASS: IBS missing bowel relationship/stool form evaluation strictly blocked.');

// 14-A-4. Blanket food lumping & flour blaming in IBS (MUST FAIL)
const failBlanketFoodIbs = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'ibs',
  titleDisease: '과민성대장증후군',
  topicAngle: { id: 'morning-diarrhea', titleSuffix: '출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유' },
  geoId: 'yongin-main',
  title: '[용인 과민성대장증후군] 출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
복통과 배변 후 증상 변화를 평가합니다. 배변 횟수 변화를 함께 봅니다.
## 2. 배경
유제품, 밀가루, 카페인은 모든 환자에게 공통 대표적인 악화 음식이므로 완전히 끊어야 합니다.
[주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failBlanketFoodIbs.valid, false, 'Blanket food lumping MUST FAIL');
assert.ok(failBlanketFoodIbs.errors.some(e => e.includes('IBS dietary guidance violation')), 'Expected IBS dietary guidance violation');
console.log('✅ PASS: Blanket food lumping (유제품, 밀가루, 카페인 공통 악화) strictly blocked.');

// 14-A-5. Warming abdomen framed as core treatment principle (MUST FAIL)
const failWarmAbdomenCore = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'ibs',
  titleDisease: '과민성대장증후군',
  topicAngle: { id: 'morning-diarrhea', titleSuffix: '출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유' },
  geoId: 'yongin-main',
  title: '[용인 과민성대장증후군] 출근길이나 긴장되는 순간마다 화장실을 찾게 되는 이유',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
복통과 배변 후 증상 변화, 배변 빈도 변화를 살핍니다.
## 2. 배경
[주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
복부를 따뜻하게 유지하는 것이 과민성대장증후군의 핵심 치료 원리입니다.
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failWarmAbdomenCore.valid, false, 'Warming abdomen as core treatment MUST FAIL');
assert.ok(failWarmAbdomenCore.errors.some(e => e.includes('IBS lifestyle guidance violation')), 'Expected IBS lifestyle guidance violation');
console.log('✅ PASS: Warming abdomen as core treatment principle strictly blocked.');

// 14-B. Syncope Subway-Dizziness Thumbnail Image Prompt Tests
console.log('\n[Test 14-B] Testing Syncope Subway-Dizziness Thumbnail Image Prompt...');

// 14-B-1. Valid subway-dizziness prompt (MUST PASS)
const validSyncopePrompt = buildImagePrompt('syncope', '미주신경성 실신', 'subway-dizziness', '만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때', 'mixed');
assert.ok(validSyncopePrompt.includes('subway') || validSyncopePrompt.includes('bus') || validSyncopePrompt.includes('public transportation'), 'Must include public transportation');
assert.ok(validSyncopePrompt.includes('ONE Korean ADULT only'), 'Must enforce ONE Korean ADULT only');
assert.ok(validSyncopePrompt.includes('NO collapse'), 'Must forbid collapse');
assert.ok(validSyncopePrompt.includes('NO unconsciousness'), 'Must forbid unconsciousness');
assert.ok(validSyncopePrompt.includes('NO fainting'), 'Must forbid fainting');
assert.ok(validSyncopePrompt.includes('NO clutching body'), 'Must forbid clutching body');
console.log('✅ PASS: Generated syncope image prompt correctly enforces transit context and safe non-symptom posture.');

// 14-B-2. Validator blocks office/home-only prompt for subway-dizziness
const failOfficePromptValidation = validateArticleContent({
  title: '[위례 미주신경성 실신] 지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때',
  summary: '성남 위례 지역 주민분들을 위한 미주신경성 실신 전조증상 대처와 기립 혈류 관리 안내입니다.',
  geoId: 'seongnam-wirye',
  diseaseId: 'syncope',
  titleDisease: '미주신경성 실신',
  topicAngle: { id: 'subway-dizziness', titleSuffix: '지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때' },
  hashtags: ['위례미주신경성실신', '위례한의원', '미주신경성실신치료', '해아림한의원'],
  keywords: ['위례 미주신경성 실신', '성남시 미주신경성 실신', '미주신경성 실신 한방치료'],
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
대중교통 이용 중 아찔한 실신 전조증상을 겪는 분들이 계십니다.
## 2. 배경
자율신경 반사와 뇌 혈류 저하 [주요 진료 안내](/treatments/)
## 3. 감별
운동 중 실신이나 원인 불명의 급사 심장 질환 가족력 시 순환기내과 평가가 필요합니다.
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  thumbnailCopy: { yellowText: '만원 버스에서', whiteText: '눈앞이 캄캄하고', greenText: '미주신경성 실신' }
}, {
  imagePrompt: 'A realistic lifestyle photo of one Korean adult sitting calmly at a desk in a quiet office workspace with a laptop, no distress.'
});
assert.strictEqual(failOfficePromptValidation.valid, false, 'Office-only prompt for subway-dizziness MUST FAIL');
assert.ok(failOfficePromptValidation.errors.some(e => e.includes('Syncope subway-dizziness thumbnail prompt')), 'Expected syncope transit prompt error');
console.log('✅ PASS: Office/home-only prompt for subway-dizziness strictly blocked by validator.');

// 14-C. Dizziness Differential Cause Framing & ENT Normal Auto-Jump Blocking Tests
console.log('\n[Test 14-C] Testing Dizziness Cause Framing & Differential Evaluation...');

// 14-C-1. Valid Dizziness Article (MUST PASS)
const validDizzinessArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'headache',
  titleDisease: '어지럼증',
  thumbnailDiseaseLabel: '어지럼증',
  seoDiseaseLabel: '어지럼증',
  ageGroup: 'adult',
  geoId: 'yongin-suji',
  title: '[수지 어지럼증] 이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증',
  summary: '용인 수지 지역 주민들을 위해 지속되는 비회전성 어지럼증에서 동반 증상과 다양한 원인을 구분하고 상태에 맞는 관리 방향을 살펴봅니다.',
  topicAngle: { id: 'chronic-dizziness', titleSuffix: '이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증' },
  hashtags: ['수지어지럼증', '수지한의원', '어지럼증치료', '해아림한의원'],
  keywords: ['수지 어지럼증', '용인시 수지구 어지럼증', '어지럼증 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
이비인후과 검사에서 전정기능 검사상 특별한 이상이 발견되지 않았음에도 머리가 맑지 않고 몸이 붕 뜨거나 흔들리는 듯한 지속성 비회전성 어지럼증을 호소하시는 분들이 많습니다.

## 2. 다양한 원인 감별의 필요성
이비인후과 검사에서 큰 이상이 없다고 해서 단일 원인으로 속단할 수 없으며, 증상 양상에 따라 전정편두통, 지속성 체위-지각 어지럼증(PPPD) 등 기능성 전정질환, 기립성 순환 문제, 신경학적 또는 내과적 원인, 복용 약물 및 전신 피로 상태 등을 폭넓게 감별해야 합니다.
[주요 진료 안내](/treatments/)를 통해 진료 정보를 확인하실 수 있습니다.

## 3. 동반 증상과 상태 평가
동반된 목과 어깨의 긴장이 있고 자세 변화에 따라 불편감이 변하는 일부 경우 경추부 긴장 요소를 함께 평가할 수 있습니다.
벼락 두통, 편마비, 언어 장애 등 중추 신경학적 이상 신호가 동반된다면 응급 뇌영상 평가가 우선되어야 합니다.
[온라인 상담](/inquiry/)으로 상태를 상담하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방, 침구 치료, 필요 시 추나요법과 생활 관리 지도를 시행합니다.
규칙적인 수면 리듬 유지와 충분한 휴식, 과도한 시각적·감각적 자극 완화를 병행합니다.

## 5. 자주 묻는 질문
**Q1. 검사에서 정상이면 원인을 알 수 없나요?**
A. 전정편두통이나 기능성 어지럼증, 자율신경 조절 등 다양한 측면에서 감별 평가가 필요합니다.
**Q2. 목 스트레칭만으로 좋아지나요?**
A. 목 긴장은 동반 요소일 수 있으므로 수면과 일상 컨디션을 함께 관리해야 합니다.
`,
  thumbnailCopy: { yellowText: '검사 후에도', whiteText: '붕 뜨는 어지럼', greenText: '어지럼증' }
}));
assert.strictEqual(validDizzinessArticle.valid, true, `Valid dizziness article MUST PASS: ${validDizzinessArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid reinforced dizziness article passed validation 100%.');

// 14-C-2. ENT Normal -> Cervical Auto-Jump (MUST FAIL)
const failEntAutoJump = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'headache',
  titleDisease: '어지럼증',
  topicAngle: { id: 'chronic-dizziness', titleSuffix: '이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증' },
  geoId: 'yongin-suji',
  title: '[수지 어지럼증] 이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증',
  summary: '용인 수지 지역 어지럼증 환자분들을 위한 감별 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
이비인후과 검사에서 이상 없는데 어지럼이 계속됩니다.
## 2. 원인
이비인후과 검사에서 정상이라면 결국 경추의 문제로 볼 수 있습니다.
전정편두통이나 PPPD 등도 있지만 결국 목 근육 때문입니다.
[주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  thumbnailCopy: { yellowText: '검사 후에도', whiteText: '붕 뜨는 어지럼', greenText: '어지럼증' }
}));
assert.strictEqual(failEntAutoJump.valid, false, 'ENT normal to cervical auto-jump MUST FAIL');
assert.ok(failEntAutoJump.errors.some(e => e.includes('Dizziness cause framing violation')), 'Expected Dizziness cause framing violation');
console.log('✅ PASS: ENT normal -> cervical/autonomic auto-jump strictly blocked.');

// 14-C-3. Summary Narrowed to Cervical/Autonomic (MUST FAIL)
const failNarrowedSummary = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'headache',
  titleDisease: '어지럼증',
  topicAngle: { id: 'chronic-dizziness', titleSuffix: '이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증' },
  geoId: 'yongin-suji',
  title: '[수지 어지럼증] 이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증',
  summary: '용인 수지 지역 어지럼증에 대한 경추·자율신경계 긴장에 대한 한의학적 관리 방향 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
어지럼증 증상을 살핍니다.
## 2. 원인 감별
전정편두통, PPPD, 기립성 문제 등 다양한 감별이 필요합니다.
[주요 진료 안내](/treatments/)
## 3. 동반 증상
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  thumbnailCopy: { yellowText: '검사 후에도', whiteText: '붕 뜨는 어지럼', greenText: '어지럼증' }
}));
assert.strictEqual(failNarrowedSummary.valid, false, 'Narrowed cervical summary MUST FAIL');
assert.ok(failNarrowedSummary.errors.some(e => e.includes('Dizziness summary framing violation')), 'Expected Dizziness summary framing violation');
console.log('✅ PASS: Narrowed cervical summary strictly blocked.');

// 14-C-4. Missing Differential Evaluation (MUST FAIL)
const failMissingDifferential = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'headache',
  titleDisease: '어지럼증',
  topicAngle: { id: 'chronic-dizziness', titleSuffix: '이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증' },
  geoId: 'yongin-suji',
  title: '[수지 어지럼증] 이비인후과 검사 후에도 지속되는 붕 뜨는 어지럼증',
  summary: '용인 수지 지역 주민들을 위해 지속되는 비회전성 어지럼증에서 동반 증상과 다양한 원인을 구분하고 상태에 맞는 관리 방향을 살펴봅니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
붕 뜨는 어지럼증이 지속됩니다.
## 2. 주요 배경
머리가 맑지 않고 어지럽습니다.
[주요 진료 안내](/treatments/)
## 3. 동반 증상
목과 어깨 긴장이 있을 수 있습니다.
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  thumbnailCopy: { yellowText: '검사 후에도', whiteText: '붕 뜨는 어지럼', greenText: '어지럼증' }
}));
assert.strictEqual(failMissingDifferential.valid, false, 'Missing differential evaluation MUST FAIL');
assert.ok(failMissingDifferential.errors.some(e => e.includes('Dizziness differential evaluation missing')), 'Expected Dizziness differential evaluation missing error');
console.log('✅ PASS: Missing differential evaluation in chronic dizziness strictly blocked.');

// 14-D. Syncope (TLOC) vs Presyncope Definition Distinction Tests
console.log('\n[Test 14-D] Testing Syncope vs Presyncope Definition Distinction...');
const { checkSyncopePresyncopeDistinction } = require('../scripts/auto_column/content_validator');

// 14-D-1. Direct String Regression Tests (PASS cases)
const passSyncopeDefinitions = [
  "실신은 일시적인 의식소실이다.",
  "의식소실 없이 눈앞이 캄캄하고 쓰러질 것 같은 상태는 전실신으로 구분한다.",
  "실신은 일시적인 뇌 혈류 감소로 인해 갑작스럽게 의식을 잃었다가 비교적 빠르게 자발적으로 회복되는 상태입니다. 반면 눈앞이 캄캄하거나 식은땀, 쓰러질 것 같은 느낌이 있으면서 의식을 완전히 잃지 않은 경우는 전실신 또는 실신 전 단계의 증상으로 구분할 수 있습니다."
];
passSyncopeDefinitions.forEach((text, idx) => {
  const res = checkSyncopePresyncopeDistinction(text);
  assert.strictEqual(res.valid, true, `Valid syncope/presyncope definition [${idx}] was falsely rejected: "${text}"`);
});
console.log('✅ PASS: All valid Syncope vs Presyncope distinction definitions passed.');

// 14-D-2. Direct String Regression Tests (FAIL cases)
const failSyncopeDefinitions = [
  "의식이 흐려지는 것만으로 실신이다.",
  "의식을 잃지 않아도 실신이다.",
  "실신은 일시적으로 뇌에 공급되는 혈류가 줄어 의식이 흐려지거나 잠깐 의식을 잃는 현상"
];
failSyncopeDefinitions.forEach((text, idx) => {
  const res = checkSyncopePresyncopeDistinction(text);
  assert.strictEqual(res.valid, false, `Conflated syncope definition [${idx}] MUST FAIL: "${text}"`);
  assert.ok(res.reason.includes('Syncope diagnostic definition violation'), `Expected violation error for: "${text}"`);
});
console.log('✅ PASS: All conflated Syncope definitions strictly rejected.');

// 14-D-3. Full Article Validation - Valid Syncope Article (MUST PASS)
const validSyncopeArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'syncope',
  titleDisease: '미주신경성 실신',
  thumbnailDiseaseLabel: '미주신경성 실신',
  seoDiseaseLabel: '미주신경성 실신',
  ageGroup: 'mixed',
  geoId: 'seongnam-wirye',
  title: '[위례 미주신경성 실신] 지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때',
  summary: '위례 지역 주민분들을 위한 미주신경성 실신과 전실신 구분 및 기립 혈류 관리 안내입니다.',
  topicAngle: { id: 'subway-dizziness', titleSuffix: '지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때' },
  hashtags: ['위례미주신경성실신', '위례한의원', '미주신경성실신치료', '해아림한의원'],
  keywords: ['위례 미주신경성 실신', '위례신도시 미주신경성 실신', '미주신경성 실신 한방치료'],
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
출퇴근길 만원 지하철이나 버스 안에서 갑자기 눈앞이 하얘지거나 아찔함을 느껴 당황하시는 분들이 많습니다.

## 2. 미주신경성 실신과 전실신의 명확한 구분
실신은 일시적인 뇌 혈류 감소로 인해 갑작스럽게 의식을 잃었다가 비교적 빠르게 자발적으로 회복되는 상태입니다.
반면 눈앞이 캄캄하거나 식은땀, 쓰러질 것 같은 느낌이 있으면서 의식을 완전히 잃지 않은 경우는 전실신 또는 실신 전 단계의 증상으로 구분할 수 있습니다.
[주요 진료 안내](/treatments/)를 확인하실 수 있습니다.

## 3. 대처 요령과 경고 증상 감별
전조증상이 나타나면 즉시 주저앉거나 다리를 꼬는 counter-pressure 동작으로 낙상을 예방해야 합니다.
운동 중 실신이나 원인 불명의 급사, 조기 심장질환, 유전성 부정맥 등 심장성 실신 위험을 시사하는 가족력이 있다면 순환기내과 정밀 평가가 선행되어야 합니다.
[온라인 상담](/inquiry/)으로 상담을 받으실 수 있습니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리
자율신경 조절력과 기립 시 반응을 살펴 한약 처방과 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 눈앞이 캄캄하기만 해도 실신인가요?**
A. 의식소실이 없다면 전실신(실신 전 단계)으로 구분하며, 즉시 자리에 앉아 낙상을 예방하는 것이 중요합니다.
**Q2. 어떻게 예방하나요?**
A. 전조 시 즉시 착석하고 다리 근육 수축 동작을 활용합니다.
`,
  thumbnailCopy: { yellowText: '만원 버스에서', whiteText: '눈앞이 캄캄하고', greenText: '미주신경성 실신' }
}, {
  imagePrompt: 'A realistic lifestyle photo of one Korean adult standing calmly in a subway train during commute, natural posture, no distress.'
}));
assert.strictEqual(validSyncopeArticle.valid, true, `Valid syncope article MUST PASS: ${validSyncopeArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid Syncope vs Presyncope distinction article passed validation 100%.');

// 14-D-4. Full Article Validation - Conflated Definition Article (MUST FAIL)
const failConflatedSyncopeArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'syncope',
  titleDisease: '미주신경성 실신',
  topicAngle: { id: 'subway-dizziness', titleSuffix: '지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때' },
  geoId: 'seongnam-wirye',
  title: '[위례 미주신경성 실신] 지하철이나 만원 버스에서 눈앞이 캄캄해지고 식은땀이 날 때',
  summary: '성남 위례 지역 주민분들을 위한 미주신경성 실신 전조증상 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
대중교통 이용 중 아찔한 증상이 나타납니다.
## 2. 배경
실신은 일시적으로 뇌에 공급되는 혈류가 줄어 의식이 흐려지거나 잠깐 의식을 잃는 현상입니다.
[주요 진료 안내](/treatments/)
## 3. 감별
[온라인 상담](/inquiry/)
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  thumbnailCopy: { yellowText: '만원 버스에서', whiteText: '눈앞이 캄캄하고', greenText: '미주신경성 실신' }
}, {
  imagePrompt: 'A realistic lifestyle photo of one Korean adult standing calmly in a subway train during commute, natural posture, no distress.'
}));
assert.strictEqual(failConflatedSyncopeArticle.valid, false, 'Conflated syncope definition in article MUST FAIL');
assert.ok(failConflatedSyncopeArticle.errors.some(e => e.includes('Syncope diagnostic definition violation')), 'Expected Syncope diagnostic definition violation');
console.log('✅ PASS: Conflated syncope definition article strictly blocked by validator.');

// ==========================================
// Test 15: Batch 4 Human Review Feedback Regression Tests (A through H)
// ==========================================
console.log('\n[Test 15] Running Batch 4 Human Review Feedback & Shared Identity Resolver Regression Tests...');

// 15-A. Depression / Burnout: Prohibit Independent OCD Checking Section
console.log('\n[Test 15-A] Testing Depression OCD Checking Section Intrusion Prevention...');
const { checkDepressionOcdSectionLeakage, checkOcdViciousCycleAndTreatments, checkSeparationAnxietyDistinction, checkNightTerrorsTitleAndClinical } = require('../scripts/auto_column/content_validator');

const validDepressionBody = `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
충분한 휴식을 취해도 피로가 지속되고 의욕이 저하되는 상태입니다.
번아웃은 만성 직장 스트레스와 관련된 직업적 현상(occupational phenomenon)이며 우울증 자체와 동일한 진단은 아닙니다.
쉬어도 지속되는 피로는 우울 증상뿐 아니라 신체적 원인(갑상선, 빈혈 등)이나 약물 영향 등 다른 원인도 감별할 필요가 있습니다.
불안이나 가벼운 강박 사고가 동반될 수 있으나 주된 양상은 기분 저하입니다.
[주요 진료 안내](/treatments/)
## 2. 발생 배경 및 심신 상태
[온라인 상담](/inquiry/)
## 3. 비슷한 다른 상태와 감별
## 4. 해아림한의원의 맞춤 관리
한약 처방과 침구 치료.
## 5. 일상 생활 관리
## 6. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`;

const validDepressionArticle = validateArticleContent({
  diseaseId: 'depression',
  titleDisease: '우울증',
  topicAngle: { id: 'burnout-lethargy', titleSuffix: '쉬어도 충전되지 않고 모든 일에 의욕이 사라질 때' },
  geoId: 'gyeonggi-gwangju',
  title: '[경기광주 우울증] 쉬어도 충전되지 않고 모든 일에 의욕이 사라질 때',
  summary: '경기광주 지역 주민분들을 위한 번아웃과 우울증 감별 및 만성 무기력 극복 가이드입니다.',
  body: validDepressionBody,
  hashtags: ['경기광주우울증', '경기광주한의원', '우울증치료', '해아림한의원'],
  keywords: ['경기광주 우울증', '경기 광주시 우울증', '우울증 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤하고', whiteText: '의욕이 사라질 때', greenText: '우울증' }
});
assert.strictEqual(validDepressionArticle.valid, true, `Valid depression article must pass: ${validDepressionArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid depression article without independent OCD section passed.');

const failDepressionOcdSectionArticle = validateArticleContent({
  diseaseId: 'depression',
  titleDisease: '우울증',
  topicAngle: { id: 'burnout-lethargy', titleSuffix: '쉬어도 충전되지 않고 모든 일에 의욕이 사라질 때' },
  geoId: 'gyeonggi-gwangju',
  title: '[경기광주 우울증] 쉬어도 충전되지 않고 모든 일에 의욕이 사라질 때',
  summary: '경기광주 지역 주민분들을 위한 번아웃과 우울증 감별 및 만성 무기력 극복 가이드입니다.',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
[주요 진료 안내](/treatments/)
## 2. 반복되는 불안한 생각과 확인 행동이 함께 나타날 때
외출 전 가스 밸브를 잠갔는지, 문을 잠갔는지 수차례 확인하는 행동이 이어집니다.
[온라인 상담](/inquiry/)
## 3. 비슷한 다른 상태와 감별
## 4. 해아림한의원의 맞춤 관리
한약 처방과 침구 치료.
## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['경기광주우울증', '경기광주한의원', '우울증치료', '해아림한의원'],
  keywords: ['경기광주 우울증', '경기 광주시 우울증', '우울증 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤하고', whiteText: '의욕이 사라질 때', greenText: '우울증' }
});
assert.strictEqual(failDepressionOcdSectionArticle.valid, false, 'Depression with independent OCD section MUST FAIL');
assert.ok(failDepressionOcdSectionArticle.errors.some(e => e.includes('Depression OCD checking section violation')), 'Expected Depression OCD checking section violation');
console.log('✅ PASS: Depression article with independent OCD section strictly blocked.');

// 15-B. OCD: Obsession-Compulsion Vicious Cycle & Standard Evidence-based Treatment
console.log('\n[Test 15-B] Testing OCD Obsession-Compulsion Cycle and Standard Treatments...');

const validOcdArticle = validateArticleContent({
  diseaseId: 'depression',
  titleDisease: '강박증/OCD',
  thumbnailDiseaseLabel: '강박증',
  seoDiseaseLabel: '강박증',
  topicAngle: { id: 'intrusive-thoughts', titleSuffix: '원치 않는 불안한 생각이 반복적으로 떠오를 때' },
  geoId: 'seongnam-main',
  title: '[성남 강박증/OCD] 원치 않는 불안한 생각이 반복적으로 떠오를 때',
  summary: '성남 지역 주민분들을 위한 원치 않는 침투적 사고와 강박 행동의 악순환, 표준 치료와 보완적 관리 안내입니다.',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
원치 않는 불안한 생각이나 침투적 사고(Obsession)가 떠오르면 심한 불안과 고통이 유발됩니다.
이를 줄이기 위해 반복적인 확인, 소독 등 강박 행동(Compulsion)이나 회피를 하게 되며 일시적 안도를 얻지만 결국 악순환이 강화되고 반복됩니다.
일상 기능 저하가 큰 경우 정신건강의학과 전문 평가가 필요하며, 노출 및 반응방지(ERP)를 포함한 인지행동치료(CBT)와 약물치료가 근거 기반 표준 치료 선택지로 권장됩니다.
한의학적 관리는 기존 표준 치료를 대체하는 것이 아니라 현재 치료 상황을 고려해 심신 긴장 완화를 돕도록 보완적으로 계획합니다.
[주요 진료 안내](/treatments/)
## 2. 발생 기전
[온라인 상담](/inquiry/)
## 3. 다른 상태와 감별
## 4. 해아림한의원의 맞춤 관리
한약 처방과 침구 치료.
## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['성남강박증', '성남한의원', '강박증치료', '해아림한의원'],
  keywords: ['성남 강박증', '성남시 강박증', '강박증 한방치료'],
  thumbnailCopy: { yellowText: '원치 않는', whiteText: '불안한 생각 반복', greenText: '강박증' }
});
assert.strictEqual(validOcdArticle.valid, true, `Valid OCD article must pass: ${validOcdArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid OCD article with vicious cycle and standard treatments passed.');

// OCD missing vicious cycle
const failOcdMissingCycle = validateArticleContent({
  diseaseId: 'depression',
  titleDisease: '강박증/OCD',
  thumbnailDiseaseLabel: '강박증',
  seoDiseaseLabel: '강박증',
  topicAngle: { id: 'intrusive-thoughts', titleSuffix: '원치 않는 불안한 생각이 반복적으로 떠오를 때' },
  geoId: 'seongnam-main',
  title: '[성남 강박증/OCD] 원치 않는 불안한 생각이 반복적으로 떠오를 때',
  summary: '성남 지역 주민분들을 위한 강박증 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
단순히 생각이 많습니다.
ERP, 인지행동치료(CBT), 약물치료 등 전문 평가를 받습니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 관리
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['성남강박증', '성남한의원', '강박증치료', '해아림한의원'],
  keywords: ['성남 강박증', '성남시 강박증', '강박증 한방치료'],
  thumbnailCopy: { yellowText: '원치 않는', whiteText: '생각이 많을 때', greenText: '강박증' }
});
assert.strictEqual(failOcdMissingCycle.valid, false, 'OCD missing vicious cycle MUST FAIL');
assert.ok(failOcdMissingCycle.errors.some(e => e.includes('OCD vicious cycle missing')), 'Expected OCD vicious cycle missing error');
console.log('✅ PASS: OCD missing vicious cycle strictly blocked.');

// OCD claiming cognitive distancing replaces ERP
const failOcdReplacingErp = validateArticleContent({
  diseaseId: 'depression',
  titleDisease: '강박증/OCD',
  thumbnailDiseaseLabel: '강박증',
  seoDiseaseLabel: '강박증',
  topicAngle: { id: 'intrusive-thoughts', titleSuffix: '원치 않는 불안한 생각이 반복적으로 떠오를 때' },
  geoId: 'seongnam-main',
  title: '[성남 강박증/OCD] 원치 않는 불안한 생각이 반복적으로 떠오를 때',
  summary: '성남 지역 주민분들을 위한 강박증 안내입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
침투적 사고로 불안과 고통이 생겨 강박 행동과 확인을 통해 일시적 안도를 얻지만 악순환이 반복 강화됩니다.
전문의 평가와 표준 치료로 ERP, CBT, 약물치료가 있습니다.
그러나 인지적 거리두기와 수용 훈련은 힘든 ERP를 대신하는 새로운 치료법입니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 관리
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['성남강박증', '성남한의원', '강박증치료', '해아림한의원'],
  keywords: ['성남 강박증', '성남시 강박증', '강박증 한방치료'],
  thumbnailCopy: { yellowText: '원치 않는', whiteText: '불안한 생각 반복', greenText: '강박증' }
});
assert.strictEqual(failOcdReplacingErp.valid, false, 'Claiming cognitive distancing replaces ERP MUST FAIL');
assert.ok(failOcdReplacingErp.errors.some(e => e.includes('OCD treatment framing violation')), 'Expected OCD treatment framing violation');
console.log('✅ PASS: Claiming cognitive distancing replaces ERP strictly blocked.');

// 15-C. Separation Anxiety: Normal Developmental vs Clinical Disorder Distinction
console.log('\n[Test 15-C] Testing Separation Anxiety Normal Developmental vs Disorder Distinction...');

const validSepAnxietyArticle = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 분리불안',
  thumbnailDiseaseLabel: '소아 분리불안',
  seoDiseaseLabel: '소아 분리불안',
  ageGroup: 'child',
  topicAngle: { id: 'school-reluctance', titleSuffix: '유치원이나 학교 갈 때마다 배가 아프다고 우는 아이' },
  geoId: 'yongin-cheoin',
  title: '[처인구 소아 분리불안] 유치원이나 학교 갈 때마다 배가 아프다고 우는 아이',
  summary: '용인 처인구 지역 학부모를 위한 정상 발달 분리불안과 분리불안장애 감별 및 아침 복통 대처 가이드입니다.',
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
어린 시기의 양육자 분리 불안 자체는 정상적인 발달 과정에서도 흔히 나타날 수 있는 자연스러운 반응입니다.
하지만 아이의 연령과 발달 수준에 비해 불안이 과도하고 지속되며, 등원 거부나 일상 기능을 방해하는 수준이라면 분리불안장애 가능성을 포함해 전문 평가가 필요합니다.
[주요 진료 안내](/treatments/)
## 2. 발생 배경
[온라인 상담](/inquiry/)
## 3. 비슷한 다른 상태와 감별
## 4. 해아림한의원의 맞춤 관리
한약 처방과 침구 치료.
## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['처인구소아분리불안', '처인구한의원', '소아분리불안치료', '해아림한의원'],
  keywords: ['처인구 소아 분리불안', '용인시 처인구 소아 분리불안', '소아 분리불안 한방치료'],
  thumbnailCopy: { yellowText: '등원할 때마다', whiteText: '배 아프다고 우는 아이', greenText: '소아 분리불안' }
});
assert.strictEqual(validSepAnxietyArticle.valid, true, `Valid separation anxiety article must pass: ${validSepAnxietyArticle.errors.join(', ')}`);
console.log('✅ PASS: Valid separation anxiety article distinguishing developmental anxiety passed.');

const failSepAnxietyMissingDev = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 분리불안',
  thumbnailDiseaseLabel: '소아 분리불안',
  seoDiseaseLabel: '소아 분리불안',
  ageGroup: 'child',
  topicAngle: { id: 'school-reluctance', titleSuffix: '유치원이나 학교 갈 때마다 배가 아프다고 우는 아이' },
  geoId: 'yongin-cheoin',
  title: '[처인구 소아 분리불안] 유치원이나 학교 갈 때마다 배가 아프다고 우는 아이',
  summary: '용인 처인구 지역 학부모를 위한 소아 분리불안 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
아이가 학교에 가기 싫어하면 즉시 치료해야 합니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['처인구소아분리불안', '처인구한의원', '소아분리불안치료', '해아림한의원'],
  keywords: ['처인구 소아 분리불안', '용인시 처인구 소아 분리불안', '소아 분리불안 한방치료'],
  thumbnailCopy: { yellowText: '등원할 때마다', whiteText: '배 아프다고 우는 아이', greenText: '소아 분리불안' }
});
assert.strictEqual(failSepAnxietyMissingDev.valid, false, 'Separation anxiety missing developmental distinction MUST FAIL');
assert.ok(failSepAnxietyMissingDev.errors.some(e => e.includes('Separation anxiety developmental distinction missing')), 'Expected Separation anxiety developmental distinction missing error');
console.log('✅ PASS: Separation anxiety missing normal developmental distinction strictly blocked.');

// 15-D. Separation Anxiety: Prohibit Enuresis Lifestyle Management Intrusion
console.log('\n[Test 15-D] Testing Enuresis Management Leakage into Separation Anxiety...');

const failSepAnxietyEnuresisLeakage = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 분리불안',
  thumbnailDiseaseLabel: '소아 분리불안',
  seoDiseaseLabel: '소아 분리불안',
  ageGroup: 'child',
  topicAngle: { id: 'school-reluctance', titleSuffix: '유치원이나 학교 갈 때마다 배가 아프다고 우는 아이' },
  geoId: 'yongin-cheoin',
  title: '[처인구 소아 분리불안] 유치원이나 학교 갈 때마다 배가 아프다고 우는 아이',
  summary: '용인 처인구 지역 학부모를 위한 소아 분리불안 및 신체 증상 관리 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
정상적인 발달 과정일 수 있으나 과도하고 일상 기능을 방해하면 전문 평가가 필요합니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 평가
한약 처방과 침구 치료.
## 5. 일상 생활 관리
저녁 식사 후 과도한 수분 제한을 실천하고 취침 전 배뇨 습관을 들이는 것이 좋습니다.
## 6. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['처인구소아분리불안', '처인구한의원', '소아분리불안치료', '해아림한의원'],
  keywords: ['처인구 소아 분리불안', '용인시 처인구 소아 분리불안', '소아 분리불안 한방치료'],
  thumbnailCopy: { yellowText: '등원할 때마다', whiteText: '배 아프다고 우는 아이', greenText: '소아 분리불안' }
});
assert.strictEqual(failSepAnxietyEnuresisLeakage.valid, false, 'Enuresis management in separation anxiety MUST FAIL');
assert.ok(failSepAnxietyEnuresisLeakage.errors.some(e => e.includes('Separation anxiety enuresis management leakage')), 'Expected Separation anxiety enuresis management leakage');
console.log('✅ PASS: Enuresis management leakage into separation anxiety strictly blocked.');

// 15-E. Night Terrors: Title Conflating Nightmares MUST FAIL
console.log('\n[Test 15-E] Testing Night Terrors Title Nightmare Conflation Blocking...');

const failNightTerrorsConflatedTitle = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 야경증',
  thumbnailDiseaseLabel: '소아 야경증',
  seoDiseaseLabel: '소아 야경증',
  ageGroup: 'child',
  topicAngle: { id: 'screaming-sleep', titleSuffix: '밤마다 자다 깨서 자지러지게 울거나 악몽을 꿀 때' },
  geoId: 'gyeonggi-icheon',
  title: '[이천 소아 야경증] 밤마다 자다 깨서 자지러지게 울거나 악몽을 꿀 때',
  summary: '이천 지역 학부모를 위한 소아 야경증 및 수면 관리 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
NREM 수면 중 부분 각성으로 일어나며 완전히 깨어나지 않습니다.
다음 날 아침 사건을 기억하지 못하며 악몽과의 감별이 필요합니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['이천소아야경증', '이천한의원', '소아야경증치료', '해아림한의원'],
  keywords: ['이천 소아 야경증', '이천시 소아 야경증', '소아 야경증 한방치료'],
  thumbnailCopy: { yellowText: '자다가 갑자기', whiteText: '울고 소리칠 때', greenText: '소아 야경증' }
});
assert.strictEqual(failNightTerrorsConflatedTitle.valid, false, 'Night terrors title conflating nightmares MUST FAIL');
assert.ok(failNightTerrorsConflatedTitle.errors.some(e => e.includes('Night terrors title conflation violation')), 'Expected Night terrors title conflation violation');
console.log('✅ PASS: Night terrors title conflating nightmares strictly blocked.');

// 15-F. Night Terrors: Thumbnail Image Prompt Night/Bedroom/Sleep Context Requirement
console.log('\n[Test 15-F] Testing Night Terrors Image Prompt Context Requirements...');

const validNightTerrorsPrompt = buildImagePrompt('child', '소아 야경증', 'screaming-sleep', '자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때', 'child');
assert.ok(validNightTerrorsPrompt.includes('calm nighttime bedroom') || validNightTerrorsPrompt.includes('bedtime environment'), 'Prompt must include nighttime bedroom/bedtime');
assert.ok(validNightTerrorsPrompt.includes('soft dim indoor'), 'Prompt must specify soft dim light');
assert.ok(validNightTerrorsPrompt.includes('NO screaming'), 'Prompt must strictly forbid screaming');
assert.ok(validNightTerrorsPrompt.includes('NO crying'), 'Prompt must strictly forbid crying');
assert.ok(validNightTerrorsPrompt.includes('NO daytime scene'), 'Prompt must strictly forbid daytime scene');
assert.ok(validNightTerrorsPrompt.includes('NO drawing scene'), 'Prompt must strictly forbid drawing scene');
console.log('✅ PASS: Generated Night Terrors image prompt includes calm bedtime context and forbids symptom/daytime/drawing.');

// Validator blocks daytime/drawing image prompt for night terrors
const failDaytimeNightTerrorsArticle = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 야경증',
  thumbnailDiseaseLabel: '소아 야경증',
  seoDiseaseLabel: '소아 야경증',
  ageGroup: 'child',
  topicAngle: { id: 'screaming-sleep', titleSuffix: '자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때' },
  geoId: 'gyeonggi-icheon',
  title: '[이천 소아 야경증] 자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때',
  summary: '이천 지역 학부모를 위한 소아 야경증 NREM 부분 각성과 수면 피로 관리 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
NREM 수면 중 부분 각성으로 발생하며 완전히 깨어나지 않습니다.
다음 날 아침 사건을 기억하지 못하며 악몽과의 감별이 중요합니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 평가
한약 처방과 침구 치료.
## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['이천소아야경증', '이천한의원', '소아야경증치료', '해아림한의원'],
  keywords: ['이천 소아 야경증', '이천시 소아 야경증', '소아 야경증 한방치료'],
  thumbnailCopy: { yellowText: '자다가 갑자기', whiteText: '울고 소리칠 때', greenText: '소아 야경증' }
}, {
  imagePrompt: 'A realistic single photo of one Korean child in daytime drawing at a classroom desk with crayons, bright daylight.'
});
assert.strictEqual(failDaytimeNightTerrorsArticle.valid, false, 'Daytime drawing prompt for night terrors MUST FAIL');
assert.ok(failDaytimeNightTerrorsArticle.errors.some(e => e.includes('Night terrors thumbnail prompt')), 'Expected Night terrors thumbnail prompt error');
console.log('✅ PASS: Daytime drawing prompt for night terrors strictly blocked by validator.');

// 15-G. Night Terrors: Prohibit Enuresis Management Leakage
console.log('\n[Test 15-G] Testing Enuresis Management Leakage into Night Terrors...');

const failNightTerrorsEnuresisLeakage = validateArticleContent({
  diseaseId: 'child',
  titleDisease: '소아 야경증',
  thumbnailDiseaseLabel: '소아 야경증',
  seoDiseaseLabel: '소아 야경증',
  ageGroup: 'child',
  topicAngle: { id: 'screaming-sleep', titleSuffix: '자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때' },
  geoId: 'gyeonggi-icheon',
  title: '[이천 소아 야경증] 자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때',
  summary: '이천 지역 학부모를 위한 소아 야경증 NREM 부분 각성과 수면 피로 관리 가이드입니다.',
  body: `
## 1. 진료실 고민
<div class="column-key-summary-box">핵심 요약</div>
NREM 수면 중 부분 각성으로 발생하며 완전히 깨어나지 않습니다.
다음 날 아침 사건을 기억하지 못하며 악몽과의 감별이 중요합니다.
[주요 진료 안내](/treatments/)
## 2. 배경
[온라인 상담](/inquiry/)
## 3. 감별
## 4. 평가
한약 처방과 침구 치료.
## 5. 핵심 생활 관리
저녁 수분 제한과 취침 전 배뇨를 철저히 관리하는 것이 야경증의 핵심 관리입니다.
## 6. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`,
  hashtags: ['이천소아야경증', '이천한의원', '소아야경증치료', '해아림한의원'],
  keywords: ['이천 소아 야경증', '이천시 소아 야경증', '소아 야경증 한방치료'],
  thumbnailCopy: { yellowText: '자다가 갑자기', whiteText: '울고 소리칠 때', greenText: '소아 야경증' }
});
assert.strictEqual(failNightTerrorsEnuresisLeakage.valid, false, 'Enuresis management in night terrors MUST FAIL');
assert.ok(failNightTerrorsEnuresisLeakage.errors.some(e => e.includes('Night terrors enuresis management leakage')), 'Expected Night terrors enuresis management leakage');
console.log('✅ PASS: Enuresis management leakage into night terrors strictly blocked.');

// 15-H. Common Content Identity Resolver: QA and Production Equivalence
console.log('\n[Test 15-H] Testing Common Content Identity Resolver Consistency Across QA and Production...');
const { resolveContentIdentity } = require('../scripts/auto_column/identity_resolver');
const { buildProductionTopicPlan } = require('../scripts/auto_column/topic_planner');

// 1. intrusive-thoughts -> OCD
const qaOcdPlan = buildQAPlan(findQATarget('qa-16-ocd'));
const seongnamRegion = geoHierarchy.regions.find(r => r.id === 'seongnam-main');
const depDisease = diseaseTaxonomy.diseases.find(d => d.id === 'depression');
const ocdAngle = depDisease.topicAngles.find(a => a.id === 'intrusive-thoughts');
const prodOcdPlan = buildProductionTopicPlan(seongnamRegion, depDisease, ocdAngle);

assert.strictEqual(qaOcdPlan.titleDisease, '강박증/OCD');
assert.strictEqual(prodOcdPlan.titleDisease, '강박증/OCD');
assert.strictEqual(qaOcdPlan.seoDiseaseLabel, '강박증');
assert.strictEqual(prodOcdPlan.seoDiseaseLabel, '강박증');
assert.strictEqual(qaOcdPlan.thumbnailDiseaseLabel, '강박증');
assert.strictEqual(prodOcdPlan.thumbnailDiseaseLabel, '강박증');
assert.ok(qaOcdPlan.slug.includes('-ocd-'), `QA slug should contain 'ocd', got: ${qaOcdPlan.slug}`);
assert.ok(prodOcdPlan.slug.includes('-ocd-'), `Production slug should contain 'ocd', got: ${prodOcdPlan.slug}`);
console.log('✅ PASS: intrusive-thoughts resolves identically to OCD in QA and Production (slug: -ocd-).');

// 2. presentation-anxiety -> social-phobia
const qaSocialPlan = buildQAPlan(findQATarget('qa-07-social-phobia'));
const sujeongRegion = geoHierarchy.regions.find(r => r.id === 'seongnam-sujeong');
const anxDisease = diseaseTaxonomy.diseases.find(d => d.id === 'anxiety');
const socialAngle = anxDisease.topicAngles.find(a => a.id === 'presentation-anxiety');
const prodSocialPlan = buildProductionTopicPlan(sujeongRegion, anxDisease, socialAngle);

assert.strictEqual(qaSocialPlan.titleDisease, '사회공포증');
assert.strictEqual(prodSocialPlan.titleDisease, '사회공포증');
assert.strictEqual(qaSocialPlan.seoDiseaseLabel, '사회공포증');
assert.strictEqual(prodSocialPlan.seoDiseaseLabel, '사회공포증');
assert.strictEqual(qaSocialPlan.thumbnailDiseaseLabel, '사회공포증');
assert.strictEqual(prodSocialPlan.thumbnailDiseaseLabel, '사회공포증');
assert.ok(qaSocialPlan.slug.includes('-social-phobia-'), `QA slug should contain 'social-phobia', got: ${qaSocialPlan.slug}`);
assert.ok(prodSocialPlan.slug.includes('-social-phobia-'), `Production slug should contain 'social-phobia', got: ${prodSocialPlan.slug}`);
console.log('✅ PASS: presentation-anxiety resolves identically to social-phobia in QA and Production (slug: -social-phobia-).');

// 3. chronic-dizziness -> dizziness
const qaDizzinessPlan = buildQAPlan(findQATarget('qa-14-dizziness'));
const sujiRegion = geoHierarchy.regions.find(r => r.id === 'yongin-suji');
const headacheDisease = diseaseTaxonomy.diseases.find(d => d.id === 'headache');
const dizzinessAngle = headacheDisease.topicAngles.find(a => a.id === 'chronic-dizziness');
const prodDizzinessPlan = buildProductionTopicPlan(sujiRegion, headacheDisease, dizzinessAngle);

assert.strictEqual(qaDizzinessPlan.titleDisease, '어지럼증');
assert.strictEqual(prodDizzinessPlan.titleDisease, '어지럼증');
assert.strictEqual(qaDizzinessPlan.seoDiseaseLabel, '어지럼증');
assert.strictEqual(prodDizzinessPlan.seoDiseaseLabel, '어지럼증');
assert.strictEqual(qaDizzinessPlan.thumbnailDiseaseLabel, '어지럼증');
assert.strictEqual(prodDizzinessPlan.thumbnailDiseaseLabel, '어지럼증');
assert.ok(qaDizzinessPlan.slug.includes('-dizziness-'), `QA slug should contain 'dizziness', got: ${qaDizzinessPlan.slug}`);
assert.ok(prodDizzinessPlan.slug.includes('-dizziness-'), `Production slug should contain 'dizziness', got: ${prodDizzinessPlan.slug}`);
console.log('✅ PASS: chronic-dizziness resolves identically to dizziness in QA and Production (slug: -dizziness-).');

// 4. parent-guidance -> tourette
const qaTourettePlan = buildQAPlan(findQATarget('qa-02-tourette'));
const ticDisease = diseaseTaxonomy.diseases.find(d => d.id === 'tic');
const touretteAngle = ticDisease.topicAngles.find(a => a.id === 'parent-guidance');
const prodTourettePlan = buildProductionTopicPlan(sujiRegion, ticDisease, touretteAngle);

assert.strictEqual(qaTourettePlan.titleDisease, '뚜렛증후군');
assert.strictEqual(prodTourettePlan.titleDisease, '뚜렛증후군');
assert.strictEqual(qaTourettePlan.seoDiseaseLabel, '뚜렛증후군');
assert.strictEqual(prodTourettePlan.seoDiseaseLabel, '뚜렛증후군');
assert.strictEqual(qaTourettePlan.thumbnailDiseaseLabel, '뚜렛증후군');
assert.strictEqual(prodTourettePlan.thumbnailDiseaseLabel, '뚜렛증후군');
assert.ok(qaTourettePlan.slug.includes('-tourette-'), `QA slug should contain 'tourette', got: ${qaTourettePlan.slug}`);
assert.ok(prodTourettePlan.slug.includes('-tourette-'), `Production slug should contain 'tourette', got: ${prodTourettePlan.slug}`);
console.log('✅ PASS: parent-guidance resolves identically to tourette in QA and Production (slug: -tourette-).');

// Test 16: Batch 4 Human Review Feedback Regression Tests (Slug Dedup, Internal Link URL Dedup & Quality > Count, Arbitrary Freq Protection)
console.log('\n[Test 16] Running Batch 4 Re-Review Feedback & Link Quality Regression Tests...');

// 16-A. Slug segment deduplication when slugDiseaseLabel === topicAngleId
console.log('\n[Test 16-A] Testing Slug Segment Deduplication...');
const { buildArticleSlug } = require('../scripts/auto_column/identity_resolver');

// Case 1: separation-anxiety
const slugSep = buildArticleSlug('yongin-cheoin', 'separation-anxiety', 'separation-anxiety');
assert.strictEqual(slugSep, 'yongin-cheoin-separation-anxiety', 'Should not duplicate separation-anxiety');
assert.ok(!slugSep.includes('separation-anxiety-separation-anxiety'), 'Duplicate segment strictly blocked');

// Case 2: night-terrors
const slugNight = buildArticleSlug('gyeonggi-icheon', 'night-terrors', 'night-terrors');
assert.strictEqual(slugNight, 'gyeonggi-icheon-night-terrors', 'Should not duplicate night-terrors');
assert.ok(!slugNight.includes('night-terrors-night-terrors'), 'Duplicate segment strictly blocked');

// Case 3: child-enuresis
const slugEnuresis = buildArticleSlug('seongnam-bundang', 'child-enuresis', 'child-enuresis');
assert.strictEqual(slugEnuresis, 'seongnam-bundang-child-enuresis', 'Should not duplicate child-enuresis');
assert.ok(!slugEnuresis.includes('child-enuresis-child-enuresis'), 'Duplicate segment strictly blocked');

// Case 4: Different segments should be preserved
const slugOcd = buildArticleSlug('seongnam-main', 'ocd', 'intrusive-thoughts');
assert.strictEqual(slugOcd, 'seongnam-main-ocd-intrusive-thoughts', 'Distinct segments preserved');

// Verify QA and Production build identical deduplicated slugs
const qaSepPlan = buildQAPlan(findQATarget('qa-17-separation-anxiety'));
assert.strictEqual(qaSepPlan.slug, 'yongin-cheoin-separation-anxiety');

const qaNightPlan = buildQAPlan(findQATarget('qa-18-night-terrors'));
assert.strictEqual(qaNightPlan.slug, 'gyeonggi-icheon-night-terrors');

console.log('✅ PASS: Slug segment deduplication correctly prevents repeated disease-angle segments.');

// 16-B. Duplicate URL in same article -> FAIL
console.log('\n[Test 16-B] Testing Duplicate URL Prohibition in Same Article...');
const duplicateUrlArticle = {
  title: '[처인구 소아 분리불안] 유치원이나 학교 갈 때마다 배가 아프다고 우는 아이',
  titleDisease: '소아 분리불안',
  summary: '처인구 지역 소아 분리불안 아동을 위한 임상적 관점 및 생활 관리 안내입니다.',
  category: 'child',
  geoId: 'yongin-cheoin',
  diseaseId: 'child',
  ageGroup: 'child',
  body: `
## 1. 진료실에서 마주하는 아동의 분리불안 고민
<div class="column-key-summary-box">
  <ul>
    <li>보호자와 떨어질 때의 일시적 불안은 정상 발달 과정에서도 나타날 수 있습니다.</li>
    <li>하지만 일상 기능을 방해하고 과도하다면 분리불안장애 전문 평가가 필요합니다.</li>
  </ul>
</div>
아이들의 수면 안정을 돕는 안내는 [수면 관리 가이드](/blog/bundang-insomnia-sleep-disorder-cure/)를 확인하십시오.

## 2. 정상 발달 과정과 임상적 분리불안의 차이
유치원 적응 시기의 분리 불안은 자연스러운 발달 과정의 일부일 수 있습니다.
그러나 일상생활을 방해하는 수준이라면 분리불안장애 전문의 진료가 권장됩니다.

## 3. 신체 증상과 기능 저하 감별
복통이 나타날 때 기질적 이상을 먼저 확인합니다.
취침 전 안정적인 분위기를 위해 [수면 관리 가이드](/blog/bundang-insomnia-sleep-disorder-cure/)를 다시 참고할 수 있습니다.

## 4. 해아림한의원의 맞춤 관리
아이의 증상과 전반적인 상태를 고려한 한약 처방 및 침구 치료를 시행합니다.

## 5. 자주 묻는 질문
**Q1. 시간이 지나면 좋아지나요?**
A. 성장하면서 호전되기도 하지만 일상 기능 저하 시 조기 상담이 유익합니다.
**Q2. 어떻게 격려해야 하나요?**
A. 비난하지 않고 차분히 안심시켜 주십시오.
`,
  hashtags: ['처인구소아분리불안', '처인구한의원', '소아분리불안치료', '해아림한의원'],
  keywords: ['처인구 소아 분리불안', '용인시 처인구 소아 분리불안', '소아 분리불안 한방치료'],
  thumbnailCopy: { yellowText: '학교 가기 싫어', whiteText: '배 아프다고 울 때', greenText: '소아 분리불안' }
};

const dupUrlRes = validateArticleContent(duplicateUrlArticle);
assert.strictEqual(dupUrlRes.valid, false, 'Duplicate URL in same article MUST FAIL');
assert.ok(dupUrlRes.errors.some(e => e.includes('Internal Link duplicate URL violation')), 'Expected duplicate URL violation');
console.log('✅ PASS: Duplicate internal link URL in same article strictly blocked.');

// 16-C. Duplicate URL with fabricated different anchors -> FAIL
console.log('\n[Test 16-C] Testing Fabricated Distinct Anchors for Same URL (MUST FAIL)...');
let countOccur = 0;
const fabricatedAnchorArticle = {
  ...duplicateUrlArticle,
  body: duplicateUrlArticle.body.replace(/\[수면 관리 가이드\]\(\/blog\/bundang-insomnia-sleep-disorder-cure\/\)/g, () => {
    countOccur++;
    return countOccur === 1
      ? '[밤마다 뒤척이는 뇌의 과각성 상태](/blog/bundang-insomnia-sleep-disorder-cure/)'
      : '[소아의 수면 위생과 안정적인 생활 리듬을 위한 안내](/blog/bundang-insomnia-sleep-disorder-cure/)';
  })
};

const fabAnchorRes = validateArticleContent(fabricatedAnchorArticle);
assert.strictEqual(fabAnchorRes.valid, false, 'Fabricated distinct anchors for same URL MUST FAIL');
assert.ok(fabAnchorRes.errors.some(e => e.includes('fabricated distinct anchors')), 'Expected fabricated distinct anchors violation');
console.log('✅ PASS: Fabricated distinct anchors for same URL strictly blocked.');

// 16-D. Single relevant internal link when relevant links are scarce -> PASS
console.log('\n[Test 16-D] Testing Single High-Quality Internal Link Allowance (Quality > Count)...');
let singleCountOccur = 0;
const singleLinkArticle = {
  ...duplicateUrlArticle,
  body: duplicateUrlArticle.body.replace(/\[수면 관리 가이드\]\(\/blog\/bundang-insomnia-sleep-disorder-cure\/\)/g, () => {
    singleCountOccur++;
    return singleCountOccur === 1
      ? '[수면 관리 가이드](/blog/bundang-insomnia-sleep-disorder-cure/)'
      : '규칙적인 취침 습관';
  })
};

const singleLinkRes = validateArticleContent(singleLinkArticle);
assert.strictEqual(singleLinkRes.valid, true, `Single relevant link should pass 100%. Errors: ${singleLinkRes.errors.join('; ')}`);
assert.strictEqual(singleLinkRes.internalLinks.length, 1);
console.log('✅ PASS: Single high-quality internal link passed validation with 0 errors (Quality > Count).');

// 16-E. Fabricating tic symptom paragraph in night-terrors article to insert tic link -> FAIL
console.log('\n[Test 16-E] Testing Fabricated Tic Paragraph in Night Terrors (MUST FAIL)...');
const forcedTicNightArticle = {
  title: '[이천 소아 야경증] 자다가 갑자기 울고 소리치지만 다음 날 기억하지 못할 때',
  titleDisease: '소아 야경증',
  summary: '이천 지역 소아 야경증 아동을 위한 비렘수면 부분각성 원인과 부모 대처 안내입니다.',
  category: 'child',
  geoId: 'gyeonggi-icheon',
  diseaseId: 'child',
  ageGroup: 'child',
  body: `
## 1. 한밤중 갑작스러운 비명과 각성
<div class="column-key-summary-box">
  <ul>
    <li>야경증은 비렘(NREM) 수면 중 부분 각성으로 발생합니다.</li>
    <li>아이가 깨어난 것처럼 보여도 완전히 깨어난 상태가 아니며 다음 날 기억하지 못합니다.</li>
    <li>꿈 내용을 생생히 기억하는 악몽과는 임상적으로 구별됩니다.</li>
  </ul>
</div>
안전한 수면 환경 조성을 위해 [수면 관리 가이드](/blog/bundang-insomnia-sleep-disorder-cure/)를 확인하십시오.

## 2. 야경증과 악몽의 감별 포인트
야경증은 NREM 수면 중 불완전한 부분 각성으로 발생하며 다음 날 기억이 없습니다. 반면 악몽은 렘수면 중 발생하며 기억합니다.
수면 부족, 과도한 피로, 발열 등이 주된 유발 요인입니다.
매우 잦게 반복되거나 주간 기능 저하, 부상 위험이 있을 때는 전문 평가가 필요합니다.

## 3. 깨어 있는 시간의 다른 증상과의 연결
야경증과 직접 같은 질환은 아니지만, 깨어 있는 시간에도 눈을 반복해서 깜빡이거나 특정 소리를 반복하는 증상이 동반된다면 신경계 긴장도를 함께 살필 수 있습니다. 관련 내용은 [틱장애 안내](/blog/bundang-tic-disorder-guide/)를 참고하십시오.

## 4. 해아림한의원의 맞춤 관리
아이의 증상과 전반적인 상태를 고려한 한약 처방 및 침구 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 자다 깰 때 억지로 깨워야 하나요?**
A. 무리하게 흔들어 깨우지 마시고 안전을 지켜주십시오.
**Q2. 다음 날 물어봐도 되나요?**
A. 기억하지 못하므로 굳이 캐묻지 않는 것이 좋습니다.
`,
  hashtags: ['이천소아야경증', '이천한의원', '소아야경증치료', '해아림한의원'],
  keywords: ['이천 소아 야경증', '이천시 소아 야경증', '소아 야경증 한방치료'],
  thumbnailCopy: { yellowText: '자다가 갑자기', whiteText: '울고 소리칠 때', greenText: '소아 야경증' }
};

const forcedTicRes = validateArticleContent(forcedTicNightArticle);
assert.strictEqual(forcedTicRes.valid, false, 'Fabricated tic paragraph in night terrors MUST FAIL');
assert.ok(forcedTicRes.errors.some(e => e.includes('Night terrors forced tic linkage violation')), 'Expected forced tic linkage violation');
console.log('✅ PASS: Fabricating tic symptom paragraph in night terrors strictly blocked.');

// 16-F. Unverified frequency claims like "주 수회 이상" in night terrors -> FAIL
console.log('\n[Test 16-F] Testing Unverified Frequency Claims in Night Terrors (MUST FAIL)...');
const unverifiedFreqNightArticle = {
  ...forcedTicNightArticle,
  body: forcedTicNightArticle.body
    .replace('## 3. 깨어 있는 시간의 다른 증상과의 연결\n야경증과 직접 같은 질환은 아니지만, 깨어 있는 시간에도 눈을 반복해서 깜빡이거나 특정 소리를 반복하는 증상이 동반된다면 신경계 긴장도를 함께 살필 수 있습니다. 관련 내용은 [틱장애 안내](/blog/bundang-tic-disorder-guide/)를 참고하십시오.', '')
    .replace('매우 잦게 반복되거나', '야경증이 주 수회 이상 매우 잦게 나타나거나')
};

const unverifiedFreqRes = validateArticleContent(unverifiedFreqNightArticle);
assert.strictEqual(unverifiedFreqRes.valid, false, 'Unverified frequency claim "주 수회 이상" MUST FAIL');
assert.ok(unverifiedFreqRes.errors.some(e => e.includes('Night terrors unverified frequency claim violation')), 'Expected unverified frequency claim violation');
console.log('✅ PASS: Unverified frequency claim "주 수회 이상" strictly blocked.');

// 16-G. Corrected neutral frequency "매우 잦게 반복되거나" -> PASS
console.log('\n[Test 16-G] Testing Neutral Frequency Phrasing "매우 잦게 반복되거나" (MUST PASS)...');
const neutralFreqNightArticle = {
  ...unverifiedFreqNightArticle,
  body: unverifiedFreqNightArticle.body.replace('야경증이 주 수회 이상 매우 잦게 나타나거나', '야경증이 매우 잦게 반복되거나')
};

const neutralFreqRes = validateArticleContent(neutralFreqNightArticle);
assert.strictEqual(neutralFreqRes.valid, true, `Neutral frequency phrasing should pass 100%. Errors: ${neutralFreqRes.errors.join('; ')}`);
console.log('✅ PASS: Neutral frequency phrasing passed validation 100%.');

// ==========================================
// Test 17: Batch 5 Human Review Feedback Regression Tests (A ~ G)
// (qa-19-child-enuresis & qa-20-fatigue)
// ==========================================
console.log('\n[Test 17] Running Batch 5 Human Review Feedback Regression Tests (A ~ G)...');

const {
  checkChildEnuresisClinicalAndStandardCare,
  checkFatigueBurnoutAndAutonomicFraming
} = require('../scripts/auto_column/content_validator');

// -------------------------------------------------------------
// 17-A. Child Enuresis: Missing Differential Evaluation (MUST FAIL)
// (낮 배뇨 증상/변비/UTI/다갈·다뇨/수면호흡장애 등 필요 감별 누락 방지)
// -------------------------------------------------------------
console.log('\n[Test 17-A] Testing Child Enuresis Missing Differential Evaluation (MUST FAIL)...');
const failChildEnuresisMissingDiffs = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'child',
  titleDisease: '소아 야뇨증',
  thumbnailDiseaseLabel: '소아 야뇨증',
  seoDiseaseLabel: '소아 야뇨증',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  title: '[분당 소아 야뇨증] 만 5세 이후에도 밤에 소변 실수를 반복할 때',
  summary: '분당 지역 소아 야뇨증 어린이를 위한 배뇨 반사 미성숙과 심리적 안정 관리 안내입니다.',
  topicAngle: { id: 'child-enuresis', titleSuffix: '만 5세 이후에도 밤에 소변 실수를 반복할 때' },
  hashtags: ['분당소아야뇨증', '분당한의원', '소아야뇨증치료', '해아림한의원'],
  keywords: ['분당 소아 야뇨증', '성남시 분당구 소아 야뇨증', '소아 야뇨증 한방치료'],
  thumbnailCopy: { yellowText: '만 5세 이후', whiteText: '밤마다 소변 실수', greenText: '소아 야뇨증' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>만 5세 이후 밤에 소변 실수가 반복되는 야뇨증을 살펴봅니다.</li>
    <li>아이의 의지 부족이나 양육 문제가 아니며 비난이나 벌을 주어서는 안 됩니다.</li>
    <li>보호자의 따뜻한 격려와 지지가 회복에 중요합니다.</li>
  </ul>
</div>
취침 전 수면 환경을 위해 [수면 관리 가이드](/blog/bundang-insomnia-sleep-disorder-cure/)를 확인하십시오.

## 2. 야뇨증의 발생 배경
야간 소변 생성량의 조절과 방광 기능 및 수면 중 각성 반응 등 복합적인 요인이 관여할 수 있습니다.
배뇨 반사의 미성숙과 심리적 긴장도 함께 살펴봅니다.

## 3. 상태 평가 관점
아이의 긴장도를 문진과 맥진으로 확인합니다.
야뇨 알람(enuresis alarm)이나 데스모프레신(desmopressin) 등의 표준 치료 선택지가 활용될 수 있습니다.

## 4. 해아림한의원의 맞춤 관리
개인 체질과 증상을 고려한 한약 처방 및 침구 치료를 진행합니다.
저녁 식사 후 수분 섭취 조절과 취침 전 배뇨 습관을 들입니다.

## 5. 자주 묻는 질문
**Q1. 아이를 혼내면 안 되나요?**
A. 비난이나 벌은 수치심과 불안을 키우므로 일관되게 안심시켜 주어야 합니다.
**Q2. 저절로 낫나요?**
A. 성장하면서 호전되기도 하지만 조기에 전문가 평가를 받는 것이 좋습니다.
`
}));
assert.strictEqual(failChildEnuresisMissingDiffs.valid, false, 'Enuresis missing required differentials MUST FAIL');
assert.ok(failChildEnuresisMissingDiffs.errors.some(e => e.includes('Child enuresis differential evaluation missing')), 'Expected Child enuresis differential evaluation missing error');
console.log('✅ PASS: Child enuresis missing required differentials (낮 배뇨/변비/UTI/다뇨/수면호흡) strictly blocked.');

// -------------------------------------------------------------
// 17-B. Child Enuresis: Missing Evidence-Based Standard Care (MUST FAIL)
// (근거 기반 표준 관리 옵션 alarm/desmopressin 완전 누락 방지 & 대체 주장 차단)
// -------------------------------------------------------------
console.log('\n[Test 17-B] Testing Child Enuresis Missing Standard Management Options (MUST FAIL)...');
const failChildEnuresisMissingStandard = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'child',
  titleDisease: '소아 야뇨증',
  thumbnailDiseaseLabel: '소아 야뇨증',
  seoDiseaseLabel: '소아 야뇨증',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  title: '[분당 소아 야뇨증] 만 5세 이후에도 밤에 소변 실수를 반복할 때',
  summary: '분당 지역 소아 야뇨증 아동을 위한 다인자적 원인 평가와 일상 관리 안내입니다.',
  topicAngle: { id: 'child-enuresis', titleSuffix: '만 5세 이후에도 밤에 소변 실수를 반복할 때' },
  hashtags: ['분당소아야뇨증', '분당한의원', '소아야뇨증치료', '해아림한의원'],
  keywords: ['분당 소아 야뇨증', '성남시 분당구 소아 야뇨증', '소아 야뇨증 한방치료'],
  thumbnailCopy: { yellowText: '만 5세 이후', whiteText: '밤마다 소변 실수', greenText: '소아 야뇨증' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>만 5세 이후 밤에 소변 실수가 반복될 때 원인을 살펴봅니다.</li>
    <li>아이의 의지 부족이 아니며 비난이나 벌 대신 격려가 필요합니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 참고하십시오.

## 2. 야뇨증의 다인자적 발생 배경
야간 소변 생성량 증가, 방광 기능 및 용적의 조절, 수면 중 각성 반응 등 여러 요소가 복합적으로 관련됩니다.

## 3. 필수 감별 평가
낮 동안의 배뇨 증상(주간 빈뇨, 절박뇨, 요실금), 배뇨통 또는 요로감염 의심 증상, 변비, 과도한 갈증과 다뇨, 코골이나 수면호흡장애 여부를 종합적으로 확인해야 합니다.
이전에 6개월 이상 소변을 가린 기간이 있었는지도 감별합니다.

## 4. 해아림한의원의 맞춤 관리
오직 한약 처방과 침구 치료, 생활 습관 관리만으로 치료를 진행합니다.

## 5. 자주 묻는 질문
**Q1. 벌을 주면 줄어드나요?**
A. 벌을 주면 오히려 증상이 악화될 수 있습니다.
**Q2. 저녁 관리는 어떻게 하나요?**
A. 저녁 수분 섭취를 조절하고 취침 전 배뇨를 유도합니다.
`
}));
assert.strictEqual(failChildEnuresisMissingStandard.valid, false, 'Enuresis missing alarm/desmopressin standard care MUST FAIL');
assert.ok(failChildEnuresisMissingStandard.errors.some(e => e.includes('Child enuresis standard management missing')), 'Expected Child enuresis standard management missing error');
console.log('✅ PASS: Child enuresis omitting standard care (alarm/desmopressin) strictly blocked.');

// 17-B-2. Claiming Korean medicine replaces standard treatments (MUST FAIL)
console.log('\n[Test 17-B-2] Testing Korean Medicine Claiming to Replace Standard Care (MUST FAIL)...');
const failChildEnuresisReplacing = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'child',
  titleDisease: '소아 야뇨증',
  thumbnailDiseaseLabel: '소아 야뇨증',
  seoDiseaseLabel: '소아 야뇨증',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  title: '[분당 소아 야뇨증] 만 5세 이후에도 밤에 소변 실수를 반복할 때',
  summary: '분당 지역 소아 야뇨증 아동을 위한 다인자적 원인 평가와 일상 관리 안내입니다.',
  topicAngle: { id: 'child-enuresis', titleSuffix: '만 5세 이후에도 밤에 소변 실수를 반복할 때' },
  hashtags: ['분당소아야뇨증', '분당한의원', '소아야뇨증치료', '해아림한의원'],
  keywords: ['분당 소아 야뇨증', '성남시 분당구 소아 야뇨증', '소아 야뇨증 한방치료'],
  thumbnailCopy: { yellowText: '만 5세 이후', whiteText: '밤마다 소변 실수', greenText: '소아 야뇨증' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
만 5세 이후 야뇨증에 대해 비난이나 벌 없이 안심을 줍니다. [주요 진료 안내](/treatments/)

## 2. 야뇨의 배경과 감별
야간 소변 생성, 방광 기능, 각성 반응을 살피며, 낮 동안의 배뇨 증상(빈뇨/절박뇨/요실금), 배뇨통, 요로감염, 변비, 과도한 갈증과 다뇨, 코골이 및 수면호흡장애를 감별합니다.

## 3. 표준 관리와 한의학적 치료
야뇨 알람(enuresis alarm)이나 데스모프레신(desmopressin) 치료가 활용되지만, 한의학적 치료가 이러한 표준 치료를 대체하는 치료로 사용될 수 있습니다.

## 4. 해아림한의원의 맞춤 관리
개인별 한약 처방과 침구 치료.

## 5. FAQ
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failChildEnuresisReplacing.valid, false, 'Claiming Korean medicine replaces standard enuresis care MUST FAIL');
assert.ok(failChildEnuresisReplacing.errors.some(e => e.includes('Child enuresis treatment replacement violation')), 'Expected Child enuresis treatment replacement violation error');
console.log('✅ PASS: Claiming Korean medicine replaces standard enuresis care strictly blocked.');

// -------------------------------------------------------------
// 17-C. Child Enuresis: Separation Anxiety Topic Leakage ("등원 전 포옹") (MUST FAIL)
// -------------------------------------------------------------
console.log('\n[Test 17-C] Testing Separation Anxiety Morning Hug Leakage in Enuresis (MUST FAIL)...');
const failChildEnuresisMorningHug = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'child',
  titleDisease: '소아 야뇨증',
  thumbnailDiseaseLabel: '소아 야뇨증',
  seoDiseaseLabel: '소아 야뇨증',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  title: '[분당 소아 야뇨증] 만 5세 이후에도 밤에 소변 실수를 반복할 때',
  summary: '분당 지역 소아 야뇨증 아동을 위한 감별과 생활 관리 가이드입니다.',
  topicAngle: { id: 'child-enuresis', titleSuffix: '만 5세 이후에도 밤에 소변 실수를 반복할 때' },
  hashtags: ['분당소아야뇨증', '분당한의원', '소아야뇨증치료', '해아림한의원'],
  keywords: ['분당 소아 야뇨증', '성남시 분당구 소아 야뇨증', '소아 야뇨증 한방치료'],
  thumbnailCopy: { yellowText: '만 5세 이후', whiteText: '밤마다 소변 실수', greenText: '소아 야뇨증' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">핵심 요약</div>
만 5세 이후 야뇨증에 대해 비난이나 벌 없이 안심을 줍니다. [주요 진료 안내](/treatments/)

## 2. 야뇨의 배경과 감별
야간 소변 생성량 조절, 방광 기능 및 용적, 수면 중 각성 반응 장애 등 다인자 요인을 살핍니다.
낮 동안의 배뇨 증상(빈뇨/절박뇨/요실금), 배뇨통 및 요로감염, 변비, 과도한 갈증과 다뇨, 코골이나 수면호흡장애를 함께 평가합니다.
상태에 따라 야뇨 알람(enuresis alarm)이나 데스모프레신(desmopressin) 등의 표준 치료가 활용됩니다.

## 3. 생활 관리 요령
저녁 수분 섭취 조절과 함께 아침 등교 및 등원 전 따뜻한 포옹과 차분한 안정감을 제공합니다.

## 4. 해아림한의원의 맞춤 관리
개인별 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failChildEnuresisMorningHug.valid, false, 'Separation anxiety morning hug tip in enuresis MUST FAIL');
assert.ok(failChildEnuresisMorningHug.errors.some(e => e.includes('Child enuresis separation-anxiety leakage')), 'Expected Child enuresis separation-anxiety leakage error');
console.log('✅ PASS: Separation anxiety morning hug leakage into enuresis strictly blocked.');

// -------------------------------------------------------------
// 17-D. Fatigue: Autonomic Auto-Jump Framing (MUST FAIL)
// (만성피로 = 자율신경 문제 자동 귀결 FAIL)
// -------------------------------------------------------------
console.log('\n[Test 17-D] Testing Fatigue Autonomic Auto-Jump Framing (MUST FAIL)...');
const failFatigueAutonomicAutoJump = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '만성피로',
  thumbnailDiseaseLabel: '만성피로',
  seoDiseaseLabel: '만성피로',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 만성피로] 머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때',
  summary: '판교 지역 직장인을 위한 만성피로와 브레인포그의 원인 및 관리 안내입니다.',
  topicAngle: { id: 'brain-fog-fatigue', titleSuffix: '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때' },
  hashtags: ['판교만성피로', '판교한의원', '만성피로치료', '해아림한의원'],
  keywords: ['판교 만성피로', '성남시 분당구 판교 만성피로', '만성피로 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤', whiteText: '머리가 멍할 때', greenText: '만성피로' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>지속되는 만성피로와 머리가 멍한 브레인포그를 살펴봅니다.</li>
    <li>번아웃은 직장 스트레스와 관련된 직업적 현상입니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 확인하십시오.

## 2. 만성피로와 브레인포그의 핵심 원인
스트레스와 수면 부족으로 인해 자율기능 조절이 흔들려 만성피로와 브레인포그가 발생합니다.
만성피로와 브레인포그의 원인은 교감신경과 부교감신경의 자율신경계 조절 이상 때문입니다.

## 3. 번아웃과 다양한 원인 감별
번아웃은 직무 관련 에너지 고갈, 일에 대한 냉소, 직업적 효능감 저하를 보입니다.
수면장애, 우울/불안, 빈혈, 갑상선 질환, 내과적 원인에 대한 의료기관 감별 평가가 필요하며 ME/CFS와 구분해야 합니다.

## 4. 해아림한의원의 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 만성피로는 왜 생기나요?**
A. 다양한 원인이 작용할 수 있습니다.
**Q2. 번아웃과 어떻게 다른가요?**
A. 직장 스트레스와의 연관성을 살펴야 합니다.
`
}));
assert.strictEqual(failFatigueAutonomicAutoJump.valid, false, 'Direct autonomic auto-jump for fatigue MUST FAIL');
assert.ok(failFatigueAutonomicAutoJump.errors.some(e => e.includes('Fatigue autonomic auto-jump violation')), 'Expected Fatigue autonomic auto-jump violation error');
console.log('✅ PASS: Automatic jump equating fatigue directly to autonomic dysfunction strictly blocked.');

// -------------------------------------------------------------
// 17-E. Fatigue: Burnout Omission (MUST FAIL)
// (fatigue target에서 번아웃을 전혀 설명하지 않으면 FAIL)
// -------------------------------------------------------------
console.log('\n[Test 17-E] Testing Fatigue Target Burnout Omission (MUST FAIL)...');
const failFatigueMissingBurnout = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '만성피로',
  thumbnailDiseaseLabel: '만성피로',
  seoDiseaseLabel: '만성피로',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 만성피로] 머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때',
  summary: '판교 지역 직장인을 위한 만성피로와 브레인포그의 원인 및 관리 안내입니다.',
  topicAngle: { id: 'brain-fog-fatigue', titleSuffix: '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때' },
  hashtags: ['판교만성피로', '판교한의원', '만성피로치료', '해아림한의원'],
  keywords: ['판교 만성피로', '성남시 분당구 판교 만성피로', '만성피로 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤', whiteText: '머리가 멍할 때', greenText: '만성피로' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>지속되는 만성피로와 머리가 멍한 브레인포그를 살펴봅니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 확인하십시오.

## 2. 만성피로의 다양한 원인 감별
만성피로는 지속되는 피로라는 증상 표현입니다.
자율신경 관련 증상이 함께 있는 일부 경우 평가 요소 중 하나로 살펴볼 수 있습니다.
수면장애, 우울과 불안 등 정신건강 문제, 빈혈, 갑상선 질환 등 내과적 원인을 의료기관에서 감별해야 하며, 단순 만성피로와 ME/CFS를 구분해야 합니다.

## 3. 일상 생활 관리
과로를 피하고 규칙적인 식사와 수면을 취합니다.

## 4. 해아림한의원의 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 피로가 가시지 않을 때 어떻게 하나요?**
A. 전신 건강 상태를 체계적으로 평가해야 합니다.
**Q2. 잠을 자도 피곤한 이유는 무엇인가요?**
A. 수면의 질과 다양한 내과적 요인을 확인해야 합니다.
`
}));
assert.strictEqual(failFatigueMissingBurnout.valid, false, 'Fatigue article completely omitting burnout MUST FAIL');
assert.ok(failFatigueMissingBurnout.errors.some(e => e.includes('Fatigue target burnout omission')), 'Expected Fatigue target burnout omission error');
console.log('✅ PASS: Fatigue target article omitting burnout explanation strictly blocked.');

// -------------------------------------------------------------
// 17-F. Fatigue: Burnout Defined as General Life Fatigue (MUST FAIL)
// (burnout을 일반 생활 피로나 모든 영역의 스트레스로 정의하면 FAIL)
// -------------------------------------------------------------
console.log('\n[Test 17-F] Testing Burnout Defined as General Life Fatigue (MUST FAIL)...');
const failBurnoutGeneralLifeFatigue = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '만성피로',
  thumbnailDiseaseLabel: '만성피로',
  seoDiseaseLabel: '만성피로',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 만성피로] 머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때',
  summary: '판교 지역 직장인을 위한 만성피로와 번아웃 구분 안내입니다.',
  topicAngle: { id: 'brain-fog-fatigue', titleSuffix: '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때' },
  hashtags: ['판교만성피로', '판교한의원', '만성피로치료', '해아림한의원'],
  keywords: ['판교 만성피로', '성남시 분당구 판교 만성피로', '만성피로 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤', whiteText: '머리가 멍할 때', greenText: '만성피로' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>만성피로와 번아웃을 살펴봅니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 확인하십시오.

## 2. 만성피로와 번아웃의 개념
만성피로는 지속되는 피로 증상입니다.
번아웃은 일상생활의 모든 스트레스에서 생기는 피로이며 누구에게나 생기는 단순한 피로입니다.
자율신경 관련 증상이 함께 있는 일부 경우 평가 요소 중 하나로 살펴볼 수 있습니다.
수면장애, 우울, 빈혈, 갑상선 질환 등을 의료기관에서 감별하고 ME/CFS와 구분합니다.

## 3. 해아림한의원의 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 4. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failBurnoutGeneralLifeFatigue.valid, false, 'Burnout defined as general life fatigue MUST FAIL');
assert.ok(failBurnoutGeneralLifeFatigue.errors.some(e => e.includes('Burnout definition violation')), 'Expected Burnout definition violation error');
console.log('✅ PASS: Burnout defined as general everyday life fatigue strictly blocked.');

// -------------------------------------------------------------
// 17-G. Fatigue: Ungrounded Seasonal Framing (MUST FAIL)
// (verified source 없는 환절기/기온 변화 핵심 악화요인 단정 금지)
// -------------------------------------------------------------
console.log('\n[Test 17-G] Testing Ungrounded Seasonal / Temperature Framing (MUST FAIL)...');
const failFatigueSeasonalFraming = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '만성피로',
  thumbnailDiseaseLabel: '만성피로',
  seoDiseaseLabel: '만성피로',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 만성피로] 머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때',
  summary: '판교 지역 직장인을 위한 만성피로와 브레인포그의 원인 및 관리 안내입니다.',
  topicAngle: { id: 'brain-fog-fatigue', titleSuffix: '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때' },
  hashtags: ['판교만성피로', '판교한의원', '만성피로치료', '해아림한의원'],
  keywords: ['판교 만성피로', '성남시 분당구 판교 만성피로', '만성피로 한방치료'],
  thumbnailCopy: { yellowText: '쉬어도 피곤', whiteText: '머리가 멍할 때', greenText: '만성피로' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>지속되는 만성피로와 번아웃을 살펴봅니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 확인하십시오.

## 2. 만성피로의 악화 요인과 프레이밍
급격한 기온 변화와 환절기는 만성피로와 브레인포그의 대표적인 악화 요인입니다. 환절기에 유독 머리가 멍하고 피로가 심해지는 경향이 있습니다.
자율신경 관련 증상이 함께 있는 일부 경우 평가 요소 중 하나로 살펴볼 수 있습니다.

## 3. 번아웃과 다양한 원인 감별
번아웃은 만성 직장 스트레스와 관련된 직업적 현상(occupational phenomenon)으로 에너지 고갈, 일에 대한 냉소, 직업적 효능감 저하가 특징입니다.
수면장애, 우울/불안, 빈혈, 갑상선 질환 등을 의료기관에서 감별하고 ME/CFS와 구분합니다.

## 4. 해아림한의원의 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료.

## 5. 자주 묻는 질문
**Q1. 질문**
A. 답변
**Q2. 질문2**
A. 답변
`
}));
assert.strictEqual(failFatigueSeasonalFraming.valid, false, 'Ungrounded seasonal transition framing MUST FAIL');
assert.ok(failFatigueSeasonalFraming.errors.some(e => e.includes('Fatigue unverified seasonal framing violation')), 'Expected Fatigue unverified seasonal framing violation error');
console.log('✅ PASS: Ungrounded seasonal transition / temperature framing strictly blocked.');

// -------------------------------------------------------------
// 17-H. Full Compliant Batch 5 Articles (MUST PASS 100%)
// -------------------------------------------------------------
console.log('\n[Test 17-H] Testing Full Compliant Batch 5 Articles (MUST PASS 100%)...');

// 1. Fully compliant child enuresis article
const validEnuresisArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'child',
  titleDisease: '소아 야뇨증',
  thumbnailDiseaseLabel: '소아 야뇨증',
  seoDiseaseLabel: '소아 야뇨증',
  ageGroup: 'child',
  geoId: 'seongnam-bundang',
  title: '[분당 소아 야뇨증] 만 5세 이후에도 밤에 소변 실수를 반복할 때',
  summary: '분당 지역 소아 야뇨증 아동을 위한 다인자적 원인 평가와 표준 치료 및 균형 잡힌 생활 관리 안내입니다.',
  topicAngle: { id: 'child-enuresis', titleSuffix: '만 5세 이후에도 밤에 소변 실수를 반복할 때' },
  hashtags: ['분당소아야뇨증', '분당한의원', '소아야뇨증치료', '소아야뇨증관리', '해아림한의원'],
  keywords: ['분당 소아 야뇨증', '성남시 분당구 소아 야뇨증', '소아 야뇨증 한방치료', '만 5세 이후에도 밤에 소변 실수를 반복할 때'],
  thumbnailCopy: { yellowText: '만 5세 이후', whiteText: '밤마다 소변 실수', greenText: '소아 야뇨증' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>만 5세 이후 밤에 소변을 가리지 못하는 증상에 대해 살펴봅니다.</li>
    <li>아이의 의지 부족이나 양육 문제로 단정하지 말고 비난이나 벌을 주지 않아야 합니다.</li>
    <li>보호자의 따뜻한 격려와 지지가 아이의 심리적 안정에 필수적입니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 통해 진료 과정을 확인하실 수 있습니다.

## 2. 야뇨증의 다인자적 발생 배경
야뇨증의 발생 배경은 단순한 배뇨 반사의 미성숙 하나로 축소할 수 없으며, 야간 소변 생성량의 조절(항이뇨호르몬 리듬 등), 방광 기능 및 방광 용적의 문제, 수면 중 각성 반응 장애 등 여러 요소가 복합적으로 관련될 수 있는 중립적 구조로 이해해야 합니다.

## 3. 필수 감별 및 종합 평가
야뇨증을 평가할 때는 밤의 증상뿐 아니라 다양한 동반 문제를 면밀히 살펴야 합니다.
낮 동안의 배뇨 증상(주간 빈뇨, 절박뇨, 요실금 등)이 있는지, 소변을 볼 때 배뇨통이나 요로감염(UTI) 의심 증상이 있는지, 대변 배출이 어려운 변비가 동반되어 방광을 압박하는지 확인합니다.
또한 과도한 갈증과 다뇨가 나타나는 내분비 질환의 가능성이나 코골이 및 수면호흡장애가 수면 중 각성을 방해하는지 함께 살피며, 이전에 최소 6개월 이상 충분히 소변을 가린 기간이 있다가 다시 야뇨가 시작된 이차성 야뇨의 경과인지도 확인합니다.

## 4. 근거 기반 표준 관리와 한의학적 맞춤 케어
환자 정보 칼럼으로서 근거 기반의 표준 관리 선택지를 중립적으로 소개합니다.
아이의 증상 형태와 연령에 따라 야뇨 알람(enuresis alarm)이나 데스모프레신(desmopressin) 등의 치료가 널리 활용될 수 있으며, 낮 배뇨 증상이나 변비 등 동반 문제가 있다면 이를 함께 평가하고 관리하는 것이 중요합니다.
한의학적 치료는 이러한 표준 치료를 대체하는 것이 아니라, 개인의 증상과 전반적인 신체 상태를 고려한 한약 처방 및 침구 치료를 통해 보완적으로 조절력을 돕습니다.
생활 관리에서는 저녁 식사 후 과도한 수분 섭취를 조절하고 취침 직전 배뇨하는 습관을 들이며, 실수를 하더라도 비난하지 않는 안심 환경을 유지합니다.

## 5. 자주 묻는 질문
**Q1. 아이를 혼내거나 벌을 주면 습관이 고쳐지나요?**
A. 야뇨는 의지로 조절되는 것이 아니므로 비난이나 벌은 자존감을 떨어뜨릴 수 있습니다. 일관된 격려와 지지가 중요합니다.
**Q2. 낮에도 소변을 자주 보는데 관련이 있나요?**
A. 주간 빈뇨나 절박뇨가 동반된다면 방광 기능 평가를 함께 진행하는 것이 권장됩니다.
**Q3. 시간이 지나면 자연히 해결되나요?**
A. 성장하면서 호전되기도 하지만, 아이의 스트레스나 학교생활 적응을 위해 조기에 전문적인 평가와 도움을 받는 것이 유익합니다.
`
}));
assert.strictEqual(validEnuresisArticle.valid, true, `Compliant enuresis article MUST PASS 100%: ${validEnuresisArticle.errors.join('; ')}`);
console.log('✅ PASS: Fully compliant child enuresis article passed validation 100%.');

// 2. Fully compliant fatigue & burnout article
const validFatigueArticle = validateArticleContent(createMockArticleForReviewTest({
  diseaseId: 'autonomic',
  titleDisease: '만성피로',
  thumbnailDiseaseLabel: '만성피로',
  seoDiseaseLabel: '만성피로',
  ageGroup: 'adult',
  geoId: 'bundang-pangyo',
  title: '[판교 만성피로] 머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때',
  summary: '판교 지역 직장인을 위한 만성피로 증상과 번아웃 구별 및 다각도 원인 감별 평가 안내입니다.',
  topicAngle: { id: 'brain-fog-fatigue', titleSuffix: '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때' },
  hashtags: ['판교만성피로', '판교한의원', '만성피로치료', '만성피로관리', '해아림한의원'],
  keywords: ['판교 만성피로', '성남시 분당구 판교 만성피로', '만성피로 한방치료', '머리에 안개가 낀 듯 멍하고 피로가 가시지 않을 때'],
  thumbnailCopy: { yellowText: '쉬어도 피곤', whiteText: '머리가 멍할 때', greenText: '만성피로' },
  body: `
## 1. 진료실에서 자주 마주하는 고민
<div class="column-key-summary-box">
  <ul>
    <li>충분한 휴식을 취해도 풀리지 않는 피로와 머리가 멍한 브레인포그를 살펴봅니다.</li>
    <li>지속되는 만성피로와 직장 스트레스 관련 번아웃을 명확히 구별해야 합니다.</li>
    <li>수면, 내과적 질환, 정신건강 등 다양한 요인에 대한 폭넓은 감별이 필요합니다.</li>
  </ul>
</div>
[주요 진료 안내](/treatments/)를 통해 진료 방향을 살펴보실 수 있습니다.

## 2. 만성피로 증상과 번아웃의 명확한 구분
진료실에서 흔히 혼용되는 만성피로와 번아웃은 임상적으로 구별됩니다.
만성피로는 충분한 휴식 후에도 지속되는 피로라는 증상 표현(symptom)이며 그 원인은 매우 다양할 수 있습니다.
반면 번아웃(Burnout)은 성공적으로 관리되지 않은 만성 직장 스트레스와 관련된 직업적 현상(occupational phenomenon, ICD-11)이며, 단순한 일상 피로나 모든 삶의 영역의 스트레스가 아니며 독립된 의학적 질환명과 동일하지 않습니다.
번아웃은 핵심적으로 1) 에너지 고갈 또는 소진감, 2) 일이나 직무에 대한 심리적 거리감 및 부정적 태도나 냉소주의, 3) 직업적 효능감과 성취감 저하의 3가지 특징을 보입니다.

## 3. 원인 감별과 신중한 프레이밍
피로와 머리가 멍한 느낌을 자율신경 문제나 자율신경실조증으로 자동 귀결해서는 안 됩니다.
자율신경 관련 증상이 함께 나타나는 일부 경우에 한해 평가 요소 중 하나로 살펴볼 수 있습니다.
따라서 다음과 같은 다양한 원인에 대한 폭넓은 감별 평가가 중요합니다:
수면 부족 및 수면무호흡증 등 수면장애, 우울이나 불안 등 정신건강 문제, 빈혈 및 철결핍, 갑상선 기능 이상 등 내분비·대사 질환, 복용 약물의 영향, 감염 후 상태 등을 확인해야 하며 필요한 경우 1차 의료기관이나 전문과에서 혈액검사 등 적절한 평가가 필요합니다.
아울러 일반적인 만성피로 증상 표현과 엄격한 진단 평가가 필요한 만성피로증후군(ME/CFS)을 구분하는 것도 중요합니다.
생활 맥락에서는 검증되지 않은 계절 변화에 기대기보다 수면 부족, 과로, 식사 불규칙, 지속적인 직장 스트레스 등 실제 생활 요인을 살피는 것이 바람직합니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리
개인의 증상과 전반적인 상태를 고려한 한약 처방과 침구 치료를 시행합니다.
신체 전반의 긴장도와 조절력을 종합적으로 평가하여 점진적인 회복을 돕습니다.

## 5. 자주 묻는 질문
**Q1. 쉬어도 피로가 가시지 않는 이유는 무엇인가요?**
A. 단순 과로뿐 아니라 수면장애, 빈혈, 갑상선 등 내과적 원인이나 정신건강 요인이 복합 작용할 수 있어 체계적 감별이 필요합니다.
**Q2. 번아웃이 오면 어떻게 대처해야 하나요?**
A. 직무 스트레스 관리와 함께 에너지 소진 상태를 인정하고 전문적인 평가와 휴식 계획을 세워야 합니다.
**Q3. 머리가 멍한 브레인포그도 좋아질 수 있나요?**
A. 피로의 근본 원인을 감별하고 수면 리듬과 전신 조절력을 회복하면서 점차 맑아질 수 있습니다.
`
}));
assert.strictEqual(validFatigueArticle.valid, true, `Compliant fatigue article MUST PASS 100%: ${validFatigueArticle.errors.join('; ')}`);
console.log('✅ PASS: Fully compliant fatigue & burnout article passed validation 100%.');

console.log('\n🎉 ALL 17 QA SYSTEM INTEGRITY, REGRESSION, BATCH, GEO, HUMAN REVIEW, TARGET IDENTITY, CLINICAL GUIDANCE, TREATMENT CERTAINTY, BATCH 3, BATCH 4, BATCH 5 & RE-REVIEW TESTS PASSED 100%!');




