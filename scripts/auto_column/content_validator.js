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
  { pattern: /(뇌의\s*과각성을\s*(진정|완화|가라앉|조절)|수면(의)?\s*흐름을\s*돕는|심포열을\s*다스리는|안정을\s*돕는|심신\s*안정을\s*돕는|자율신경\s*긴장을\s*완화하는)\s*(맞춤\s*)?(한약|처방|침구|치료)/i, reason: '치료법 임의 생성 금지: 치료 효과 단정 및 임의 기전 수식어 사용' },
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
 * Smart Treatment Certainty / Guarantee Validator
 * Distinguishes forbidden declarative efficacy guarantees (e.g. "반드시 좋아집니다", "반드시 완치됩니다", "반드시 낫습니다", "반드시 치료됩니다")
 * from safe, responsible clinical caution / negation sentences
 * (e.g. "‘반드시 좋아진다’는 식의 접근이 아닙니다", "반드시 좋아진다고 단정할 수 없습니다", "반드시 치료된다고 보장할 수 없습니다").
 *
 * @param {string} text - Text to inspect (title, summary, body)
 * @returns {{ violated: boolean, reason?: string, sentence?: string }}
 */
function checkTreatmentCertainty(text) {
  if (!text || typeof text !== 'string') return { violated: false };

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

      // Certainty Trigger: 반드시 + (치료|완치|좋아|낫)
      const certaintyPattern = /반드시\s*(치료|완치|좋아|낫)/i;
      if (!certaintyPattern.test(sentence)) {
        continue;
      }

      // Find all matches in this sentence to ensure no unnegated violation hides behind a negated clause
      const matchRegex = /반드시\s*(치료|완치|좋아|낫)[가-힣]*/gi;
      let match;
      let hasViolatingOccurrence = false;
      let violatingSnippet = '';

      while ((match = matchRegex.exec(sentence)) !== null) {
        const afterMatch = sentence.slice(match.index);

        // Safe Negation Patterns in Korean:
        // 1. Predicate / Copula Negation:
        //    "접근이 아닙니다", "뜻은 아닙니다", "의미는 아닙니다", "아닙니다", "아니다", "아닌", "아니며"
        // 2. Certainty / Assertion Negation:
        //    "단정할 수 없다", "단정하기 어렵다", "단정해서는 안 된다", "단정은 금물"
        //    "보장할 수 없다", "보장되지 않는다", "보장은 없다", "보장하지 않는다"
        //    "볼 수 없다", "보기 어렵다", "생각해서는 안 된다"
        //    "적절하지 않다", "바람직하지 않다", "옳지 않다"
        //    "경계해야 한다", "경계할 필요가 있다", "주의해야 한다"
        //    "오해해서는 안 된다", "착각하기 쉽지만"
        const negationPatterns = [
          /(식의\s*접근(이|\s*은)?\s*)?(아닙니다|아니다|아닌|아니며|아니라고|아니라는|아님)/i,
          /(그런|이런)?\s*(뜻|의미)(는|은|가|이)?\s*(아닙|아니|없)/i,
          /(의미|뜻)하지\s*않/i,
          /(단정|확언|장담).{0,15}(할\s*수\s*없|하기\s*어렵|해서는\s*안|은\s*금물|하지\s*않|마십시오|말아야|않습니다|못합니다|어렵습니다|어려우며)/i,
          /보장.{0,15}(할\s*수\s*없|하기\s*어렵|되지\s*않|되는\s*것은\s*아니|은\s*없|하지\s*않|못합니다|어렵습니다)/i,
          /(볼|보기|생각하|판단하).{0,12}(수\s*없|어렵|어려우며|않|안\s*됩|말아야|마십시오)/i,
          /(적절하지|바람직하지|옳지|올바르지)\s*(않|못)/i,
          /(경계|주의|유의).{0,15}(해야|할\s*필요|가\s*있|바랍니다)/i,
          /(오해|착각).{0,15}(해서는\s*안|하기\s*쉽|금물|하지\s*마|마십시오)/i,
          /(기대하기|확신하기).{0,12}(어렵|힘들|수\s*없)/i
        ];

        let isSafeNegated = false;
        for (const np of negationPatterns) {
          if (np.test(afterMatch)) {
            isSafeNegated = true;
            break;
          }
        }

        // Pure interrogative question (FAQ question without affirmative promise)
        // e.g. "Q. 치료를 받으면 반드시 좋아지나요?"
        const isPureQuestion = (
          /(\?|지나요|되나요|인가요|을까요|ㄹ까요|나요|가요)\s*$/i.test(sentence.trim()) ||
          /(반드시\s*(치료|완치|좋아|낫).{0,8}(지나요|되나요|나요|가요|을까요|ㄹ까요))\??/i.test(afterMatch)
        ) && !/(됩니다|집니다|습니다|확신합니다|보장합니다)/i.test(afterMatch);

        if (!isSafeNegated && !isPureQuestion) {
          hasViolatingOccurrence = true;
          violatingSnippet = sentence.slice(0, 80);
          break;
        }
      }

      if (hasViolatingOccurrence) {
        return {
          violated: true,
          sentence: violatingSnippet,
          reason: '치료 단정적 확신 표현 금지 (부정/경계 문맥 부재)'
        };
      }
    }
  }

  return { violated: false };
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
 * Contextual Age Group Validation
 * Checks whether the primary subject or patient target improperly transitions to another age group.
 * Rather than naive flat keyword blacklisting, evaluates sentence-level context and compound patterns.
 *
 * @param {string} text - The full text to check (title, summary, body)
 * @param {'child'|'adult'|'mixed'} ageGroup
 * @returns {{ violated: boolean, reason?: string, matchedSentence?: string }}
 */
