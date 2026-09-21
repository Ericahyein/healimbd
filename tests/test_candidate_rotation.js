const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const {
  getKstDateString,
  getKstCalendarDate,
  getKstDaySeed,
  isGeoDiseaseIn90DayCooldown,
  isDiseaseIn3DayCooldown,
  isMedicalKnowledgeApproved,
  sortAndRotateCandidates,
  planNextColumn,
  getRankedCandidatePlans,
  loadHistory,
  SCORE_EPSILON
} = require('../scripts/auto_column/topic_planner');

async function testCandidateRotation() {
  console.log('🧪 Starting Candidate Tie-Break Rotation & Cooldown Safety Test Suite...\n');

  // =========================================================================
  // TEST 1: KST Date Seed Calculation & Midnight Boundary
  // =========================================================================
  console.log('--- TEST 1: KST Date Seed Calculation & Midnight Boundary ---');
  const tMidnightBefore = new Date('2026-09-21T23:59:59+09:00'); // UTC 2026-09-21T14:59:59Z
  const tMidnightAfter  = new Date('2026-09-22T00:00:00+09:00'); // UTC 2026-09-21T15:00:00Z

  const dateStrBefore = getKstDateString(tMidnightBefore);
  const dateStrAfter  = getKstDateString(tMidnightAfter);
  const seedBefore = getKstDaySeed(tMidnightBefore);
  const seedAfter  = getKstDaySeed(tMidnightAfter);

  assert.strictEqual(dateStrBefore, '2026-09-21', 'KST date string before midnight must be 2026-09-21');
  assert.strictEqual(dateStrAfter,  '2026-09-22', 'KST date string after midnight must be 2026-09-22');
  assert.strictEqual(seedAfter - seedBefore, 1, 'Seed must advance by exactly 1 at KST midnight');
  console.log(`✅ TEST 1-1 PASS: Midnight boundary verified (${dateStrBefore} seed ${seedBefore} -> ${dateStrAfter} seed ${seedAfter}).`);

  // UTC date boundary with identical KST date
  const tUtcDiff1 = new Date('2026-09-21T01:00:00+09:00'); // UTC 2026-09-20T16:00:00Z (UTC is 20th)
  const tUtcDiff2 = new Date('2026-09-21T18:00:00+09:00'); // UTC 2026-09-21T09:00:00Z (UTC is 21st)

  assert.strictEqual(getKstDateString(tUtcDiff1), '2026-09-21');
  assert.strictEqual(getKstDateString(tUtcDiff2), '2026-09-21');
  assert.strictEqual(getKstDaySeed(tUtcDiff1), getKstDaySeed(tUtcDiff2), 'Same KST calendar date must produce identical seed regardless of UTC date');
  console.log('✅ TEST 1-2 PASS: Identical KST date yields identical seed across UTC boundaries.');

  // =========================================================================
  // TEST 2: Determinism & Reproducibility (Same date + history = Same order)
  // =========================================================================
  console.log('\n--- TEST 2: Determinism & Reproducibility on Same Date ---');
  const realHistory = loadHistory();
  const testNow1 = new Date('2026-09-20T09:00:00+09:00');
  const testNow2 = new Date('2026-09-20T16:00:00+09:00'); // Same KST calendar day, different hour

  const plan1 = planNextColumn({ now: testNow1 });
  const plan2 = planNextColumn({ now: testNow2 });

  assert.strictEqual(plan1.geo.id, plan2.geo.id, 'Same date must select same region');
  assert.strictEqual(plan1.disease.id, plan2.disease.id, 'Same date must select same disease');
  assert.strictEqual(plan1.topicAngle.id, plan2.topicAngle.id, 'Same date must select same topic angle');
  assert.strictEqual(plan1.titleCandidate, plan2.titleCandidate, 'Same date must yield identical canonical title');
  console.log(`✅ TEST 2 PASS: 100% deterministic output on same date (${plan1.titleCandidate}).`);

  // =========================================================================
  // TEST 3: Tied Candidate Rotation on Next Date (No Permanent Lock-in)
  // =========================================================================
  console.log('\n--- TEST 3: Rotation of Tied Candidates on Next Calendar Day ---');
  const day1Date = new Date('2026-09-20T09:00:00+09:00');
  const day2Date = new Date('2026-09-21T09:00:00+09:00');
  const day3Date = new Date('2026-09-22T09:00:00+09:00');

  const day1Plan = planNextColumn({ now: day1Date });
  const day2Plan = planNextColumn({ now: day2Date });
  const day3Plan = planNextColumn({ now: day3Date });

  console.log(`   Day 1 Candidate 1: [${day1Plan.geo.displayName}] ${day1Plan.disease.name} (${day1Plan.topicAngle.titleSuffix})`);
  console.log(`   Day 2 Candidate 1: [${day2Plan.geo.displayName}] ${day2Plan.disease.name} (${day2Plan.topicAngle.titleSuffix})`);
  console.log(`   Day 3 Candidate 1: [${day3Plan.geo.displayName}] ${day3Plan.disease.name} (${day3Plan.topicAngle.titleSuffix})`);

  // Candidates on different days in tied group must rotate
  assert.notStrictEqual(
    `${day1Plan.geo.id}|${day1Plan.disease.id}`,
    `${day2Plan.geo.id}|${day2Plan.disease.id}`,
    'Day 2 candidate must rotate from Day 1 candidate in tied group'
  );
  console.log('✅ TEST 3 PASS: Candidate rotated smoothly across calendar dates without lock-in.');

  // =========================================================================
  // TEST 4: Score Priority Preservation (Higher Score Never Leapfrogged)
  // =========================================================================
  console.log('\n--- TEST 4: Score Priority Preservation ---');
  const mockCandidates = [
    { stableKey: 'region-low|disease-a', score: 100.0 },
    { stableKey: 'region-high|disease-b', score: 135.0 },
    { stableKey: 'region-high|disease-c', score: 135.0 },
    { stableKey: 'region-mid|disease-d', score: 110.0 }
  ];

  for (let seed = 0; seed < 10; seed++) {
    const rotated = sortAndRotateCandidates([...mockCandidates], seed);
    // Score 135 items must ALWAYS come before score 110, which must come before score 100
    assert.strictEqual(rotated[0].score, 135.0);
    assert.strictEqual(rotated[1].score, 135.0);
    assert.strictEqual(rotated[2].score, 110.0);
    assert.strictEqual(rotated[3].score, 100.0);
  }
  console.log('✅ TEST 4 PASS: Higher score candidates are NEVER overtaken by lower score candidates during rotation.');

  // =========================================================================
  // TEST 5: Tied Group Base Order Stability (Independent of Insertion Order)
  // =========================================================================
  console.log('\n--- TEST 5: Tied Group Base Order Stability ---');
  const tiedGroup1 = [
    { stableKey: 'c|disease', score: 120.0 },
    { stableKey: 'a|disease', score: 120.0 },
    { stableKey: 'b|disease', score: 120.0 }
  ];
  const tiedGroup2 = [
    { stableKey: 'a|disease', score: 120.0 },
    { stableKey: 'b|disease', score: 120.0 },
    { stableKey: 'c|disease', score: 120.0 }
  ];

  const res1 = sortAndRotateCandidates(tiedGroup1, 100);
  const res2 = sortAndRotateCandidates(tiedGroup2, 100);

  assert.deepStrictEqual(
    res1.map(c => c.stableKey),
    res2.map(c => c.stableKey),
    'Base order inside tied group must be identical regardless of input array insertion order'
  );
  console.log('✅ TEST 5 PASS: Base order of tied group is 100% deterministic and independent of insertion order.');

  // =========================================================================
  // TEST 6: Cooldown Invariance (90-Day GEO & 3-Day Disease Never Bypassed)
  // =========================================================================
  console.log('\n--- TEST 6: Cooldown Invariance Under Date Rotation ---');
  const now = new Date('2026-09-20T09:00:00+09:00');

  // In history, Suji anxiety was published on 2026-09-14 (within 90 days)
  const isSujiAnxietyCooldown = isGeoDiseaseIn90DayCooldown(realHistory, 'yongin-suji', 'anxiety', now);
  assert.strictEqual(isSujiAnxietyCooldown, true, 'Suji anxiety must be in 90-day cooldown');

  // Tic was published on 2026-09-19 (within 3 calendar days in KST of 2026-09-20)
  const isTic3DayCooldown = isDiseaseIn3DayCooldown(realHistory, 'tic', now);
  assert.strictEqual(isTic3DayCooldown, true, 'Tic must be in 3-day cooldown on 2026-09-20');

  // Verify that neither Suji anxiety nor Tic is ever selected across any daySeed rotation
  for (let d = 0; d < 14; d++) {
    const simDate = new Date(now.getTime() + d * 24 * 3600 * 1000);
    const plans = getRankedCandidatePlans({ now: simDate });
    for (const p of plans) {
      if (isGeoDiseaseIn90DayCooldown(realHistory, p.geo.id, p.disease.id, simDate)) {
        assert.fail(`Cooldown violation: Candidate [${p.geo.id} ${p.disease.id}] selected while in 90-day cooldown!`);
      }
      if (isDiseaseIn3DayCooldown(realHistory, p.disease.id, simDate)) {
        assert.fail(`Cooldown violation: Candidate [${p.geo.id} ${p.disease.id}] selected while in 3-day cooldown!`);
      }
    }
  }
  console.log('✅ TEST 6 PASS: Cooldowns (90-day GEO+disease and 3-day disease) are 100% strictly enforced across all dates.');

  // =========================================================================
  // TEST 7: Unapproved Medical Knowledge Excluded From Candidate List
  // =========================================================================
  console.log('\n--- TEST 7: Unapproved Medical Knowledge Excluded ---');
  assert.strictEqual(isMedicalKnowledgeApproved('adhd'), true);
  assert.strictEqual(isMedicalKnowledgeApproved('non-existent-disease-xyz'), false);

  const candidatePlans = getRankedCandidatePlans({ now });
  for (const p of candidatePlans) {
    assert.strictEqual(isMedicalKnowledgeApproved(p.disease.id), true, `Selected plan disease '${p.disease.id}' must be approved`);
  }
  console.log('✅ TEST 7 PASS: Unapproved medical knowledge candidates are excluded at planner level.');

  // =========================================================================
  // TEST 8: Date is NOT Included in Candidate Title or Slug
  // =========================================================================
  console.log('\n--- TEST 8: Date NOT in Title or Slug ---');
  for (const p of candidatePlans.slice(0, 10)) {
    assert.ok(!p.titleCandidate.match(/202[0-9]|9월|10월/), `Title candidate '${p.titleCandidate}' must not contain date tokens`);
    assert.ok(!p.slug.match(/202[0-9]/), `Slug '${p.slug}' must not contain date tokens`);
  }
  console.log('✅ TEST 8 PASS: Titles and slugs remain strictly clinical with 0 date tokens.');

  console.log('\n🎉 ALL CANDIDATE ROTATION, TIE-BREAK & COOLDOWN SAFETY TESTS PASSED 100%!\n');
}

if (require.main === module) {
  testCandidateRotation().catch(err => {
    console.error('💥 Test Failed:', err);
    process.exit(1);
  });
}

module.exports = {
  testCandidateRotation
};
