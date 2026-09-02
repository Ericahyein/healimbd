const geoHierarchy = require('./geo_hierarchy.json');
const diseaseTaxonomy = require('./disease_taxonomy.json');
const { isInternalUrlValid } = require('./internal_linker');

const GLOBAL_BANNED_MEDICAL_PATTERNS = [
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
  { pattern: /국내\s*유일/i, reason: '유일 표현 금지' },
  { pattern: /(유명한\s*한의원|추천\s*한의원|치료\s*잘하는\s*곳)/i, reason: '광고성 수식어 금지' },
  // Arbitrary rigid time limits or direct single-cause assertion patterns
  { pattern: /취침\s*전\s*(1~2|1|2|3)시간만\s*제한/i, reason: '일률적 시간 수치 강제 표현 금지' },
  { pattern: /스마트폰(이|은|을)\s*(틱|ADHD)의\s*(직접적\s*)?(원인|유발)/i, reason: '미디어와 질환의 직접 인과관계 단정 금지' },
  { pattern: /도파민(이|\s*)*폭발/i, reason: '도파민 기전 비과학적 과장 표현 금지' },
  { pattern: /도파민\s*(과다|분비|수치).{0,10}(틱|ADHD)\s*(발생|유발|원인)/i, reason: '도파민 단일 원인 단정 금지' }
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
 * Extracts markdown links from text, supporting balanced brackets
 */
function extractInternalLinks(text) {
  const linkRegex = /\[([^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*)\]\(([^)\s]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const linkText = match[1].trim();
    const url = match[2].trim();
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      links.push({ text: linkText, url });
    }
  }
  return links;
}

/**
 * 3-Tier Comprehensive Validation of Generated Column
 * Tier 1: Global Policy (Structure, Length, Headings, Banned Phrases, Internal Links)
 * Tier 2: GEO Consistency Policy (No unrelated active GEO or station keywords)
 * Tier 3: Disease-Specific Policy (medical_knowledge constraints)
 */
function validateArticleContent(articleData, options = {}) {
  const errors = [];
  const warnings = [];

  const {
    title = '',
    summary = '',
    category = '',
    body = '',
    hashtags = [],
    keywords = [],
    geoId = '',
    diseaseId = '',
    thumbnailCopy,
    knowledge,
    history = [],
    blogDir
  } = articleData;

  // ==========================================
  // TIER 1: GLOBAL CONTENT VALIDATION
  // ==========================================

  // 1. Basic Field Existence & Length
  if (!title || title.trim().length < 5) errors.push('Title is missing or too short (< 5 chars).');
  if (!summary || summary.trim().length < 20) errors.push('Summary description is missing or too short (< 20 chars).');
  if (!body || body.trim().length < 300) errors.push('Article body is missing or too short (< 300 chars).');

  // 2. Geo & Disease Validity Check
  const validGeo = geoHierarchy.regions.find(r => r.id === geoId);
  if (!validGeo) errors.push(`Invalid geoId: ${geoId}`);

  const validDisease = diseaseTaxonomy.diseases.find(d => d.id === diseaseId);
  if (!validDisease) errors.push(`Invalid diseaseId: ${diseaseId}`);

  // 3. Title Format Check '[지역 질환] 구체적 질문/주제'
  const titlePattern = /^\[([가-힣\s]+)\s+([가-힣\s]+)\]\s+.+$/;
  if (!titlePattern.test(title)) {
    errors.push(`Title must match format '[지역 질환] 구체적 질문/주제'. Given: ${title}`);
  }

  // 4. Global Banned Medical Patterns
  const fullText = `${title}\n${summary}\n${body}\n${hashtags.join(' ')}\n${keywords.join(' ')}`;
  for (const { pattern, reason } of GLOBAL_BANNED_MEDICAL_PATTERNS) {
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

  // 6. Internal Links Verification (Must have 2~4 real verified links)
  const links = extractInternalLinks(body);
  const validatedLinks = [];

  for (const l of links) {
    const isValid = isInternalUrlValid(l.url, blogDir);
    validatedLinks.push({ ...l, exists: isValid });
    if (!isValid) {
      errors.push(`Internal Link validation failed: URL '${l.url}' does not exist in repository.`);
    }
  }

  if (links.length < 2) {
    errors.push(`Article must contain at least 2 real internal links. Found: ${links.length}`);
  } else if (links.length > 5) {
    warnings.push(`Article contains ${links.length} internal links (recommended: 2~4).`);
  }

  // 7. Thumbnail Copy Validation
  if (thumbnailCopy) {
    const { yellowText, whiteText, greenText } = thumbnailCopy;
    if (!yellowText || yellowText.trim().length < 1 || yellowText.length > 15) {
      errors.push('Thumbnail yellowText must be 1~15 characters.');
    }
    if (!whiteText || whiteText.trim().length < 1 || whiteText.length > 18) {
      errors.push('Thumbnail whiteText must be 1~18 characters.');
    }
    if (!greenText || greenText.trim().length < 1 || greenText.length > 12) {
      errors.push('Thumbnail greenText must be 1~12 characters.');
    }

    // Check for glued unspaced common patterns (e.g. "나도모르게", "눈깜빡임·헛기침" without space)
    if (yellowText === '나도모르게') {
      errors.push('Thumbnail yellowText must have natural Korean spacing: "나도 모르게".');
    }
    if (whiteText === '눈깜빡임·헛기침') {
      errors.push('Thumbnail whiteText must have natural Korean spacing: "눈 깜빡임·헛기침".');
    }

    // No regional names in thumbnail
    for (const r of geoHierarchy.regions) {
      if (
        (yellowText && yellowText.includes(r.displayName)) ||
        (whiteText && whiteText.includes(r.displayName)) ||
        (greenText && greenText.includes(r.displayName))
      ) {
        errors.push(`Thumbnail copy must NOT contain regional names like '${r.displayName}'.`);
      }
    }
  }

  // 8. Title Similarity against Past History
  for (const past of history) {
    if (past.title) {
      const sim = jaroWinkler(title, past.title);
      if (sim > 0.75) {
        errors.push(`Title is too similar to past article: '${past.title}' (Similarity: ${(sim * 100).toFixed(1)}%)`);
      }
    }
  }

  // 9. Disease Image Prompt Context Validation (if imagePrompt provided)
  if (diseaseId === 'tic' && options.imagePrompt) {
    const promptLower = options.imagePrompt.toLowerCase();
    if (!promptLower.includes('child') && !promptLower.includes('adolescent')) {
      errors.push('Tic disorder thumbnail prompt must feature a child or adolescent.');
    }
    if (promptLower.includes('woman clutching') || promptLower.includes('chest or stomach')) {
      errors.push('Tic disorder thumbnail prompt must not feature adult woman clutching chest or stomach.');
    }
  }

  // ==========================================
  // TIER 2: GEO CONSISTENCY VALIDATION
  // ==========================================
  if (validGeo) {
    const allowedRegions = [validGeo.displayName, validGeo.fullName, ...validGeo.aliases];
    const otherActiveRegions = geoHierarchy.regions
      .filter(r => r.id !== validGeo.id)
      .flatMap(r => [r.displayName, ...r.aliases]);

    // Disallowed station/subway/unrelated keywords that must not be in tags/keywords/title
    const specificForbiddenKeywords = ['정자역', '미금역', '오리역', '야탑역', '서현역', '수내역', '판교역', '수지구청역'];

    // Check hashtags and keywords strictly
    const checkList = [...hashtags, ...keywords, title, summary];
    for (const item of checkList) {
      for (const other of otherActiveRegions) {
        if (item.includes(other) && !allowedRegions.includes(other)) {
          errors.push(`Geo consistency violation: Targeted for '${validGeo.displayName}', but found unrelated region keyword '${other}' in '${item}'.`);
        }
      }
      for (const forbidden of specificForbiddenKeywords) {
        if (item.includes(forbidden) && !allowedRegions.includes(forbidden)) {
          errors.push(`Geo consistency violation: Found unrelated local station keyword '${forbidden}' in '${item}'.`);
        }
      }
    }

    // Check body regional density (Max 3 mentions of current geo)
    const bodyOnly = body.replace(/^##.+$/gm, '');
    const regex = new RegExp(validGeo.displayName, 'g');
    const matches = (bodyOnly.match(regex) || []).length;
    if (matches > 3) {
      warnings.push(`Regional keyword '${validGeo.displayName}' appears ${matches} times in body (recommended: 1~3 times).`);
    }
  }

  // ==========================================
  // TIER 3: DISEASE-SPECIFIC VALIDATION
  // ==========================================
  if (knowledge && Array.isArray(knowledge.bannedPhrases)) {
    for (const phrase of knowledge.bannedPhrases) {
      if (fullText.includes(phrase)) {
        errors.push(`Disease-specific safety violation (${diseaseId}): Contains banned phrase '${phrase}'.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    internalLinks: validatedLinks
  };
}

module.exports = {
  GLOBAL_BANNED_MEDICAL_PATTERNS,
  jaroWinkler,
  extractInternalLinks,
  validateArticleContent
};
