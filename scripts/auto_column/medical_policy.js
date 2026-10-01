// Clinic facts are independent of general medical evidence and cannot be
// inferred from an institution's tests or treatments described in a source.
const CLINIC_EVALUATION = '해아림한의원 분당점에서는 필요에 따라 뇌인지검사, 뇌기능검사, 정서심리검사, 문진·설진·복진·진맥을 참고로 활용합니다. 검사 하나로 질환이나 원인을 확정하지 않으며 모든 검사를 일률적으로 시행하지 않습니다.';

function selectEvidenceNotes(knowledge, topicAngle) {
  const id = typeof topicAngle === 'string' ? topicAngle : topicAngle?.id;
  return (knowledge?.evidenceNotes || []).filter(note =>
    note.sourceVerified === true && note.productionUsable === true &&
    (!Array.isArray(note.topicAngles) || note.topicAngles.includes(id))
  );
}

function prepareArticleKnowledge(knowledge, plan) {
  const id = plan.topicAngle?.id;
  const override = knowledge.topicOverrides?.[id] || {};
  return {
    ...knowledge,
    ...override,
    evaluationGuidance: CLINIC_EVALUATION,
    evidenceNotes: selectEvidenceNotes(knowledge, id),
    // Topic overrides may narrow clinical guidance but never add unverified sources.
    specificRules: [...(override.specificRules || knowledge.specificRules || []),
      '출처를 채우기 위해 현재 주제와 관계없는 질환이나 번아웃·어지럼증 설명을 추가하지 마십시오.',
      '일반 의료정보의 검사·치료와 분당점에서 실제 제공하는 진료를 구분하십시오. HRV나 심박변이도 검사를 본원 검사로 안내하지 마십시오.',
      '뉴로피드백·밸런싱·IM은 틱장애와 ADHD에서 평가 후 선택적으로 활용하며, 다른 질환의 본원 치료로 안내하지 마십시오. 정식 CBT·CBIT 제공 여부를 임의로 만들지 마십시오.',
      '실제 검수자가 확인되지 않은 글에 원장 직접 작성, 개별 의학적 검수 완료, 검토 완료 또는 환자 상담 경험·내원 빈도를 만들어 쓰지 마십시오.'
    ]
  };
}

function checkClinicFacts(text, diseaseId) {
  const errors = [];
  const sentences = String(text || '').split(/[\n.!?。]+/);
  for (const sentence of sentences) {
    if (/(HRV|심박\s*변이도|자율신경\s*반응도)/i.test(sentence) &&
        !/(시행하지|제공하지|하지\s*않|검사하지)/.test(sentence)) {
      errors.push('Clinic facts violation: HRV/심박변이도/자율신경 반응도 검사를 분당점 검사로 생성할 수 없습니다.');
    }
    if (/(상담|진료)(을|를)?\s*(하다\s*보면|하던\s*중)|자주\s*(듣습니다|만납니다|내원|방문)|말씀(을|도)?\s*자주\s*듣/.test(sentence)) {
      errors.push('Clinic facts violation: 확인되지 않은 상담 경험이나 내원 빈도를 생성할 수 없습니다.');
    }
    if (/(뉴로\s*피드백|밸런싱|\bIM\b)/i.test(sentence)) {
      if (!['tic', 'adhd'].includes(diseaseId) && !/(적용하지|활용하지|시행하지|제공하지|않습니다)/.test(sentence)) {
        errors.push('Clinic facts violation: 뉴로피드백·밸런싱·IM은 틱장애와 ADHD에서만 선택적으로 안내합니다.');
      } else if (['tic', 'adhd'].includes(diseaseId) && !/(평가|선택|필요|상태에\s*따라)/.test(sentence)) {
        errors.push('Clinic facts violation: 훈련치료는 평가 후 선택적으로 활용하는 범위를 표시해야 합니다.');
      }
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

module.exports = { CLINIC_EVALUATION, selectEvidenceNotes, prepareArticleKnowledge, checkClinicFacts };
