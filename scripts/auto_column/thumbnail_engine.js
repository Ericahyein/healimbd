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
      // fontconfig tool might not be installed in all test environments
      return true;
    }
  }
  return true;
}

/**
 * Escapes special XML characters for SVG text
 */
function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Dynamically scales font size based on text character count to prevent clipping
 */
function getScaledFontSize(text, defaultSize, maxSafeChars, minSize = 28) {
  const len = (text || '').trim().length;
  if (len <= maxSafeChars) return defaultSize;
  const scaled = Math.floor(defaultSize * (maxSafeChars / len));
  return Math.max(scaled, minSize);
}

/**
 * Generates an SVG overlay containing the 3-line outlined text, neon border, and backdrop
 */
function generateSvgOverlay(yellowText, whiteText, greenText, width = 800, height = 800) {
  const safeYellow = escapeXml(yellowText);
  const safeWhite = escapeXml(whiteText);
  const safeGreen = escapeXml(greenText);

  // Dynamic font sizing
  const yellowSize = getScaledFontSize(yellowText, 44, 8, 30);
  const whiteSize = getScaledFontSize(whiteText, 48, 10, 32);
  const greenSize = getScaledFontSize(greenText, 54, 8, 36);

  const yellowStroke = Math.max(6, Math.floor(yellowSize * 0.16));
  const whiteStroke = Math.max(7, Math.floor(whiteSize * 0.17));
  const greenStroke = Math.max(8, Math.floor(greenSize * 0.18));

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
        <style>
          .title-text {
            font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'NanumGothic', 'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            font-weight: 800;
            text-anchor: middle;
            paint-order: stroke fill;
            stroke-linejoin: round;
          }
          .yellow-line {
            font-size: ${yellowSize}px;
            fill: #FFEA00;
            stroke: #000000;
            stroke-width: ${yellowStroke}px;
            filter: url(#text-shadow);
          }
          .white-line {
            font-size: ${whiteSize}px;
            fill: #FFFFFF;
            stroke: #000000;
            stroke-width: ${whiteStroke}px;
            filter: url(#text-shadow);
          }
          .green-line {
            font-size: ${greenSize}px;
            fill: #00FF66;
            stroke: #000000;
            stroke-width: ${greenStroke}px;
            filter: url(#text-shadow);
          }
        </style>
      </defs>

      <!-- 1. Dark Vignette Overlay -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(15, 23, 42, 0.45)" />

      <!-- 2. Inner Neon Green Border -->
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#00E676" stroke-width="4" rx="8" />

      <!-- 3. Line 1: Yellow (#FFEA00) -->
      <text x="${width / 2}" y="270" class="title-text yellow-line">${safeYellow}</text>

      <!-- 4. Line 2: White (#FFFFFF) -->
      <text x="${width / 2}" y="385" class="title-text white-line">${safeWhite}</text>

      <!-- 5. Line 3: Neon Green (#00FF66) -->
      <text x="${width / 2}" y="500" class="title-text green-line">${safeGreen}</text>
    </svg>
  `;
}

/**
 * Composites background image, SVG text overlay, and Healim logo into 800x800 JPEG
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
    // Fallback solid gradient canvas if no image provided
    baseSharp = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
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

  // 4. Attach Healim Logo if exists
  const effectiveLogoPath = fs.existsSync(logoPath) ? logoPath : LOGO_DEFAULT_PATH;
  if (fs.existsSync(effectiveLogoPath)) {
    const logoWidth = 180;
    const resizedLogoBuffer = await sharp(effectiveLogoPath)
      .resize(logoWidth)
      .toBuffer();

    const logoMeta = await sharp(resizedLogoBuffer).metadata();
    const logoHeight = logoMeta.height || 45;

    compositeLayers.push({
      input: resizedLogoBuffer,
      top: height - logoHeight - 35,
      left: width - logoWidth - 35
    });
  }

  const finalPipeline = baseSharp.composite(compositeLayers).jpeg({ quality: 90, progressive: true });

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
