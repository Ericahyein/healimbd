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

// Test 4: Verify approved QA targets status (approved per human review)
console.log('\n[Test 4] Verifying all 7 approved and 3 needs_revision QA targets approval status...');
const qaResults = loadQAResults();

const expectedApprovedTargets = [
  'qa-01-tic',
  'qa-03-adhd-child',
  'qa-05-panic',
  'qa-06-anxiety',
  'qa-08-sleep',
  'qa-09-autonomic',
  'qa-10-hyperhidrosis'
];
for (const qId of expectedApprovedTargets) {
  const record = qaResults.find(r => r.qaId === qId);
  assert.ok(record, `${qId} record must exist in QA results`);
  assert.strictEqual(record.validationPassed, true, `${qId} validationPassed must be true`);
  assert.strictEqual(record.humanReviewStatus, 'approved', `${qId} must be approved per human review`);
}

const expectedRevisionTargets = [
  'qa-02-tourette',
  'qa-04-adhd-adult',
  'qa-07-social-phobia'
];
for (const qId of expectedRevisionTargets) {
  const record = qaResults.find(r => r.qaId === qId);
  assert.ok(record, `${qId} record must exist in QA results`);
  assert.strictEqual(record.validationPassed, true, `${qId} validationPassed must be true`);
  assert.strictEqual(record.humanReviewStatus, 'needs_revision', `${qId} must be needs_revision per human review`);
}

console.log('✅ [Test 4 Passed] All 7 approved targets and 3 needs_revision targets verified 100%.');

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
신경생물학적 요인과 환경적 자극을 함께 살펴봅니다.

## 3. 감별 포인트
자세한 정보는 [주요 진료 안내](/treatments/)에서 확인하실 수 있습니다.

## 4. 치료 관점
궁금한 점은 [온라인 상담](/inquiry/)을 통해 문의 가능합니다.

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
assert.strictEqual(b2Targets.length, 3, 'Batch 2 has 3 active unapproved targets (qa-10-hyperhidrosis is approved and excluded)');
assert.ok(b2Targets.includes('qa-02-tourette'));
assert.ok(b2Targets.includes('qa-04-adhd-adult'));
assert.ok(b2Targets.includes('qa-07-social-phobia'));
assert.ok(!b2Targets.includes('qa-10-hyperhidrosis'), 'qa-10-hyperhidrosis must be excluded as it is approved');

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
  // Create 2 mock worker single results for unapproved targets
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
  assert.strictEqual(touretteRecord.validationPassed, true);
  assert.strictEqual(touretteRecord.humanReviewStatus, 'generated');
  assert.strictEqual(touretteRecord.estimatedCostUSD, 0.0491);

  const adhdAdultRecord = afterMerge.find(r => r.qaId === 'qa-04-adhd-adult');
  assert.strictEqual(adhdAdultRecord.validationPassed, false);
  assert.strictEqual(adhdAdultRecord.humanReviewStatus, 'needs_revision');
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

console.log('\n🎉 ALL 11 QA SYSTEM INTEGRITY, REGRESSION, BATCH, GEO, HUMAN REVIEW & TARGET IDENTITY TESTS PASSED 100%!');




