const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EDITORIAL_GUIDANCE, checkEditorialFraming } = require('../scripts/auto_column/editorial_policy');
const { prepareArticleKnowledge } = require('../scripts/auto_column/medical_policy');
const { loadMedicalKnowledge, generateArticleBody } = require('../scripts/auto_column/ai_generator');
const { validateArticleContent, checkMedicationDiscontinuation } = require('../scripts/auto_column/content_validator');
const { validateDraft, adapt } = require('../scripts/auto_column/telegram_delivery');
const regressions = require('./fixtures/column_editorial_regressions.json');

(async () => {
  // Captured publication regressions: hierarchy, source disclaimers and the
  // owner's exact ADHD example, independent of later edits to published files.
  assert.equal(regressions.length, 17);
  for (const row of regressions) {
    assert.equal(checkEditorialFraming(row.text).valid, false, row.slug);
  }
  const replacement = '현재 복용 중인 약이 있다면 진료 시 알려주세요. 아이의 증상과 복용 약을 함께 살펴 한약·침구 치료 등 개인별 진료 계획을 세웁니다. 기존 약의 용량이나 복용 방법을 조정할 필요가 있다면 처방 의료진과 협의합니다.';
  for (const text of [
    replacement,
    '한약 병행을 검토할 때 현재 복용약을 확인합니다. 상호작용이 의심되면 처방 의료진과 협의합니다.',
    '한약과 처방약 병행 시 상호작용 확인이 필요하면 처방 의료진과 협의합니다.',
    '이상반응이 의심되면 관련 의료진에게 알리고 평가를 받습니다.',
    '복부를 따뜻하게 하는 것은 편안함을 위한 보조적인 생활 방법입니다.',
    '흉통·의식 저하가 있으면 즉시 응급 평가를 받아야 합니다.',
    '참고 자료는 어지럼증의 감별과 위험 신호를 설명합니다. 한의 진찰에서는 증상과 수면·소화·피로를 살핍니다.'
  ]) assert.equal(checkEditorialFraming(text).valid, true, text);
  for (const text of [
    '한방 치료 병행 여부는 기존 처방 의료진과 상의해야 합니다.',
    '한의 진료를 시작하려면 주치의의 허락을 받아야 합니다.',
    '한약 병행 시 상호작용 때문에 처방 의료진의 승인을 받아야 합니다.',
    '체질 평가는 보조적 관점입니다.',
    '일반 의료기관에서 확인하세요.'
  ]) assert.equal(checkEditorialFraming(text).valid, false, text);
  const warning = '처방약을 임의로 중단하지 말고 약물 변경이 필요하면 처방 의료진과 상의합니다.';
  assert.equal(checkEditorialFraming(warning).valid, true);
  assert.equal(checkEditorialFraming(`${warning}\n## FAQ\n${warning}`).valid, false);
  assert.equal(checkEditorialFraming('약물 부작용이 의심돼도 처방약을 임의로 중단하지 말고 의료진과 협의합니다.\n한약과 기존 약의 상호작용이 우려되면 약을 스스로 줄이지 않고 관련 의료진과 확인합니다.').valid, true, 'distinct concrete safety concerns must not be treated as repeated generic warnings');
  // Editorial changes must not weaken the independent medication safety guard.
  assert.equal(checkMedicationDiscontinuation('약을 즉시 중단하세요.').violated, true);
  assert.equal(checkMedicationDiscontinuation(replacement).violated, false);

  const knowledge = loadMedicalKnowledge('adhd');
  const plan = { geo: { id: 'seongnam-bundang', displayName: '분당' }, disease: { id: 'adhd', name: 'ADHD' }, titleDisease: 'ADHD', ageGroup: 'child', topicAngle: { id: 'multi-step-instructions', titleSuffix: '여러 지시를 들으면 빠뜨릴 때' } };
  assert(prepareArticleKnowledge(knowledge, plan).specificRules.includes(EDITORIAL_GUIDANCE));
  assert.equal(prepareArticleKnowledge(prepareArticleKnowledge(knowledge, plan), plan).specificRules.filter(r => r === EDITORIAL_GUIDANCE).length, 1, 'repeated preparation must not duplicate the policy');
  assert(!knowledge.evidenceNotes.some(n => /반동 증상|주치의 상담을 원칙/.test(n.rationale || '')));
  for (const note of knowledge.evidenceNotes) assert.equal(checkMedicationDiscontinuation(note.claim).violated, false, 'approved evidence must not produce medication-stop advice');
  let capturedPrompt = '';
  const originalFetch = global.fetch;
  try {
    global.fetch = async (_url, options) => {
      capturedPrompt = JSON.parse(options.body).messages.map(m => m.content).join('\n');
      return { ok: true, json: async () => ({ choices: [{ message: { content: replacement } }], usage: {} }) };
    };
    await generateArticleBody(plan, {}, knowledge, [], 'unit-test-only-key');
  } finally { global.fetch = originalFetch; }
  assert(capturedPrompt.includes(EDITORIAL_GUIDANCE), 'real writer request must receive the policy');
  assert(!capturedPrompt.includes('한방 보조 요법'));
  const input = { title: '[분당 ADHD] 여러 지시를 들으면 빠뜨릴 때', summary: '여러 지시를 빠뜨리는 아이의 생활 양상과 필요한 평가를 설명합니다.', body: `${replacement}\n${'증상과 생활에서 불편한 점을 확인합니다. '.repeat(20)}`, geoId: 'seongnam-bundang', diseaseId: 'adhd', topicAngle: plan.topicAngle, knowledge };
  const framingErrors = value => validateArticleContent(value).errors.filter(e => e.startsWith('Editorial framing'));
  assert.deepEqual(framingErrors(input), []);
  assert(framingErrors({ ...input, body: input.body + regressions.at(-1).text }).length > 0, 'production validator must reject the published ADHD regression');
  assert(validateArticleContent({ ...input, body: input.body + '\n약을 즉시 중단하세요.' }).errors.some(e => e.includes('임의 약물 중단')));

  // Telegram adaptation is checked too; tests use a fake fetcher and never send.
  const source = { title: '원문', body: '증상과 진료 과정에 대한 설명입니다. '.repeat(40) };
  const draft = { title: '각색한 글', intro: replacement, sections: Array.from({ length: 3 }, (_, i) => ({ heading: `진료 설명 ${i}`, paragraphs: ['증상과 생활의 변화를 확인하고 개인별로 진료합니다. '.repeat(7)] })), closing: '일상에서 불편한 점을 진료에서 알려주세요.' };
  assert.equal(validateDraft(draft, source), draft);
  assert.throws(() => validateDraft({ ...draft, intro: regressions.at(-1).text }, source), /Editorial framing/);
  let adaptationPrompt = '';
  let calls = 0;
  await adapt(source, { OPENAI_API_KEY: 'unit-test-only-key' }, async (_url, options) => {
    const request = JSON.parse(options.body);
    adaptationPrompt += request.messages.map(m => m.content).join('\n');
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(calls++ ? { approved: true } : draft) } }] }) };
  });
  assert(adaptationPrompt.includes(EDITORIAL_GUIDANCE));
  // Previously published content is checked too, so a manual edit cannot
  // reintroduce the framing that the generator now rejects.
  const blog = path.join(__dirname, '../content/blog');
  for (const file of fs.readdirSync(blog).filter(f => f.endsWith('.md') && f !== '_index.md')) {
    const markdown = fs.readFileSync(path.join(blog, file), 'utf8');
    const front = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    const narrative = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
    const metadata = front.split('\n').filter(line => /^(title|summary):/.test(line)).join('\n');
    const checked = checkEditorialFraming(`${metadata}\n${narrative}`);
    assert.equal(checked.valid, true, `${file}: ${checked.errors.join('; ')}`);
  }
  console.log('✅ Published framing regressions blocked; writer, validator and Telegram policy wired; specific safety cooperation and medication safeguards preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
