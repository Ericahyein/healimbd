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

console.log('\n🎉 ALL 4 QA SYSTEM INTEGRITY TESTS PASSED 100%!');
