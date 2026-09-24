const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  DISEASE_ACCENT_COLOR,
  generateSvgOverlay,
  compositeThumbnail
} = require('../scripts/auto_column/thumbnail_engine');
const {
  buildImagePrompt,
  buildFallbackImagePrompt
} = require('../scripts/auto_column/ai_generator');

async function run() {
  assert.strictEqual(THUMBNAIL_WIDTH, 1200);
  assert.strictEqual(THUMBNAIL_HEIGHT, 750);
  assert.strictEqual(THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT, 16 / 10, 'Output must match the live column-list aspect ratio');

  const svg = generateSvgOverlay('출근길 복통', '긴장하면 화장실', '과민성대장증후군');
  assert(svg.includes(`fill: ${DISEASE_ACCENT_COLOR}`), 'Disease label must use the fixed bright-yellow accent');
  assert(svg.includes('AI 활용'), 'Thumbnail must include the small AI usage label');
  assert(!svg.includes('성남 과민성대장증후군'), 'Thumbnail disease label must not contain a regional prefix');

  const ibsPrompt = buildImagePrompt('ibs', '과민성대장증후군', 'commute-urgency', '출근길 긴장과 화장실 불안', 'adult');
  assert(ibsPrompt.includes('semi-flat medical editorial illustration'), 'Primary prompt must require medical editorial illustration');
  assert(ibsPrompt.includes('brain-to-intestine neural connection'), 'IBS prompt must include a topic-specific brain-gut motif');
  assert(ibsPrompt.includes('출근길 긴장과 화장실 불안'), 'Prompt must incorporate the current article focus');
  assert(ibsPrompt.includes('no photorealism'), 'Primary prompt must explicitly forbid photorealism');

  const panicPrompt = buildImagePrompt('panic', '공황장애', 'palpitation', '갑자기 숨이 막히고 심장이 뛸 때', 'adult');
  assert(panicPrompt.includes('heartbeat line and breathing rings'), 'Panic prompt must include its own topic-specific motif');
  assert.notStrictEqual(ibsPrompt, panicPrompt, 'Every article topic must produce a distinct illustration prompt');

  const fallbackPrompt = buildFallbackImagePrompt('tic', '틱장애', 'school-stress', '학교 스트레스 때 심해지는 틱', 'child');
  assert(fallbackPrompt.includes('semi-flat medical editorial illustration'), 'Fallback must preserve the illustration visual system');
  assert(fallbackPrompt.includes('no photorealism'), 'Fallback must not revert to photography');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-thumb-test-'));
  const jpgPath = path.join(tempDir, 'sample.jpg');
  try {
    await compositeThumbnail({
      outputPath: jpgPath,
      yellowText: '출근길 복통',
      whiteText: '긴장하면 화장실',
      greenText: '과민성대장증후군'
    });

    const jpgMeta = await sharp(jpgPath).metadata();
    const webpMeta = await sharp(jpgPath.replace(/\.jpg$/i, '.webp')).metadata();
    assert.deepStrictEqual([jpgMeta.width, jpgMeta.height, jpgMeta.format], [1200, 750, 'jpeg']);
    assert.deepStrictEqual([webpMeta.width, webpMeta.height, webpMeta.format], [1200, 750, 'webp']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('✅ Illustrated column thumbnails: unique topic art, fixed typography, AI label, and live 16:10 JPG/WebP ratio verified.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
