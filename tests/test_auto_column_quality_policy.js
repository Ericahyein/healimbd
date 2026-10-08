const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CLINIC_EVALUATION, selectEvidenceNotes, prepareArticleKnowledge, checkClinicFacts } = require('../scripts/auto_column/medical_policy');
const { planNextColumn, getRankedCandidatePlans, wasTopicPublished, selectTopicAngleForDisease, getKstCalendarDate } = require('../scripts/auto_column/topic_planner');
const { generateArticleBody, loadMedicalKnowledge } = require('../scripts/auto_column/ai_generator');
const { validateArticleContent, checkMedicationDiscontinuation } = require('../scripts/auto_column/content_validator');
const taxonomy = require('../scripts/auto_column/disease_taxonomy.json');
const history = require('../data/auto_column_history.json');
const ROOT = path.join(__dirname, '..');

(async () => {
  // Describing a patient's concern must not become medication-stop advice.
  assert.strictEqual(
    checkMedicationDiscontinuation('새 약을 먹은 뒤 불편함이 생기면 약을 즉시 끊고 싶어질 수 있습니다.').violated,
    false
  );
  assert.strictEqual(
    checkMedicationDiscontinuation('약을 끊고 싶어질 수 있습니다. 의료진과 상의 없이 약을 끊으세요.').violated,
    true
  );
  assert.strictEqual(checkMedicationDiscontinuation('약을 끊어도 됩니다.').violated, true);
  assert.strictEqual(checkMedicationDiscontinuation('약을 임의로 중단하지 마십시오.').violated, false);
  assert.strictEqual(
    checkMedicationDiscontinuation('새 약 복용 후 불편이 생겼다고 해서 처방약을 스스로 중단하거나 용량을 조절하는 것은 주의가 필요합니다.').violated,
    false
  );
  assert.strictEqual(checkMedicationDiscontinuation('처방약을 즉시 중단하세요.').violated, true);
  assert.strictEqual(
    checkMedicationDiscontinuation('약물 때문이라고 단정하거나 스스로 중단하기보다, 복용 정보와 증상 양상을 의료진에게 알리는 것이 필요합니다.').violated,
    false
  );
  assert.strictEqual(checkMedicationDiscontinuation('약을 끊기보다 의료진에게 알린 뒤 약을 중단하세요.').violated, true);
  assert.strictEqual(
    checkMedicationDiscontinuation('약물 치료의 변경과 중단은 의료진의 검토 아래 이루어져야 한다는 점은 [NICE ADHD 진료지침](https://www.nice.org.uk/)에서도 강조합니다.').violated,
    false
  );
  assert.strictEqual(checkMedicationDiscontinuation('약물 치료를 중단하세요. 의료진의 검토를 받아보세요.').violated, true);
  assert.strictEqual(checkMedicationDiscontinuation('약물 치료의 중단은 의료진 검토 아래 이루어져야 하지만 지금은 중단해도 됩니다.').violated, true);
  assert.strictEqual(
    checkMedicationDiscontinuation('[NICE ADHD 진단 및 관리 지침](https://www.nice.org.uk/guidance/ng87)도 약물 치료의 변경이나 중단은 의료진의 판단과 검토를 거쳐야 한다고 안내합니다.').violated,
    false
  );
  assert.strictEqual(checkMedicationDiscontinuation('약물 치료를 중단하고 의료진과 상담하세요.').violated, true);
  const autonomic = loadMedicalKnowledge('autonomic');
  const headache = loadMedicalKnowledge('headache');
  const tic = loadMedicalKnowledge('tic');
  const urls = (knowledge, angle) => selectEvidenceNotes(knowledge, angle).map(note => note.sourceUrl || note.source?.url);
  assert(!urls(autonomic, 'digestive-dizziness').some(url => /who\.int/.test(url)), 'meal topic must not force burnout evidence');
  assert(urls(autonomic, 'brain-fog-fatigue').some(url => /who\.int/.test(url)), 'fatigue evidence must remain available');
  assert(!urls(headache, 'tension-headache').some(url => /9249299/.test(url)), 'tension headache must not force PPPD evidence');
  const pppd = headache.evidenceNotes.find(note => (note.topicAngles || []).includes('chronic-dizziness'));
  assert(!selectEvidenceNotes(headache, 'tension-headache').includes(pppd));
  assert(selectEvidenceNotes(headache, 'chronic-dizziness').includes(pppd));
  const screen = tic.evidenceNotes.find(note => (note.topicAngles || []).includes('media-exposure'));
  assert(!selectEvidenceNotes(tic, 'pain-interference').includes(screen));
  assert(selectEvidenceNotes(tic, 'media-exposure').includes(screen));
  assert(!urls(loadMedicalKnowledge('depression'), 'intrusive-thoughts').some(url => /who\.int/.test(url)));
  const anxiety = loadMedicalKnowledge('anxiety');
  const generalAnxietyAngles = ['chronic-worry', 'somatization', 'worry-sleep', 'avoidance-daily-life', 'physical-tension'];
  for (const angle of generalAnxietyAngles) {
    const selected = urls(anxiety, angle);
    assert(selected.includes('https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad'), angle + ': must retain worry/muscle-tension evidence');
    assert(selected.includes('https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/'), angle + ': must retain symptom/lifestyle evidence');
    assert(!selected.some(url => /cg159|social-anxiety|9780890425596/.test(url)), angle + ': social evidence must not be forced into general worry topics');
    const preparedAnxiety = prepareArticleKnowledge(anxiety, { topicAngle: { id: angle } });
    assert(!preparedAnxiety.commonSymptoms.some(symptom => /시선|발표/.test(symptom)));
    assert(!preparedAnxiety.faqCandidates.some(faq => /소심|내향/.test(faq.q)));
  }
  assert(urls(anxiety, 'presentation-anxiety').includes('https://www.nimh.nih.gov/health/publications/social-anxiety-disorder-more-than-just-shyness'));
  assert(urls(anxiety, 'presentation-anxiety').some(url => /cg159/.test(url)));
  assert(!urls(anxiety, 'presentation-anxiety').includes('https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad'));
  assert(urls(anxiety, 'reassurance-loop').includes('https://www.nhs.uk/mental-health/conditions/health-anxiety/'));
  const anxietyMarkdown = fs.readFileSync(path.join(ROOT, 'content/blog/bundang-pangyo-anxiety-physical-tension.md'), 'utf8');
  const anxietyBody = anxietyMarkdown.replace(/^---[\s\S]*?---\s*/, '');
  const anxietyInput = { title: '[판교 불안장애] 걱정이 이어지면서 몸에 힘이 들어갈 때 기록할 점', summary: '걱정과 신체 긴장의 경과를 기록하고 의료진 평가를 준비합니다.', category: 'anxiety', body: anxietyBody, diseaseId: 'anxiety', geoId: 'bundang-pangyo', titleDisease: '불안장애', ageGroup: 'adult', topicAngle: { id: 'physical-tension' }, knowledge: anxiety, requireVerifiedSources: true };
  const anxietySourceErrors = input => validateArticleContent(input).errors.filter(error => /verified medical sources|Topic evidence|explanation/.test(error));
  assert.deepStrictEqual(anxietySourceErrors(anxietyInput), []);
  assert(!anxietyBody.includes('cg159') && !anxietyBody.includes('9780890425596'));
  const socialOnlyBody = anxietyBody.replaceAll('https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad', 'https://www.nimh.nih.gov/health/publications/social-anxiety-disorder-more-than-just-shyness').replaceAll('https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/', 'https://www.nice.org.uk/guidance/cg159');
  assert(anxietySourceErrors({ ...anxietyInput, body: socialOnlyBody }).some(error => /verified medical sources/.test(error)), 'two social-only links cannot satisfy a physical-tension topic');
  const snapshot = JSON.stringify(autonomic);
  const prepared = prepareArticleKnowledge(autonomic, { topicAngle: { id: 'digestive-dizziness' } });
  assert.strictEqual(prepared.evaluationGuidance, CLINIC_EVALUATION);
  assert.strictEqual(JSON.stringify(autonomic), snapshot, 'preparation must not mutate shared knowledge');
  assert(!checkClinicFacts('분당점에서는 HRV 검사를 시행합니다.', 'autonomic').valid);
  assert(!checkClinicFacts('분당점은 자율신경 반응도 검사를 활용합니다.', 'autonomic').valid);
  assert(checkClinicFacts('분당점에서는 HRV 검사를 시행하지 않습니다.', 'autonomic').valid);
  assert(!checkClinicFacts('용인에서 상담을 하다 보면 자주 듣습니다.', 'tic').valid);
  assert(checkClinicFacts('아이의 증상이 걱정되면 상담을 준비하세요.', 'tic').valid);
  assert(!checkClinicFacts('뉴로피드백·밸런싱·IM을 적용합니다.', 'panic').valid);
  assert(!checkClinicFacts('뉴로피드백을 적용합니다.', 'tic').valid);
  assert(checkClinicFacts('뉴로피드백·밸런싱·IM은 평가 후 선택적으로 활용합니다.', 'tic').valid);
  assert(checkClinicFacts('뉴로피드백·밸런싱·IM은 평가 후 선택적으로 활용합니다.', 'adhd').valid);

  // Every eligible topic needs enough independently verified, relevant sources.
  for (const disease of taxonomy.diseases) {
    for (const angle of disease.topicAngles) {
      assert(new Set(urls(loadMedicalKnowledge(disease.id), angle)).size >= 2, `${disease.id}/${angle.id}: insufficient topic evidence`);
    }
  }
  const plan = {
    geo: { id: 'seongnam-main', displayName: '성남', fullName: '성남시' },
    disease: { id: 'tic', name: '틱장애', category: 'tic' },
    titleDisease: '틱장애', ageGroup: 'child',
    topicAngle: { id: 'cough-distinction', titleSuffix: '헛기침이 반복될 때 관찰할 점' }
  };
  const body = await generateArticleBody(plan, {}, tic, [{ url: '/conditions/tic/', title: '틱장애 안내' }], '');
  const article = {
    title: '[성남 틱장애] 헛기침이 반복될 때 관찰할 점',
    summary: '반복되는 헛기침의 양상을 기록하고 필요한 평가를 준비하는 내용을 설명합니다.',
    category: 'tic', body, geoId: 'seongnam-main', diseaseId: 'tic', titleDisease: '틱장애',
    ageGroup: 'child', topicAngle: plan.topicAngle, hashtags: ['성남', '틱장애정보'],
    keywords: ['헛기침이 반복될 때 관찰할 점'], knowledge: tic, requireVerifiedSources: true
  };
  const sourceErrors = input => validateArticleContent(input).errors.filter(error => /verified medical sources|Topic evidence|explanation/.test(error));
  assert.deepStrictEqual(sourceErrors(article), []);
  assert(sourceErrors({ ...article, knowledge: { ...tic, evidenceNotes: [] } }).length >= 2, 'zero evidence must fail closed');
  const withoutReferences = body.replace(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g, '출처 설명');
  const referencesOnly = withoutReferences + '\n## 참고 자료\n' + selectEvidenceNotes(tic, plan.topicAngle).slice(0, 2).map(note => `[자료](${note.sourceUrl || note.source?.url})`).join('\n');
  assert(sourceErrors({ ...article, body: referencesOnly }).some(error => /explanation/.test(error)), 'bibliography-only links must fail');
  // The production writer must not disguise missing citations by appending a footer.
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: withoutReferences } }], usage: {} }) });
    const uncited = await generateArticleBody(plan, {}, tic, [], 'unit-test-only-key');
    assert(sourceErrors({ ...article, body: uncited }).length > 0);
    assert(!uncited.includes('https://'), 'real-API path may not silently append references');
  } finally { global.fetch = originalFetch; }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-quality-policy-'));
  try {
    const historyPath = path.join(temp, 'history.json');
    const simulated = JSON.parse(JSON.stringify(history));
    const published = new Set(simulated.map(item => `${item.disease}|${item.topicAngle}`));
    fs.writeFileSync(historyPath, JSON.stringify(simulated));
    // Start after the real history so a newly published entry cannot consume
    // one of the two simulated slots on a hard-coded calendar day.
    const latestDay = Math.max(...simulated.map(item => getKstCalendarDate(item.publishDate).getTime()));
    const simulationDate = (day, hour) => new Date(latestDay + day * 86400000 + (hour - 9) * 3600000 + 7 * 60000);
    const candidates = getRankedCandidatePlans({ historyPath, now: simulationDate(1, 9) });
    assert(candidates.length > 0);
    assert.strictEqual(taxonomy.diseases.find(d => d.id === 'autonomic').topicAngles.find(a => a.id === 'medication-onset').productionEligible, false);
    for (const candidate of candidates) {
      assert(!published.has(`${candidate.disease.id}|${candidate.topicAngle.id}`), 'region changes cannot recycle a published topic');
      assert(candidate.topicAngle.productionEligible !== false, 'quarantined medical topic cannot publish automatically');
    }
    for (let day = 1; day <= 14; day++) {
      const dayDiseases = new Set();
      for (const hour of ['09', '17']) {
        const now = simulationDate(day, Number(hour));
        const candidate = planNextColumn({ historyPath, now });
        assert(candidate.disease && candidate.topicAngle, `must find a fresh candidate on day ${day}`);
        const key = `${candidate.disease.id}|${candidate.topicAngle.id}`;
        assert(!published.has(key));
        assert(!dayDiseases.has(candidate.disease.id));
        assert(['성남', '분당', '판교', '용인', '경기광주'].includes(candidate.geo.displayName));
        published.add(key); dayDiseases.add(candidate.disease.id);
        simulated.push({ disease: candidate.disease.id, topicAngle: candidate.topicAngle.id, geoId: candidate.geo.id, parentRegion: candidate.geo.parentRegion, publishDate: now.toISOString(), title: candidate.titleCandidate, slug: candidate.slug });
        fs.writeFileSync(historyPath, JSON.stringify(simulated));
      }
      assert.strictEqual(planNextColumn({ historyPath, now: simulationDate(day, 20) }).status, 'daily_limit_reached');
    }
    fs.writeFileSync(historyPath, '{broken-json');
    assert.throws(() => planNextColumn({ historyPath }), /history cannot be read safely/i);
    fs.writeFileSync(historyPath, '{}');
    assert.throws(() => getRankedCandidatePlans({ historyPath }), /history cannot be read safely/i);
    const exhausted = taxonomy.diseases.flatMap(disease => disease.topicAngles.map(angle => ({ disease: disease.id, topicAngle: angle.id, geoId: 'other-region', publishDate: '2025-01-01T00:00:00Z' })));
    fs.writeFileSync(historyPath, JSON.stringify(exhausted));
    assert(wasTopicPublished(exhausted, 'tic', taxonomy.diseases.find(d => d.id === 'tic').topicAngles[0].id));
    assert.strictEqual(selectTopicAngleForDisease(taxonomy.diseases[0], exhausted), null);
    assert.strictEqual(getRankedCandidatePlans({ historyPath, now: new Date('2026-10-01') }).length, 0);
    assert.throws(() => planNextColumn({ historyPath, now: new Date('2026-10-01') }), /topic|주제|eligible/i);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }

  for (const slug of ['yongin-cheoin-autonomic-digestive-dizziness', 'yongin-main-headache-tension-headache', 'seongnam-bundang-ocd-intrusive-thoughts']) {
    const markdown = fs.readFileSync(path.join(ROOT, 'content/blog', `${slug}.md`), 'utf8');
    assert(markdown.includes('article_review_status: "source_based"'));
    assert(!markdown.includes('medical_information_reviewer:'));
    assert(!markdown.includes('자율신경 반응도'));
    assert(!markdown.includes('WHO'));
    assert(!markdown.includes('PPPD'));
    assert(history.find(item => item.slug === slug).title === markdown.match(/^title: "(.+)"/m)[1]);
  }
  console.log('✅ Topic-specific evidence, clinic facts, honest credits, strict citations, 14-day two-post scheduling, cross-region deduplication and exhaustion safety passed.');
})().catch(error => { console.error(error); process.exit(1); });
