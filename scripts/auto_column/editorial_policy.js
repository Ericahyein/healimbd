// One editorial policy for website generation, publication checks and Telegram adaptation.
// This changes presentation, never the evidence or the medication-safety requirements.
const EDITORIAL_GUIDANCE = `
[한의 진료 설명과 병행 진료 서술 기준]
- 본원 진료는 증상 경과·수면·소화·피로·정서 상태를 어떻게 살피고 개인별 한약·침구·생활 관리 계획을 정하는지 직접 설명하십시오. 실제 제공 범위와 승인된 지식 안에서 구체화하고, 확인되지 않은 효과·기전·완치·대체 가능성은 만들지 마십시오.
- 한의학적 평가·체질 진찰·한약·침구를 일괄적으로 보조적·보완적 접근이나 요법으로 규정하지 마십시오. 현대의학적 진단과 다르다는 부정적 비교를 모든 진료 소개에 관성적으로 붙이지 말고, 필요한 검사·감별의 목적과 본원 진찰 내용을 각각 설명하십시오.
- 약물 용량·복용 방법의 변경을 위한 협의와 한의 진료를 받는 일을 구분하십시오. 한방 치료 병행 자체를 기존 처방 의료진의 사전 허락·승인·필수 상담 대상으로 서술하지 마십시오. 진료 시 현재 복용약을 확인하고, 상호작용·이상반응이나 약물 조정 등 구체적인 필요가 있으면 관련 의료진과 협의하는 내용으로 작성하십시오. 누구에게나 병행이 안전하다고 보장하지 마십시오.
- 복용약 안내의 예: 현재 복용 중인 약이 있다면 진료 시 알려주세요. 증상과 복용 약을 함께 살펴 개인별 진료 계획을 세웁니다. 기존 약의 용량이나 복용 방법을 조정할 필요가 있다면 처방 의료진과 협의합니다.
- 약물 임의 중단·감량을 권하지 마십시오. 약물 관련 주제가 아니라면 중단 금지 경고를 핵심 요약·본문·FAQ에 반복하지 말고 필요한 진료 준비 안내 한 곳에 간결하게 설명하십시오. 응급 신호·금기·상호작용 등 개별 위험에 필요한 안내는 빠뜨리지 마십시오.
- NICE 등 지침은 실제 권고 범위에만 인용하십시오. 약물 유지·변경·중단 검토 권고를 한방 치료 병행의 허가 요건으로 확대하지 마십시오. 다른 치료 선택지는 현재 주제에 필요한 범위에서 중립적으로 소개하고 한의 진료와 위계적으로 비교하지 마십시오.
- 출처는 어떤 증상·감별·관리 정보의 근거인지 해당 문단에서 구체적으로 밝히십시오. 본원 치료 효과를 입증하는 자료가 아니라는 부정문을 진료 소개나 마무리에 관성적으로 붙이지 마십시오. 출처가 입증하지 않은 치료 효과를 주장하지 않는 원칙은 유지하십시오.
- 한의원도 의료기관입니다. 다른 진료과 안내에 일반 의료기관이라는 표현을 쓰지 말고, 필요한 내과·신경과·소아청소년과 등 해당 진료과와 평가 목적을 구체적으로 적으십시오.
`;

function checkEditorialFraming(text) {
  const errors = new Set();
  // Remove Markdown URL destinations before sentence splitting (e.g. nice.org).
  const plain = String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // A follow-up sentence may refer back to Korean medicine as "이러한 접근".
  // Keep concrete test-scope explanations (e.g. ECG/endoscopy) separate.
  for (const paragraph of plain.split(/\n\s*\n/)) {
    if (/(한의(?:학)?(?:적)?|한방|한약|침구)/.test(paragraph) &&
        /(표준\s*치료|야뇨\s*알람|전문의\s*진료).{0,100}대체.{0,50}(아니|안\s*되|없|않)/.test(paragraph)) {
      errors.add('Editorial framing violation: 다른 치료와 대체 불가를 비교하는 관성적인 부정문 대신 본원의 진찰·치료 내용과 필요한 협력을 구체적으로 설명하십시오.');
    }
  }
  const sentences = plain.split(/[\n.!?。]+/).map(s => s.trim()).filter(Boolean);
  let medicationWarnings = 0;
  for (const sentence of sentences) {
    const koreanCare = /(한의(?:학)?(?:적)?|한방|한약|침구|체질\s*(평가|진단|관점|진찰))/.test(sentence);
    if (koreanCare && /(보조적|보완적|보조\s*(요법|치료)|보완\s*(요법|치료))/.test(sentence)) {
      errors.add('Editorial framing violation: 한의 진찰·치료를 일괄적으로 보조·보완으로 규정하지 말고 본원의 진찰 과정과 개인별 치료 계획을 직접 설명하십시오.');
    }
    if (koreanCare && /(입증하는\s*자료로\s*제시|효과의?\s*근거로\s*제시|근거로\s*제시)/.test(sentence) && /(아닙|않습)/.test(sentence)) {
      errors.add('Editorial framing violation: 출처가 뒷받침하는 증상·평가·관리 정보를 구체적으로 설명하고 본원 치료 효과에 관한 관성적인 부정문은 쓰지 마십시오. 확인되지 않은 효과 주장도 금지합니다.');
    }
    const prescribingClinician = /(처방(?:한|하는|\s*의료진|\s*의사)|주치의|기존\s*담당의|현재\s*치료를\s*담당하는\s*의료진)/.test(sentence);
    const combinedCare = /(병행|한방\s*치료.{0,15}(받|시작)|한의\s*진료.{0,15}(받|시작))/.test(sentence);
    const consultation = /(상의|상담|협의|허락|승인|동의)/.test(sentence);
    const specificSafetyReason = /(상호작용|이상\s*반응|부작용|금기|간\s*기능|신장\s*기능)/.test(sentence);
    const permission = /(허락|승인|동의를?\s*(받|구))/.test(sentence);
    if (combinedCare && prescribingClinician && consultation && (!specificSafetyReason || permission)) {
      errors.add('Editorial framing violation: 한방 치료 병행 자체에 기존 처방 의료진의 허락이나 필수 상담을 요구하지 마십시오. 복용약 확인과 구체적인 안전 문제·약물 조정에 필요한 협의를 분리해 설명하십시오.');
    }
    if (/일반\s*의료기관/.test(sentence)) {
      errors.add('Editorial framing violation: 일반 의료기관 대신 필요한 진료과와 평가 목적을 구체적으로 안내하십시오.');
    }
    if (!specificSafetyReason && /(약물|처방약|수면제|양약|약을)/.test(sentence) && /(임의|스스로|보호자\s*판단)/.test(sentence) &&
        /(중단|감량|줄이)/.test(sentence) && /(않|말|안\s*됩|금지|해서는\s*안)/.test(sentence)) medicationWarnings++;
  }
  if (medicationWarnings > 1) errors.add('Editorial framing violation: 약물 임의 중단 경고를 요약·본문·FAQ에 반복하지 말고 필요한 복용약·진료 준비 안내에 한 번만 간결하게 설명하십시오.');
  return { valid: errors.size === 0, errors: [...errors] };
}

module.exports = { EDITORIAL_GUIDANCE, checkEditorialFraming };
