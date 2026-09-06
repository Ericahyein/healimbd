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
    const error = new Error(`OpenAI API error (${resp.status} ${resp.statusText}): ${errorText}`);
    error.status = resp.status;
    error.errorBody = errorText;
    if (errorText.includes('moderation_blocked')) {
      error.isModerationBlocked = true;
    }
    throw error;
  }

  return await resp.json();
}

/**
 * Builds disease + topicAngle tailored primary photorealistic prompt (Safe & Non-symptom-simulating)
 * Prioritizes ageGroup strictly to prevent child images for adult targets and vice versa.
 */
function buildImagePrompt(diseaseId, diseaseName, topicAngleId = '', topicAngleFocus = '', ageGroup = 'mixed') {
  const focusLower = `${topicAngleFocus} ${topicAngleId}`.toLowerCase();

  // If ageGroup not explicitly provided ('mixed'), infer from diseaseId/name/topicAngle
  let effectiveAgeGroup = ageGroup;
  if (effectiveAgeGroup === 'mixed') {
    const isChildDisease = ['tic', 'child-enuresis', 'night-terrors', 'separation-anxiety'].includes(diseaseId) ||
      (diseaseName && (diseaseName.includes('틱') || diseaseName.includes('뚜렛') || diseaseName.includes('소아') || diseaseName.includes('야경') || diseaseName.includes('야뇨')));
    const hasChildAngle = focusLower.includes('child') || focusLower.includes('아이') || focusLower.includes('학부모') || focusLower.includes('훈육') || focusLower.includes('학교');
    
    if (isChildDisease || hasChildAngle) {
      effectiveAgeGroup = 'child';
    } else {
      effectiveAgeGroup = 'adult';
    }
  }

  // -------------------------------------------------------------
  // 1. ADULT TARGET OVERRIDE (Strictly working-age adult, NO child/classroom)
  // -------------------------------------------------------------
  if (effectiveAgeGroup === 'adult') {
    // ADHD Adult (e.g. qa-04-adhd-adult + adult-work-mistakes)
    if (diseaseId === 'adhd' || (diseaseName && diseaseName.includes('ADHD'))) {
      return `A realistic single lifestyle photo of one Korean adult in a modern, calm professional office or clean home workspace, sitting naturally at a desk with a laptop and documents, showing a thoughtful and focused expression while managing daily work. Warm natural daylight, professional editorial lifestyle photography, authentic working-age adult. Strictly: ONE Korean ADULT only, clearly adult, approximately working-age (20s to 40s), professional office or adult home workspace context, NO child, NO teenager, NO school uniform, NO classroom, NO homework scene, no exaggerated pain or distress, no clutching head, no medical equipment, no text, no watermark.`;
    }

    // Social Phobia / Presentation Anxiety (e.g. qa-07-social-phobia)
    if (focusLower.includes('presentation') || focusLower.includes('social') || (diseaseName && diseaseName.includes('사회공포'))) {
      return `A realistic single photo of one Korean adult standing or sitting in a modern, calm professional meeting room or quiet office environment, looking thoughtfully prepared for a discussion, neutral and composed posture, soft natural indoor lighting, professional wellness editorial photography. Strictly: ONE Korean ADULT only, clearly adult, approximately working-age (20s to 40s), professional workspace context, NO child, NO teenager, NO school uniform, NO classroom, no extreme panic, no trembling simulation, no distress, no text, no watermark.`;
    }

    // Panic
    if (diseaseId === 'panic' || (diseaseName && diseaseName.includes('공황'))) {
      if (focusLower.includes('subway') || focusLower.includes('교통') || focusLower.includes('밀폐') || focusLower.includes('터널') || focusLower.includes('운전')) {
        return `A realistic single photo of one Korean adult in a transit or commute environment, looking thoughtfully toward a window or quiet area, calm natural posture, mental wellness editorial photography, strictly ONE adult only, NO child, NO teenager, NO school uniform, no distress, no pain, no clutching chest, no text.`;
      }
      return `A realistic single lifestyle photo of one Korean adult sitting quietly by a bright window at home, resting thoughtfully in calm natural daylight, mental wellness editorial photography, strictly ONE adult only, NO child, NO teenager, NO school uniform, no distress, no pain, no clutching chest, no text.`;
    }

    // Anxiety (e.g. qa-06-anxiety)
    if (diseaseId === 'anxiety' || (diseaseName && diseaseName.includes('불안'))) {
      return `A realistic single lifestyle photo of one Korean adult sitting calmly in a quiet living space, thoughtful expression, soft ambient lighting, wellness editorial photography, strictly ONE adult only, NO child, NO teenager, NO school uniform, no distress, no pain, no text.`;
    }

    // Sleep (e.g. qa-08-sleep)
    if (diseaseId === 'sleep' || (diseaseName && (diseaseName.includes('수면') || diseaseName.includes('불면')))) {
      return `A realistic single lifestyle photo of one Korean adult sitting calmly in a peaceful bedroom in soft ambient dawn light, resting thoughtfully, wellness editorial photography, strictly ONE adult only, NO child, NO teenager, NO school uniform, no distress, no illness, no text.`;
    }

    // Autonomic / Fatigue (qa-09, qa-20)
    if (diseaseId === 'autonomic' || (diseaseName && (diseaseName.includes('자율신경') || diseaseName.includes('피로')))) {
      return `A realistic single lifestyle photo of one Korean adult sitting comfortably in a modern living space or clean workspace, resting peacefully in soft natural light, health editorial photography, strictly ONE adult only, NO child, NO teenager, NO school uniform, no distress, no clutching chest or stomach, no text.`;
    }

    // Syncope / Subway-dizziness (qa-12-syncope)
    if (diseaseId === 'syncope' || (diseaseName && diseaseName.includes('실신')) || focusLower.includes('subway') || topicAngleId.includes('subway')) {
      return `A realistic single lifestyle photo of one Korean adult in a subway train, bus, or public transportation transit environment, naturally standing or seated during commute, calm and composed expression but slightly aware of physical condition, warm natural transit lighting, professional healthcare wellness editorial photography. Strictly: ONE Korean ADULT only, clearly adult, approximately working-age (20s to 40s), subway / bus / public transportation environment context, naturally standing or seated during transit, calm but slightly aware of physical condition, NO child, NO teenager, NO school uniform, NO classroom, NO collapse, NO unconsciousness, NO fainting, NO dramatic illness, NO clutching body, NO clutching head, NO clutching chest or stomach, no medical equipment, no text, no watermark.`;
    }

    // General Adult Fallback
    return `A realistic single lifestyle photo of one Korean adult in a calm, modern indoor setting, thoughtful natural expression, healthcare wellness editorial photography, strictly ONE Korean ADULT only, clearly working-age, NO child, NO teenager, NO school uniform, NO classroom, no distress, no illness, no text.`;
  }

  // -------------------------------------------------------------
  // 2. CHILD TARGET OVERRIDE (School-age child/adolescent, NO adult main subject)
  // -------------------------------------------------------------
  if (effectiveAgeGroup === 'child') {
    // ADHD Child (qa-03-adhd-child)
    if (diseaseId === 'adhd' || (diseaseName && diseaseName.includes('ADHD'))) {
      return `A realistic single lifestyle photo of one Korean school-age child sitting near a study desk at home with notebooks, natural posture, thoughtful expression, warm soft indoor light, child health editorial photography. Strictly: ONE child only, Korean school-age child or adolescent, NO adult as main subject, no distress, no visible illness, no text.`;
    }

    // TIC / Tourette Child (qa-01-tic, qa-02-tourette)
    if (diseaseId === 'tic' || (diseaseName && (diseaseName.includes('틱') || diseaseName.includes('뚜렛')))) {
      if (focusLower.includes('media') || focusLower.includes('스마트폰') || focusLower.includes('영상') || focusLower.includes('게임')) {
        return `A realistic single photo of one Korean school-age child sitting naturally in a calm living room or bedroom, with a turned-off tablet or smartphone resting quietly on a side table in the background. The child has a thoughtful or slightly distracted expression. Warm, realistic lifestyle photography, natural posture, soft indoor lighting, neutral and non-distressing scene. The image should visually fit a pediatric health / child development article, but should NOT depict or simulate a medical symptom. Strictly: ONE child only, Korean school-age child or adolescent, NO adult as main subject, no medical procedure, no visible illness, no pain, no distress, no clutching chest/stomach/neck, no forced blinking or facial tic simulation, no collage, no split screen, no multi-panel, no text, no letters, no logo, no watermark.`;
      }
      return `A realistic single photo of one Korean school-age child in a calm home environment, sitting naturally with a thoughtful expression. Warm realistic lifestyle photography, soft indoor light, child health editorial photography. Strictly: ONE child only, Korean school-age child or adolescent, NO adult as main subject, no distress, no medical symptoms, no text.`;
    }

    // Night Terrors Child (qa-18-night-terrors)
    if (diseaseId === 'night-terrors' || (diseaseName && diseaseName.includes('야경')) || topicAngleId.includes('night-terror') || focusLower.includes('night-terror') || focusLower.includes('야경') || focusLower.includes('screaming-sleep')) {
      return `A realistic single photo of one Korean school-age child in a calm nighttime bedroom or peaceful bedtime environment, resting quietly or preparing for sleep, soft dim indoor ambient light, safe and non-distressing scene. Strictly: ONE child only, Korean school-age child, calm nighttime bedroom / bedtime environment context, resting or preparing for sleep, soft dim indoor light, safe and non-distressing scene, NO screaming, NO crying, NO nightmare simulation, NO medical symptom simulation, NO parent required, NO adult as main subject, NO daytime scene, NO drawing scene, NO classroom, no text, no logo, no watermark.`;
    }

    // Separation Anxiety Child (qa-17-separation-anxiety)
    if (diseaseId === 'separation-anxiety' || (diseaseName && diseaseName.includes('분리불안')) || topicAngleId.includes('separation') || focusLower.includes('separation') || focusLower.includes('분리불안') || focusLower.includes('school-reluctance')) {
      return `A realistic single photo of one Korean school-age child standing or sitting calmly in a bright comfortable home living area or hallway, natural relaxed posture, soft warm daylight, child health editorial photography. Strictly: ONE child only, Korean school-age child, natural home environment, thoughtful calm expression, NO crying, NO screaming, NO clinginess, NO distress, NO adult as main subject, no text, no logo, no watermark.`;
    }

    // General Child
    return `A realistic single lifestyle photo of one Korean child in a bright comfortable living room, natural relaxed posture, soft daylight, pediatric wellness photography. Strictly: ONE child only, Korean school-age child, NO adult as main subject, no distress, no visible illness, no text.`;
  }

  // -------------------------------------------------------------
  // 3. MIXED TARGET (Topic-tailored)
  // -------------------------------------------------------------
  if (diseaseId === 'syncope' || (diseaseName && diseaseName.includes('실신')) || focusLower.includes('subway') || topicAngleId.includes('subway')) {
    return `A realistic single lifestyle photo of one Korean adult in a subway train, bus, or public transportation transit environment, naturally standing or seated during commute, calm and composed expression but slightly aware of physical condition, warm natural transit lighting, professional healthcare wellness editorial photography. Strictly: ONE Korean ADULT only, clearly adult, approximately working-age (20s to 40s), subway / bus / public transportation environment context, naturally standing or seated during transit, calm but slightly aware of physical condition, NO child, NO teenager, NO school uniform, NO classroom, NO collapse, NO unconsciousness, NO fainting, NO dramatic illness, NO clutching body, NO clutching head, NO clutching chest or stomach, no medical equipment, no text, no watermark.`;
  }

  if (diseaseId === 'hyperhidrosis' || (diseaseName && diseaseName.includes('다한증'))) {
    return `A realistic single lifestyle photo of one Korean person sitting calmly indoors holding a clean dry handkerchief or looking thoughtfully at a table, peaceful natural daylight, wellness editorial photography, no distress, no exaggerated sweating simulation, no text.`;
  }

  return `A realistic single lifestyle photo of one Korean person in a calm, warm home setting, peaceful natural expression, healthcare wellness editorial photography, no distress, no illness, no text.`;
}

