const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const LOGO_DEFAULT_PATH = path.join(__dirname, '../../static/images/healim-logo-white-text.png');

/**
 * Checks if Korean fonts are available in the system
 */
function verifyKoreanFontAvailable() {
  if (process.platform === 'linux') {
    try {
      const output = execSync('fc-list :lang=ko file', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (!output || output.trim().length === 0) {
        console.warn('⚠️ WARNING: No Korean fonts found in fontconfig cache. Text may render as tofu boxes.');
        return false;
      }
      return true;
    } catch (err) {
      return true;
    }
  }
  return true;
}

/**
 * Escapes special XML characters for SVG text
 */
function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Dynamically scales font size to fit width perfectly while maintaining massive visual impact
 */
function getTargetFontSize(text, baseSize, maxTargetWidthPx = 700, minSize = 48) {
  const len = (text || '').trim().length;
  if (len === 0) return baseSize;
  // Korean characters in bold Gothic typically occupy ~0.95 - 1.05 * fontSize in width
  const estimatedWidth = len * (baseSize * 1.02);
  if (estimatedWidth <= maxTargetWidthPx) {
    return baseSize;
  }
  const scaled = Math.floor(maxTargetWidthPx / (len * 1.02));
  return Math.max(scaled, minSize);
}

/**
 * Generates an exact SVG overlay matching the reference design:
 * - Massive 3-line bold Gothic typography
 * - Heavy black stroke outline (12~14px)
 * - Vivid Yellow (#FFE600) / Pure White (#FFFFFF) / Neon Green (#00FF33)
 * - Neon Green Border & Dark Vignette
 */
function generateSvgOverlay(yellowText, whiteText, greenText, width = 800, height = 800) {
  // Target width for text is 700px (approx 88% of 800px width)
  const yellowSize = getTargetFontSize(yellowText, 86, 680, 54);
  const whiteSize = getTargetFontSize(whiteText, 80, 710, 50);
  const greenSize = getTargetFontSize(greenText, 96, 720, 60);

  const yellowStroke = Math.max(10, Math.round(yellowSize * 0.14));
  const whiteStroke = Math.max(10, Math.round(whiteSize * 0.14));
  const greenStroke = Math.max(12, Math.round(greenSize * 0.15));

  const safeYellow = escapeXml(yellowText);
  const safeWhite = escapeXml(whiteText);
  const safeGreen = escapeXml(greenText);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="heavy-text-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
        <style>
          .title-text {
            font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'NanumGothic', 'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            font-weight: 900;
            text-anchor: middle;
            paint-order: stroke fill;
            stroke-linejoin: round;
            stroke-linecap: round;
            letter-spacing: -1px;
          }
          .yellow-line {
            font-size: ${yellowSize}px;
            fill: #FFE600;
            stroke: #000000;
            stroke-width: ${yellowStroke}px;
            filter: url(#heavy-text-shadow);
          }
          .white-line {
            font-size: ${whiteSize}px;
            fill: #FFFFFF;
            stroke: #000000;
            stroke-width: ${whiteStroke}px;
            filter: url(#heavy-text-shadow);
          }
          .green-line {
            font-size: ${greenSize}px;
            fill: #00FF33;
            stroke: #000000;
            stroke-width: ${greenStroke}px;
            filter: url(#heavy-text-shadow);
          }
        </style>
      </defs>

      <!-- 1. Dark Overlay over whole photo -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(15, 23, 42, 0.40)" />

      <!-- 2. Neon Green Outer/Inner Border -->
      <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="#00FF33" stroke-width="4" rx="4" />

      <!-- 3. Line 1: Yellow Hook (Y ~ 305) -->
      <text x="${width / 2}" y="305" class="title-text yellow-line">${safeYellow}</text>

      <!-- 4. Line 2: White Symptom / Condition (Y ~ 445) -->
      <text x="${width / 2}" y="445" class="title-text white-line">${safeWhite}</text>

      <!-- 5. Line 3: Neon Green Disease Name (Y ~ 590) -->
      <text x="${width / 2}" y="590" class="title-text green-line">${safeGreen}</text>
    </svg>
  `;
}

/**
 * Composites single photo background, SVG text overlay, and Healim logo into 800x800 JPEG
 */
async function compositeThumbnail(options = {}) {
  const {
    bgImageBuffer,
    bgImagePath,
    outputPath,
    yellowText,
    whiteText,
    greenText,
    logoPath = LOGO_DEFAULT_PATH,
    width = 800,
    height = 800
  } = options;

  if (!yellowText || !whiteText || !greenText) {
    throw new Error('All 3 text lines (yellowText, whiteText, greenText) are required for thumbnail generation.');
  }

  verifyKoreanFontAvailable();

  // 1. Prepare Base Background
  let baseSharp;
  if (bgImageBuffer) {
    baseSharp = sharp(bgImageBuffer).resize(width, height, { fit: 'cover' });
  } else if (bgImagePath && fs.existsSync(bgImagePath)) {
    baseSharp = sharp(bgImagePath).resize(width, height, { fit: 'cover' });
  } else {
    baseSharp = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 20, g: 30, b: 45, alpha: 1 }
      }
    });
  }

  // 2. Prepare SVG Overlay Buffer
  const svgString = generateSvgOverlay(yellowText, whiteText, greenText, width, height);
  const svgBuffer = Buffer.from(svgString);

  // 3. Composite Layers
  const compositeLayers = [
    { input: svgBuffer, top: 0, left: 0 }
  ];

  // 4. Attach Healim Logo at bottom right if exists
  const effectiveLogoPath = fs.existsSync(logoPath) ? logoPath : LOGO_DEFAULT_PATH;
  if (fs.existsSync(effectiveLogoPath)) {
    const logoWidth = 190;
    const resizedLogoBuffer = await sharp(effectiveLogoPath)
      .resize(logoWidth)
      .toBuffer();

    const logoMeta = await sharp(resizedLogoBuffer).metadata();
    const logoHeight = logoMeta.height || 48;

    compositeLayers.push({
      input: resizedLogoBuffer,
      top: height - logoHeight - 25,
      left: width - logoWidth - 25
    });
  }

  const finalPipeline = baseSharp.composite(compositeLayers).jpeg({ quality: 92, progressive: true });

  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    await finalPipeline.toFile(outputPath);
  }

  return await finalPipeline.toBuffer();
}

module.exports = {
  verifyKoreanFontAvailable,
  generateSvgOverlay,
  compositeThumbnail
};
