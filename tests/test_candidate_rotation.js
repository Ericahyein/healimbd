const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const cp = require('child_process');

const {
  getKstDateString,
  getKstCalendarDate,
  getKstDaySeed,
  parseKstDateParts,
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

  console.log(`   Day 1 Candidate: [${day1Plan.geo.displayName}] ${day1Plan.disease.name} (${day1Plan.topicAngle.titleSuffix}) [Key: ${day1Plan.stableKey}]`);
  console.log(`   Day 2 Candidate: [${day2Plan.geo.displayName}] ${day2Plan.disease.name} (${day2Plan.topicAngle.titleSuffix}) [Key: ${day2Plan.stableKey}]`);
  console.log(`   Day 3 Candidate: [${day3Plan.geo.displayName}] ${day3Plan.disease.name} (${day3Plan.topicAngle.titleSuffix}) [Key: ${day3Plan.stableKey}]`);

  // Verify candidate rotates across consecutive days in tied group
  assert.notStrictEqual(
    day1Plan.stableKey,
    day2Plan.stableKey,
    'Day 2 candidate must rotate from Day 1 candidate in tied group'
  );
  assert.notStrictEqual(
    day2Plan.stableKey,
    day3Plan.stableKey,
    'Day 3 candidate must rotate from Day 2 candidate in tied group'
  );
  console.log('✅ TEST 3 PASS: Candidate rotated smoothly across calendar dates without lock-in.');

  // =========================================================================
  // TEST 4: Score Priority Preservation (Higher Score Never Leapfrogged)
  // =========================================================================
  console.log('\n--- TEST 4: Score Priority Preservation ---');
  const mockCandidates = [
    { stableKey: 'region-low|disease-a|angle-1', score: 100.0 },
    { stableKey: 'region-high|disease-b|angle-1', score: 135.0 },
    { stableKey: 'region-high|disease-c|angle-2', score: 135.0 },
    { stableKey: 'region-mid|disease-d|angle-1', score: 110.0 }
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
  // TEST 5: Complete Candidate Identifier with topicAngleKey & Shuffle Invariance
  // =========================================================================
  console.log('\n--- TEST 5: Complete Identifier (geo|disease|topicAngle) & Shuffle Invariance ---');
  const geoKey = 'gyeonggi-gwangju';
  const diseaseKey = 'adhd';
  const angleKeys = ['adult-executive', 'impulsive-focus', 'child-hyperactivity', 'inattention-work'];
  const tiedScore = 135.0;

  // 1. Multiple candidates sharing same geoKey and diseaseKey but different topicAngleKey
  const cands1 = angleKeys.map(k => ({
    geoKey,
    diseaseKey,
    topicAngleKey: k,
    stableKey: `${geoKey}|${diseaseKey}|${k}`,
    score: tiedScore
  }));

  // Permutation 2: Reversed order
  const cands2 = [...cands1].reverse();
  // Permutation 3: Shuffled order 1
  const cands3 = [cands1[2], cands1[0], cands1[3], cands1[1]];
  // Permutation 4: Shuffled order 2
  const cands4 = [cands1[1], cands1[3], cands1[0], cands1[2]];

  // Verify that for all permutations, base order and rotated order are 100% identical
  for (let seed = 0; seed < 12; seed++) {
    const r1 = sortAndRotateCandidates([...cands1], seed);
    const r2 = sortAndRotateCandidates([...cands2], seed);
    const r3 = sortAndRotateCandidates([...cands3], seed);
    const r4 = sortAndRotateCandidates([...cands4], seed);

    const keys1 = r1.map(c => c.stableKey);
    const keys2 = r2.map(c => c.stableKey);
    const keys3 = r3.map(c => c.stableKey);
    const keys4 = r4.map(c => c.stableKey);

    assert.deepStrictEqual(keys1, keys2, `Seed ${seed}: Order must match reversed permutation`);
    assert.deepStrictEqual(keys1, keys3, `Seed ${seed}: Order must match shuffled permutation 1`);
    assert.deepStrictEqual(keys1, keys4, `Seed ${seed}: Order must match shuffled permutation 2`);
  }

  // Verify that across consecutive KST calendar days, candidates rotate deterministically
  // and no single candidate is permanently locked-in just because it appeared first in input
  const firstSelectedPerDay = new Set();
  for (let d = 0; d < angleKeys.length; d++) {
    const daySeed = 20700 + d;
    const rotated = sortAndRotateCandidates([...cands1], daySeed);
    firstSelectedPerDay.add(rotated[0].topicAngleKey);
  }
  assert.strictEqual(
    firstSelectedPerDay.size,
    angleKeys.length,
    'Every topic angle must be selected as first across consecutive days (no permanent lock-in)'
  );
  console.log('✅ TEST 5 PASS: Topic angle included in stableKey; 100% shuffle-independent and deterministically rotating.');

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

  // =========================================================================
  // TEST 9: Execution Environment Timezone Independence (UTC, Asia/Seoul, America/Los_Angeles)
  // =========================================================================
  console.log('\n--- TEST 9: Timezone Independence (UTC, Asia/Seoul, America/Los_Angeles) ---');
  const tzList = ['UTC', 'Asia/Seoul', 'America/Los_Angeles'];
  const testIsoTime = '2026-09-21T12:00:00Z'; // 2026-09-21 21:00:00 KST
  const expectedKstDate = '2026-09-21';
  const expectedSeed = getKstDaySeed(new Date(testIsoTime));

  const tzResults = [];

  for (const tz of tzList) {
    // Run an isolated node subprocess with the specified TZ environment variable
    const script = `
      const { getKstDateString, getKstDaySeed, sortAndRotateCandidates } = require('./scripts/auto_column/topic_planner');
      const d = new Date('${testIsoTime}');
      const dateStr = getKstDateString(d);
      const seed = getKstDaySeed(d);
      const tied = [
        { stableKey: 'geoA|diseaseA|angle2', score: 100 },
        { stableKey: 'geoA|diseaseA|angle1', score: 100 },
        { stableKey: 'geoA|diseaseA|angle3', score: 100 }
      ];
      const rotated = sortAndRotateCandidates(tied, seed);
      console.log(JSON.stringify({ dateStr, seed, order: rotated.map(c => c.stableKey) }));
    `;
    const res = cp.spawnSync('node', ['-e', script], {
      env: Object.assign({}, process.env, { TZ: tz }),
      encoding: 'utf-8'
    });

    assert.strictEqual(res.status, 0, `Subprocess execution under TZ=${tz} must succeed: ${res.stderr}`);
    const parsed = JSON.parse(res.stdout.trim());
    tzResults.push({ tz, ...parsed });

    assert.strictEqual(parsed.dateStr, expectedKstDate, `KST date string under TZ=${tz} must be ${expectedKstDate}`);
    assert.strictEqual(parsed.seed, expectedSeed, `daySeed under TZ=${tz} must be ${expectedSeed}`);
  }

  // Verify all timezones yielded identical date, seed, and tied candidate rotation order
  for (let i = 1; i < tzResults.length; i++) {
    assert.strictEqual(tzResults[i].dateStr, tzResults[0].dateStr, `Date string under TZ=${tzResults[i].tz} must match TZ=${tzResults[0].tz}`);
    assert.strictEqual(tzResults[i].seed, tzResults[0].seed, `Seed under TZ=${tzResults[i].tz} must match TZ=${tzResults[0].tz}`);
    assert.deepStrictEqual(tzResults[i].order, tzResults[0].order, `Candidate order under TZ=${tzResults[i].tz} must match TZ=${tzResults[0].tz}`);
  }
  console.log(`✅ TEST 9 PASS: Timezone independence verified across ${tzList.join(', ')} (all produced date=${expectedKstDate}, seed=${expectedSeed}, identical order).`);

  // =========================================================================
  // TEST 10: Invalid Date Input Strictly Throws Error (Fail-Closed)
  // =========================================================================
  console.log('\n--- TEST 10: Invalid Date Error Handling (Fail-Closed) ---');
  assert.throws(
    () => parseKstDateParts(new Date('invalid-date-string')),
    /Invalid Date input/,
    'Invalid Date object must throw explicit error'
  );

  assert.throws(
    () => parseKstDateParts('not-a-valid-date'),
    /Invalid Date input/,
    'Invalid date string must throw explicit error'
  );

  assert.throws(
    () => getKstDateString('completely-broken'),
    /Invalid Date input/,
    'getKstDateString must throw on invalid date input'
  );

  assert.throws(
    () => getKstDaySeed(new Date(NaN)),
    /Invalid Date input/,
    'getKstDaySeed must throw on NaN Date'
  );
  console.log('✅ TEST 10 PASS: Invalid Date inputs strictly throw explicit Fail-Closed errors.');

  console.log('\n🎉 ALL 10 CANDIDATE ROTATION, TIE-BREAK & COOLDOWN SAFETY TESTS PASSED 100%!\n');
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
