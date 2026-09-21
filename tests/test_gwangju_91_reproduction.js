const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const {
  checkTitleSimilarity,
  jaroWinkler,
  validateArticleContent
} = require('../scripts/auto_column/content_validator');
const { loadMedicalKnowledge } = require('../scripts/auto_column/ai_generator');
const {
  runAutoColumnPipeline,
  MAX_TITLE_REGEN_ATTEMPTS,
  MAX_FALLBACK_CANDIDATES,
  MAX_TOTAL_TITLE_REGENS,
  MAX_TOTAL_BODY_GENS,
  MAX_TOTAL_IMAGE_GENS
} = require('../scripts/auto_column/index');
const { loadHistory, planNextColumn } = require('../scripts/auto_column/topic_planner');

async function testGwangju91Reproduction() {
  console.log('🧪 Starting Gyeonggi-Gwangju ADHD 91.4% Collision & Recovery Test Suite...\n');

  const realHistory = loadHistory();

  // 1. Target collision titles
  const candidateGwangjuTitle = '[경기광주 ADHD] 성인 업무 중 실수가 반복되고 마무리가 어려울 때';
  const pastYonginTitle = '[용인 ADHD] 성인 업무 중 실수가 반복되고 마무리가 어려울 때';

  // Verify the past Yongin article exists in real history
  const pastYonginArticle = realHistory.find(h => h.title === pastYonginTitle);
  assert.ok(pastYonginArticle, 'Past Yongin article must exist in real history');

  // 2. Verify exact similarity calculation and reporting
  const rawJaro = jaroWinkler(candidateGwangjuTitle, pastYonginTitle);
  const reportedPercent = Number((rawJaro * 100).toFixed(1));
  console.log(`1. Collision Verification:`);
  console.log(`   Candidate: "${candidateGwangjuTitle}"`);
  console.log(`   Past:      "${pastYonginTitle}"`);
  console.log(`   Raw Jaro-Winkler: ${rawJaro}`);
  console.log(`   Reported Similarity: ${reportedPercent}%`);
  assert.strictEqual(reportedPercent, 91.4, `Expected reported similarity to be exactly 91.4%, got ${reportedPercent}%`);

  // 3. Verify Validator strictly rejects candidate with 0.75 threshold (unchanged)
  const simResult = checkTitleSimilarity(candidateGwangjuTitle, realHistory, 0.75);
  assert.strictEqual(simResult.valid, false, 'Validator must strictly reject 91.4% collision');
  assert.strictEqual(simResult.conflictingTitle, pastYonginTitle);
  assert.ok(simResult.error.includes('91.4%'), 'Error message must explicitly mention 91.4%');
  console.log(`   Result: ❌ BLOCKED (${simResult.error})`);

  // 4. Test Level A Title Regeneration candidate comparisons
  console.log('\n2. Level A: AI Title Regeneration Simulation:');
  const rejectedTitles = [candidateGwangjuTitle];
  const regenCandidate1 = '[경기광주 ADHD] 업무 중 실수가 잦고 마무리가 어려울 때'; // High similarity
  const regenCandidate2 = '[경기광주 ADHD] 성인기 반복되는 업무 실수와 실행기능 저하의 연관성'; // Unique!

  const sim1 = checkTitleSimilarity(regenCandidate1, realHistory, 0.75);
  const sim2 = checkTitleSimilarity(regenCandidate2, realHistory, 0.75);

  console.log(`   Regen 1: "${regenCandidate1}" -> valid: ${sim1.valid} (sim: ${(sim1.maxSimilarity * 100).toFixed(1)}%)`);
  console.log(`   Regen 2: "${regenCandidate2}" -> valid: ${sim2.valid} (sim: ${(sim2.maxSimilarity * 100).toFixed(1)}%)`);

  assert.strictEqual(sim1.valid, false, 'Regen 1 with similar phrasing must be blocked');
  assert.strictEqual(sim2.valid, true, 'Unique regenerated title must pass similarity check');
  assert.ok(sim2.maxSimilarity < 0.75, 'Max similarity must be strictly below 0.75 threshold');

  // 5. End-to-End Pipeline Execution with Level A Recovery
  console.log('\n3. End-to-End Recovery Simulation (Level A):');
  const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-gwangju-91-test-'));
  const testHistoryPath = path.join(testTmpDir, 'history.json');
  const testBlogDir = path.join(testTmpDir, 'content_blog');
  fs.mkdirSync(testBlogDir, { recursive: true });
  fs.writeFileSync(testHistoryPath, JSON.stringify(realHistory, null, 2), 'utf-8');

  // Verified reproduction date where Gyeonggi-Gwangju ADHD is selected as candidate 1
  const reproductionDate = new Date('2026-09-06T09:00:00+09:00');

  let mockRegenCalls = 0;
  const pipelineResult = await runAutoColumnPipeline({
    apiKey: '', // Offline mock mode: 0 live OpenAI API calls
    isDryRun: true,
    historyPath: testHistoryPath,
    blogDir: testBlogDir,
    now: reproductionDate,
    mockTitleGenerator: (plan, conflict, sim, rejected) => {
      mockRegenCalls++;
      assert.strictEqual(conflict, pastYonginTitle);
      assert.ok(sim >= 0.91);
      assert.ok(rejected.includes(candidateGwangjuTitle));
      return regenCandidate2;
    }
  });

  assert.strictEqual(pipelineResult.success, true, 'Pipeline must succeed on valid regenerated title');
  assert.strictEqual(mockRegenCalls, 1, 'mock generator should be called exactly once');
  assert.strictEqual(pipelineResult.plan.titleCandidate, regenCandidate2);
  assert.strictEqual(pipelineResult.retryReport.totalTitleRegens, 1);
  console.log(`   ✅ Pipeline successfully recovered on attempt 1 of Level A: "${pipelineResult.plan.titleCandidate}"`);

  // 6. Test Level A Exhaustion (3 attempts fail) -> Transitions to Level B Fallback Candidate
  console.log('\n4. Level A Exhaustion (3 failures) -> Level B Transition Verification:');
  const testHistoryPath2 = path.join(testTmpDir, 'history2.json');
  fs.writeFileSync(testHistoryPath2, JSON.stringify(realHistory, null, 2), 'utf-8');

  let candidate1Attempts = 0;
  const candidate2UniqueTitle = '[경기광주 ADHD] 교실과 가정에서 주의 집중이 유지되기 어려운 신경학적 이유';

  const pipelineResultFallback = await runAutoColumnPipeline({
    apiKey: '',
    isDryRun: true,
    historyPath: testHistoryPath2,
    blogDir: testBlogDir,
    now: reproductionDate,
    mockTitleGenerator: (plan, conflict, sim, rejected) => {
      if (plan.topicAngle.id === 'adult-work-mistakes') {
        candidate1Attempts++;
        // Force Level A attempts 1, 2, 3 to all collide with past Yongin article
        return candidateGwangjuTitle;
      }
      return candidate2UniqueTitle;
    }
  });

  assert.strictEqual(pipelineResultFallback.success, true, 'Pipeline must succeed on Level B fallback candidate');
  assert.strictEqual(candidate1Attempts, MAX_TITLE_REGEN_ATTEMPTS, 'Candidate 1 must attempt exactly MAX_TITLE_REGEN_ATTEMPTS (3)');
  assert.notStrictEqual(pipelineResultFallback.plan.topicAngle.id, 'adult-work-mistakes', 'Must transition to alternative candidate');
  console.log(`   ✅ Successfully fell back to Candidate 2: [${pipelineResultFallback.plan.geo.displayName} ${pipelineResultFallback.plan.titleDisease}] ${pipelineResultFallback.plan.topicAngle.id}`);

  // 7. Test Total Exhaustion (All Candidates Fail Title Retries) -> 0 files written, history untouched
  console.log('\n5. Total Failure Ceiling Verification (All 3 Candidates Fail Title Retries):');
  const testHistoryPath3 = path.join(testTmpDir, 'history3.json');
  fs.writeFileSync(testHistoryPath3, JSON.stringify(realHistory, null, 2), 'utf-8');
  const initialFiles = fs.readdirSync(testBlogDir);

  let caughtTotalErr = null;
  try {
    await runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: testHistoryPath3,
      blogDir: testBlogDir,
      now: reproductionDate,
      // All titles collide with Yongin
      mockTitleGenerator: () => candidateGwangjuTitle
    });
  } catch (err) {
    caughtTotalErr = err;
  }

  assert.ok(caughtTotalErr, 'Pipeline must throw error when all candidates fail');
  assert.ok(caughtTotalErr.message.includes('Article validation and title retry failed'), 'Error message must reflect exhaustion');
  const finalFiles = fs.readdirSync(testBlogDir);
  assert.strictEqual(finalFiles.length, initialFiles.length, 'Zero content files written on total failure');

  // Verify history was NOT polluted with failed candidates
  const finalHistory = JSON.parse(fs.readFileSync(testHistoryPath3, 'utf-8'));
  assert.strictEqual(finalHistory.length, realHistory.length, 'Failed candidates must NEVER be written to history');

  // Clean up
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n🎉 ALL GYEONGGI-GWANGJU 91.4% REPRODUCTION & RECOVERY TESTS PASSED 100%!\n');
}

if (require.main === module) {
  testGwangju91Reproduction().catch(err => {
    console.error('💥 Test Failed:', err);
    process.exit(1);
  });
}

module.exports = {
  testGwangju91Reproduction
};
