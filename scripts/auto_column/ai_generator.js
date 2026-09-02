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
 * Helper to call OpenAI API using fetch with JSON structured schema
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
 * 1. Generate Topic Outline using Lightweight Planner Model (gpt-5.6-luna)
 */
async function generateTopicOutline(plan, knowledge, apiKey, telemetry) {
  if (!apiKey) {
    // Return deterministic mock outline for offline test mode
    return {
      title: plan.titleCandidate,
      summary: `${plan.geo.displayName} 지역 주민들을 위한 [${plan.disease.name}] ${plan.topicAngle.titleSuffix}에 대한 임상 관점과 한방 관리 가이드입니다.`,
      outline: [
        { h2: '1. 진료실에서 자주 마주하는 환자분들의 고민' },
        { h2: '2. 증상이 나타나는 알려진 주요 관련 요인' },
        { h2: '3. 일상에서 증상을 악화시킬 수 있는 자극들' },
        { h2: '4. 상태 평가 및 진료 시 함께 살펴보는 부분' },
        { h2: '5. 가정에서 실천할 수 있는 생활 속 대처 요령' },
        { h2: '6. 자주 묻는 질문 (FAQ)' }
      ]
    };
  }

  const prompt = `
당신은 해아림한의원 분당점의 의학 칼럼 기획자입니다.
다음 승인된 의료 지식을 바탕으로 환자 질문에 답하는 칼럼 아웃라인을 JSON 형식으로 작성하세요.

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
1. 제목 형식은 반드시 '[${plan.geo.displayName} ${plan.disease.name}] 구체적 주제' 형태여야 합니다.
2. 완치, 근본 치료, 기저핵 흥분 안정, 자율신경 정상화 등 단정적 기전 표현 금지.
3. 보수적이고 신중한 임상 관점 사용.
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: PLANNER_MODEL,
    messages: [
      { role: 'system', content: '당신은 한의학 전문 칼럼 플래너입니다. JSON 형식으로만 응답합니다.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });

  if (telemetry && response.usage) {
    telemetry.lunaInTokens += response.usage.prompt_tokens || 0;
    telemetry.lunaOutTokens += response.usage.completion_tokens || 0;
  }

  const result = JSON.parse(response.choices[0].message.content);
  return result;
}

/**
 * 2. Generate Full Medical Article Body using Writer Model (gpt-5.6-terra)
 */
async function generateArticleBody(plan, outline, knowledge, internalLinks, apiKey, telemetry) {
  if (!apiKey) {
    // Deterministic mock body for offline testing
    const internalLinksMd = internalLinks.map(l => `- [${l.title}](${l.url})`).join('\n');
    return `
<div class="column-key-summary-box">
  <div class="summary-header">
    <i class="ph-fill ph-lightbulb"></i> 핵심 요약
  </div>
  <ul class="summary-list">
    <li><strong>${knowledge.approvedDefinition}</strong></li>
    <li>증상의 악화에는 ${knowledge.possibleAggravatingFactors.slice(0, 2).join(', ')} 등이 복합적으로 영향을 줄 수 있습니다.</li>
    <li>개인의 체질과 긴장 상태를 면밀히 살펴 ${knowledge.treatmentGuidance}를 진행합니다.</li>
    <li>가정에서는 ${knowledge.lifestyleTips[0]} 등의 생활 수칙을 함께 실천하는 것이 도움됩니다.</li>
  </ul>
</div>

## 1. 진료실에서 자주 마주하는 고민

${plan.geo.displayName} 지역에서 ${plan.disease.name} 증상으로 상담을 청하시는 분들 중 많은 경우가 일상 속 작은 변화에서 시작된 불편을 호소하십니다.
갑작스럽게 나타나는 증상은 환자 본인뿐만 아니라 지켜보는 가족들에게도 큰 염려가 되기 마련입니다.

## 2. 증상에 영향을 미칠 수 있는 관련 요인들

${knowledge.approvedDefinition}
임상에서는 다음과 같은 요인들이 복합적으로 관여할 수 있다고 알려져 있습니다:

- ${knowledge.possibleAggravatingFactors.join('\n- ')}

## 3. 비슷한 다른 상태와 감별하여 살펴볼 점

흔히 나타나는 초기 증상으로는 다음이 있습니다:
- ${knowledge.commonSymptoms.join('\n- ')}

단순한 일시적 피로 반응인지 지속적인 평가가 필요한지 신중하게 구별하여 접근하는 것이 바람직합니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점

${knowledge.evaluationGuidance}
해아림한의원 분당점에서는 ${knowledge.treatmentGuidance}를 통해 환자 개개인의 건강한 회복을 돕고 있습니다.

## 5. 일상생활에서 실천할 수 있는 대처 수칙

1. **생활 리듬 안정**: ${knowledge.lifestyleTips[0]}
2. **자극 완화**: ${knowledge.lifestyleTips[1] || '스트레스 이완'}
3. **충분한 휴식**: ${knowledge.lifestyleTips[2] || '충분한 수면 확보'}

## 6. 자주 묻는 질문 (FAQ)

**Q1. ${knowledge.faqCandidates[0]?.q || '증상이 있을 때 어떻게 대처하나요?'}**  
A. ${knowledge.faqCandidates[0]?.a || '무리하게 자극하지 않고 편안한 환경에서 상태를 관찰하는 것이 권장됩니다.'}

**Q2. ${knowledge.faqCandidates[1]?.q || '치료 기간은 개인마다 다른가요?'}**  
A. ${knowledge.faqCandidates[1]?.a || '증상의 지속 기간과 체질에 따라 차이가 있으므로 1:1 상담을 통해 맞춤 계획을 세웁니다.'}

${internalLinksMd ? `\n---\n\n### 🔗 함께 읽어보면 좋은 연관 칼럼\n${internalLinksMd}` : ''}
`;
  }

  const prompt = `
당신은 해아림한의원 분당점 손지웅 대표원장의 관점에서 의학 칼럼 본문을 작성하는 의료 전문 작가입니다.

[기본 정보]
- 지역: ${plan.geo.displayName} (${plan.geo.fullName})
- 질환: ${plan.disease.name}
- 제목: ${plan.titleCandidate}
- 요약: ${outline.summary}

[승인된 의료 지식 - 철저 준수]
- 정의: ${knowledge.approvedDefinition}
- 주요 증상: ${knowledge.commonSymptoms.join(', ')}
- 악화 요인: ${knowledge.possibleAggravatingFactors.join(', ')}
- 검사 안내: ${knowledge.evaluationGuidance}
- 치료 관점: ${knowledge.treatmentGuidance}
- 생활 관리: ${knowledge.lifestyleTips.join(', ')}
- 금지 문구: ${knowledge.bannedPhrases.join(', ')}

[작성 규칙]
1. 최상단에 반드시 <div class="column-key-summary-box"> 핵심 요약 3~4항목 포함.
2. H2 목차는 최소 4개 이상 논리적으로 전개.
3. FAQ는 최소 3문항 이상 Q&A 볼드체로 작성.
4. 지역명(${plan.geo.displayName})은 본문 전체에서 1~2회만 자연스럽게 언급. 절대 남발하지 말 것.
5. 완치, 근본 치료, 뇌기능/자율신경/기저핵 완벽 정상화 등 단정적 기전 표현 금지.
6. 가상의 논문이나 연구 인용 절대 금지.
7. 마크다운 형식으로만 반환.
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: WRITER_MODEL,
    messages: [
      { role: 'system', content: '당신은 보수적이고 신뢰성 높은 한의학 전문 칼럼니스트입니다.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4
  });

  if (telemetry && response.usage) {
    telemetry.terraInTokens += response.usage.prompt_tokens || 0;
    telemetry.terraOutTokens += response.usage.completion_tokens || 0;
  }

  return response.choices[0].message.content;
}

