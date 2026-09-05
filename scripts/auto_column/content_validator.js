const geoHierarchy = require('./geo_hierarchy.json');
const diseaseTaxonomy = require('./disease_taxonomy.json');
const { isInternalUrlValid } = require('./internal_linker');

let qaTargets = [];
try {
  qaTargets = require('./qa_targets.json').targets || [];
} catch (e) {
  qaTargets = [];
}

const CANONICAL_GEO_NAMES = new Set(geoHierarchy.regions.map(r => r.displayName));

/**
 * Returns allowed canonical disease labels for title verification
 */
function getAllowedDiseaseNames(diseaseId, extraLabel) {
  const allowed = new Set();

  // 1. From diseaseTaxonomy
  const disease = diseaseTaxonomy.diseases.find(d => d.id === diseaseId);
  if (disease) {
    if (disease.name) allowed.add(disease.name.trim());
    if (disease.categoryName) allowed.add(disease.categoryName.trim());

    // Compound names like "두통·어지럼" or "우울·강박"
    if (disease.name.includes('·')) {
      disease.name.split('·').forEach(part => {
        const p = part.trim();
        if (p) allowed.add(p);
      });
    }

    // Specific clinically approved disease variations
    if (disease.id === 'adhd') {
      allowed.add('ADHD');
      allowed.add('소아 ADHD');
      allowed.add('성인 ADHD');
    } else if (disease.id === 'tic') {
      allowed.add('틱장애');
      allowed.add('소아 틱장애');
      allowed.add('뚜렛증후군');
      allowed.add('뚜렛');
    } else if (disease.id === 'sleep') {
      allowed.add('불면증');
      allowed.add('만성 불면증');
    } else if (disease.id === 'anxiety') {
      allowed.add('불안장애');
      allowed.add('사회공포증');
      allowed.add('발표불안');
    } else if (disease.id === 'autonomic') {
      allowed.add('자율신경실조증');
      allowed.add('만성피로');
      allowed.add('만성피로·번아웃');
      allowed.add('번아웃');
    } else if (disease.id === 'headache') {
      allowed.add('두통');
      allowed.add('만성 두통');
      allowed.add('어지럼증');
      allowed.add('어지럼');
    } else if (disease.id === 'depression') {
      allowed.add('우울증');
      allowed.add('강박증');
      allowed.add('강박증/OCD');
      allowed.add('OCD');
    } else if (disease.id === 'child') {
      allowed.add('소아 분리불안');
      allowed.add('소아 야경증');
      allowed.add('소아 야뇨증');
      allowed.add('분리불안');
      allowed.add('야경증');
      allowed.add('야뇨증');
    } else if (disease.id === 'syncope') {
      allowed.add('미주신경성 실신');
      allowed.add('실신');
    }
  }

  // 2. From qa_targets.json
  qaTargets.forEach(t => {
    if (t.diseaseId === diseaseId) {
      if (t.titleDisease) allowed.add(t.titleDisease.trim());
      if (t.canonicalDiseaseLabel) allowed.add(t.canonicalDiseaseLabel.trim());
      if (t.displayDisease) {
        allowed.add(t.displayDisease.trim());
        const stripped = t.displayDisease.replace(/\s*\([^)]*\)/g, '').trim();
        if (stripped) allowed.add(stripped);
      }
    }
  });

  // 3. Extra label passed from caller (e.g. titleDisease)
  if (extraLabel && typeof extraLabel === 'string') {
    allowed.add(extraLabel.trim());
  }

  return allowed;
}

function getAllAllowedDiseaseNames() {
  const all = new Set();
  diseaseTaxonomy.diseases.forEach(d => {
    getAllowedDiseaseNames(d.id).forEach(name => all.add(name));
  });
  return all;
}

/**
 * Resolves hierarchical GEO compatibility rules for a given region.
 * Allows target geo's own names and its authentic administrative ancestors (상위 행정구역),
 * while strictly blocking sibling local areas, sibling districts, and foreign regions.
 */