/**
 * Builds neutral fallback prompt if primary prompt encounters moderation
 */
function buildFallbackImagePrompt(diseaseId, diseaseName, topicAngleId = '', topicAngleFocus = '', ageGroup = 'mixed') {
  const focusLower = `${topicAngleFocus} ${topicAngleId}`.toLowerCase();
  if (diseaseId === 'night-terrors' || (diseaseName && diseaseName.includes('야경')) || focusLower.includes('night-terror') || focusLower.includes('야경') || focusLower.includes('screaming-sleep')) {
    return `A realistic photo of one Korean school-age child resting peacefully in a calm nighttime bedroom, soft dim lighting, safe and quiet bedtime context, child health editorial photography, strictly ONE child only, calm nighttime bedroom / bedtime environment, resting or preparing for sleep, NO screaming, NO crying, NO daytime, NO drawing, no distress, no symptoms, no text.`;
  }
  if (diseaseId === 'syncope' || (diseaseName && diseaseName.includes('실신')) || focusLower.includes('subway') || topicAngleId.includes('subway')) {
    return `A realistic lifestyle photo of one Korean working-age adult in a subway or public transit environment, naturally seated or standing during commute, calm and composed, health editorial photography, strictly ONE adult only, NO collapse, NO fainting, NO clutching body, no distress, no symptoms, no text.`;
  }
  if (ageGroup === 'adult') {
    return `A realistic lifestyle portrait of one Korean working-age adult resting peacefully in a calm, modern, naturally lit workspace or home environment, neutral clean background, health editorial photography, strictly ONE adult only, clearly working-age, NO child, NO teenager, NO school uniform, NO classroom, no distress, no symptoms, no text.`;
  }
  if (ageGroup === 'child' || diseaseId === 'child' || (diseaseName && (diseaseName.includes('틱') || diseaseName.includes('소아')))) {
    return `A realistic lifestyle portrait of one Korean school-age child sitting calmly at home in a clean room, thoughtful expression, natural posture, soft indoor light, clean neutral background, child health editorial photography, strictly ONE child only, NO adult as main subject, no distress, no medical symptoms, no text.`;
  }
  return `A realistic lifestyle portrait of one Korean adult resting peacefully in a calm, naturally lit home environment, neutral clean background, health editorial photography, no distress, no symptoms, no text.`;
}

/**
 * 1. Generate Topic Outline & Mandatory Summary using Planner Model (gpt-5.6-luna)
 */
