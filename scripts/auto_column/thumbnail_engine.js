const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const LOGO_DEFAULT_PATH = path.join(__dirname, '../../static/images/healim-logo-white-text.png');
// Matches the live doctor-column list (600x375 featured, 400x250 archive) at 2x density.
const THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 750;
const DISEASE_ACCENT_COLOR = '#FFE600';

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
 * Dynamically scales font size to fit width (85~92% of canvas) while maintaining massive visual dominance
 */
function getTargetFontSize(text, baseSize, maxTargetWidthPx = 730, minSize = 56) {
  const len = (text || '').trim().length;
  if (len === 0) return baseSize;
  const estimatedWidth = len * (baseSize * 1.04);
  if (estimatedWidth <= maxTargetWidthPx) {
    return baseSize;
  }
  const scaled = Math.floor(maxTargetWidthPx / (len * 1.04));
  return Math.max(scaled, minSize);
}

/**
 * Generates an SVG overlay with left-aligned editorial typography, top-left category badge, and left-to-right scrim
 */
function generateSvgOverlay(yellowText, whiteText, greenText, width = THUMBNAIL_WIDTH, height = THUMBNAIL_HEIGHT, options = {}) {
  const categoryName = options.categoryName || '의학 칼럼';
  const safeCategory = escapeXml(categoryName);
  const safeLine1 = escapeXml(yellowText);
  const safeLine2 = escapeXml(whiteText);
  const safeLine3 = escapeXml(greenText);

  // Badge sizing
  const badgeTextLen = safeCategory.length;
  const badgeWidth = Math.max(96, Math.round(badgeTextLen * 19 + 34));
  const badgeHeight = 36;

  // Font size calculation for the left 50~55% safe area of the 16:10 card.
  const maxTextWidth = Math.round(width * 0.48);
  const line1Size = getTargetFontSize(yellowText, 58, maxTextWidth, 38);
  const line2Size = getTargetFontSize(whiteText, 62, maxTextWidth, 40);
  const line3Size = getTargetFontSize(greenText, 76, maxTextWidth, 50);

  const stroke1 = Math.max(10, Math.min(14, Math.round(line1Size * 0.22)));
  const stroke2 = Math.max(10, Math.min(14, Math.round(line2Size * 0.22)));
  const stroke3 = Math.max(12, Math.min(16, Math.round(line3Size * 0.22)));

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Heavy clean text shadow for maximum legibility on any photo -->
        <filter id="editorial-text-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.92"/>
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.78"/>
        </filter>
        <filter id="badge-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
        </filter>

        <!-- Left Scrim Gradient: Dark on left 0~55%, smoothly transparent on right 80~100% -->
        <linearGradient id="left-scrim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#020617" stop-opacity="0.88"/>
          <stop offset="42%" stop-color="#090E1A" stop-opacity="0.75"/>
          <stop offset="68%" stop-color="#0F172A" stop-opacity="0.36"/>
          <stop offset="88%" stop-color="#0F172A" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#0F172A" stop-opacity="0.0"/>
        </linearGradient>

        <style>
          .thumb-text {
            font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'Pretendard', 'NanumGothic', 'Apple SD Gothic Neo', sans-serif;
            font-weight: 900;
            text-anchor: start;
            paint-order: stroke fill;
            stroke-linejoin: round;
            stroke-linecap: round;
            letter-spacing: -1.2px;
          }
          .line-hook {
            font-size: ${line1Size}px;
            fill: #FFFFFF;
            stroke: #050B14;
            stroke-width: ${stroke1}px;
            filter: url(#editorial-text-shadow);
          }
          .line-symptom {
            font-size: ${line2Size}px;
            fill: #FFFFFF;
            stroke: #050B14;
            stroke-width: ${stroke2}px;
            filter: url(#editorial-text-shadow);
          }
          .line-accent {
            font-size: ${line3Size}px;
            fill: ${DISEASE_ACCENT_COLOR};
            stroke: #050B14;
            stroke-width: ${stroke3}px;
            filter: url(#editorial-text-shadow);
          }
          .badge-label {
            font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'Pretendard', sans-serif;
            font-size: 19px;
            font-weight: 700;
            fill: #38BDF8;
            letter-spacing: -0.3px;
          }
          .ai-label {
            font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'Pretendard', sans-serif;
            font-size: 15px;
            font-weight: 600;
            fill: #FFFFFF;
            fill-opacity: 0.72;
            letter-spacing: -0.2px;
          }
        </style>
      </defs>

      <!-- 1. Left-to-Right Dark Scrim for High-Contrast Typography on Left (~8-10% margin, ~55-65% width) -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#left-scrim)" />

      <!-- 2. [Top Left] Category Badge Label (Safe Area ~64px margin, rx=6) -->
      <g transform="translate(72, 58)" filter="url(#badge-shadow)">
        <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="6" ry="6" fill="#0F172A" fill-opacity="0.9" stroke="#38BDF8" stroke-width="1.8" />
        <text x="${badgeWidth / 2}" y="24" text-anchor="middle" class="badge-label">${safeCategory}</text>
      </g>

      <!-- 3. [Left Center] Main Headline (Left Aligned, 2~3 Lines) -->
      <!-- Line 1: Hook (Y ~ 275) -->
      <text x="72" y="255" class="thumb-text line-hook">${safeLine1}</text>

      <!-- Line 2: Symptom / Question (Y ~ 365) -->
      <text x="72" y="350" class="thumb-text line-symptom">${safeLine2}</text>

      <!-- Line 3: Accent Highlight Disease Name (Y ~ 475) -->
      <text x="72" y="455" class="thumb-text line-accent">${safeLine3}</text>

      <!-- 4. [Bottom Right] Small AI transparency label -->
      <text x="${width - 28}" y="${height - 24}" text-anchor="end" class="ai-label">AI 활용</text>
    </svg>
  `;
}

/**
 * Composites an illustration background, fixed SVG text overlay, and Healim logo into 16:10 outputs.
 */
async function compositeThumbnail(options = {}) {
  const {
    bgImageBuffer,
    bgImagePath,
    outputPath,
    yellowText,
    whiteText,
    greenText,
    categoryName,
    category,
    logoPath = LOGO_DEFAULT_PATH,
    width = THUMBNAIL_WIDTH,
    height = THUMBNAIL_HEIGHT
  } = options;

  if (!yellowText || !whiteText || !greenText) {
    throw new Error('All 3 text lines (yellowText, whiteText, greenText) are required for thumbnail generation.');
  }

  verifyKoreanFontAvailable();

  // 1. Prepare Base Background (Fitted cover)
  let baseSharp;
  if (bgImageBuffer) {
    baseSharp = sharp(bgImageBuffer).resize(width, height, { fit: 'cover', position: 'right' });
  } else if (bgImagePath && fs.existsSync(bgImagePath)) {
    baseSharp = sharp(bgImagePath).resize(width, height, { fit: 'cover', position: 'right' });
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

  // 2. Prepare SVG Overlay Buffer with Left-aligned Typography & Category Badge
  const svgString = generateSvgOverlay(yellowText, whiteText, greenText, width, height, { categoryName, category });
  const svgBuffer = Buffer.from(svgString);

  // 3. Composite Layers
  const compositeLayers = [
    { input: svgBuffer, top: 0, left: 0 }
  ];

  // 4. Attach Healim Logo at bottom left (aligned with x=64, y=height - logoHeight - 54)
  const effectiveLogoPath = fs.existsSync(logoPath) ? logoPath : LOGO_DEFAULT_PATH;
  if (fs.existsSync(effectiveLogoPath)) {
    const logoWidth = 180;
    const resizedLogoBuffer = await sharp(effectiveLogoPath)
      .resize(logoWidth)
      .toBuffer();

    const logoMeta = await sharp(resizedLogoBuffer).metadata();
    const logoHeight = logoMeta.height || 46;

    compositeLayers.push({
      input: resizedLogoBuffer,
      top: height - logoHeight - 54,
      left: 72
    });
  }

  const compositedSharp = baseSharp.composite(compositeLayers);
  const jpegBuffer = await compositedSharp.clone().jpeg({ quality: 92, progressive: true }).toBuffer();
  const webpBuffer = await compositedSharp.clone().webp({ quality: 90 }).toBuffer();

  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    await fs.promises.writeFile(outputPath, jpegBuffer);
    const webpPath = outputPath.replace(/\.jpe?g$/i, '.webp');
    await fs.promises.writeFile(webpPath, webpBuffer);
  }

  return jpegBuffer;
}

module.exports = {
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  DISEASE_ACCENT_COLOR,
  verifyKoreanFontAvailable,
  generateSvgOverlay,
  compositeThumbnail
};