function getGeoHierarchyRules(validGeo) {
  // 1. Self tokens and aliases (always allowed)
  const selfKeywords = new Set([
    validGeo.displayName,
    validGeo.fullName,
    ...validGeo.aliases
  ]);

  // Special handling for special_area like seongnam-wirye:
  // "단 seongnam-wirye 같은 special_area는 특정 단일 행정구역에 임의 귀속시키지 않는 기존 특수 규칙 유지."
  const isSpecialArea = validGeo.regionType === 'special_area';

  // 2. Extract ancestor keywords from validGeo's own hierarchy
  const ancestorKeywords = new Set();
  if (!isSpecialArea) {
    if (validGeo.parentRegion && validGeo.parentRegion !== validGeo.displayName) {
      ancestorKeywords.add(validGeo.parentRegion);
      ancestorKeywords.add(`${validGeo.parentRegion}시`);
    }

    const fullNameParts = (validGeo.fullName || '').split(/\s+/).filter(Boolean);
    for (const part of fullNameParts) {
      ancestorKeywords.add(part);
      const base = part.replace(/[시구]$/, '');
      if (base && base.length >= 2) {
        ancestorKeywords.add(base);
      }
    }

    // Build progressive compound phrases from fullName parts (e.g. '성남시 분당구', '분당구 판교', '성남시 분당구 판교')
    for (let i = 0; i < fullNameParts.length; i++) {
      for (let j = i + 1; j <= fullNameParts.length; j++) {
        const slice = fullNameParts.slice(i, j).join(' ');
        if (slice) ancestorKeywords.add(slice);
      }
    }

    // Also support parent + displayName (e.g. "성남 판교", "용인 수지")
    if (validGeo.parentRegion && validGeo.displayName) {
      ancestorKeywords.add(`${validGeo.parentRegion} ${validGeo.displayName}`);
    }
  }

  // Combined allowed list for this geo
  const allowedKeywords = new Set([...selfKeywords, ...ancestorKeywords]);

  // 3. Build forbidden keywords from other regions in geoHierarchy
  const forbiddenKeywords = new Set();

  for (const otherRegion of geoHierarchy.regions) {
    if (otherRegion.id === validGeo.id) continue;

    const otherTerms = [
      otherRegion.displayName,
      otherRegion.fullName,
      ...otherRegion.aliases
    ];

    for (const term of otherTerms) {
      if (!term || typeof term !== 'string') continue;
      const cleanTerm = term.trim();
      if (cleanTerm.length < 2) continue;

      // If this term is an authentic ancestor/self term of validGeo, it is NOT forbidden
      if (allowedKeywords.has(cleanTerm)) {
        continue;
      }

      // If term appears inside validGeo.fullName (e.g. '분당' or '분당구' inside '성남시 분당구 판교'),
      // it is an authentic administrative component of validGeo, so NOT forbidden
      if (validGeo.fullName && validGeo.fullName.includes(cleanTerm)) {
        continue;
      }

      // Check base name without '시' or '구'
      const baseClean = cleanTerm.replace(/[시구]$/, '');
      if (baseClean.length >= 2 && validGeo.fullName && validGeo.fullName.includes(baseClean)) {
        continue;
      }

      // Otherwise it is a sibling local area, sibling district, or foreign region keyword!
      forbiddenKeywords.add(cleanTerm);
    }
  }

  // Specific subway station keywords: filter out stations that belong to validGeo's own area
  const specificForbiddenStations = ['정자역', '미금역', '오리역', '야탑역', '서현역', '수내역', '판교역', '수지구청역']
    .filter(st => {
      const stationBase = st.replace(/역$/, '').replace(/구청$/, '');
      return !allowedKeywords.has(st) && !allowedKeywords.has(stationBase);
    });

  return {
    selfKeywords,
    ancestorKeywords,
    allowedKeywords,
    forbiddenKeywords,
    specificForbiddenStations
  };
}



