const fs = require('fs');
const path = require('path');

const PLANNER_MODEL = process.env.OPENAI_PLANNER_MODEL || 'gpt-5.6-luna';
const WRITER_MODEL = process.env.OPENAI_WRITER_MODEL || 'gpt-5.6-terra';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

/**
 * Loads approved medical knowledge for a disease
 */
function loadMedicalKnowledge(diseaseId) {
  const filePath = path.join(__dirname, 'medical_knowledge', `${diseaseId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Medical knowledge file not found for disease: ${diseaseId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Helper to call OpenAI API using fetch
 */
async function callOpenAiApi(apiKey, endpoint, body) {
  const resp = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`OpenAI API error (${resp.status} ${resp.statusText}): ${errorText}`);
  }

  return await resp.json();
}

/**
 * 1. Generate Topic Outline & Mandatory Summary using Planner Model (gpt-5.6-luna)
 */
async function generateTopicOutline(plan, knowledge, apiKey, telemetry) {
  const fallbackSummary = `${plan.geo.displayName} 지역 주민들을 위한 [${plan.disease.name}] ${plan.topicAngle.titleSuffix}에 대한 임상적 관점과 생활 관리 가이드입니다.`;

  if (!apiKey) {
    return {
      title: plan.titleCandidate,
      summary: fallbackSummary,
      outline: [
        '1. 진료실에서 자주 마주하는 환자분들의 고민',
        '2. 신경생물학적 특성과 증상에 영향을 미치는 관련 요인들',
        '3. 비슷한 다른 상태와 감별하여 살펴볼 점',
        '4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점',
        '5. 일상생활에서 실천할 수 있는 적극적 대처 수칙',
        '6. 자주 묻는 질문 (FAQ)'
      ]
    };
  }

  const prompt = `
당신은 해아림한의원의 의학 칼럼 기획자입니다.
다음 승인된 의료 지식을 바탕으로 환자 질문에 답하는 칼럼 아웃라인과 핵심 요약(summary)을 작성하세요.

[칼럼 기본 정보]
- 지역: ${plan.geo.displayName} (${plan.geo.fullName})
- 질환: ${plan.disease.name} (${plan.disease.categoryName})
- 주제 앵글: ${plan.topicAngle.titleSuffix} (${plan.topicAngle.focus})
- 권장 제목: ${plan.titleCandidate}

[승인된 의료 지식]
- 정의: ${knowledge.approvedDefinition}
- 주요 증상: ${knowledge.commonSymptoms.join(', ')}
- 악화 요인: ${knowledge.possibleAggravatingFactors.join(', ')}
- 검사 안내: ${knowledge.evaluationGuidance}
- 생활 관리: ${knowledge.lifestyleTips.join(', ')}

[엄격 제약사항]
1. 제목(title)은 반드시 '[${plan.geo.displayName} ${plan.disease.name}] 구체적 주제' 형태여야 합니다.
2. 요약(summary)은 1~2문장(30자~120자)의 완성된 한글 문장으로 필수 작성해야 하며 절대 빈 문자열이면 안 됩니다.
3. 완치, 근본 치료, 기저핵 흥분 안정, 자율신경 정상화 등 단정적 기전 표현 금지.
4. 특정 미디어나 생활 습관이 질환의 단일 원인인 것처럼 단정하지 마십시오.
5. 보수적이고 신중한 임상 관점 사용.

반드시 다음 JSON 구조로 응답하십시오:
{
  "title": "[${plan.geo.displayName} ${plan.disease.name}] ${plan.topicAngle.titleSuffix}",
  "summary": "환자분들이 겪는 증상의 악화 요인과 생활 속 관리 수칙을 안내하는 칼럼 요약문입니다.",
  "outline": ["1. ...", "2. ...", "3. ...", "4. ...", "5. ...", "6. ..."]
}
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: PLANNER_MODEL,
    messages: [
      { role: 'system', content: '당신은 한의학 전문 칼럼 플래너입니다. summary와 outline이 포함된 유효한 JSON으로만 응답합니다.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  if (telemetry && response.usage) {
    telemetry.lunaInTokens += response.usage.prompt_tokens || 0;
    telemetry.lunaOutTokens += response.usage.completion_tokens || 0;
  }

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    result = {};
  }

  const rawSummary = result.summary || result.description || result.summaryDescription || '';
  const finalSummary = rawSummary.trim().length >= 20 ? rawSummary.trim() : fallbackSummary;

  return {
    title: result.title || plan.titleCandidate,
    summary: finalSummary,
    outline: Array.isArray(result.outline) && result.outline.length >= 4 ? result.outline : [
      '1. 진료실에서 자주 마주하는 고민',
      '2. 신경생물학적 특성과 증상에 영향을 미칠 수 있는 관련 요인들',
      '3. 비슷한 다른 상태와 감별하여 살펴볼 점',
      '4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점',
      '5. 일상생활에서 실천할 수 있는 적극적 대처 수칙',
      '6. 자주 묻는 질문 (FAQ)'
    ]
  };
}

/**
 * 2. Generate Full Medical Article Body using Writer Model (gpt-5.6-terra)
 */
async function generateArticleBody(plan, outline, knowledge, internalLinks, apiKey, telemetry) {
  const linksListMd = internalLinks.map(l => `- [${l.title}](${l.url})`).join('\n');
  const evidenceSnippet = knowledge.evidenceNotes ? JSON.stringify(knowledge.evidenceNotes, null, 2) : 'None';

  if (!apiKey) {
    return `
<div class="column-key-summary-box">
  <div class="summary-header">
    <i class="ph-fill ph-lightbulb"></i> 핵심 요약
  </div>
  <ul class="summary-list">
    <li><strong>${knowledge.approvedDefinition}</strong></li>
    <li>증상의 악화와 변동에는 ${knowledge.possibleAggravatingFactors.slice(0, 2).join(', ')} 등이 복합적으로 영향을 줄 수 있습니다.</li>
    <li>개인의 체질과 긴장 상태를 면밀히 살펴 ${knowledge.treatmentGuidance}를 진행합니다.</li>
    <li>가정에서는 ${knowledge.lifestyleTips[0]} 등의 생활 수칙을 함께 실천하는 것이 도움됩니다.</li>
  </ul>
</div>

## 1. 진료실에서 자주 마주하는 고민

${plan.geo.displayName} 지역에서 ${plan.disease.name} 증상으로 상담을 청하시는 분들 중 많은 경우가 "일상 속에서 겪는 변화가 증상에 어떤 영향을 주는지"에 대해 깊은 염려를 표하십니다.
진료실에서 보호자분들이 흔히 묻는 질문 중 하나는 "미디어나 자극적인 활동이 증상을 더 악화시키는 것은 아닌지"에 대한 고민입니다.

## 2. 신경생물학적 특성과 증상에 영향을 미치는 관련 요인들

${knowledge.approvedDefinition}
임상과 기초 연구에 따르면 질환의 근본적인 생물학적 특성과 증상의 일상적 변동 요인은 구분하여 이해할 필요가 있습니다.

- ${knowledge.possibleAggravatingFactors.join('\n- ')}

미디어 사용이나 특정 자극 자체가 질환의 직접적인 단일 원인(causation)이라기보다는, 보상·각성 시스템의 높은 자극과 피로가 겹치는 시기에 증상이 더 두드러져 보일 수 있습니다.
자세한 진료 과목 안내는 [${internalLinks[0]?.title || '주요 진료 안내'}](${internalLinks[0]?.url || '/treatments/'})에서도 확인하실 수 있습니다.

## 3. 비슷한 다른 상태와 감별하여 살펴볼 점

초기 증상의 양상을 파악하는 것이 중요합니다:
- ${knowledge.commonSymptoms.join('\n- ')}

단순한 일시적 피로 반응인지 지속적인 관찰과 체계적인 관리가 필요한 상태인지 신중하게 구별하여 접근하는 것이 바람직합니다.
관련 질환에 대한 참고 정보는 [${internalLinks[1]?.title || '온라인 상담 안내'}](${internalLinks[1]?.url || '/inquiry/'})를 통해 문의하실 수 있습니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점

${knowledge.evaluationGuidance}
해아림한의원에서는 ${knowledge.treatmentGuidance}를 통해 환자 개개인의 균형 있는 회복을 돕고 있습니다.

## 5. 일상생활에서 실천할 수 있는 적극적 대처 수칙

1. **자극 완화와 노출 조절**: ${knowledge.lifestyleTips[1] || '불필요한 과도한 미디어 노출 줄이기'}
2. **증상 변화 관찰**: ${knowledge.lifestyleTips[2] || '미디어 사용량 조절 전후의 증상 변화를 차분하게 관찰'}
3. **안정적인 수면 리듬**: ${knowledge.lifestyleTips[3] || knowledge.lifestyleTips[0]}

## 6. 자주 묻는 질문 (FAQ)

**Q1. ${knowledge.faqCandidates[0]?.q || '증상이 있을 때 어떻게 대처하나요?'}**  
A. ${knowledge.faqCandidates[0]?.a || '무리하게 지적하지 않고 편안한 환경에서 상태를 관찰하는 것이 권장됩니다.'}

**Q2. ${knowledge.faqCandidates[1]?.q || '치료 기간은 개인마다 다른가요?'}**  
A. ${knowledge.faqCandidates[1]?.a || '증상의 지속 기간과 체질에 따라 차이가 있으므로 1:1 상담을 통해 맞춤 계획을 세웁니다.'}

---

### 🔗 함께 읽어보면 좋은 연관 안내
${linksListMd}
`;
  }

  const prompt = `
당신은 해아림한의원 대표원장의 관점에서 의학 칼럼 본문을 작성하는 전문 의료 작가입니다.

[칼럼 기본 정보]
- 지역: ${plan.geo.displayName} (${plan.geo.fullName})
- 질환: ${plan.disease.name}
- 제목: ${plan.titleCandidate}
- 요약: ${outline.summary}

[승인된 의료 지식]
- 정의: ${knowledge.approvedDefinition}
- 주요 증상: ${knowledge.commonSymptoms.join(', ')}
- 악화 요인: ${knowledge.possibleAggravatingFactors.join(', ')}
- 근거 수준 참고: ${evidenceSnippet}
- 검사 안내: ${knowledge.evaluationGuidance}
- 치료 관점: ${knowledge.treatmentGuidance}
- 생활 관리: ${knowledge.lifestyleTips.join(', ')}
- 금지 문구: ${knowledge.bannedPhrases.join(', ')}
- 질환별 특수 규칙: ${(knowledge.specificRules || []).join(' / ')}

[사용 가능한 검증된 내부링크 후보 (본문 자연스러운 문맥에 2~3개 반드시 삽입)]
${linksListMd}

[원장칼럼 작성 규칙 및 의료 안전 원칙]
1. 최상단에 반드시 <div class="column-key-summary-box"> 핵심 요약 3~4항목 포함.
2. H2 목차는 최소 4개 이상 논리적으로 전개.
3. FAQ는 최소 3문항 이상 Q&A 볼드체(**Q1.**, **Q2.**, **Q3.**)로 작성.
4. 문체는 "진료실에서 환자분들과 보호자분들이 자주 궁금해하시는 질문"에 친절하고 보수적으로 답하는 원장칼럼 톤을 유지하십시오. (가상의 극적인 환자 사례 생성 금지)
5. 지역명(${plan.geo.displayName})은 본문 전체에서 1~2회만 자연스럽게 언급하고 다른 인근/하위 지역명은 절대 언급하지 마십시오.
6. [의학적 정확성 & 인과관계 표현]
   - 질환의 '근본 생물학적 특성'과 '증상을 악화/변동시키는 요인'을 명확히 구분하십시오.
   - 단일 요인(예: 스마트폰, 커피, 특정 음식)이 질환의 직접적인 원인(causation)인 것처럼 단정하지 마십시오. ("연관될 수 있음", "증상이 두드러지는 시기와 겹칠 수 있음" 등의 보수적 연관성(association) 표현 사용)
   - "취침 전 1~2시간만 제한" 등 근거 없는 일률적인 시간/숫자 기준을 제시하지 말고, 전체적인 자극 노출량을 줄이고 증상 변화를 관찰하는 방향으로 서술하십시오.
   - 완치, 근본 치료, 기저핵/자율신경/뇌기능 정상화, 신경전달물질 완벽 조절, 약물 임의 중단 유도 금지.
7. [내부링크 필수 삽입] 위 제공된 내부링크 목록 중 최소 2개를 본문 문맥이나 하단 연관 안내에 [제목](URL) 형식으로 삽입하십시오.

마크다운 형식으로만 반환하십시오.
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: WRITER_MODEL,
    messages: [
      { role: 'system', content: '당신은 보수적이고 신뢰성 높은 한의학 전문 칼럼니스트입니다.' },
      { role: 'user', content: prompt }
    ]
  });

  if (telemetry && response.usage) {
    telemetry.terraInTokens += response.usage.prompt_tokens || 0;
    telemetry.terraOutTokens += response.usage.completion_tokens || 0;
  }

  return response.choices[0].message.content;
}

/**
 * 3. Generate Strict Thumbnail Copy using Planner Model (gpt-5.6-luna) with Retry & Validation
 */
async function generateThumbnailCopy(plan, articleBody, apiKey, telemetry, retryCount = 0) {
  const fallbackCopy = {
    yellowText: '원인 모를',
    whiteText: plan.topicAngle.titleSuffix.slice(0, 12),
    greenText: plan.disease.name
  };

  if (!apiKey) {
    return fallbackCopy;
  }

  const prompt = `
당신은 해아림한의원 800x800 썸네일 카피라이터입니다.
칼럼 본문을 바탕으로 썸네일용 3줄 한글 카피를 JSON으로 추출하세요.

[규칙 및 제약사항]
1. yellowText (상단 노랑): 환자의 상황 또는 고민 훅 (1~8자 한글, 자연스러운 한국어 띄어쓰기 필수, 빈칸 금지, 예: "원인 모를", "갑자기 찾아오는", "아이의 틱", "나도 모르게")
2. whiteText (중간 흰색): 대표 증상 또는 핵심 질문 (1~12자 한글, 자연스러운 한국어 띄어쓰기 필수, 빈칸 금지, 예: "어지럼증·소화불량", "두근거림·숨막힘", "스마트폰 사용 늘었다면")
3. greenText (하단 초록): 질환명 (1~8자 한글, 반드시 '${plan.disease.name}', 빈칸 금지)
4. 지역명(${plan.geo.displayName}, 분당, 성남, 용인, 수지 등)은 3개 문구 어디에도 절대 포함하지 마십시오.
5. "나도모르게", "눈깜빡임·헛기침"처럼 띄어쓰기를 무시하고 붙여 쓰지 마십시오. 반드시 올바른 맞춤법/띄어쓰기를 준수하십시오.

반드시 다음 JSON 형식으로만 응답해야 하며, 각 필드는 절대 빈 문자열("")이어서는 안 됩니다:
{
  "yellowText": "원인 모를",
  "whiteText": "어지럼증·소화불량",
  "greenText": "${plan.disease.name}"
}
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: PLANNER_MODEL,
    messages: [
      { role: 'system', content: '당신은 썸네일 카피라이터입니다. 자연스러운 띄어쓰기가 적용된 yellowText, whiteText, greenText JSON으로만 응답합니다.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  if (telemetry && response.usage) {
    telemetry.lunaInTokens += response.usage.prompt_tokens || 0;
    telemetry.lunaOutTokens += response.usage.completion_tokens || 0;
  }

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    result = {};
  }

  let yellow = (result.yellowText || '').trim();
  let white = (result.whiteText || '').trim();
  let green = (result.greenText || '').trim();

  const isInvalid = !yellow || yellow.length > 15 ||
                    !white || white.length > 18 ||
                    !green || green.length > 12 ||
                    yellow.includes(plan.geo.displayName) ||
                    white.includes(plan.geo.displayName) ||
                    green.includes(plan.geo.displayName);

  if (isInvalid) {
    if (retryCount < 2) {
      console.warn(`⚠️ Thumbnail copy invalid (${JSON.stringify(result)}). Retrying (attempt ${retryCount + 1}/2)...`);
      return await generateThumbnailCopy(plan, articleBody, apiKey, telemetry, retryCount + 1);
    } else {
      yellow = yellow || fallbackCopy.yellowText;
      white = white || fallbackCopy.whiteText;
      green = green || fallbackCopy.greenText;
    }
  }

  return {
    yellowText: yellow,
    whiteText: white,
    greenText: green
  };
}

/**
 * 4. Generate Single Photo Background Image using gpt-image-2 (Strict Single-Subject Constraint)
 */
async function generateBackgroundImage(diseaseName, topicFocus, apiKey, telemetry) {
  if (!apiKey) {
    return null;
  }

  const imagePrompt = `A single, focused, realistic photo of ONE person representing comfort and clinical mindfulness for ${diseaseName} (${topicFocus}). Single subject only, centered composition, soft natural lighting, photorealistic. Strictly NO collage, NO split screen, NO multi-panel, NO text, NO letters, NO words, NO logos, NO signs, NO watermark.`;

  const response = await callOpenAiApi(apiKey, 'images/generations', {
    model: IMAGE_MODEL,
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024'
  });

  if (telemetry) {
    telemetry.imageCount += 1;
  }

  const item = response.data && response.data[0];
  if (!item) {
    throw new Error('No image item found in OpenAI Images API response.');
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const imgFetch = await fetch(item.url);
    if (!imgFetch.ok) {
      throw new Error(`Failed to download image from OpenAI URL: ${imgFetch.statusText}`);
    }
    const arrayBuf = await imgFetch.arrayBuffer();
    return Buffer.from(arrayBuf);
  } else {
    throw new Error(`Unexpected image response data structure: ${JSON.stringify(item)}`);
  }
}

module.exports = {
  loadMedicalKnowledge,
  generateTopicOutline,
  generateArticleBody,
  generateThumbnailCopy,
  generateBackgroundImage
};