function checkContextualAgeGroup(text, ageGroup) {
  if (!ageGroup || ageGroup === 'mixed') {
    return { violated: false };
  }

  // Clean markdown headings, html tags, list markers, and bold/italic markup
  const clean = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/^[\*\-\d\.]+\s+/gm, '')
    .replace(/[\*_~`]/g, '');

  const sentences = clean
    .split(/[\r\n\.!\?]+/g)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (ageGroup === 'child') {
    // Child target: Focus on child/adolescent patient, parents/guardians, school, home.
    // Forbidden: Transitioning primary patient target to adult workplace dysfunction or adult patients.
    const adultSubjectPatterns = [
      /(성인\s*ADHD|성인\s*환자|성인의\s*경우|성인에서도|성인\s*역시|성인기에서도|성인기\s*환자|성인기에\s*(접어든|이르러|나타나는))/i,
      /직장인\s*(환자|은|이|에게)/i,
      /(직장\s*업무\s*중\s*실수|업무\s*중\s*실수|업무\s*실수|직장\s*내\s*실수)/i,
      /(업무\s*마감|마감\s*일정|마감에\s*쫓|마감\s*부담).{0,15}(어려|스트레스|압박|놓치|부담)/i,
      /(직장|업무).{0,20}(실수(가|를)?\s*(반복|잦|늘)|마감(에|\s*을)?\s*(어려|쫓|놓치)|능률|효율\s*저하|퇴사|이직)/i,
      /(출퇴근길\s*(공황|불안|스트레스)|퇴근\s*후\s*야근|과중한\s*업무\s*스트레스)/i,
      /(직장\s*생활\s*(어려움|갈등|부적응)|업무\s*마감에\s*어려움)/i
    ];

    for (const sentence of sentences) {
      for (const pattern of adultSubjectPatterns) {
        if (pattern.test(sentence)) {
          // Benign exception: If framed around guardian's living schedule (e.g. 부모의 직장 일정, 보호자의 퇴근 시간)
          // without clinical dysfunction patterns like 성인 ADHD, 실수가 반복, 마감에 어려움
          const isBenignParentalSchedule = /(부모|보호자|어머니|아버지|양육자)(의|님)?\s*(직장\s*일정|퇴근\s*시간|출퇴근|맞벌이)/.test(sentence)
            && !/(성인\s*ADHD|성인의\s*경우|성인\s*환자|실수(가|를)?\s*(반복|잦)|마감(에|\s*을)?\s*어려)/.test(sentence);

          if (!isBenignParentalSchedule) {
            return {
              violated: true,
              reason: `Age Group violation: Target is 'child', but primary subject transitions to adult workplace/patient context (Matched: "${sentence.slice(0, 80)}")`,
              matchedSentence: sentence
            };
          }
        }
      }
    }
  } else if (ageGroup === 'adult') {
    // Adult target: Focus on adult patient daily life, work, social situations, adult stressors.
    // Forbidden: Transitioning primary patient target to pediatric classroom/discipline/child symptoms.
    // Note: Adult patient life context like "직장 스트레스와 자녀 양육 부담" is completely valid.
    const childSubjectPatterns = [
      // Pediatric patient symptoms and school/classroom routines
      /(아이|자녀|학생|소아|아이들)(가|는|의|가\s*자주)?\s*(수업\s*시간|교실(에서|\s*내)|등교\s*(전|후|길|거부)|학교\s*생활).{0,25}(산만|집중|불안|어려움|적응|문제|거부|지적|지각)/i,
      /(등교\s*전\s*(아이|자녀|소아)|수업\s*시간에\s*(산만|집중하지)|교실에서\s*(산만|돌아다니|아이)|아이가\s*수업)/i,
      /(아이가|아이는|학생이)\s*(수업\s*시간|교실|학교에서).{0,15}(산만|집중|지적)/i,
      /(등교\s*전\s*(아이|자녀)(가|는)?\s*(복통|두통|불안|울거나|거부))/i,
      // Parental discipline of child
      /(부모|양육자)(가|는)?\s*(아이|자녀)(를|에게)?\s*훈육(할\s*때|하거나|을\s*통해|으로|의\s*방법|에서|에\s*대한)/i,
      /(훈육할\s*때|아이를\s*훈육|자녀를\s*훈육|훈육\s*과정에서\s*아이)/i,
      /(아이(의)?\s*훈육|자녀(의)?\s*훈육)/i,
      // Explicit pediatric disease terms
      /(소아\s*ADHD|소아\s*틱|소아청소년\s*환자|어린이\s*틱)/i,
      /(아이의\s*증상|자녀의\s*증상|아이의\s*틱|자녀의\s*틱|아이의\s*산만함)/i,
      /(학부모\s*상담\s*(에서|시|때|을\s*받))/i
    ];

    for (const sentence of sentences) {
      for (const pattern of childSubjectPatterns) {
        if (pattern.test(sentence)) {
          return {
            violated: true,
            reason: `Age Group violation: Target is 'adult', but primary subject transitions to pediatric patient/school/discipline context (Matched: "${sentence.slice(0, 80)}")`,
            matchedSentence: sentence
          };
        }
      }
    }
  }

  return { violated: false };
}

/**
 * Detects whether normal ENT exam findings are automatically jumped/attributed to cervical or autonomic causes
 * without cautious differential evaluation.
 */
function checkDizzinessEntCervicalAutoJump(text) {
  if (!text || typeof text !== 'string') return { violated: false };

  // Split into sentences / clauses
  const sentences = text.split(/[.\n!?]+/);
  const entNormalPattern = /(이비인후과|귀\s*(기능)?\s*검사).*?(정상|이상\s*없|큰\s*이상\s*없)/i;
  const cervicalCausePattern = /(경추|목\s*근육|목\s*긴장|목어깨|자율신경).*?(문제|원인|귀결|때문|기인)/i;
  const safeNegationPattern = /(단정할\s*수\s*없|단정하지|단정해서는\s*안|아닙니다|않습니다|볼\s*수\s*없|연결할\s*수\s*없|귀결되지\s*않|속단할\s*수\s*없|주의|오해)/i;

  for (const rawSentence of sentences) {
    const s = rawSentence.trim();
    if (!s) continue;

    if (entNormalPattern.test(s) && cervicalCausePattern.test(s)) {
      if (!safeNegationPattern.test(s)) {
        return { violated: true, sentence: s };
      }
    }
  }

  return { violated: false };
}

/**
 * Validates medical distinction between Syncope (transient loss of consciousness)
 * and Presyncope (prodromal symptoms like vision darkening, cold sweat, feeling faint without loss of consciousness).
 * Prohibits conflating "becoming blurred/dimmed consciousness" with syncope or claiming syncope without loss of consciousness.
 */
function checkSyncopePresyncopeDistinction(text) {
  if (!text || typeof text !== 'string') return { valid: true };

  const conflatePattern = /(의식이\s*흐려지는\s*(것만으로|것도|것을|상태도)?\s*(실신|미주신경성\s*실신)|의식이\s*흐려져도\s*(실신|미주신경성\s*실신)|의식을\s*(잃지\s*않아도|잃지\s*않고도|잃지\s*않아도\s*되는)\s*(실신|미주신경성\s*실신)|(실신은|실신이란|미주신경성\s*실신은|미주신경성\s*실신이란).{0,50}의식이\s*흐려지거나)/i;

  if (conflatePattern.test(text)) {
    const match = text.match(conflatePattern);
    return {
      valid: false,
      reason: `Syncope diagnostic definition violation: 실신은 일시적인 뇌 관류 저하로 인한 일시적 의식소실이며 자발적으로 회복되는 상태입니다. 의식이 흐려지는 것만으로 실신이라 하거나 의식을 잃지 않아도 실신이라 정의할 수 없으며, 의식소실 없는 전조는 전실신(Presyncope)으로 명확히 구분해야 합니다. (Matched: "${match ? match[0] : ''}")`,
      matched: match ? match[0] : ''
    };
  }

  return { valid: true };
}

/**
 * Prohibits independent OCD checking behavior sections (문 잠금, 가스 확인, 침투적 사고 등)
 * in Depression / Burnout articles. Brief comorbidity mention (1~2 sentences) is allowed,
 * but independent H2/H3 sections are strictly forbidden.
 */
function checkDepressionOcdSectionLeakage(body) {
  if (!body || typeof body !== 'string') return { valid: true };
  const ocdSectionPattern = /^#{2,4}\s+.*(확인\s*행동|문\s*잠금|가스\s*확인|침투적\s*사고|반복되는\s*불안한\s*생각과\s*확인)/m;
  if (ocdSectionPattern.test(body)) {
    const match = body.match(ocdSectionPattern);
    return {
      valid: false,
      reason: `Depression OCD checking section violation: 우울증 글 안에 확인 행동, 문 잠금, 가스 확인, 침투적 사고 등 OCD 증상을 독립 섹션으로 다루지 마십시오. 동반 가능성을 짧게 언급하는 수준만 허용됩니다. (Matched: "${match ? match[0] : ''}")`
    };
  }
  return { valid: true };
}

/**
 * Validates OCD-specific vicious cycle and evidence-based standard treatments.
 * - Must explain: obsession -> anxiety -> compulsion/checking/avoidance -> temporary relief -> reinforcement/vicious cycle
 * - Must neutrally mention evidence-based standard treatments: ERP (Exposure and Response Prevention), CBT, pharmacotherapy, and specialist evaluation
 * - Must NOT claim cognitive distancing / acceptance / relaxation replaces ERP
 */
function checkOcdViciousCycleAndTreatments(fullText) {
  if (!fullText || typeof fullText !== 'string') return { valid: true };

  const hasObsession = fullText.includes('침투적') || fullText.includes('강박 사고') || fullText.includes('강박사고') || fullText.includes('원치 않는 생각');
  const hasAnxiety = fullText.includes('불안') || fullText.includes('고통');
  const hasCompulsion = fullText.includes('강박 행동') || fullText.includes('강박행동') || fullText.includes('확인') || fullText.includes('회피');
  const hasReliefOrReinforcement = fullText.includes('안도') || fullText.includes('악순환') || fullText.includes('강화') || fullText.includes('반복');

  if (!hasObsession || !hasAnxiety || !hasCompulsion || !hasReliefOrReinforcement) {
    return {
      valid: false,
      reason: 'OCD vicious cycle missing: 강박증 글은 침투적 사고/강박 사고 → 불안/고통 → 강박 행동/확인/회피 → 일시적 안도 → 악순환 반복·강화의 핵심 사이클을 명확히 설명해야 합니다.'
    };
  }

  const hasErp = fullText.includes('ERP') || fullText.includes('노출 및 반응방지') || fullText.includes('노출 및 반응 방지') || fullText.includes('노출반응방지');
  const hasCbtOrMeds = fullText.includes('인지행동치료') || fullText.includes('CBT') || fullText.includes('약물치료') || fullText.includes('약물 치료');
  const hasSpecialistEval = fullText.includes('전문 평가') || fullText.includes('전문의') || fullText.includes('전문가') || fullText.includes('표준 치료');

  if (!hasErp || !hasCbtOrMeds || !hasSpecialistEval) {
    return {
      valid: false,
      reason: 'OCD standard treatment missing: 강박증 글은 일상 기능 저하 시 전문 평가 필요성과 함께 ERP(노출 및 반응방지)를 포함한 CBT 및 약물치료 등 근거 기반 표준 치료를 중립적으로 언급해야 합니다.'
    };
  }

  const erpReplacementPattern = /(인지적\s*거리두기|수용|이완\s*훈련|이완요법).*?(대체하는\s*치료|ERP를\s*대신|치료법으로\s*대체|ERP\s*대신)/i;
  if (erpReplacementPattern.test(fullText)) {
    return {
      valid: false,
      reason: 'OCD treatment framing violation: 인지적 거리두기나 수용, 이완 훈련 등을 ERP를 대체하는 치료법처럼 서술하지 마십시오.'
    };
  }

  return { valid: true };
}

/**
 * Validates separation anxiety content:
 * - Distinguishes normal developmental anxiety from clinical disorder level
 * - Strictly forbids enuresis fluid restriction / urination management leakage
 */
function checkSeparationAnxietyDistinction(fullText) {
  if (!fullText || typeof fullText !== 'string') return { valid: true };

  const mentionsNormalDev = fullText.includes('정상적인 발달') || fullText.includes('자연스러운 발달') || fullText.includes('발달 과정에서') || fullText.includes('발달 과정상');
  const mentionsDisorderCriteria = (fullText.includes('과도하') || fullText.includes('일상 기능') || fullText.includes('기능을 방해') || fullText.includes('적응') || fullText.includes('방해')) &&
    (fullText.includes('전문 평가') || fullText.includes('전문의') || fullText.includes('분리불안장애'));

  if (!mentionsNormalDev || !mentionsDisorderCriteria) {
    return {
      valid: false,
      reason: 'Separation anxiety developmental distinction missing: 어린 시기의 분리불안은 정상 발달 과정에서도 나타날 수 있음을 명시하고, 연령/발달에 비해 과도하고 일상 기능을 방해할 때 분리불안장애 가능성을 포함해 전문 평가가 필요하다는 구분을 포함해야 합니다.'
    };
  }

  const enuresisLeakagePattern = /(저녁\s*(식사\s*후)?\s*(과도한\s*)?수분\s*제한|취침\s*전\s*배뇨(\s*습관)?)/i;
  if (enuresisLeakagePattern.test(fullText)) {
    return {
      valid: false,
      reason: 'Separation anxiety enuresis management leakage: 분리불안 글의 생활관리에 야뇨증 관리법(저녁 수분 제한, 취침 전 배뇨)을 넣지 마십시오.'
    };
  }

  return { valid: true };
}

/**
 * Validates night terrors content:
 * - Prohibits conflating nightmares with night terrors in title (title must focus on night terrors, e.g. not "자다 깨서 울거나 악몽을 꿀 때")
 * - Requires NREM partial arousal, lack of next-day recall, and nightmare differentiation in body
 * - Strictly forbids enuresis fluid restriction / urination management leakage
 */
function checkNightTerrorsTitleAndClinical(title, fullText) {
  if (title) {
    const nightmareConflatedInTitle = /(악몽을\s*꿀\s*때|악몽과\s*야경증|야경증과\s*악몽)/i;
    if (nightmareConflatedInTitle.test(title)) {
      return {
        valid: false,
        reason: 'Night terrors title conflation violation: 야경증 제목에서 악몽을 동일 증상처럼 묶지 마십시오. 악몽은 감별 설명에서만 다뤄야 합니다.'
      };
    }
  }

  if (fullText) {
    const hasNremArousal = fullText.includes('비렘') || fullText.includes('NREM') || fullText.includes('부분 각성') || fullText.includes('완전히 깨어나지');
    const hasNoRecall = fullText.includes('기억하지 못') || fullText.includes('기억이 없') || fullText.includes('기억을 못') || fullText.includes('기억이 거의');
    const hasNightmareDiff = fullText.includes('악몽과') || fullText.includes('악몽은') || fullText.includes('악몽과의');

    if (!hasNremArousal || !hasNoRecall || !hasNightmareDiff) {
      return {
        valid: false,
        reason: 'Night terrors core clinical distinction missing: 야경증은 NREM 수면 중 부분 각성, 완전히 깨어나지 않음, 다음 날 기억하지 못함, 악몽과의 구별을 명확히 다루어야 합니다.'
      };
    }

    const enuresisLeakagePattern = /(저녁\s*(식사\s*후)?\s*(과도한\s*)?수분\s*제한|취침\s*전\s*배뇨(\s*습관)?)/i;
    if (enuresisLeakagePattern.test(fullText)) {
      return {
        valid: false,
        reason: 'Night terrors enuresis management leakage: 야경증 글의 핵심 생활관리에 야뇨증 수분/배뇨 관리법을 넣지 마십시오.'
      };
    }

    // Prohibit forced tic symptom fabrication or tic paragraph in night terrors
    const forcedTicPattern = /(깨어\s*있는\s*시간에도\s*눈을\s*반복해서\s*깜빡이|특정\s*소리를\s*반복하는|눈\s*깜빡임이나\s*음음|눈\s*깜빡임이나\s*헛기침|야경증과\s*직접\s*같은\s*질환은\s*아니지만.{0,40}(틱|깜빡|소리)|틱\s*증상이\s*동반|틱장애\s*안내)/i;
    if (forcedTicPattern.test(fullText)) {
      return {
        valid: false,
        reason: 'Night terrors forced tic linkage violation: 야경증 글에 틱장애 링크를 넣기 위해 틱 증상 문단이나 부자연스러운 연결 문장을 작성할 수 없습니다.'
      };
    }

    const links = extractInternalLinks(fullText);
    if (links.some(l => l.url.includes('tic') || l.text.includes('틱장애') || l.text.includes('틱 증상'))) {
      return {
        valid: false,
        reason: 'Night terrors forced tic linkage violation: 야경증 글에 관련성이 낮은 틱장애 내부링크를 삽입할 수 없습니다.'
      };
    }

    // Arbitrary frequency count prohibition (e.g. "주 수회 이상")
    const arbitraryFreqPattern = /(주\s*수회\s*이상|주\s*[0-9一-龥]+\s*회\s*이상|하루\s*수회\s*이상)/i;
    if (arbitraryFreqPattern.test(fullText)) {
      return {
        valid: false,
        reason: 'Night terrors unverified frequency claim violation: 근거 없는 임의 빈도 수치("주 수회 이상" 등)를 사용할 수 없습니다. "매우 잦게 반복되거나" 등 중립적이고 안전한 표현을 사용하십시오.'
      };
    }
  }

  return { valid: true };
}

/**
 * Validates child enuresis (소아 야뇨증) content:
 * - Prohibits topic leakage from separation anxiety (e.g. "아침 등원·등교 전 따뜻한 포옹")
 * - Prohibits single reduction to bladder reflex immaturity; requires multifactorial etiology (nighttime urine production, bladder function, sleep arousal)
 * - Requires essential clinical differential evaluation: daytime LUTS, dysuria/UTI, constipation, polydipsia/polyuria, sleep-disordered breathing
 * - Requires neutral mention of evidence-based standard management options (enuresis alarm, desmopressin)
 * - Prohibits claiming Korean medicine replaces standard treatments
 */
function checkChildEnuresisClinicalAndStandardCare(fullText) {
  if (!fullText || typeof fullText !== 'string') return { valid: true };

  // 1. Topic leakage check: Separation anxiety morning hug tip
  const morningHugPattern = /(아침\s*)?(등원|등교|등원·등교|등교·등원)\s*전\s*(따뜻한\s*)?포옹|따뜻한\s*포옹/i;
  if (morningHugPattern.test(fullText)) {
    return {
      valid: false,
      reason: 'Child enuresis separation-anxiety leakage: 야뇨증 글의 생활관리에 분리불안용 문구("등원·등교 전 따뜻한 포옹")를 넣을 수 없습니다.'
    };
  }

  // 2. Multifactorial background check (nighttime urine volume, bladder function, arousal threshold)
  const hasUrineProduction = /(야간\s*소변\s*생성|야간\s*요량|소변\s*생성|항이뇨)/i.test(fullText);
  const hasBladderFunction = /(방광\s*기능|방광\s*용적|방광\s*용량|방광)/i.test(fullText);
  const hasArousal = /(각성\s*반응|수면\s*중\s*각성|잠에서\s*깨|각성\s*역치|각성)/i.test(fullText);
  if (!hasUrineProduction || !hasBladderFunction || !hasArousal) {
    return {
      valid: false,
      reason: 'Child enuresis multifactorial background missing: 야뇨의 발생 배경을 단순 배뇨 반사 미성숙 하나로 축소하지 말고, 야간 소변 생성량, 방광 기능, 수면 중 각성 반응 등 여러 요소가 관련될 수 있는 중립적 다인자 구조로 설명해야 합니다.'
    };
  }

  // 3. Required differential evaluation
  const hasDaytimeSymptoms = /(낮\s*(동안|의|시간)|주간).{0,35}(배뇨|빈뇨|절박뇨|급박뇨|요실금)|낮\s*배뇨\s*증상/i.test(fullText);
  const hasUtiOrDysuria = /(배뇨통|요로\s*감염|소변볼\s*때\s*(통증|아프)|요로감염)/i.test(fullText);
  const hasConstipation = /(변비|배변\s*문제|장\s*내\s*대변)/i.test(fullText);
  const hasPolydipsiaPolyuria = /(과도한\s*갈증|다갈|다뇨|소변량이\s*과도|물을\s*(너무\s*많이|과도하게)\s*마시)/i.test(fullText);
  const hasSleepApnea = /(수면\s*호흡\s*장애|코골이|수면\s*무호흡|구강\s*호흡)/i.test(fullText);

  const missingDiffs = [];
  if (!hasDaytimeSymptoms) missingDiffs.push('낮 동안의 배뇨 증상(주간 빈뇨/절박뇨/요실금)');
  if (!hasUtiOrDysuria) missingDiffs.push('배뇨통 또는 요로감염 의심 증상');
  if (!hasConstipation) missingDiffs.push('변비');
  if (!hasPolydipsiaPolyuria) missingDiffs.push('과도한 갈증(다갈)/다뇨');
  if (!hasSleepApnea) missingDiffs.push('코골이/수면호흡장애');

  if (missingDiffs.length > 0) {
    return {
      valid: false,
      reason: `Child enuresis differential evaluation missing: 소아 야뇨증 평가 시 필수 감별 항목(${missingDiffs.join(', ')})에 대한 확인이 반드시 포함되어야 합니다.`
    };
  }

  // 4. Evidence-based standard management options neutral mention
  const hasAlarm = /(야뇨\s*(알람|경보기)|enuresis\s*alarm)/i.test(fullText);
  const hasDesmopressin = /(데스모프레신|desmopressin)/i.test(fullText);
  if (!hasAlarm || !hasDesmopressin) {
    return {
      valid: false,
      reason: 'Child enuresis standard management missing: 환자 정보 칼럼으로서 야뇨 알람(enuresis alarm) 및 데스모프레신(desmopressin) 등 근거 기반 표준 관리 선택지를 중립적으로 언급해야 합니다.'
    };
  }

  // 5. Prohibit claiming Korean medicine replaces standard treatments
  const claimsToReplace = /(한방\s*치료|한의학적\s*치료|한약).*?(대체하는\s*치료|표준\s*치료를\s*대신|알람이나\s*약물\s*대신|대체할\s*수\s*있)/i.test(fullText);
  if (claimsToReplace) {
    return {
      valid: false,
      reason: 'Child enuresis treatment replacement violation: 한의학적 치료가 야뇨 알람이나 데스모프레신 등 표준 치료를 대체한다고 서술할 수 없습니다. 보완적 접근으로 서술해야 합니다.'
    };
  }

  return { valid: true };
}

/**
 * Validates chronic fatigue & burnout (만성피로·번아웃) content:
 * - Strictly prohibits automatic causal jump equating chronic fatigue / brain fog directly to autonomic dysfunction
 * - Requires distinct definition of Chronic Fatigue (symptom presentation) vs Burnout (ICD-11 occupational phenomenon tied to chronic workplace stress)
 * - Prohibits defining burnout as general everyday tiredness or across all life domains
 * - Requires burnout's 3 core dimensions: energy depletion/exhaustion, job cynicism/mental distance, reduced professional efficacy
 * - Requires broad differential evaluation (sleep, psychiatric, anemia, endocrine/thyroid, medication, infection/internal medicine, and ME/CFS distinction)
 * - Strictly prohibits ungrounded seasonal transition ("급격한 기온 변화와 환절기") as core aggravating factors
 */
function checkFatigueBurnoutAndAutonomicFraming(fullText) {
  if (!fullText || typeof fullText !== 'string') return { valid: true };

  // 1. Prohibit ungrounded seasonal transition framing
  const seasonalFramingPattern = /(급격한\s*기온\s*변화(와| 및|\s*및)?\s*환절기|환절기(에|\s*마다)?\s*(유독\s*)?(머리가\s*멍|피로가\s*심|원인이)|환절기가\s*(대표적\s*악화\s*요인|주요\s*원인)|환절기\s*피로)/i;
  if (seasonalFramingPattern.test(fullText)) {
    return {
      valid: false,
      reason: 'Fatigue unverified seasonal framing violation: 검증되지 않은 환절기나 급격한 기온 변화를 만성피로 및 브레인포그의 핵심 악화 요인으로 단정할 수 없습니다. 수면 부족, 과로, 식사 불규칙, 지속적인 직장 스트레스 등 검증된 생활 맥락에 집중해야 합니다.'
    };
  }

  // 2. Autonomic auto-jump check
  const sentences = fullText.split(/[.\n!?]+/);
  const directJumpClause = /(만성\s*피로|브레인포그).*?(자율신경|자율기능).*?(원인|귀결|기인|때문)/i;
  const safeHedging = /(일부\s*경우|함께\s*살펴볼\s*수|하나로\s*살펴|평가\s*요소\s*중\s*하나|단정할\s*수\s*없|단정하지|동반된\s*경우|자동\s*귀결되지\s*않)/i;

  for (const rawS of sentences) {
    const s = rawS.trim();
    if (!s) continue;
    if (directJumpClause.test(s) && !safeHedging.test(s)) {
      return {
        valid: false,
        reason: `Fatigue autonomic auto-jump violation: 만성피로와 브레인포그를 자율신경 문제나 자율신경실조증으로 자동 귀결하지 마십시오. 자율신경 관련 증상이 함께 있는 일부 경우 평가 요소 중 하나로 살펴볼 수 있다는 수준으로 작성해야 합니다. (Matched: "${s.slice(0, 80)}")`
      };
    }
  }

  // 3. Burnout presence check
  if (!fullText.includes('번아웃')) {
    return {
      valid: false,
      reason: 'Fatigue target burnout omission: 만성피로·번아웃 타깃 칼럼은 본문에서 만성피로(지속되는 피로 증상 표현)와 번아웃을 반드시 구별하여 설명해야 합니다.'
    };
  }

  // 4. Burnout definition check: occupational phenomenon tied to workplace stress, NOT general life fatigue
  const generalLifeFatigueDef = /(번아웃(은|이란)?\s*(일상생활의\s*모든\s*스트레스|삶의\s*모든\s*영역에서\s*생기는\s*피로|일반적인\s*생활\s*피로|단순한\s*만성\s*피로와\s*같은\s*의학적\s*질환|모든\s*영역의\s*스트레스))/i;
  if (generalLifeFatigueDef.test(fullText)) {
    return {
      valid: false,
      reason: 'Burnout definition violation: 번아웃을 일상 생활의 일반 피로나 모든 영역의 스트레스로 정의할 수 없습니다. 성공적으로 관리되지 않은 만성 직장 스트레스와 관련된 직업적 현상(occupational phenomenon, ICD-11)으로 정의해야 합니다.'
    };
  }

  const hasWorkplaceContext = /(직장|업무|직무|직업적|occupational|일과\s*관련)/i.test(fullText);
  const hasEnergyDepletion = /(에너지\s*고갈|소진|탈진)/i.test(fullText);
  const hasCynicismDistance = /(거리감|냉소|부정적\s*태도|심리적\s*거리)/i.test(fullText);
  const hasReducedEfficacy = /(효능감|성취감|직업적\s*효능감|업무\s*효율)/i.test(fullText);

  if (!hasWorkplaceContext || !hasEnergyDepletion || !hasCynicismDistance || !hasReducedEfficacy) {
    return {
      valid: false,
      reason: 'Burnout core dimensions missing: 번아웃은 만성 직장 스트레스와 관련된 직업적 현상(occupational phenomenon)으로서 3대 핵심 특징(에너지 고갈/소진, 일에 대한 냉소/거리감, 직업적 효능감 저하)을 명확히 설명해야 합니다.'
    };
  }

  // 5. Broad differential evaluation check
  const hasSleepDiff = /(수면\s*부족|수면\s*장애|수면무호흡|수면)/i.test(fullText);
  const hasPsychDiff = /(우울|불안|정신건강)/i.test(fullText);
  const hasAnemiaDiff = /(빈혈|철결핍|철분)/i.test(fullText);
  const hasEndoDiff = /(갑상선|내분비|대사)/i.test(fullText);
  const hasClinicDiff = /(의료기관|내과|혈액검사|전문\s*평가|감별)/i.test(fullText);
  const hasMecfsDiff = /(ME\/CFS|만성피로증후군)/i.test(fullText);

  const missingDiffs = [];
  if (!hasSleepDiff) missingDiffs.push('수면 부족/수면장애');
  if (!hasPsychDiff) missingDiffs.push('우울/불안 등 정신건강 문제');
  if (!hasAnemiaDiff) missingDiffs.push('빈혈/철결핍');
  if (!hasEndoDiff) missingDiffs.push('갑상선 등 내분비·대사 질환');
  if (!hasClinicDiff) missingDiffs.push('의료기관 감별 평가 안내');
  if (!hasMecfsDiff) missingDiffs.push('ME/CFS(만성피로증후군) 구분');

  if (missingDiffs.length > 0) {
    return {
      valid: false,
      reason: `Fatigue broad differential missing: 만성피로 글은 다양한 원인 감별(${missingDiffs.join(', ')})을 반드시 포함해야 합니다.`
    };
  }

  return { valid: true };
}

// Build canonical GEO names and aliases for clinic branch name verification
const allGeoTerms = new Set();
for (const r of geoHierarchy.regions) {
  if (r.displayName) allGeoTerms.add(r.displayName);
  if (r.parentRegion) allGeoTerms.add(r.parentRegion);
  if (r.fullName) {
    allGeoTerms.add(r.fullName);
    allGeoTerms.add(r.fullName.replace(/(시|구|동)$/, ''));
  }
  if (r.aliases) {
    for (const a of r.aliases) {
      allGeoTerms.add(a);
      allGeoTerms.add(a.replace(/(시|구|동)$/, ''));
    }
  }
}
['성남', '분당', '판교', '용인', '수지', '기흥', '처인구', '경기광주', '광주', '이천', '송파', '위례'].forEach(g => allGeoTerms.add(g));

const sortedGeoTerms = Array.from(allGeoTerms)
  .filter(t => t && t.length >= 2)
  .sort((a, b) => b.length - a.length);

const geoPatternString = sortedGeoTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const fabricatedBranchRegex = new RegExp(`(?:${geoPatternString})(?:시|구|동|역|지역)?\\s*(?:인근\\s*)?해아림\\s*한의원`, 'g');

/**
 * Validates clinic branch identity:
 * - Prohibits fabricated branch names like GEO + "해아림한의원" (e.g. "성남 해아림한의원", "용인 해아림한의원", "판교 해아림한의원")
 * - Official branch name is strictly "해아림한의원 분당점"
 * - Allows general GEO SEO contexts (e.g. "[성남 틱장애]...", "판교에서 틱장애를 상담하다 보면...")
 *
 * @param {string} text - The text to check (fullText, body, or title)
 * @returns {{ valid: boolean, errors: string[], matches?: string[] }}
 */
function checkClinicBranchName(text) {
  if (!text || typeof text !== 'string') return { valid: true, errors: [] };
  const errors = [];

  const matches = text.match(fabricatedBranchRegex);
  if (matches && matches.length > 0) {
    const uniqueMatches = Array.from(new Set(matches));
    errors.push(`Clinic Branch Identity violation: Fabricated branch name detected (${uniqueMatches.join(', ')}). 공식 병원명은 '해아림한의원 분당점'이며, 지역 키워드(GEO)와 결합된 임의 지점명(예: 성남 해아림한의원, 용인 해아림한의원, 판교 해아림한의원 등)은 엄격히 금지됩니다. (SEO GEO와 실제 지점명 분리 필수)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    matches: matches || []
  };
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
    thumbnailDiseaseLabel = articleData.thumbnailDiseaseLabel,
    seoDiseaseLabel = articleData.seoDiseaseLabel,
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
    } else if (titleDisease && diseasePart !== titleDisease) {
      errors.push(`Title disease identity mismatch: Title uses '${diseasePart}' instead of target disease '${titleDisease}'.`);
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

  // 4-0. Target Identity Validation for SEO (Hashtags & Keywords)
  const expectedSeo = seoDiseaseLabel ||
    (qaTarget && (qaTarget.seoDiseaseLabel || qaTarget.titleDisease)) ||
    titleDisease;
  if (expectedSeo && validDisease) {
    const parentName = validDisease.name;
    if (expectedSeo.trim() !== parentName.trim()) {
      const allSeoText = `${hashtags.join(' ')} ${keywords.join(' ')}`;
      const cleanExpectedSeo = expectedSeo.replace(/\s+/g, '');
      const hasExpected = allSeoText.includes(expectedSeo) || allSeoText.includes(cleanExpectedSeo);
      if (!hasExpected) {
        errors.push(`SEO identity leakage: Expected SEO disease label '${expectedSeo}' in hashtags/keywords, but it was missing.`);
      }

      const parentHashtagPrimary = `${validGeo ? validGeo.displayName : ''}${parentName.replace(/[^가-힣a-zA-Z0-9]/g, '')}`;
      if (hashtags.includes(parentHashtagPrimary)) {
        errors.push(`SEO identity leakage: Primary hashtag uses parent disease '${parentName}' ('${parentHashtagPrimary}') instead of specific target '${expectedSeo}'.`);
      }
    }
  }

  // 4-1. Smart Medication Discontinuation Check (Distinguishes safe warnings from stop recommendations)
  const medCheck = checkMedicationDiscontinuation(fullText);
  if (medCheck.violated) {
    errors.push(`Medical safety violation: 임의 약물 중단 권고 금지 (Matched: "${medCheck.sentence}")`);
  }

  // 4-1-1. Smart Treatment Certainty / Guarantee Check (Distinguishes safe cautionary negation from efficacy guarantees)
  const certaintyCheck = checkTreatmentCertainty(fullText);
  if (certaintyCheck.violated) {
    errors.push(`Medical safety violation: 치료 단정적 확신 표현 금지 (Matched: "${certaintyCheck.sentence}")`);
  }

  // 4-2. Contextual Age Group Consistency Validation (GLOBAL RULE)
  const articleNarrativeText = `${title}\n${summary}\n${body}`;
  const ageGroupCheck = checkContextualAgeGroup(articleNarrativeText, ageGroup);
  if (ageGroupCheck.violated) {
    errors.push(ageGroupCheck.reason);
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

  // 4-4. Specific Target Identity in Article Body
  const effectiveTargetDisease = titleDisease || (qaTarget && (qaTarget.titleDisease || qaTarget.displayDisease)) || '';
  if (effectiveTargetDisease.includes('뚜렛') && !body.includes('뚜렛')) {
    errors.push("Target identity violation: Target is Tourette ('뚜렛증후군'), but article body does not mention '뚜렛'.");
  }
  if (effectiveTargetDisease.includes('사회공포') && (!body.includes('사회공포') && !body.includes('발표불안'))) {
    errors.push("Target identity violation: Target is Social Phobia ('사회공포증'), but article body does not mention '사회공포' or '발표불안'.");
  }

  // 5. Structure Elements Check (Key Summary Box, Headings, FAQ)
  const hasKeySummary = body.includes('column-key-summary-box') || body.includes('핵심 요약');
  if (!hasKeySummary) {
    errors.push('Article must include a Key Summary Box (핵심 요약) in the introduction.');
  }

  // Duplicate H1 check (Markdown body must not start with or contain duplicate H1 matching front matter title)
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const h1Heading = h1Match[1].trim();
    const cleanTitle = (title || '').trim();
    if (h1Heading === cleanTitle || h1Heading.includes(cleanTitle) || cleanTitle.includes(h1Heading)) {
      errors.push(`Duplicate H1 violation: Markdown body contains duplicate H1 title '${h1Heading}' matching front matter title. Front matter title is already rendered by template.`);
    }
  }

  const h2Count = (body.match(/^##\s+.+$/gm) || []).length;
  if (h2Count < 4) {
    errors.push(`Article must have at least 4 H2 headings. Found: ${h2Count}`);
  }

  const faqCount = (body.match(/\*\*Q\d*[\.:\s]/g) || body.match(/자주\s*묻는\s*질문/g) || []).length;
  if (faqCount < 2) {
    errors.push('Article must contain FAQ questions and answers.');
  }

  // 6. Internal Links Verification (Must have 1~4 real verified links, strictly NO duplicate URLs)
  const links = extractInternalLinks(body);
  const validatedLinks = [];

  for (const l of links) {
    const isValid = isInternalUrlValid(l.url, blogDir);
    validatedLinks.push({ ...l, exists: isValid });
    if (!isValid) {
      errors.push(`Internal Link validation failed: URL '${l.url}' does not exist in repository.`);
    }
  }

  // Duplicate URL check within same article (Quality > Count, strictly NO duplicate URLs)
  const urlMap = new Map();
  for (const l of links) {
    const cleanUrl = l.url.split('#')[0].split('?')[0].replace(/\/$/, '');
    if (!urlMap.has(cleanUrl)) {
      urlMap.set(cleanUrl, []);
    }
    urlMap.get(cleanUrl).push(l.text || '');
  }

  for (const [cleanUrl, anchors] of urlMap.entries()) {
    if (anchors.length > 1) {
      const distinctAnchors = new Set(anchors);
      if (distinctAnchors.size > 1) {
        errors.push(`Internal Link duplicate URL violation (fabricated distinct anchors): URL '${cleanUrl}' appears ${anchors.length} times with distinct anchors [${Array.from(distinctAnchors).map(a => `"${a}"`).join(', ')}]. Do not fabricate artificial anchors to make a single URL appear as separate articles.`);
      } else {
        errors.push(`Internal Link duplicate URL violation: URL '${cleanUrl}' appears ${anchors.length} times in article. Each URL may appear at most once.`);
      }
    }
  }

  if (links.length < 1) {
    errors.push(`Article must contain at least 1 real internal link. Found: ${links.length}`);
  } else if (links.length > 4) {
    warnings.push(`Article contains ${links.length} internal links (recommended: 1~3).`);
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

    // 7-0. Target Identity Enforcement on Thumbnail (greenText)
    const expectedGreen = thumbnailDiseaseLabel ||
      (qaTarget && (qaTarget.thumbnailDiseaseLabel || qaTarget.titleDisease)) ||
      titleDisease;
    if (expectedGreen && greenText.trim() !== expectedGreen.trim()) {
      errors.push(`Thumbnail copy identity violation: greenText must be '${expectedGreen}', but got '${greenText}'.`);
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
  const effectiveImagePrompt = articleData.imagePrompt || options.imagePrompt;
  if (effectiveImagePrompt) {
    const promptLower = effectiveImagePrompt.toLowerCase();
    if (diseaseId === 'tic') {
      if (!promptLower.includes('child') && !promptLower.includes('adolescent')) {
        errors.push('Tic disorder thumbnail prompt must feature a child or adolescent.');
      }
      if (promptLower.includes('woman clutching') || promptLower.includes('chest or stomach')) {
        errors.push('Tic disorder thumbnail prompt must not feature adult woman clutching chest or stomach.');
      }
    }

    // Syncope subway-dizziness thumbnail image prompt validation (public transportation context required)
    const isSubwayAngle = angleId === 'subway-dizziness' || (qaTarget && qaTarget.topicAngle === 'subway-dizziness') || (articleData.topicAngle && articleData.topicAngle.id === 'subway-dizziness');
    if ((diseaseId === 'syncope' || isSubwayAngle) && isSubwayAngle) {
      const hasTransitContext = promptLower.includes('subway') || promptLower.includes('bus') || promptLower.includes('public transportation') || promptLower.includes('transit');
      if (!hasTransitContext) {
        errors.push('Syncope subway-dizziness thumbnail prompt must include public transportation context (subway, bus, or transit).');
      }
      const isOfficeHomeOnly = (promptLower.includes('office') || promptLower.includes('workspace') || promptLower.includes('desk') || promptLower.includes('home')) && !hasTransitContext;
      if (isOfficeHomeOnly) {
        errors.push('Syncope subway-dizziness thumbnail prompt cannot be restricted to office or home workspace only.');
      }
    }

    // Night terrors thumbnail image prompt validation (night/bedroom/sleep context required, daytime/drawing/distress forbidden)
    const isNightTerrorsPrompt = diseaseId === 'night-terrors' ||
      angleId === 'screaming-sleep' ||
      (qaTarget && (qaTarget.topicAngle === 'screaming-sleep' || qaTarget.id === 'qa-18-night-terrors')) ||
      (articleData.topicAngle && articleData.topicAngle.id === 'screaming-sleep') ||
      (titleDisease && titleDisease.includes('야경'));
    if (isNightTerrorsPrompt) {
      const hasNightSleepContext = promptLower.includes('night') || promptLower.includes('bedroom') || promptLower.includes('bedtime') || promptLower.includes('sleep');
      if (!hasNightSleepContext) {
        errors.push('Night terrors thumbnail prompt must include nighttime, bedroom, or sleep context.');
      }
      if (promptLower.includes('daytime') || promptLower.includes('drawing')) {
        errors.push('Night terrors thumbnail prompt must NOT feature daytime activity or drawing.');
      }
      if (promptLower.includes('screaming') && !promptLower.includes('no screaming')) {
        errors.push('Night terrors thumbnail prompt must NOT depict screaming symptoms.');
      }
      if (promptLower.includes('crying') && !promptLower.includes('no crying')) {
        errors.push('Night terrors thumbnail prompt must NOT depict crying symptoms.');
      }
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
    // Note: The official clinic name "해아림한의원 분당점" is used across all articles regardless of SEO GEO.
    // We strip the official clinic branch name when checking body foreign keywords so "분당" inside the official name does not false-positive.
    const bodyWithoutOfficialClinic = body.replace(/해아림\s*한의원\s*분당점/g, '');
    for (const forbidden of forbiddenKeywords) {
      if (bodyWithoutOfficialClinic.includes(forbidden)) {
        errors.push(`Geo consistency violation: Targeted for '${validGeo.displayName}', but found unrelated region keyword '${forbidden}' in article body.`);
      }
    }
    for (const forbidden of specificForbiddenStations) {
      if (bodyWithoutOfficialClinic.includes(forbidden)) {
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

  // 5. Clinic Brand / Branch Identity check: GEO + "해아림한의원" forbidden, official is "해아림한의원 분당점"
  const branchCheck = checkClinicBranchName(fullText);
  if (!branchCheck.valid) {
    errors.push(...branchCheck.errors);
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
      if (note.productionUsable === false || note.sourceVerified === false) {
        if (note.sourceTitle && fullText.includes(note.sourceTitle)) {
          errors.push(`Unverified / Non-production source citation violation: '${note.sourceTitle}' marked productionUsable=false is prohibited in production articles.`);
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

  // IBS-specific checks (qa-11-ibs / morning-diarrhea)
  if (diseaseId === 'ibs' || angleId === 'morning-diarrhea') {
    // 1) 단순 스트레스/긴장성 설사/복통만으로 IBS 단정 금지
    const simplisticIbsDef = /(긴장(하|될|할)\s*때마다?|스트레스(를\s*받으면|받을\s*때마다?))\s*(설사|복통)(가|이|\s*)*(반복되면|나타나면)\s*(곧|모두|바로)?\s*(과민성대장증후군으로\s*진단|과민성대장증후군(이다|입니다)|IBS로\s*진단)/i;
    if (simplisticIbsDef.test(fullText)) {
      errors.push('IBS diagnostic rule violation: 단순히 긴장이나 스트레스 시 설사/복통이 반복된다는 사실만으로 과민성대장증후군으로 단정할 수 없으며, 배변과의 관계 및 배변 빈도/변 형태 변화를 함께 평가해야 합니다.');
    }

    // 2) 복통 + 배변/변 형태·빈도 관계 평가 반영 여부
    const hasAbdominalPain = fullText.includes('복통') || fullText.includes('배의 통증') || fullText.includes('배가 아프');
    const hasBowelRelation = (
      fullText.includes('배변과의 관계') ||
      fullText.includes('배변과 연관') ||
      fullText.includes('배변 후') ||
      fullText.includes('변 형태') ||
      fullText.includes('배변 빈도') ||
      fullText.includes('배변 횟수') ||
      fullText.includes('대변 형태')
    );
    if (!hasAbdominalPain || !hasBowelRelation) {
      errors.push('IBS diagnostic criteria missing: 과민성대장증후군 설명 시 반복되는 복통과 함께 배변과의 관계(배변 후 호전/악화) 또는 배변 빈도/변 형태 변화와의 연관성을 함께 평가해야 한다는 내용이 반드시 포함되어야 합니다.');
    }

    // 3) 특정 음식 일괄 묶음 단정 및 밀가루 단정 금지
    const blanketFoodLumping = /(유제품,\s*밀가루,\s*카페인|밀가루,\s*유제품,\s*카페인).*?(모든\s*환자에게\s*공통|대표적(인)?\s*악화\s*음식|반드시\s*피해야)/i;
    const flourBlanketBlame = /(밀가루(는|가|를)?\s*(과민성대장의?\s*주요\s*원인|대표적(인)?\s*악화\s*음식|장을\s*망치는\s*주범|모든\s*환자가\s*피해야))/i;
    if (blanketFoodLumping.test(fullText) || flourBlanketBlame.test(fullText)) {
      errors.push('IBS dietary guidance violation: 유제품, 밀가루, 카페인을 모든 환자의 공통 악화 음식으로 묶거나 밀가루 자체를 포괄적 악화 음식으로 단정하지 마십시오. 개인별 음식-증상 관계를 파악하도록 서술해야 합니다.');
    }

    // 4) 복부 따뜻하게 유지를 핵심 치료 원리로 표현 금지
    const warmAbdomenAsCoreTreatment = /(복부(를|\s*를)?\s*(따뜻하게|온열|보온).*?(핵심\s*치료|근본\s*치료|치료의\s*핵심|치료\s*원리))/i;
    if (warmAbdomenAsCoreTreatment.test(fullText)) {
      errors.push('IBS lifestyle guidance violation: 복부를 따뜻하게 유지는 편안함을 돕는 보조적인 생활 요령으로만 표현해야 하며 핵심 치료 원리로 서술할 수 없습니다.');
    }
  }

  // Dizziness-specific checks (qa-14-dizziness / chronic-dizziness)
  const isDizzinessTarget = angleId === 'chronic-dizziness' ||
    (qaTarget && qaTarget.topicAngle === 'chronic-dizziness') ||
    (diseaseId === 'headache' && (titleDisease === '어지럼증' || title.includes('어지럼증')));

  if (isDizzinessTarget) {
    // 1) ENT 정상 → 경추/자율신경 원인 자동 귀결 금지
    const entJumpCheck = checkDizzinessEntCervicalAutoJump(fullText);
    if (entJumpCheck.violated) {
      errors.push(`Dizziness cause framing violation: 이비인후과 검사 정상 소견을 경추 또는 자율신경 문제로 바로 연결하거나 자동 귀결할 수 없습니다. (Matched: "${entJumpCheck.sentence}")`);
    }

    // 2) 경추 원인 독점/단정 금지
    const cervicalRootCauseClaim = /(어지럼증의\s*(근본\s*원인은|주요\s*원인은|핵심\s*원인은|직접적\s*원인은)\s*(경추|목\s*긴장|목어깨\s*긴장|일자목))/i;
    if (cervicalRootCauseClaim.test(fullText)) {
      errors.push('Dizziness cervical framing violation: 목·어깨 긴장 및 경추 문제는 동반된 긴장이 있고 자세에 따라 불편감이 변하는 일부 경우 함께 평가할 수 있는 요소로만 서술해야 합니다.');
    }

    // 3) 요약(summary)에서 경추·자율신경으로 원인을 좁히지 않기
    const summaryCervicalNarrowing = /(경추·자율신경계\s*긴장|경추\s*긴장에\s*대한\s*한의학적)/i;
    if (summaryCervicalNarrowing.test(summary)) {
      errors.push('Dizziness summary framing violation: 요약(summary)에서 경추나 자율신경계 긴장으로 원인을 좁히지 마십시오. 동반 증상과 다양한 원인을 구분하는 포괄적 관점으로 작성해야 합니다.');
    }

    // 4) 다양한 감별 필요성 누락 시 FAIL
    const diffKeywords = ['전정', '편두통', 'PPPD', '기립', '순환', '신경학', '내과', '약물', '감별'];
    const matchedCount = diffKeywords.filter(kw => fullText.includes(kw)).length;
    if (matchedCount < 2) {
      errors.push('Dizziness differential evaluation missing: 지속되는 비회전성 어지럼증은 전정계 질환, 전정편두통, PPPD 등 기능성 전정질환, 기립성/순환기 문제, 신경학적/내과적 원인, 약물 등 다양한 감별 평가 필요성을 포함해야 합니다.');
    }
  }

  // Syncope-specific checks (qa-12-syncope / subway-dizziness): Syncope vs Presyncope concept distinction
  const isSyncopeTarget = diseaseId === 'syncope' ||
    angleId === 'subway-dizziness' ||
    (qaTarget && qaTarget.topicAngle === 'subway-dizziness') ||
    (titleDisease && titleDisease.includes('실신')) ||
    (title && title.includes('실신'));

  if (isSyncopeTarget) {
    const syncopeDefCheck = checkSyncopePresyncopeDistinction(fullText);
    if (!syncopeDefCheck.valid) {
      errors.push(syncopeDefCheck.reason);
    }
  }

  // Depression-specific checks (qa-15-depression / burnout-lethargy)
  const isDepressionTarget = diseaseId === 'depression' ||
    (titleDisease && titleDisease.includes('우울')) ||
    angleId === 'burnout-lethargy' ||
    (qaTarget && (qaTarget.topicAngle === 'burnout-lethargy' || qaTarget.id === 'qa-15-depression'));

  if (isDepressionTarget && angleId !== 'intrusive-thoughts') {
    const ocdLeakCheck = checkDepressionOcdSectionLeakage(body);
    if (!ocdLeakCheck.valid) {
      errors.push(ocdLeakCheck.reason);
    }
  }

  // OCD-specific checks (qa-16-ocd / intrusive-thoughts)
  const isOcdTarget = diseaseId === 'ocd' ||
    angleId === 'intrusive-thoughts' ||
    (qaTarget && (qaTarget.topicAngle === 'intrusive-thoughts' || qaTarget.id === 'qa-16-ocd')) ||
    (titleDisease && (titleDisease.includes('강박') || titleDisease.includes('OCD')));

  if (isOcdTarget) {
    const ocdCheck = checkOcdViciousCycleAndTreatments(fullText);
    if (!ocdCheck.valid) {
      errors.push(ocdCheck.reason);
    }
  }

  // Separation Anxiety specific checks (qa-17-separation-anxiety / school-reluctance)
  const isSeparationAnxietyTarget = diseaseId === 'separation-anxiety' ||
    angleId === 'school-reluctance' ||
    (qaTarget && (qaTarget.topicAngle === 'school-reluctance' || qaTarget.id === 'qa-17-separation-anxiety')) ||
    (titleDisease && titleDisease.includes('분리불안'));

  if (isSeparationAnxietyTarget) {
    const sepCheck = checkSeparationAnxietyDistinction(fullText);
    if (!sepCheck.valid) {
      errors.push(sepCheck.reason);
    }
  }

  // Night Terrors specific checks (qa-18-night-terrors / screaming-sleep)
  const isNightTerrorsTarget = diseaseId === 'night-terrors' ||
    angleId === 'screaming-sleep' ||
    (qaTarget && (qaTarget.topicAngle === 'screaming-sleep' || qaTarget.id === 'qa-18-night-terrors')) ||
    (titleDisease && titleDisease.includes('야경'));

  if (isNightTerrorsTarget) {
    const ntCheck = checkNightTerrorsTitleAndClinical(title, fullText);
    if (!ntCheck.valid) {
      errors.push(ntCheck.reason);
    }
  }

  // Child Enuresis specific checks (qa-19-child-enuresis / child-enuresis)
  const isChildEnuresisTarget = (diseaseId === 'child' && angleId === 'child-enuresis') ||
    (qaTarget && (qaTarget.topicAngle === 'child-enuresis' || qaTarget.id === 'qa-19-child-enuresis')) ||
    (titleDisease && titleDisease.includes('야뇨')) ||
    (title && title.includes('야뇨'));

  if (isChildEnuresisTarget) {
    const enuresisCheck = checkChildEnuresisClinicalAndStandardCare(fullText);
    if (!enuresisCheck.valid) {
      errors.push(enuresisCheck.reason);
    }
  }

  // Fatigue & Burnout specific checks (qa-20-fatigue / brain-fog-fatigue)
  const isFatigueTarget = (diseaseId === 'autonomic' && angleId === 'brain-fog-fatigue') ||
    (qaTarget && (qaTarget.topicAngle === 'brain-fog-fatigue' || qaTarget.id === 'qa-20-fatigue')) ||
    (titleDisease && (titleDisease.includes('만성피로') || titleDisease.includes('번아웃'))) ||
    (title && (title.includes('만성피로') || title.includes('번아웃') || title.includes('브레인포그')));

  if (isFatigueTarget) {
    const fatigueCheck = checkFatigueBurnoutAndAutonomicFraming(fullText);
    if (!fatigueCheck.valid) {
      errors.push(fatigueCheck.reason);
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
  getGeoHierarchyRules,
  checkContextualAgeGroup,
  checkMedicationDiscontinuation,
  checkTreatmentCertainty,
  checkDizzinessEntCervicalAutoJump,
  checkSyncopePresyncopeDistinction,
  checkDepressionOcdSectionLeakage,
  checkOcdViciousCycleAndTreatments,
  checkSeparationAnxietyDistinction,
  checkNightTerrorsTitleAndClinical,
  checkChildEnuresisClinicalAndStandardCare,
  checkFatigueBurnoutAndAutonomicFraming,
  checkClinicBranchName
};