/**
 * 3. Generate Thumbnail Copy using Planner Model (gpt-5.6-luna)
 */
async function generateThumbnailCopy(plan, articleBody, apiKey, telemetry) {
  if (!apiKey) {
    // Deterministic mock thumbnail copy
    return {
      yellowText: '원인모를',
      whiteText: plan.topicAngle.titleSuffix.slice(0, 10),
      greenText: plan.disease.name
    };
  }

  const prompt = `
칼럼 본문을 바탕으로 썸네일용 3줄 한글 카피를 추출하세요.

[규칙]
1. yellowText (노랑, 상단): 환자의 상황이나 고민 훅 (최대 10자, 예: "원인모를", "잠은 드는데", "업무 중")
2. whiteText (흰색, 중간): 핵심 증상이나 행동 (최대 14자, 예: "어지럼증·소화불량", "새벽마다 깰 때", "실수가 반복될 때")
3. greenText (초록, 하단): 질환명 (최대 10자, 예: "${plan.disease.name}")
4. 지역명(${plan.geo.displayName}, 분당, 성남, 용인, 수지 등)은 썸네일에 절대 포함하지 마십시오.

JSON 형식으로 응답:
{"yellowText": "...", "whiteText": "...", "greenText": "..."}
`;

  const response = await callOpenAiApi(apiKey, 'chat/completions', {
    model: PLANNER_MODEL,
    messages: [
      { role: 'system', content: '당신은 썸네일 카피라이터입니다. JSON 형식으로만 응답합니다.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });

  if (telemetry && response.usage) {
    telemetry.lunaInTokens += response.usage.prompt_tokens || 0;
    telemetry.lunaOutTokens += response.usage.completion_tokens || 0;
  }

  return JSON.parse(response.choices[0].message.content);
}

/**
 * 4. Generate Clean Background Image using gpt-image-2
 */
async function generateBackgroundImage(diseaseName, topicFocus, apiKey, telemetry) {
  if (!apiKey) {
    // Return null in offline mode (thumbnail engine will use solid gradient backdrop)
    return null;
  }

  const imagePrompt = `A quiet, warm, realistic clinical atmosphere or lifestyle scene representing comfort and mindfulness for ${diseaseName} (${topicFocus}). Soft natural lighting, serene mood, photorealistic. Strictly NO text, NO letters, NO words, NO logos, NO signs.`;

  const response = await callOpenAiApi(apiKey, 'images/generations', {
    model: IMAGE_MODEL,
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json'
  });

  if (telemetry) {
    telemetry.imageCount += 1;
  }

  const b64 = response.data[0].b64_json;
  return Buffer.from(b64, 'base64');
}

module.exports = {
  loadMedicalKnowledge,
  generateTopicOutline,
  generateArticleBody,
  generateThumbnailCopy,
  generateBackgroundImage
};