async function generateTopicOutline(plan, knowledge, apiKey, telemetry) {
  const targetDisease = plan.titleDisease || plan.displayDisease || plan.disease.name;
  let fallbackSummary = `${plan.geo.displayName} 지역 주민들을 위한 [${targetDisease}] ${plan.topicAngle.titleSuffix}에 대한 임상적 관점과 생활 관리 가이드입니다.`;
  if (plan.topicAngle && plan.topicAngle.id === 'chronic-dizziness') {
    fallbackSummary = `${plan.geo.displayName} 지역 주민들을 위해 지속되는 비회전성 어지럼증에서 동반 증상과 다양한 원인을 구분하고 상태에 맞는 관리 방향을 살펴봅니다.`;
  }

  if (!apiKey) {
    return {
      title: plan.titleCandidate,
      summary: fallbackSummary,
      outline: [
        '1. 진료실에서 자주 마주하는 환자분들의 고민',
        '2. 신경생물학적 특성과 자극적 환경이 증상에 미치는 영향',
        '3. 비슷한 다른 상태와 감별하여 살펴볼 점',
        '4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점',
        '5. 일상생활에서 실천할 수 있는 적극적인 미디어 조절 수칙',
        '6. 자주 묻는 질문 (FAQ)'
      ]
    };
  }

  const prompt = `
당신은 해아림한의원의 의학 칼럼 기획자입니다.
다음 승인된 의료 지식을 바탕으로 환자 질문에 답하는 칼럼 아웃라인과 핵심 요약(summary)을 작성하세요.

[칼럼 기본 정보]
- 지역: ${plan.geo.displayName} (${plan.geo.fullName})
- 질환: ${targetDisease} (분류: ${plan.disease.categoryName})
- 주제 앵글: ${plan.topicAngle.titleSuffix} (${plan.topicAngle.focus})
- 권장 제목: ${plan.titleCandidate}

[승인된 의료 지식]
- 정의: ${knowledge.approvedDefinition}
- 주요 증상: ${knowledge.commonSymptoms.join(', ')}
- 악화 요인: ${knowledge.possibleAggravatingFactors.join(', ')}
- 검사 안내: ${knowledge.evaluationGuidance}
- 생활 관리: ${knowledge.lifestyleTips.join(', ')}

[엄격 제약사항]
1. 제목(title)은 반드시 '[${plan.geo.displayName} ${targetDisease}] 구체적 주제' 형태여야 합니다.
2. 요약(summary)은 1~2문장(30자~120자)의 완성된 한글 문장으로 필수 작성해야 하며 절대 빈 문자열이면 안 됩니다. 상위 질환 카테고리가 아닌 '${targetDisease}'를 정확히 명시하십시오.
3. 지속되는 비회전성 어지럼증(chronic-dizziness)의 경우 summary를 '경추·자율신경계 긴장'처럼 원인을 좁히지 말고, 반드시 '지속되는 비회전성 어지럼증에서 동반 증상과 다양한 원인을 구분하고 상태에 맞는 관리 방향을 살펴본다' 취지로 균형 있고 포괄적으로 작성하십시오.
4. 완치, 근본 치료, 기저핵 흥분 안정, 자율신경 정상화 등 단정적 기전 표현 금지.
5. 특정 미디어나 생활 습관이 질환의 단일 원인인 것처럼 단정하지 마십시오.
6. 보수적이고 신중한 임상 관점 사용.

반드시 다음 JSON 구조로 응답하십시오:
{
  "title": "[${plan.geo.displayName} ${targetDisease}] ${plan.topicAngle.titleSuffix}",
  "summary": "${plan.geo.displayName} 지역 주민들을 위한 ${targetDisease} 임상적 관점과 관리 안내입니다.",
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
      '2. 신경생물학적 특성과 자극적 환경이 증상에 미치는 영향',
      '3. 비슷한 다른 상태와 감별하여 살펴볼 점',
      '4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점',
      '5. 일상생활에서 실천할 수 있는 적극적인 미디어 조절 수칙',
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
    <li>빠른 화면 전환과 강한 시각 자극은 두뇌의 각성과 긴장도를 높여 틱 증상 변동에 영향을 줄 수 있습니다.</li>
    <li>도파민계 및 CSTC 회로 등 신경생물학적 특성을 고려할 때 자극적인 환경을 조절하는 것이 중요합니다.</li>
    <li>단순 허용보다 아이의 상황에 맞추어 불필요한 미디어 노출을 적극적으로 줄이고 증상 변화를 관찰합니다.</li>
  </ul>
</div>

## 1. 진료실에서 자주 마주하는 고민

${plan.geo.displayName} 지역에서 아이의 ${plan.disease.name} 증상으로 상담을 청하시는 보호자분들의 이야기를 듣다 보면 "스마트폰이나 게임을 볼 때 증상이 더 심해지는 것 같은데 어떻게 지도해야 하는지"에 대한 질문을 자주 받습니다.
진료실에서는 무조건적인 방치나 단순한 시간 때우기식 허용보다는, 자극적인 콘텐츠가 아이의 두뇌 흥분도에 미치는 영향을 균형 있게 이해하고 대처하는 것이 필요하다고 안내해 드립니다.

## 2. 신경생물학적 특성과 자극적 환경이 증상에 미치는 영향

${knowledge.approvedDefinition}
임상 및 신경과학 연구에서는 틱장애와 관련하여 다음과 같은 점들을 명확히 구분하여 살펴보고 있습니다:

- **질환의 발생 및 신경학적 배경**: 도파민계를 포함한 신경전달 체계와 피질-선조체-시상-피질(CSTC) 운동 조절 회로의 특성이 주요 신경생물학적 배경으로 연구되고 있습니다.
- **증상의 악화 및 변동 요인**: 질환의 기저 특성과 별개로, 이미 나타나는 틱 증상의 정도는 피로, 수면 상태, 정서적 긴장 및 ${knowledge.possibleAggravatingFactors.join(', ')} 등에 따라 변동될 수 있습니다.
- **자극적인 콘텐츠와 두뇌 각성**: 빠른 화면 전환, 강한 색감, 큰 소리 등 자극적인 영상이나 게임은 뇌의 보상계와 각성 시스템을 강하게 활성화하여 긴장 상태를 오래 지속시킬 수 있습니다.

자세한 진료 과목 안내는 의료진과의 1:1 상담을 통해 확인하실 수 있습니다.

## 3. 비슷한 다른 상태와 감별하여 살펴볼 점

초기 증상의 양상을 파악하는 것이 중요합니다:
- ${knowledge.commonSymptoms.join('\n- ')}

단순한 일시적 버릇인지 신경학적 긴장 조절이 필요한 상태인지 신중하게 구별하여 접근하는 것이 바람직합니다.
관련 질환에 대한 구체적인 평가는 초기 진료 상담을 통해 안내받으실 수 있습니다.

## 4. 해아림한의원의 상태 평가 및 1:1 맞춤 관리 관점

${knowledge.evaluationGuidance}
해아림한의원에서는 ${knowledge.treatmentGuidance}를 통해 환자 개개인의 균형 있는 회복을 돕고 있습니다.

## 5. 일상생활에서 실천할 수 있는 적극적인 미디어 조절 수칙

1. **과도한 노출 적극적 축소**: 특정 시간대만 제한하기보다는 평소의 전체적인 미디어 노출량을 가능한 범위에서 적극적으로 줄여나갑니다.
2. **증상 안정 관찰**: 사용량을 줄인 후 일정 기간 동안 아이의 틱 증상 및 수면, 일상 긴장도의 변화를 차분히 관찰합니다.
3. **대체 활동 마련**: 자극적인 스크린 노출 대신 가벼운 야외 활동, 신체 놀이, 정서적 대화 시간을 함께 늘려줍니다.

## 6. 자주 묻는 질문 (FAQ)

**Q1. ${knowledge.faqCandidates[0]?.q || '증상이 있을 때 어떻게 대처하나요?'}**  
A. ${knowledge.faqCandidates[0]?.a || '무리하게 지적하지 않고 편안한 환경에서 상태를 관찰하는 것이 권장됩니다.'}

**Q2. ${knowledge.faqCandidates[1]?.q || '스마트폰을 어떻게 조절해야 하나요?'}**  
A. ${knowledge.faqCandidates[1]?.a || '아이 상황에 맞게 불필요한 노출을 적극적으로 줄이고, 조절 전후의 증상 변화를 세밀히 관찰하는 것이 좋습니다.'}

---

### 🔗 함께 읽어보면 좋은 연관 안내
${linksListMd}
`;
  }

  const isTic = plan.disease.id === 'tic' || (plan.disease.name && plan.disease.name.includes('틱'));
  const isTourette = (plan.titleDisease && plan.titleDisease.includes('뚜렛')) || (plan.qaId && plan.qaId.includes('tourette'));
  const isMediaTopic = plan.topicAngle.id.includes('media') || (plan.topicAngle.titleSuffix && plan.topicAngle.titleSuffix.includes('스마트폰'));
  const isParentGuidance = plan.topicAngle.id === 'parent-guidance' || (plan.topicAngle.titleSuffix && plan.topicAngle.titleSuffix.includes('대처'));

  let mediaGuideline = '';
  if (isMediaTopic) {
    mediaGuideline = `
7. [미디어와 신경생물학 설명 지침 (해당 주제 한정)]
   - 빠른 화면 전환, 강한 색감, 큰 소리 등 자극적인 콘텐츠가 두뇌의 흥분도와 각성 상태를 높여 증상 변동에 관여할 수 있음을 설명하십시오.
   - 도파민계 및 피질-선조체-시상-피질(CSTC) 회로와 관련된 신경생물학적 연구 배경을 보수적이고 전문적인 어조로 다루십시오. (단, '도파민 폭발' 등 자극적 과장 표현 금지)
   - "취침 전 1~2시간만 제한" 같은 느슨한 표현은 금지하며, "아이 상황에 맞게 불필요하고 과도한 미디어 노출을 가능한 범위에서 적극적으로 줄여나가며 증상 변화를 관찰"하는 적극적 관리 방향으로 작성하십시오.
   - 미디어를 줄인다고 틱이 100% 호전된다거나 결과가 보장된다는 식의 단정적 표현을 금지합니다.
`;
  } else if (isTourette || (isTic && isParentGuidance)) {
    mediaGuideline = `
7. [뚜렛증후군 및 부모 대처 원칙 지침 (Tourette Parent-Guidance Rule)]
   - 뚜렛증후군이 틱장애 범주 안에서 갖는 임상적 특징을 설명하되, 여러 운동틱과 하나 이상의 음성틱이 함께 나타나는 양상을 다룹니다.
   - [필수 구분 설명] 반드시 다음 취지를 명시하십시오: "운동틱과 음성틱이 함께 보인다는 사실만으로 뚜렛증후군을 확정하는 것은 아니며, 증상이 이어진 경과, 시작 시기, 종류와 변화 양상 등을 함께 평가해야 한다."
   - 일과성 틱이나 지속성(만성) 틱과 구분하여 종합적으로 살핀다는 취지를 승인된 의학 지식 범위에서 설명하십시오.
   - 구체적인 진단 기간(예: 1년 이상 등)이나 발병 연령 숫자는 검증된 출처(verified source)가 있을 때만 사용하고, 임의 수치를 만들지 마십시오.
   - 현재 parent-guidance 중심 구조를 엄격히 유지하십시오. 미디어 비중을 더 늘리지 마십시오. (미디어는 필요한 경우 일상 관리 요인 중 하나로만 아주 짧게 언급하거나 배제)
   - 글의 중심은 부모가 불안해하며 아이를 지적하거나 억지로 참게 하지 않는 수용적 태도, 가정 내 심리적 안정감 제공, 아이의 자존감 보호와 장기적 기능 관찰 등 부모 대처 원칙이어야 합니다.
`;
  }

  const isAdhdAdult = (plan.disease.id === 'adhd' || (plan.disease.name && plan.disease.name.includes('ADHD'))) &&
    (plan.ageGroup === 'adult' || (plan.qaId && plan.qaId.includes('adult')) || (plan.topicAngle && plan.topicAngle.id && plan.topicAngle.id.includes('adult')));

  let adhdAdultGuideline = '';
  if (isAdhdAdult) {
    adhdAdultGuideline = `
7-1. [성인 ADHD 평가 및 임상 설명 지침 (Adult ADHD Assessment Rule)]
   - 성인 직장인의 반복되는 업무 실수, 잦은 마감 지연, 정리 정돈의 어려움 등 성인기 직장/업무 맥락을 중심으로 서술하십시오.
   - [필수 평가 항목 보강] 성인 ADHD 평가 시 현재 직장에서의 업무 실수나 어려움만 보지 말고, "이전부터 주의집중, 정리, 과제 마무리, 충동성/실행기능과 관련된 유사한 어려움이 여러 생활 영역에서 이어져 왔는지"를 함께 확인해야 한다는 내용을 승인된 의학 지식 범위에서 자연스럽게 추가하십시오.
   - 구체적 발병 연령이나 기간 수치(예: 만 12세 이전, 6개월 이상 등)는 검증된 출처(verified source)가 있을 때만 사용하고, 임의 수치를 만들지 마십시오.
   - 소아기 양육/교실 사례를 주 내용으로 혼입하지 마십시오.
`;
  }

  const isIbs = plan.disease.id === 'ibs' || (plan.disease.name && plan.disease.name.includes('과민성대장'));
  let ibsGuideline = '';
  if (isIbs) {
    ibsGuideline = `
7-2. [과민성대장증후군(IBS) 진단 개념 및 악화음식/생활관리 지침 (IBS Clinical Rule)]
   - 단순히 '긴장하거나 스트레스받을 때 설사/복통이 반복된다'는 이유만으로 IBS처럼 성급히 단정하지 마십시오.
   - IBS를 설명할 때 핵심적으로 '반복되는 복통'과 함께 '배변과의 관계(배변 후 통증 호전/악화)' 또는 '배변 빈도나 변 형태 변화(설사/변비)와의 연관성'을 함께 평가해야 한다는 점을 승인된 의학 지식에 근거해 명확히 밝히십시오.
   - 구체적인 Rome 진단 기간 수치는 검증된 출처가 있을 때만 사용하고, 임의 수치를 제시하지 마십시오.
   - '유제품, 밀가루, 카페인'을 모든 IBS 환자의 공통적인 대표 악화 음식처럼 묶어서 제시하지 마십시오. 특정 음식 반응은 개인차가 매우 크므로, 식사 일지 등을 통해 개인별 음식-증상 관계를 파악하도록 작성하십시오. 특히 '밀가루' 자체를 포괄적인 IBS 악화 음식으로 단정하지 마십시오.
   - '복부를 따뜻하게 유지'는 환자가 일상에서 편안함을 느낄 수 있는 보조적인 생활 관리 방법 정도로만 표현하고, 질환의 핵심 치료 원리처럼 서술하지 마십시오.
   - 혈변, 설명되지 않는 체중 감소, 빈혈, 야간 복통 등 경고 증상(Red flags) 시 소화기내과 정밀 평가를 안내하십시오.
`;
  }

  const isSyncope = plan.disease.id === 'syncope' || (plan.disease.name && plan.disease.name.includes('실신'));
  let syncopeGuideline = '';
  if (isSyncope) {
    syncopeGuideline = `
7-3. [미주신경성 실신 임상 설명 및 실신 vs 전실신 용어 구분 지침 (Syncope Clinical Rule)]
   - [실신 vs 전실신 개념 명확한 구분 - 필수]
     * 실신(Syncope): 일시적인 뇌 관류(혈류) 저하로 인해 발생하는 갑작스럽고 짧은 일시적 의식소실이며 비교적 빠르게 자발적으로 회복되는 상태입니다.
     * 전실신(Presyncope / 실신 전 단계): 눈앞이 캄캄함, 극심한 어지럼, 식은땀, 쓰러질 것 같은 느낌 등이 있지만 완전한 의식소실까지 진행하지 않은 상태입니다.
     * '의식이 흐려지거나'를 실신 자체의 정의에 포함하지 마십시오. ("의식이 흐려지거나 의식을 잃는 상태" 같은 모호한 혼용 금지)
     * 예시 표현: "실신은 일시적인 뇌 혈류 감소로 인해 갑작스럽게 의식을 잃었다가 비교적 빠르게 자발적으로 회복되는 상태입니다. 반면 눈앞이 캄캄하거나 식은땀, 쓰러질 것 같은 느낌이 있으면서 의식을 완전히 잃지 않은 경우는 전실신 또는 실신 전 단계의 증상으로 구분할 수 있습니다."
   - 만원 버스나 지하철 등 대중교통 및 밀폐된 환경에서의 기립 상태 혈류 조절 저하, 전조증상 대처(즉시 앉기/눕기, 다리 꼬기 등 counter-pressure maneuver) 요령과 낙상 예방을 차분하게 서술하십시오.
   - 실신의 경고 증상(Red flags) 중 '가족력' 표현을 너무 포괄적으로 쓰지 말고, '원인 불명의 급사, 조기 심장질환 또는 유전성 부정맥 등 심장성 실신 위험을 시사하는 가족력'인지 명확히 구체화하여 서술하십시오.
`;
  }

  const isChronicDizziness = (plan.topicAngle && plan.topicAngle.id === 'chronic-dizziness') ||
    (plan.qaId && plan.qaId === 'qa-14-dizziness') ||
    (plan.titleDisease === '어지럼증' && plan.topicAngle && plan.topicAngle.id.includes('dizziness'));

  let dizzinessGuideline = '';
  if (isChronicDizziness) {
    dizzinessGuideline = `
7-4. [지속성 비회전성 어지럼증 원인 감별 및 프레이밍 지침 (Dizziness Differential Framing Rule)]
   - 이비인후과 검사에서 큰 이상이 없다는 이유만으로 경추 또는 자율신경 문제로 바로 연결하거나 자동 귀결하지 마십시오.
   - 지속적인 비회전성 어지럼은 증상 양상에 따라 다양한 원인을 폭넓게 감별해야 한다는 구조로 작성하십시오:
     * 지속성 비회전성 어지럼의 특성
     * 전정계 질환 및 전정편두통
     * 지속성 체위-지각 어지럼증(PPPD) 등 기능성 전정질환
     * 기립성 및 순환기 문제 (체위 변화에 따른 혈압 조절 등)
     * 신경학적 또는 내과적 원인 (중추성 요인, 빈혈, 대사 이상 등)
     * 약물 복용력 및 전신 피로/컨디션 상태
   - 특정 질환을 자동으로 단정 진단하지 마십시오.
   - 목·어깨 긴장 및 경추 문제는 "동반된 목·어깨 긴장이 있고 자세에 따라 불편감이 변하는 일부 경우 함께 평가할 수 있는 요소" 수준으로 신중하게 다루십시오.
   - 핵심 요약(summary)은 "경추·자율신경계 긴장에 대한 한의학적 관리 방향"처럼 원인을 좁히지 말고, "지속되는 비회전성 어지럼증에서 동반 증상과 다양한 원인을 구분하고 상태에 맞는 관리 방향을 살펴본다" 정도로 작성하십시오.
   - 생활 관리 역시 목 스트레칭이나 찜질만 중심이 되지 않도록, 규칙적인 수면 리듬, 충분한 휴식, 과도한 시각적/감각적 자극 완화, 적절한 수분 섭취 등을 균형 있게 조언하십시오.
`;
  }

  const isDepression = plan.disease.id === 'depression' || (plan.disease.name && plan.disease.name.includes('우울'));
  const isOcd = plan.disease.id === 'ocd' || (plan.disease.name && (plan.disease.name.includes('강박') || plan.disease.name.includes('OCD'))) ||
    (plan.topicAngle && plan.topicAngle.id === 'intrusive-thoughts') ||
    (plan.qaId && plan.qaId.includes('ocd'));
  const isSeparationAnxiety = plan.disease.id === 'separation-anxiety' || (plan.disease.name && plan.disease.name.includes('분리불안')) ||
    (plan.topicAngle && plan.topicAngle.id === 'school-reluctance') ||
    (plan.qaId && plan.qaId.includes('separation-anxiety'));
  const isNightTerrors = plan.disease.id === 'night-terrors' || (plan.disease.name && plan.disease.name.includes('야경')) ||
    (plan.topicAngle && plan.topicAngle.id === 'screaming-sleep') ||
    (plan.qaId && plan.qaId.includes('night-terrors'));

  let depressionGuideline = '';
  if (isDepression && !isOcd) {
    depressionGuideline = `
7-5. [우울증 및 번아웃 구분 지침 (Depression vs Burnout Rule)]
   - 번아웃은 만성적인 직장 스트레스와 관련된 직업적 현상(occupational phenomenon, ICD-11)이며, 우울증 자체와 동일한 의학적 진단이 아니라는 점을 명확히 구분하십시오.
   - 쉬어도 지속되는 피로와 무기력이 중심인 경우, 우울 증상뿐 아니라 신체적 원인(갑상선 기능 이상, 만성 피로, 빈혈 등) 또는 약물 영향 등 다른 원인도 상황에 따라 감별할 필요가 있다는 중립적인 문장을 반드시 추가하십시오.
   - [OCD 확인행동 독립 섹션 엄격 금지] 문 잠금, 가스 확인, 침투적 사고, 반복 확인 행동 등 강박증(OCD)의 핵심 증상을 우울증 글의 독립된 H2/H3 섹션으로 길게 다루지 마십시오. 강박 증상은 불안이나 우울 상태에서 동반될 수 있는 가능성을 1~2문장으로 짧게 언급하는 수준만 허용됩니다.
   - 자살/자해 생각이나 심각한 절망감에 대한 전문의 진료 안내(Red flag) 및 위기상담전화(109/1393)는 신중하고 안전하게 유지하십시오.
`;
  }

  let ocdGuideline = '';
  if (isOcd) {
    ocdGuideline = `
7-6. [강박증(OCD) 핵심 악순환 및 표준 치료 지침 (OCD Clinical Rule)]
   - 침투적 사고와 "원치 않는 생각 ≠ 실제 의도나 성격"이라는 점을 분명히 설명하십시오.
   - [핵심 악순환 중심 설명 - 필수] 강박증의 핵심 악순환 구조:
     "침투적 사고/강박 사고(Obsession) → 불안/고통(Anxiety/Distress) → 강박 행동 또는 회피/확인(Compulsion/Avoidance) → 일시적 안도(Temporary Relief) → 악순환 반복 및 강화(Reinforcement)"
     를 본문의 중심 기전으로 상세하고 명확하게 설명하십시오.
   - [우울/소진 문구 배제] 번아웃, 햇빛 부족, 신체활동 저하, 억눌린 감정, 화병 등 우울증이나 소진 쪽의 일반적인 문구 비중을 대폭 줄이고 강박증 고유의 인지-행동 특성에 집중하십시오.
   - [근거 기반 표준 치료 중립적 언급 - 필수] 일상 기능 저하가 큰 강박증에서는 전문의 평가가 필요하며, 노출 및 반응방지(ERP, Exposure and Response Prevention)를 포함한 인지행동치료(CBT)와 약물치료 등이 근거 기반의 표준 치료 선택지로 널리 사용된다는 사실을 중립적이고 균형 있게 언급하십시오.
   - [한의학적 관리 원칙] 한의학적 관리는 기존의 표준 치료나 전문의 진료를 대체한다고 서술하지 말고, 환자의 현재 치료 상황과 전반적인 신체 긴장도, 자율신경 불균형 등을 고려하여 보완적으로 계획한다는 원칙을 유지하십시오.
   - "인지적 거리두기, 수용, 이완 훈련" 등을 ERP를 대체하는 치료법인 것처럼 서술하지 마십시오.
`;
  }

  let separationGuideline = '';
  if (isSeparationAnxiety) {
    separationGuideline = `
7-7. [소아 분리불안 감별 및 발달 불안 구분 지침 (Separation Anxiety Rule)]
   - [정상 발달 불안 vs 장애 수준 구분 - 필수] 어린 시기의 보호자 분리 불안 자체는 정상적인 발달 과정에서도 흔히 나타날 수 있음을 명시하십시오.
   - 다만 다음의 경우 분리불안장애 가능성을 포함해 전문 평가가 필요하다는 구조로 작성하십시오:
     1) 아이의 연령 및 발달 수준에 비해 불안과 공포가 과도하고
     2) 반복적으로 지속되며
     3) 등원·등교 거부, 수면 문제, 복통·두통 등 신체 증상, 또래 관계 및 일상 기능을 뚜렷하게 방해하는 경우
   - 구체적인 진단 기간 숫자(예: 4주 이상 등)는 검증된 출처(DSM-5)가 있을 때만 신중히 언급하고, 임의 숫자를 만들지 마십시오.
   - '신경발달학적·신경생물학적 특성'을 근거 없이 핵심 발생 원인처럼 과도하게 단정하여 강조하지 마십시오.
   - [야뇨 관리법 혼입 엄격 금지] "저녁 수분 제한", "취침 전 배뇨 습관" 등 야뇨증(child-enuresis) 관리법을 분리불안 글의 생활관리 항목에 넣지 마십시오. (야뇨는 수면 중 동반 여부를 확인하고 필요한 경우 별도로 평가할 수 있다는 1문장 언급 수준만 허용)
   - 틱장애 관련 내부링크를 관련성이 충분하지 않은데 억지로 넣지 마십시오.
`;
  }

  let nightTerrorsGuideline = '';
  if (isNightTerrors) {
    nightTerrorsGuideline = `
7-8. [소아 야경증 임상 설명 및 악몽 감별 지침 (Night Terrors Clinical Rule)]
   - [야경증과 악몽 완전 분리 - 필수] 제목, 주제, 서술에서 야경증과 악몽을 같은 증상처럼 묶지 마십시오. 악몽은 감별 진단 설명에서만 다루십시오.
   - [핵심 임상 특징]:
     1) NREM(비렘) 수면 중 부분 각성으로 발생
     2) 아이가 소리를 지르거나 울지만 자극에 잘 반응하지 않고 완전히 깨어나지 않음
     3) 다음 날 아침 사건을 전혀 기억하지 못하거나 거의 기억하지 못함 (악몽과의 결정적 차이: 악몽은 REM 수면 중 발생하며 꿈 내용을 생생히 기억함)
   - [검증된 유발/악화 요인 우선 서술]: 수면 부족, 과도한 신체 피로, 수면 일정 변화 및 수면 환경 방해, 심리적 스트레스, 발열 등 검증된 요인을 우선적으로 다루십시오.
   - "정서적 부담을 표현하는 방식"처럼 야경증을 단순 심리 문제의 표현으로 과도하게 해석하지 마십시오.
   - [전문 평가가 필요한 경고 신호(Red flags) 안내]:
      * 매우 잦게 반복되거나 장기화되는 경우 ("주 수회 이상" 등 근거 없는 임의 빈도 수치 표현 금지, 반드시 "매우 잦게 반복되거나"로 표현)
     * 수면의 질을 크게 방해하거나 낮 동안 심한 졸림 및 일상 기능 저하 동반
     * 침대 밖으로 뛰쳐나가는 등 부상 위험이 있는 경우
     * 수면호흡장애(코골이, 무호흡) 등 다른 수면 질환이 의심되는 경우
     * 전형적이지 않은 반복적인 경련 양상이나 주간 사건이 동반되는 경우
     -> 소아청소년과 또는 수면 전문의의 정밀 평가가 필요함을 명시하십시오.
    - [야뇨 관리법 혼입 엄격 금지] "저녁 수분 제한", "취침 전 배뇨 습관" 등 야뇨증 관리법을 야경증의 핵심 생활관리로 사용하지 마십시오.
    - [틱장애 문단/링크 날조 엄격 금지] 야경증 글에 틱장애 링크를 넣기 위해 "깨어 있는 시간에도 눈을 반복해서 깜빡이거나..."와 같은 틱 증상 문단이나 부자연스러운 연결 문장을 작성하지 마십시오. (관련성 낮은 링크를 위한 본문 변형 엄격 금지)
`;
  }

  const prompt = `
당신은 해아림한의원 대표원장의 관점에서 의학 칼럼 본문을 작성하는 전문 의료 작가입니다.

[칼럼 기본 정보]
- 지역: ${plan.geo.displayName} (${plan.geo.fullName})
- 질환: ${plan.titleDisease || plan.displayDisease || plan.disease.name} (분류: ${plan.disease.categoryName})
- 주제 앵글: ${plan.topicAngle.titleSuffix} (${plan.topicAngle.focus})
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

[사용 가능한 검증된 내부링크 후보 (관련성 높은 실존 링크만 자연스럽게 삽입, 1개도 허용)]
${linksListMd}

[원장칼럼 작성 규칙 및 핵심 지침 (GLOBAL MEDICAL POLICY)]
1. 최상단에 반드시 <div class="column-key-summary-box"> 핵심 요약 3~4항목 포함.
2. H2 목차는 최소 4개 이상 논리적으로 전개.
3. FAQ는 최소 3문항 이상 Q&A 볼드체(**Q1.**, **Q2.**, **Q3.**)로 작성.
4. 문체는 진료실에서 환자/보호자분들이 자주 묻는 질문에 전문적이고 명확하게 설명하는 원장칼럼 톤을 유지하십시오.
5. [원인 vs 증상 변동 요인 명확한 분리 및 발생 배경 서술 지침 - 필수 (GLOBAL RULE)]
   - 질환의 현대의학적 발생 배경을 설명할 때 '체질적 특성'을 신경생물학적 원인과 같은 층위에 섞지 마십시오. ('신경생물학적·체질적 특성이 관여' 금지)
   - 소아 발달성 질환(틱/ADHD): '신경발달학적·신경생물학적 특성이 관여'로 서술하십시오.
   - 성인 불안/수면/기분/자율신경 질환(불안장애, 공황장애, 불면증, 우울증 등): '신경발달학적'이라는 표현을 일체 사용하지 마십시오. 반드시 '신경생물학적 특성, 심리적 경험, 환경적 스트레스 등이 복합적으로 관여할 수 있다' 정도로 서술하십시오.
   - 질환의 신경생물학적 병태생리와 일상 속 증상의 악화/변동 요인을 명확히 분리하여 서술하십시오.
   - 한의학적 체질 및 장부 불균형 관점은 4번 '해아림한의원의 상태 평가 및 1:1 맞춤 관리' 섹션에서 전문적으로 별도 설명하십시오.
6. [질환별 승인된 악화 요인 및 생활 관리 준수 - 타 질환 생활요인 혼입 엄격 금지 (GLOBAL RULE)]
   - 반드시 위 [승인된 의료 지식]의 '악화 요인'과 '생활 관리' 항목에만 근거하여 작성하십시오.
   - 현재 질환과 관련 없는 타 질환의 생활 요인(예: 공황장애에 틱장애의 미디어 노출, 빠른 화면 전환, 강한 색감 등)을 절대로 혼입하거나 재사용하지 마십시오.
   - 공황장애의 경우: 수면 부족, 만성 과로, 고카페인 섭취, 알코올, 급격한 스트레스, 신체 감각(심장 박동, 가슴 답답함)에 대한 파국적/위협적 오해석 등을 우선적으로 다루십시오.
6-1. [연령 대상(Age Group) 일관성 원칙 - 엄격 준수 (GLOBAL RULE)]
   현재 칼럼의 대상 연령층은 [${plan.ageGroup || (plan.qaTarget && plan.qaTarget.ageGroup) || 'mixed'}]입니다.
   - child (소아 대상): 소아/청소년 본인, 보호자(부모), 학교, 가정 환경에 철저히 집중하십시오. 성인의 직장, 업무, 마감, 직장인, 출퇴근, "성인 역시" 등 성인 사회생활/직장 관련 사례나 문구를 일체 포함하지 마십시오.
   - adult (성인 대상): 성인 환자 본인의 일상, 직장, 사회생활, 성인기 스트레스에 집중하십시오. 소아/보호자, 훈육, 양육, 교실/학교생활 등 불필요한 소아기 사례를 혼입하지 마십시오.
   - mixed: 소아와 성인 전 연령의 공통적 특성을 균형 있게 다루십시오.
6-2. [주제 앵글(Topic Angle) 독립성 원칙 - 인접 세부 주제 침범 엄격 금지 (GLOBAL RULE)]
   현재 주제 앵글은 [${plan.topicAngle.titleSuffix}] (${plan.topicAngle.id})입니다.
   인접한 다른 질환이나 세부 주제의 대표 증상을 현재 주제의 대표 증상처럼 서술하지 마십시오:
   - 만성 걱정·범불안 (chronic-worry) 작성 시:
     * 사회공포증/발표불안의 핵심 증상('사람들의 시선', '발표 상황', '목소리 떨림', '손 떨림' 등)을 대표 증상으로 끌어오지 마십시오.
     * 공황장애의 극심한 발작 증상('숨 막힘', '심장마비 공포' 등)이나 썸네일 카피('두근거림·숨 막힘')를 재사용하지 마십시오.
     * 일상 속 사소한 걱정이 꼬리를 무는 연쇄적 사고, 만성적인 신체 긴장, 과도한 경계 반응에 철저히 집중하십시오.
   - 조기 각성·새벽 각성 (early-awakening) 작성 시:
     * 입면장애('밤마다 뒤척여 잠들기 어렵다', '누워서 1~2시간 동안 잠이 안 옴')로 주제를 변질시키지 마십시오.
     * "잠은 비교적 쉽게 드는데, 새벽 2~4시에 저절로 눈이 떠져 다시 잠들기 어렵고 머리가 무거운" 새벽 각성 양상에 집중하십시오.
   - 자율신경실조증 어지럼증·소화불량 (digestive-dizziness) 작성 시:
     * 핵심 증상은 '원인 모를 어지럼증'과 '소화불량/위장장애(메스꺼움, 복부 팽만감 등)'의 동반입니다.
     * 소화불량을 임의로 '두근거림' 등 다른 증상으로 교체하지 마십시오.
7. [치료법 및 시술 객관적 중립 기술 원칙 (GLOBAL RULE)]
   - 치료 항목은 치료 효과를 선행 단정하거나 수식어를 붙이지 말고, 치료 항목 자체를 객관적으로 서술하십시오:
     * '개인의 증상과 전반적인 상태를 고려한 한약 처방'
     * '침구 치료'
     * '필요에 따른 생활 관리 지도 및 수면 위생 지도'
     * '이완 및 정서 상담', '추나요법'
   - "안정을 돕는다", "자율신경 긴장을 완화한다", "수면 흐름을 돕는다", "뇌의 과각성을 진정시킨다" 등 치료 효과나 기전을 미리 단정하여 한약/침구 치료에 임의 수식어로 결합하지 마십시오.
   - 승인되지 않은 한의학 장부/열 개념 및 병리명 절대 사용 금지:
     * '심포열(心包熱)', '간화(肝火)', '심화(心火)', '담음', '수승화강' 등 임의의 병리/장부 열 개념을 언급하거나 '심포열을 다스리는 치료' 등으로 기술하지 마십시오.
   - 새로운 임의 치료 명칭 생성 금지:
     * '인지 이완 훈련', '인지 행동 훈련', '두뇌 훈련', '안심 한약', '두뇌 회복탕' 등 승인되지 않은 치료 명칭을 임의로 만들지 마십시오.
   - 위 [승인된 의료 지식]의 '치료 관점(treatmentGuidance)'에 명시된 표현 범위를 벗어나 임의로 조작하지 마십시오.
8. [마무리 광고성 내원 유도(CTA) 금지 (GLOBAL RULE)]
   - 칼럼의 마지막 문단이나 결론부에서 "[지역]에서 ... 진료를 권합니다", "[지역] 한의원에 내원하십시오", "본원에 방문하셔서" 등과 같은 지역 키워드 기반의 직접적인 내원/예약 권유 문장으로 끝맺지 마십시오.
   - 본문 내의 자연스러운 지역 언급(SEO)은 유지하되, 글의 마무리는 의료정보 요약, 환자의 일상 생활 관리 원칙, 차분한 관찰과 회복 지지로 품격 있고 자연스럽게 종료하십시오.
9. [임의 수치/기간/빈도 생성 금지 - 필수 (GLOBAL RULE)]
   - "일주일 정도 기록", "3일간", "2주간", "한 달 동안", "하루 N회", "주 수회 이상", "주 N회", "N분 동안" 등 승인된 지식에 근거 없는 구체적인 기간/횟수/빈도 수치를 임의 생성하지 마십시오.
   - "매우 잦게 반복되거나", "일정 기간 동안", "규칙적으로", "꾸준히", "차분하게" 등으로 표현하십시오.
10. [의료 표현 제약]
    - 완치, 근본 치료, 기저핵/자율신경/뇌기능 정상화, 신경전달물질 완벽 조절, 약물 임의 중단 유도 금지.
11. [내부링크 품질 우선 및 URL 중복 엄격 금지 (GLOBAL RULE)]
    - 위 제공된 내부링크 목록 중 주제와 실질적으로 가장 관련성이 높은 실존 링크만 자연스럽게 삽입하십시오.
    - [품질 > 개수 원칙] 관련성이 높은 링크가 1개뿐이라면 본문에 1개만 삽입해도 충분합니다.
    - 2~4개 개수를 채우기 위해 다른 질환을 갑자기 언급하거나, 별도 소제목/문단을 만들거나, 억지 연결 문장을 생성하는 행위를 엄격히 금지합니다.
    - [동일 URL 중복 절대 금지] 하나의 URL은 아티클 전체에서 최대 1회만 사용할 수 있습니다. 동일한 URL을 서로 다른 앵커 텍스트로 중복 삽입하는 것을 엄격히 금지합니다.
    - [정직한 앵커 텍스트 원칙] 실제 연결되는 글의 제목과 내용을 정직하게 반영해야 하며, 별도의 아티클이 존재하는 것처럼 앵커 텍스트를 허위로 날조하지 마십시오.
${mediaGuideline}
${adhdAdultGuideline}
${ibsGuideline}
${syncopeGuideline}
${dizzinessGuideline}
${depressionGuideline}
${ocdGuideline}
${separationGuideline}
${nightTerrorsGuideline}
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
  const targetDisease = plan.thumbnailDiseaseLabel || plan.titleDisease || plan.disease.name;
  const fallbackCopy = {
    yellowText: '원인 모를',
    whiteText: plan.topicAngle.titleSuffix.slice(0, 12),
    greenText: targetDisease
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
3. greenText (하단 초록): 질환명 (1~8자 한글, 반드시 '${targetDisease}', 빈칸 금지. 상위 질환 카테고리로 대체 절대 금지!)
4. 지역명(${plan.geo.displayName}, 분당, 성남, 용인, 수지 등)은 3개 문구 어디에도 절대 포함하지 마십시오.
5. "나도모르게", "눈깜빡임·헛기침"처럼 띄어쓰기를 무시하고 붙여 쓰지 마십시오. 반드시 올바른 맞춤법/띄어쓰기를 준수하십시오.
6. [주제 앵글(Topic Angle) 일치 필수 원칙 (GLOBAL RULE)]
   현재 주제 앵글: ${plan.topicAngle.titleSuffix} (${plan.topicAngle.id})
   썸네일 문구는 반드시 현재 주제 앵글의 핵심 증상 및 상황을 직관적으로 반영해야 합니다:
   - early-awakening (새벽 각성): "잠들기 어렵다면", "밤마다 뒤척여" 같은 입면장애 문구 절대 금지. "잠은 드는데 / 새벽마다 깬다면", "새벽에 깨서 / 다시 못 잔다면" 등 새벽 각성 표현 작성.
   - digestive-dizziness (어지럼증+소화불량): 소화불량을 임의로 "두근거림" 등 다른 증상으로 바꾸지 마십시오. 반드시 "어지럼증·소화불량" 등 어지럼증과 소화/위장 문제를 담으십시오.
   - chronic-worry (만성 걱정): 공황장애 카피인 "두근거림·숨 막힘"이나 사회공포 카피인 "발표 때 떨림"을 쓰지 마십시오. "사소한 일도 / 꼬리 무는 걱정", "꼬리를 무는 / 만성적인 불안감" 등으로 작성하십시오.

반드시 다음 JSON 형식으로만 응답해야 하며, 각 필드는 절대 빈 문자열("")이어서는 안 됩니다:
{
  "yellowText": "원인 모를",
  "whiteText": "어지럼증·소화불량",
  "greenText": "${targetDisease}"
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

  // Enforce greenText identity
  if (!green || green !== targetDisease) {
    green = targetDisease;
  }

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
 * 4. Generate Single Photo Background Image with Optimized Moderation Transition & Error Classification
 */
async function generateBackgroundImage(diseaseId, diseaseName, topicAngleId, topicAngleFocus, apiKey, telemetry, ageGroup = 'mixed') {
  if (!apiKey) {
    return null;
  }

  const primaryPrompt = buildImagePrompt(diseaseId, diseaseName, topicAngleId, topicAngleFocus, ageGroup);
  const fallbackPrompt = buildFallbackImagePrompt(diseaseId, diseaseName, topicAngleId, topicAngleFocus, ageGroup);

  let attempts = 0;
  let moderationRetries = 0;
  let currentPrompt = primaryPrompt;
  let isFallback = false;

  telemetry.imageGenerationAttempts = 0;
  telemetry.imageModerationRetries = 0;
  telemetry.imageGenerationStatus = 'pending';

  while (attempts < 2) {
    attempts++;
    telemetry.imageGenerationAttempts = attempts;

    try {
      console.log(`🖼️ [Images API] Requesting background image (Attempt ${attempts}/2, fallback=${isFallback})...`);
      const response = await callOpenAiApi(apiKey, 'images/generations', {
        model: IMAGE_MODEL,
        prompt: currentPrompt,
        n: 1,
        size: '1024x1024'
      });

      telemetry.imageCount = (telemetry.imageCount || 0) + 1;
      telemetry.imageGenerationStatus = moderationRetries > 0 ? 'success_after_retry' : 'success';

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
    } catch (err) {
      // 1. Check Moderation Blocked -> Immediately switch to Fallback
      if (err.isModerationBlocked || (err.errorBody && err.errorBody.includes('moderation_blocked'))) {
        moderationRetries++;
        telemetry.imageModerationRetries = moderationRetries;

        if (!isFallback && attempts < 2) {
          console.warn(`⚠️ [Images API] Primary prompt was moderation_blocked. Switching IMMEDIATELY to Neutral Fallback Prompt for Attempt 2...`);
          currentPrompt = fallbackPrompt;
          isFallback = true;
          continue;
        } else {
          telemetry.imageGenerationStatus = 'failed_moderation';
          throw new Error(`Image generation failed due to moderation_blocked on ${isFallback ? 'fallback' : 'primary'} prompt: ${err.message}`);
        }
      }

      // 2. Check Transient Network / Rate Limit / 5xx error -> Allowed single quick retry
      const isTransient = err.status === 429 || (err.status >= 500 && err.status < 600) || err.message.includes('fetch');
      if (isTransient && attempts < 2) {
        console.warn(`⚠️ [Images API] Transient error (${err.status || err.message}). Retrying in 1.5s...`);
        await new Promise(res => setTimeout(res, 1500));
        continue;
      }

      // 3. Other Non-retryable error (e.g. invalid request 400 with other reasons)
      telemetry.imageGenerationStatus = 'failed_error';
      throw err;
    }
  }

  telemetry.imageGenerationStatus = 'failed_exhausted';
  throw new Error('Image generation exhausted maximum attempts.');
}

module.exports = {
  loadMedicalKnowledge,
  buildImagePrompt,
  buildFallbackImagePrompt,
  generateTopicOutline,
  generateArticleBody,
  generateThumbnailCopy,
  generateBackgroundImage
};
