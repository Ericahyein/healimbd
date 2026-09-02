const geoHierarchy = require('./geo_hierarchy.json');
const diseaseTaxonomy = require('./disease_taxonomy.json');

const BANNED_MEDICAL_PATTERNS = [
  { pattern: /완치\s*보장/i, reason: '의료법 위반: 완치 보장 표현 금지' },
  { pattern: /반드시\s*(치료|완치|좋아|낫)/i, reason: '치료 단정적 확신 표현 금지' },
  { pattern: /무조건\s*(치료|완치|회복|해결)/i, reason: '무조건적 치료 표현 금지' },
  { pattern: /100%\s*(치료|완치|회복|호전)/i, reason: '100% 효과 과장 금지' },
  { pattern: /부작용(이|\s*)*전혀\s*없/i, reason: '부작용 부존재 단정 금지' },
  { pattern: /(양약|정신과\s*약|신경과\s*약|약물|수면제|항불안제|약).{0,15}(중단|끊)/i, reason: '임의 약물 중단 권고 금지' },
  { pattern: /근본\s*치료/i, reason: '근본 치료 과장 표현 금지' },
  { pattern: /두뇌\s*밸런스(를|\s*)*회복/i, reason: '두뇌 밸런스 회복 단정 표현 금지' },
  { pattern: /기저핵(의|\s*)*흥분(을|\s*)*안정/i, reason: '기저핵 흥분 안정 단정 기전 금지' },
  { pattern: /자율신경(을|이|\s*)*정상화/i, reason: '자율신경 정상화 단정 표현 금지' },
  { pattern: /신경전달물질(을|의|\s*)*조절/i, reason: '신경전달물질 직접 조절 단정 금지' },
  { pattern: /뇌\s*기능(을|의|\s*)*정상화/i, reason: '뇌 기능 정상화 단정 표현 금지' },
  { pattern: /최고의\s*(한의원|치료|명의)/i, reason: '최고 표현 금지' },
  { pattern: /국내\s*유일/i, reason: '유일 표현 금지' }
];

/**
 * Jaro-Winkler string similarity calculation
 */
function jaroWinkler(s1, s2) {
  let m = 0;
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1 === s2) return 1;

  const range = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1;
  const s1Matches = new Array(s1.length);
  const s2Matches = new Array(s2.length);

  for (let i = 0; i < s1.length; i++) {
    const low  = (i >= range) ? i - range : 0;
    const high = (i + range <= s2.length) ? (i + range) : (s2.length - 1);

    for (let j = low; j <= high; j++) {
      if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
        ++m;
        s1Matches[i] = s2Matches[j] = true;
        break;
      }
    }
  }

  if (m === 0) return 0;

  let k = 0;
  let numTrans = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s1Matches[i] === true) {
      let j;
      for (j = k; j < s2.length; j++) {
        if (s2Matches[j] === true) {
          k = j + 1;
          break;
        }
      }
      if (s1[i] !== s2[j]) ++numTrans;
    }
  }

  let weight = (m / s1.length + m / s2.length + (m - numTrans / 2) / m) / 3;
  let l = 0;
  const p = 0.1;
  if (weight > 0.7) {
    while (s1[l] === s2[l] && l < 4) ++l;
    weight += l * p * (1 - weight);
  }
  return weight;
}

/**
 * Comprehensive Validation of Generated Column
 */
function validateArticleContent(articleData, options = {}) {
  const errors = [];
  const warnings = [];

  const {
    title,
    summary,
    category,
    body,
    geoId,
    diseaseId,
    thumbnailCopy,
    history = []
  } = articleData;

  // 1. Basic Field Existence
  if (!title || title.trim().length < 5) errors.push('Title is missing or too short.');
  if (!summary || summary.trim().length < 20) errors.push('Summary description is missing or too short.');
  if (!body || body.trim().length < 300) errors.push('Article body is missing or too short (< 300 chars).');

  // 2. Geo & Disease Validation
  const validGeo = geoHierarchy.regions.find(r => r.id === geoId);
  if (!validGeo) errors.push(`Invalid geoId: ${geoId}`);

  const validDisease = diseaseTaxonomy.diseases.find(d => d.id === diseaseId);
  if (!validDisease) errors.push(`Invalid diseaseId: ${diseaseId}`);

  // 3. Title Format Check
  const titlePattern = /^\[([가-힣\s]+)\s+([가-힣\s]+)\]\s+.+$/;
  if (!titlePattern.test(title)) {
    errors.push(`Title must match format '[지역 질환] 구체적 질문/주제'. Given: ${title}`);
  }

  // 4. Medical Banned Expressions Check
  const fullText = `${title}\n${summary}\n${body}`;
  for (const { pattern, reason } of BANNED_MEDICAL_PATTERNS) {
    if (pattern.test(fullText)) {
      errors.push(`Medical safety violation: ${reason} (Matched: ${pattern})`);
    }
  }

  // 5. Structure Elements Check (Key Summary Box, Headings, FAQ)
  const hasKeySummary = body.includes('column-key-summary-box') || body.includes('핵심 요약');
  if (!hasKeySummary) {
    errors.push('Article must include a Key Summary Box (핵심 요약) in the introduction.');
  }

  const h2Count = (body.match(/^##\s+.+$/gm) || []).length;
  if (h2Count < 4) {
    errors.push(`Article must have at least 4 H2 headings. Found: ${h2Count}`);
  }

  const faqCount = (body.match(/\*\*Q\d*[\.:\s]/g) || body.match(/자주\s*묻는\s*질문/g) || []).length;
  if (faqCount < 2) {
    errors.push('Article must contain FAQ questions and answers.');
  }

  // 6. Regional Keyword Density Check in Body (Max 3 mentions)
  if (validGeo) {
    const regionName = validGeo.displayName;
    const bodyOnly = body.replace(/^##.+$/gm, ''); // remove headings
    const regex = new RegExp(regionName, 'g');
    const matches = (bodyOnly.match(regex) || []).length;
    if (matches > 3) {
      warnings.push(`Regional keyword '${regionName}' appears ${matches} times in body (recommended: 1~3 times).`);
    }
  }

  // 7. Title Similarity against Past History
  for (const past of history) {
    if (past.title) {
      const sim = jaroWinkler(title, past.title);
      if (sim > 0.75) {
        errors.push(`Title is too similar to past article: '${past.title}' (Similarity: ${(sim * 100).toFixed(1)}%)`);
      }
    }
  }

  // 8. Thumbnail Copy Validation
  if (thumbnailCopy) {
    const { yellowText, whiteText, greenText } = thumbnailCopy;
    if (!yellowText || yellowText.length > 15) errors.push('Thumbnail yellowText must be 1~15 characters.');
    if (!whiteText || whiteText.length > 18) errors.push('Thumbnail whiteText must be 1~18 characters.');
    if (!greenText || greenText.length > 12) errors.push('Thumbnail greenText must be 1~12 characters.');

    // No regional names in thumbnail
    for (const r of geoHierarchy.regions) {
      if (
        yellowText.includes(r.displayName) ||
        whiteText.includes(r.displayName) ||
        greenText.includes(r.displayName)
      ) {
        errors.push(`Thumbnail copy must NOT contain regional names like '${r.displayName}'.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  BANNED_MEDICAL_PATTERNS,
  jaroWinkler,
  validateArticleContent
};
