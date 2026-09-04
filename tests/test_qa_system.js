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

// Record a simulated test QA result for qa-02-tourette
const testQaId = 'qa-02-tourette';
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

// Reset qa-02-tourette back to not_tested for clean test state
recordQAResult({
  qaId: testQaId,
  validationPassed: false,
  estimatedCostUSD: 0,
  articleSlug: null,
  notes: '테스트 대기'
});
const resetResults = loadQAResults();
const resetTarget = resetResults.find(r => r.qaId === testQaId);
resetTarget.humanReviewStatus = 'not_tested';
resetTarget.testedAt = null;
fs.writeFileSync(path.join(__dirname, '../data/auto_column_qa_results.json'), JSON.stringify(resetResults, null, 2), 'utf-8');

// Verify production history is 100% UNTOUCHED
const finalProdHistory = fs.readFileSync(prodHistoryPath, 'utf-8');
assert.strictEqual(initialProdHistory, finalProdHistory, 'CRITICAL: data/auto_column_history.json MUST be 100% untouched during QA!');
console.log('✅ [Test 3 Passed] QA Results are recorded properly, humanReviewStatus is strictly "generated", and production history is 100% untouched.');

// Test 4: Verify qa-01-tic is 'generated' (not auto-approved)
console.log('\n[Test 4] Verifying qa-01-tic initial status...');
const qaResults = loadQAResults();
const ticRecord = qaResults.find(r => r.qaId === 'qa-01-tic');
assert.ok(ticRecord, 'qa-01-tic record must exist');
assert.strictEqual(ticRecord.humanReviewStatus, 'generated', 'qa-01-tic must start as generated (pending human approval)');
console.log('✅ [Test 4 Passed] qa-01-tic humanReviewStatus is properly set to "generated".');

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

console.log('\n🎉 ALL 6 QA SYSTEM INTEGRITY & SMART VALIDATION TESTS PASSED 100%!');