const GLOBAL_BANNED_MEDICAL_PATTERNS = [
  { pattern: /완치\s*보장/i, reason: '의료법 위반: 완치 보장 표현 금지' },
  { pattern: /반드시\s*(치료|완치|좋아|낫)/i, reason: '치료 단정적 확신 표현 금지' },
  { pattern: /무조건\s*(치료|완치|회복|해결)/i, reason: '무조건적 치료 표현 금지' },
  { pattern: /100%\s*(치료|완치|회복|호전)/i, reason: '100% 효과 과장 금지' },
  { pattern: /부작용(이|\s*)*전혀\s*없/i, reason: '부작용 부존재 단정 금지' },
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
  { pattern: /(미디어|스마트폰|게임).{0,12}(줄이면|제한하면).{0,12}(좋아집|완치|호전|안정됩니다|개선\s*효과가\s*더\s*큽)/i, reason: '미디어 조절에 따른 결과 단정적 보장 금지' },
  { pattern: /(일주일|1주일|2주일|3일|5일|한\s*달|2개월|3개월|하루\s*\d+회|\d+분\s*동안)\s*(동안|정도|간)?\s*(기록|관찰|실천|제한|복용)/i, reason: '임의의 기간/횟수 수치 임의 생성 금지 (일정 기간/꾸준히 등으로 작성)' },
  { pattern: /신경(생물|발달)학적.{0,10}체질적\s*특성/i, reason: '신경생물학적 원인과 한의학 체질 특성 층위 혼용 금지' },
  // Unapproved treatment names & fabricated acupoint locations
  { pattern: /(안심\s*한약|두뇌\s*(회복|밸런스)\s*탕|총명\s*탕|귀비\s*탕|소요\s*산)/i, reason: '치료법 임의 생성 금지: 승인되지 않은 고유 한약 처방 명칭 사용' },
  { pattern: /(두경부\s*(중심의|\s*)*혈자리|특정\s*혈자리\s*(자극|침구|치료))/i, reason: '치료법 임의 생성 금지: 근거 없는 구체적 경혈/신체 부위 시술 위치 임의 서술' },
  // Unapproved TCM pathology / organ-heat concepts
  { pattern: /(심포\s*열|심포열|간화|심화|간양상항|신음허|담음|수승화강)/i, reason: '치료법 임의 생성 금지: 승인되지 않은 구체적 한의학 병리명/장부열 개념 사용' },
  // Unapproved new treatment names
  { pattern: /(인지\s*이완\s*훈련|인지\s*행동\s*훈련|두뇌\s*이완\s*훈련|두뇌\s*훈련|뉴로\s*피드백|바이오\s*피드백)/i, reason: '치료법 임의 생성 금지: 승인되지 않은 새 치료명 사용' },
  // Fabricated mechanism/efficacy assertion modifiers attached to treatments
  { pattern: /(뇌의\s*과각성을\s*(진정|완화|가라앉|조절)|수면의\s*흐름을\s*돕는|심포열을\s*다스리는)\s*(맞춤\s*)?(한약|처방|침구|치료)/i, reason: '치료법 임의 생성 금지: 치료 효과 단정 및 임의 기전 수식어 사용' },
  // Promotional closing CTA patterns
  { pattern: /([가-힣]+(시|구|동|역|지역|에서)?\s*)?(진료(를)?\s*(권합니다|권해드립니다|추천합니다)|내원(을)?\s*(권합니다|권해드립니다|추천합니다|바랍니다)|방문(을)?\s*(권합니다|권해드립니다)|내원하셔서\s*진료|방문하셔서\s*상담)/i, reason: '마무리 광고성 CTA 금지: 지역 키워드 및 직접적인 내원/진료 권유 문장' }
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
 * Smart Medication Discontinuation Validator
 * Blocks: "약을 끊으세요", "수면제를 중단하세요", "증상이 좋아지면 약물을 끊어도 됩니다" 등 중단 권고
 * Allows: "약물을 임의로 중단하지 마십시오", "의료진과 상의 없이 약을 끊으면 안 됩니다" 등 안전 주의 권고
 */
function checkMedicationDiscontinuation(text) {
  // 1. Explicit Declarative Discontinuation Permission/Recommendation Patterns (ALWAYS VIOLATION)
  // Blocks: '끊어도 됩니다', '끊으셔도 괜찮습니다', '약을 끊으세요', '중단하십시오', '단약하세요' etc.
  const explicitDeclarativeStopPattern = /(끊어도\s*(됩니다|돼요|좋습니다|좋아요|괜찮습니다|괜찮아요)|끊으셔도\s*(됩니다|좋습니다|괜찮습니다)|끊기를\s*(권장|추천|권합니다)|끊는\s*것을\s*(권장|추천|권합니다)|끊으세요|끊으십시오|중단해도\s*(됩니다|돼요|좋습니다|좋아요|괜찮습니다|괜찮아요)|중단하셔도\s*(됩니다|좋습니다|괜찮습니다)|중단하기를\s*(권장|추천|권합니다)|중단하는\s*(것을|걸)\s*(권장|추천|권합니다)|중단하세요|중단하십시오|단약해도\s*(됩니다|좋습니다|괜찮습니다)|단약하셔도\s*(됩니다|좋습니다|괜찮습니다)|단약하세요|단약하십시오|단약을\s*(권장|추천|권합니다))/i;

  // Split lines and sentences
  const lines = text.split(/\r?\n+/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split line into sentences
    const sentences = line.split(/(?<=[.!?])\s+/);
    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim();
      if (!sentence) continue;

      // Check 1: Explicit declarative stop permission (instant violation regardless of context)
      if (explicitDeclarativeStopPattern.test(sentence)) {
        return {
          violated: true,
          sentence: sentence.slice(0, 80),
          reason: '명시적 약물 중단/단약 허용 및 권고 표현'
        };
      }

      const medPattern = /(약물|양약|정신과\s*약|신경과\s*약|정신건강의학과\s*약|수면제|항불안제|진통제|항우울제|처방약|복용\s*중인\s*약|신경안정제|진정제|양방\s*약|(\s|^)약(을|은|이|도|에|\s))/i;
      const stopPattern = /(중단|끊|단약|줄이|감량)/i;

      if (medPattern.test(sentence) && stopPattern.test(sentence)) {
        // Question / Interrogative context (FAQ questions, inquiries, patient concerns) -> ALLOW
        const isQuestion = (
          /\?/.test(sentence) ||
          /(되나요|될까요|괜찮나요|가능한가요|어떨까요|맞나요)/i.test(sentence) ||
          /(해도\s*되나요|해도\s*될까요|줄여도\s*되나요|줄여도\s*될까요|끊어도\s*되나요|중단해도\s*되나요|끊어도\s*될까요|중단해도\s*될까요)/i.test(sentence) ||
          /(중단해도|끊어도|줄여도|단약해도|조절해도)\s*(되는지|될지|괜찮은지|가능한지)/i.test(sentence) ||
          /(중단|끊|줄이|단약).{0,15}(되는지\s*(궁금|문의|질문|알고\s*싶|여쭤)|될지\s*(궁금|문의|질문)|어떤지)/i.test(sentence)
        );

        if (isQuestion) {
          // FAQ question or inquiry without declarative stop permission -> ALLOW
          continue;
        }

        // Safe warning / negative / consultation context -> ALLOW
        const hasNegativeWarning = /(중단|끊|단약|감량).{0,15}(하[지않]|않|말|금지|금물|삼가|반동|안\s*됩|위험|주의|권하지|피해|어렵|조심|우려)/i.test(sentence);
        const hasArbitraryWarning = /(임의(로)?|자의(로)?|상의\s*없이|지시\s*없이).{0,15}(중단|끊|단약|감량)/i.test(sentence);
        const hasDoctorConsult = /(처방|의료진|담당의|주치의|의사|전문가).{0,15}(상의|상담|조절|조정|상의하|상의한\s*후)/i.test(sentence);

        const isSafeContext = hasNegativeWarning || hasArbitraryWarning || hasDoctorConsult;

        // Check if there is imperative recommendation to stop: e.g. '약을 끊으세요', '정신과 약을 중단하세요'
        const isImperativeStop = /(중단|끊|단약).{0,8}(하세요|하십시오|합시다)/i.test(sentence) && !hasNegativeWarning;

        if (isSafeContext && !isImperativeStop) {
          // Legitimate safety warning - ALLOWED
          continue;
        }

        // Discontinuation recommendation or non-safe context - VIOLATION
        return {
          violated: true,
          sentence: sentence.slice(0, 80),
          reason: '약물 중단 권고 또는 비안전 문맥'
        };
      }
    }
  }
  return { violated: false };
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
    titleDisease = '',
    canonicalDiseaseLabel = '',
    ageGroup = articleData.ageGroup || (articleData.qaTarget && articleData.qaTarget.ageGroup) || 'mixed',
    topicAngle = articleData.topicAngle,
    qaTarget = articleData.qaTarget,
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
  // Strict format: starts with '[', region name, exactly one space, disease name, ']', followed by whitespace, and non-empty topic
  const titlePattern = /^\[([^\s\]]+) ([^\]]+)\]\s+(.+)$/;
  const titleMatch = title.match(titlePattern);
  if (!titleMatch) {
    errors.push(`Title must match format '[지역 질환] 구체적 질문/주제'. Given: ${title}`);
  } else {
    const regionPart = titleMatch[1].trim();
    const diseasePart = titleMatch[2].trim();
    const topicPart = titleMatch[3].trim();

    // 3-1. Check Region Validity (Must be one of the 12 canonical regions)
    if (!CANONICAL_GEO_NAMES.has(regionPart)) {
      errors.push(`Title contains unapproved GEO: '${regionPart}'. Must be one of canonical regions: ${Array.from(CANONICAL_GEO_NAMES).join(', ')}`);
    } else if (validGeo && regionPart !== validGeo.displayName) {
      errors.push(`Geo consistency violation: Title region '${regionPart}' does not match target GEO '${validGeo.displayName}'.`);
    }

    // 3-2. Check Disease Validity (Must be an approved disease in taxonomy/qa_targets)
    const allowedDiseases = validDisease
      ? getAllowedDiseaseNames(validDisease.id, titleDisease || canonicalDiseaseLabel)
      : getAllAllowedDiseaseNames();

    if (!allowedDiseases.has(diseasePart)) {
      errors.push(`Title contains unapproved disease: '${diseasePart}'. Allowed: ${Array.from(allowedDiseases).join(', ')}`);
    }

    // 3-3. Check Topic Part Length
    if (!topicPart || topicPart.length < 5) {
      errors.push(`Title question/topic is too short (< 5 chars): '${topicPart}'`);
    }
  }

  // 4. Global Banned Medical Patterns
  const fullText = `${title}\n${summary}\n${body}\n${hashtags.join(' ')}\n${keywords.join(' ')}`;
  for (const { pattern, reason } of GLOBAL_BANNED_MEDICAL_PATTERNS) {
    if (pattern.test(fullText)) {
      errors.push(`Medical safety violation: ${reason} (Matched: ${pattern})`);
    }
  }

  // 4-1. Smart Medication Discontinuation Check (Distinguishes safe warnings from stop recommendations)
  const medCheck = checkMedicationDiscontinuation(fullText);
  if (medCheck.violated) {
    errors.push(`Medical safety violation: 임의 약물 중단 권고 금지 (Matched: "${medCheck.sentence}")`);
  }

  // 4-2. Age Group Consistency Validation (GLOBAL RULE)
  if (ageGroup === 'child') {
    const adultWorkKeywords = [
      '직장', '업무', '마감', '직장인', '출근', '퇴근', '야근', '이직',
      '성인 역시', '성인의 경우', '성인에서도', '성인기에도'
    ];
    for (const kw of adultWorkKeywords) {
      if (body.includes(kw) || summary.includes(kw) || title.includes(kw)) {
        errors.push(`Age Group violation: Target is 'child', but found adult workplace keyword '${kw}'.`);
      }
    }
  } else if (ageGroup === 'adult') {
    const childKeywords = [
      '훈육', '양육', '학부모', '교실에서', '등교', '소아청소년', '소아 틱', '소아 ADHD'
    ];
    for (const kw of childKeywords) {
      if (body.includes(kw) || summary.includes(kw)) {
        errors.push(`Age Group violation: Target is 'adult', but found unnecessary child keyword '${kw}'.`);
      }
    }
  }

  // 4-3. Sibling Disease & Topic Leakage Validation
  const angleId = typeof topicAngle === 'string' ? topicAngle : (topicAngle?.id || '');

  // For chronic-worry (qa-06), social-phobia core symptoms are strictly prohibited
  if (angleId === 'chronic-worry') {
    const socialPhobiaCoreKeywords = [
      '사람들의 시선', '발표 상황', '발표 때', '시선이 두려', '목소리 떨림', '목소리가 떨', '손 떨림', '손이 떨', '시선 공포', '대인 공포'
    ];
    for (const spk of socialPhobiaCoreKeywords) {
      if (body.includes(spk) || summary.includes(spk) || title.includes(spk) || keywords.some(k => k.includes(spk))) {
        errors.push(`Topic leakage violation: Target is 'chronic-worry', but found social phobia core symptom '${spk}'.`);
      }
    }
  }

  // Adult anxiety/stress disorders cannot use '신경발달학적'
  const nonDevelopmentalDiseases = ['anxiety', 'panic', 'sleep', 'depression', 'autonomic', 'ibs', 'headache', 'dizziness', 'hyperhidrosis', 'fatigue', 'syncope'];
  if (nonDevelopmentalDiseases.includes(diseaseId) && fullText.includes('신경발달')) {
    errors.push(`Etiology phrasing violation: '신경발달학적' is only applicable to pediatric/neurodevelopmental disorders (tic/adhd), not ${diseaseId}.`);
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

    // 7-1. Topic Angle Consistency for Thumbnail (GLOBAL RULE)
    if (topicAngle) {
      const copyCombined = `${yellowText || ''} ${whiteText || ''}`;

      // 1. early-awakening: MUST NOT contain sleep-onset insomnia keywords
      if (angleId === 'early-awakening') {
        const sleepOnsetKeywords = ['잠들기 어렵', '잠들지 못', '뒤척', '잠 안 올', '입면'];
        for (const sok of sleepOnsetKeywords) {
          if (copyCombined.includes(sok)) {
            errors.push(`Thumbnail topic mismatch: Target is 'early-awakening' (새벽 각성), but thumbnail contains sleep-onset insomnia phrase '${sok}'.`);
          }
        }
      }

      // 2. digestive-dizziness: MUST contain digestive symptom (소화/위장/체기/더부룩) and MUST NOT replace with palpitation
      if (angleId === 'digestive-dizziness') {
        const hasDigestive = copyCombined.includes('소화') || copyCombined.includes('위장') || copyCombined.includes('체기') || copyCombined.includes('더부룩');
        if (!hasDigestive) {
          errors.push(`Thumbnail topic mismatch: Target is 'digestive-dizziness' (어지럼증+소화불량), but thumbnail is missing digestive symptoms (소화/위장).`);
        }
        if (copyCombined.includes('두근거림') || copyCombined.includes('숨 막힘') || copyCombined.includes('숨막힘')) {
          errors.push(`Thumbnail topic mismatch: Target is 'digestive-dizziness', but thumbnail arbitrarily swapped digestive symptom for palpitation/dyspnea.`);
        }
      }

      // 3. chronic-worry: MUST NOT use panic copy ("두근거림·숨 막힘") or social phobia copy
      if (angleId === 'chronic-worry') {
        if (copyCombined.includes('숨 막힘') || copyCombined.includes('숨막힘') || (copyCombined.includes('두근거림') && !copyCombined.includes('걱정'))) {
          errors.push(`Thumbnail topic mismatch: Target is 'chronic-worry', but thumbnail contains panic copy '${copyCombined}'.`);
        }
        if (copyCombined.includes('발표') || copyCombined.includes('시선')) {
          errors.push(`Thumbnail topic mismatch: Target is 'chronic-worry', but thumbnail contains social phobia copy '${copyCombined}'.`);
        }
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
  // TIER 2: GEO CONSISTENCY VALIDATION (Hierarchical Compatibility)
  // ==========================================
  if (validGeo) {
    const {
      ancestorKeywords,
      allowedKeywords,
      forbiddenKeywords,
      specificForbiddenStations
    } = getGeoHierarchyRules(validGeo);

    // 1. Check metadata (hashtags, keywords, title, summary)
    const checkList = [
      ...hashtags.map(h => ({ type: 'Hashtag', text: h })),
      ...keywords.map(k => ({ type: 'Keyword', text: k })),
      { type: 'Title', text: title },
      { type: 'Summary', text: summary }
    ];

    for (const { type, text } of checkList) {
      for (const forbidden of forbiddenKeywords) {
        if (text.includes(forbidden)) {
          errors.push(`Geo consistency violation: Targeted for '${validGeo.displayName}', but found unrelated region keyword '${forbidden}' in ${type} '${text}'.`);
        }
      }
      for (const forbidden of specificForbiddenStations) {
        if (text.includes(forbidden)) {
          errors.push(`Geo consistency violation: Found unrelated local station keyword '${forbidden}' in ${type} '${text}'.`);
        }
      }
    }

    // 2. Check body for foreign or sibling local areas
    for (const forbidden of forbiddenKeywords) {
      if (body.includes(forbidden)) {
        errors.push(`Geo consistency violation: Targeted for '${validGeo.displayName}', but found unrelated region keyword '${forbidden}' in article body.`);
      }
    }
    for (const forbidden of specificForbiddenStations) {
      if (body.includes(forbidden)) {
        errors.push(`Geo consistency violation: Found unrelated local station keyword '${forbidden}' in article body.`);
      }
    }

    // 3. Check body regional density (Primary target recommended 1~3 times)
    const bodyOnly = body.replace(/^##.+$/gm, '');
    const regex = new RegExp(validGeo.displayName, 'g');
    const matches = (bodyOnly.match(regex) || []).length;
    if (matches > 3) {
      warnings.push(`Regional keyword '${validGeo.displayName}' appears ${matches} times in body (recommended: 1~3 times).`);
    }

    // 4. Ensure ancestor keywords do not overpower the primary target in body
    for (const anc of ancestorKeywords) {
      if (anc.length >= 2 && anc !== validGeo.displayName) {
        const ancRegex = new RegExp(anc, 'g');
        const ancMatches = (bodyOnly.match(ancRegex) || []).length;
        if (ancMatches > 3) {
          warnings.push(`Ancestor regional keyword '${anc}' appears ${ancMatches} times in body (recommended: <= 3 times to preserve primary target '${validGeo.displayName}').`);
        }
      }
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

  // Evidence Notes Citation & Identifier Validation
  if (knowledge && Array.isArray(knowledge.evidenceNotes)) {
    for (const note of knowledge.evidenceNotes) {
      if (note.verified === true) {
        const hasIdentifier = Boolean(note.doi || note.pmid || note.sourceUrl);
        if (!note.sourceTitle || !hasIdentifier) {
          errors.push(`Evidence Note validation failed: Claim '${(note.claim || '').slice(0, 30)}...' marked verified=true but missing valid sourceTitle or source identifier (DOI, PMID, sourceUrl).`);
        }
      }
    }
  }

  // Disease-specific Lifestyle Factor Leakage Check
  // Prevent tic/media specific phrases ('빠른 화면 전환', '강한 색감', 'CSTC 회로') from leaking into other diseases
  if (diseaseId !== 'tic' && diseaseId !== 'adhd') {
    const leakedLifestylePattern = /(빠른\s*화면\s*전환|강한\s*색감|CSTC\s*회로|피질-선조체)/i;
    if (leakedLifestylePattern.test(fullText)) {
      errors.push(`Disease-specific lifestyle leakage violation (${diseaseId}): 타 질환(틱장애/미디어) 특화 요인이 혼입되었습니다.`);
    }
  }

  // Panic-specific checks: Panic attack vs Panic disorder distinction
  if (diseaseId === 'panic') {
    const simplisticPanicDef = /(심계항진|호흡곤란|가슴\s*답답함)(이|\s*)*반복되면\s*(곧|모두|바로)?\s*공황장애/i;
    if (simplisticPanicDef.test(fullText)) {
      errors.push('Panic-specific rule violation: 단순 신체 증상 반복만으로 공황장애로 단정할 수 없으며, 공황발작과 예기불안/회피 행동을 명확히 구분해야 합니다.');
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
  validateArticleContent,
  getGeoHierarchyRules
};
