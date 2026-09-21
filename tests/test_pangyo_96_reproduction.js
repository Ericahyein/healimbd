const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const { checkTitleSimilarity, jaroWinkler, validateArticleContent } = require('../scripts/auto_column/content_validator');
const { loadMedicalKnowledge } = require('../scripts/auto_column/ai_generator');

async function testPangyoReproduction() {
  console.log('🧪 Reproducing 96.8% Title Similarity Failure and Fix Locally...\n');

  // Load actual auto_column_history.json
  const realHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/auto_column_history.json'), 'utf-8'));

  // The past article that caused the collision (published 2026-09-08)
  const pastSujiArticle = realHistory.find(h => h.slug === 'yongin-suji-social-phobia-presentation-anxiety');
  assert.ok(pastSujiArticle, 'Past Suji article must exist in history');
  assert.strictEqual(pastSujiArticle.title, '[수지 사회공포증] 발표나 미팅 때 목소리가 떨리고 시선이 두려울 때');

  // The candidate title that failed on 2026-09-17 and 2026-09-18
  const candidatePangyoTitle = '[판교 사회공포증] 발표나 미팅 때 목소리가 떨리고 시선이 두려울 때';

  // Verify exact 96.8% similarity
  const rawSimilarity = jaroWinkler(candidatePangyoTitle, pastSujiArticle.title);
  const similarityPercent = Number((rawSimilarity * 100).toFixed(1));
  console.log(`1. Collision Verification:`);
  console.log(`   Past:      "${pastSujiArticle.title}"`);
  console.log(`   Candidate: "${candidatePangyoTitle}"`);
  console.log(`   Similarity: ${similarityPercent}%`);
  assert.strictEqual(similarityPercent, 96.8, `Expected exactly 96.8%, got ${similarityPercent}%`);

  // Verify Validator strictly blocks it
  const simResult = checkTitleSimilarity(candidatePangyoTitle, realHistory, 0.75);
  assert.strictEqual(simResult.valid, false, 'Validator must strictly reject 96.8% collision');
  assert.strictEqual(simResult.conflictingTitle, pastSujiArticle.title);
  console.log(`   Result: ❌ BLOCKED (${simResult.error})`);

  // Simulate Level A: AI Title Regeneration
  console.log('\n2. Level A AI Regeneration Simulation:');
  const rejectedTitles = new Set([candidatePangyoTitle]);

  // Unique regenerated candidate
  const regeneratedTitle = '[판교 사회공포증] 사람들 앞에 서면 심장이 요동치고 머릿속이 하얘질 때';
  console.log(`   Regenerated: "${regeneratedTitle}"`);

  // Verify new similarity against ALL past articles in real history
  const regenSimResult = checkTitleSimilarity(regeneratedTitle, realHistory, 0.75);
  console.log(`   New Max Similarity: ${(regenSimResult.maxSimilarity * 100).toFixed(1)}% (Threshold: 75%)`);
  assert.strictEqual(regenSimResult.valid, true, 'Regenerated title must pass similarity check');
  assert.ok(regenSimResult.maxSimilarity < 0.75, 'Max similarity must be below 75% threshold');
  console.log('   Result: ✅ PASSED (Unique & Clinically Compliant)');

  // 3. Verify Full 3-Tier Validation with regenerated title
  console.log('\n3. Full 3-Tier Validation with Regenerated Title:');
  const knowledge = loadMedicalKnowledge('anxiety');

  const fullValidation = validateArticleContent({
    title: regeneratedTitle,
    titleDisease: '사회공포증',
    thumbnailDiseaseLabel: '사회공포증',
    seoDiseaseLabel: '사회공포증',
    summary: '사회공포증으로 발표와 미팅에서 느끼는 불안과 신체적 긴장을 살펴보고, 상태에 맞는 평가와 생활 관리 방향을 안내합니다.',
    category: 'anxiety',
    body: `> 💡 **핵심 요약**
> - 사회공포증은 발표나 미팅 같은 평가 상황에서 교감신경계가 과도하게 항진되는 질환입니다.
> - 신체적 긴장과 예기불안을 단계적으로 평가하고 조절하여 일상 회복을 돕습니다.

## 발표 자리에서 찾아오는 얼어붙는 긴장

회의나 발표를 앞두고 가슴이 두근거리거나 목소리가 떨리는 경험은 누구나 할 수 있습니다. 그러나 이러한 긴장이 특정 상황을 반복적으로 회피하게 만들고 일상생활이나 업무 수행에 심각한 지장을 초래한다면 단순한 수줍음이 아닌 사회공포증(사회불안장애)의 관점에서 살펴볼 필요가 있습니다.

사회공포증은 타인의 시선이나 부정적인 평가에 대해 과도한 두려움을 느끼며, 발표, 미팅, 낯선 사람과의 대화 등 사회적 상황에 노출될 때 교감신경계가 과항진되어 다양한 신체 증상을 동반합니다.

[분당 공황장애](/blog/seongnam-bundang-panic-sudden-palpitation/) 증상처럼 예기치 못한 순간에 심장이 요동치기도 하지만, 사회공포증은 명확한 사회적 맥락과 평가 상황에서 유발된다는 점에서 차이가 있습니다.

## 자율신경계 과각성과 신체 반응

사회적 압박 상황에 직면하면 뇌의 편도체가 위험 신호를 감지하고 교감신경을 급격히 활성화시킵니다. 이로 인해 심장박동이 빨라지고, 호흡이 가빠지며, 후두부와 성대 주변 근육이 경직되어 목소리가 떨리게 됩니다. 또한 얼굴이 붉어지거나 손발이 차가워지는 등 자율신경계의 불균형 증상이 나타납니다.

이러한 신체 반응 자체가 다시 '남들이 나의 떨림을 알아채지 않을까' 하는 파국적 사고를 촉발하여 불안을 증폭시키는 악순환이 형성됩니다.

## 한의학적 변증과 단계별 조절

한의학에서는 사회공포증을 심담허겁(心膽虛怯), 간기울결(肝氣鬱結) 등으로 분류하여 다룹니다. 심장과 담의 기운이 약해져 사소한 자극에도 과도하게 놀라고 긴장하는 체질적 소인을 평가하며, 장기간의 스트레스로 인해 기혈 순환이 정체된 상태를 개선합니다.

체질과 증상 발현 양상에 맞춘 한약 처방과 침구 치료를 통해 항진된 교감신경을 안정시키고, 신체적 긴장도를 낮추어 점진적으로 불안 상황에 직면할 수 있는 신체적 회복력을 돕습니다.

해아림한의원 분당점에서는 세심한 문진과 자율신경 기능 평가를 바탕으로 개인별 맞춤 치료 계획을 수립합니다.

## 자주 묻는 질문 (FAQ)

**Q1. 단순 수줍음과 사회공포증의 차이는 무엇인가요?**
단순한 수줍음은 시간이 지나 익숙해지면 완화되지만, 사회공포증은 상황에 대한 극심한 예기불안과 회피 반응으로 인해 직장이나 학교생활에 뚜렷한 장애를 초래합니다.

**Q2. 한방 치료 기간과 관리 방법은 어떻게 되나요?**
개인의 자율신경 조절력과 증상의 지속 기간에 따라 단계별로 접근하며, 신체 긴장 완화 훈련과 일상 스트레스 관리를 병행합니다.`,
    hashtags: ['판교사회공포증', '판교한의원', '사회공포증치료', '사회공포증관리', '해아림한의원'],
    keywords: ['판교 사회공포증', '성남시 분당구 판교동 사회공포증', '사회공포증 한방치료', '사람들 앞에 서면 심장이 요동치고 머릿속이 하얘질 때'],
    geoId: 'bundang-pangyo',
    diseaseId: 'anxiety',
    ageGroup: 'adult',
    topicAngle: { id: 'presentation-anxiety', titleSuffix: '발표나 미팅 때 목소리가 떨리고 시선이 두려울 때' },
    qaTarget: null,
    thumbnailCopy: { yellowText: '발표할 때', whiteText: '시선이 두렵다면', greenText: '사회공포증' },
    knowledge,
    history: realHistory
  });

  console.log(`   Validation valid: ${fullValidation.valid}`);
  if (!fullValidation.valid) {
    console.error('   Validation errors:', fullValidation.errors);
  }
  assert.strictEqual(fullValidation.valid, true, 'Regenerated article must pass 3-tier validation 100%');
  console.log('   Result: ✅ 3-Tier Validator 100% PASS with 0 errors.');

  console.log('\n🎉 Pangyo 96.8% Reproduction & Resolution Verified 100%!\n');
}

testPangyoReproduction().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
