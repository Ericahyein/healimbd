const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  cosineFromCharacterNgrams,
  checkArticleSimilarity
} = require('../scripts/auto_column/content_validator');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-similarity-'));
const now = new Date('2026-09-30T09:00:00+09:00');
const history = [{
  publishDate: '2026-09-20T09:00:00+09:00',
  disease: 'tic',
  slug: 'past-tic',
  title: '[분당 틱장애] 미디어 노출과 증상 변화'
}];

const past = `---\ntitle: past\n---\n## 미디어 노출과 틱 증상\n영상 자극에 오래 노출되면 피로와 수면 리듬 변화가 함께 나타날 수 있습니다. 스마트폰이 틱의 직접 원인이라는 뜻은 아니며 아이의 긴장과 생활 흐름을 함께 관찰해야 합니다.\n\n**Q1. 스마트폰이 틱의 원인인가요?** 직접적인 단일 원인으로 단정할 수 없습니다.`;
fs.writeFileSync(path.join(tempDir, 'past-tic.md'), past);

try {
  const duplicate = `## 미디어 노출과 틱 증상\n용인 지역에서도 영상 자극에 오래 노출되면 피로와 수면 리듬 변화가 함께 나타날 수 있습니다. 스마트폰이 틱의 직접 원인이라는 뜻은 아니며 아이의 긴장과 생활 흐름을 함께 관찰해야 합니다.\n\n**Q1. 스마트폰이 틱의 원인인가요?** 직접적인 단일 원인으로 단정할 수 없습니다.`;
  const different = `## 학교생활에서 나타나는 틱\n새 학기에는 교실 환경과 또래 관계가 달라져 긴장이 커질 수 있습니다. 증상을 지적하기보다 수업 참여와 아이의 정서 변화를 차분히 살펴봅니다.\n\n**Q1. 담임교사에게 알려야 하나요?** 아이와 상의하여 필요한 관찰 기준을 공유할 수 있습니다.`;

  assert.ok(cosineFromCharacterNgrams(duplicate, past) > cosineFromCharacterNgrams(different, past));
  assert.strictEqual(checkArticleSimilarity(duplicate, history, tempDir, 'tic', { now }).valid, false);
  assert.strictEqual(checkArticleSimilarity(different, history, tempDir, 'tic', { now }).valid, true);
  assert.strictEqual(checkArticleSimilarity(duplicate, history, tempDir, 'adhd', { now }).valid, true);
  console.log('✅ 120-day same-disease body/FAQ similarity gate passed.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
