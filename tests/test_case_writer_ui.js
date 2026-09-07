const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Test Suite: 3-Part Structured Review Writer & Display UI...\n');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const mainJsPath = path.join(__dirname, '..', 'assets', 'js', 'main.js');
const mainJs = fs.readFileSync(mainJsPath, 'utf8');

const modalHtmlPath = path.join(__dirname, '..', 'layouts', 'partials', 'admin_case_modal.html');
const modalHtml = fs.readFileSync(modalHtmlPath, 'utf8');

const styleCssPath = path.join(__dirname, '..', 'assets', 'css', 'style.css');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

async function runAll() {
  // TEST A: Fixed non-editable question texts in modal
  await test('TEST A: Question texts are non-editable fixed labels in modal form, inputs only accept answers', () => {
    assert.ok(modalHtml.includes('id="case-input-q1"'), 'case-input-q1 textarea exists');
    assert.ok(modalHtml.includes('id="case-input-q2"'), 'case-input-q2 textarea exists');
    assert.ok(modalHtml.includes('id="case-input-q3"'), 'case-input-q3 textarea exists');

    // Confirm exact fixed questions in HTML
    assert.ok(modalHtml.includes('치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어주세요.'), 'Q1 label matches');
    assert.ok(modalHtml.includes('치료받기 전과 비교해 나아진 몸상태에 대해 적어주세요.'), 'Q2 label matches');
    assert.ok(modalHtml.includes('비슷한 질환을 앓고 계신 환자들에게 하고싶은 말이 있으면 적어주세요.'), 'Q3 label matches');

    // Confirm QUESTION_TEMPLATE in main.js has exact strings
    assert.ok(mainJs.includes("question: '치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어주세요.'"), 'Q1 constant matches');
    assert.ok(mainJs.includes("question: '치료받기 전과 비교해 나아진 몸상태에 대해 적어주세요.'"), 'Q2 constant matches');
    assert.ok(mainJs.includes("question: '비슷한 질환을 앓고 계신 환자들에게 하고싶은 말이 있으면 적어주세요.'"), 'Q3 constant matches');
  });

  // TEST B: Submit requires answers only and saves single source of truth (sections)
  await test('TEST B: handleAdminCaseSubmit saves structured sections, version 1, and legacy combined Hugo markdown', () => {
    assert.ok(mainJs.includes("questionSetVersion: 1"), 'questionSetVersion: 1 is set');
    assert.ok(mainJs.includes("{ id: 'q1', answer: q1 }"), 'q1 answer in sections');
    assert.ok(mainJs.includes("{ id: 'q2', answer: q2 }"), 'q2 answer in sections');
    assert.ok(mainJs.includes("{ id: 'q3', answer: q3 }"), 'q3 answer in sections');
    
    // Check validation allows submitting when answers are present
    assert.ok(mainJs.includes("if (!q1 && !q2 && !q3)"), 'Validates answer existence');
  });

  // TEST C: Preserves line breaks and formatting
  await test('TEST C: Preserves multiline line breaks with white-space: pre-wrap', () => {
    assert.ok(styleCss.includes('.case-section-answer {') || styleCss.includes('.case-section-answer'), 'CSS has .case-section-answer');
    assert.ok(styleCss.includes('white-space: pre-wrap;'), 'CSS uses white-space: pre-wrap for answers');
  });

  // TEST D: Safe parse prevents false positives on legacy free-form reviews
  await test('TEST D: Legacy free-form content with arbitrary 1. 2. 3. numbers is NOT split incorrectly', () => {
    // Extract parseLegacyContentToQuestions from main.js using Function constructor
    const parseFnMatch = mainJs.match(/function parseLegacyContentToQuestions\(rawContent\) \{([\s\S]*?)\n\}/);
    assert.ok(parseFnMatch, 'parseLegacyContentToQuestions function found');
    const parseLegacy = new Function('rawContent', parseFnMatch[1]);

    // 1. Free-form review with random numbers
    const freeformText = "환자 치료 일지:\n1. 1일차에는 두통이 있었음.\n2. 2일차에는 조금 완화됨.\n3. 3일차에는 정상 생활 복귀함.";
    assert.strictEqual(parseLegacy(freeformText), null, 'Random numbered text must return null');

    // 2. Real legacy review matching all 3 question themes
    const legacyTemplateReview = `### 1. 치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어 주세요.
7세 때 눈깜빡임으로 시작되어 10세에 재발했습니다. 킁킁거림과 찡그림이 심했습니다.

---

### 2. 치료받기 전과 비교해 나아진 몸 상태에 대해 적어 주세요.
한약 복용 후 머리 끄덕임과 킁킁거림이 완화되었습니다.

---

### 3. 비슷한 질환을 앓고 계신 환자들에게 하고 싶은 말이 있으면 적어 주세요.
선생님을 믿고 꾸준히 치료받으시면 호전될 것입니다.`;

    const parsed = parseLegacy(legacyTemplateReview);
    assert.ok(parsed, 'Legitimate 3-question legacy review must be parsed');
    assert.ok(parsed.q1.includes('눈깜빡임'), 'q1 content extracted');
    assert.ok(parsed.q2.includes('한약 복용 후'), 'q2 content extracted');
    assert.ok(parsed.q3.includes('꾸준히 치료받으시면'), 'q3 content extracted');
  });

  // TEST E: New structured sections render as 3 distinct cards
  await test('TEST E: renderCustomCaseBody renders 3 distinct cards with 01, 02, 03 badges', () => {
    const renderFnMatch = mainJs.match(/function renderCustomCaseBody\(item\) \{([\s\S]*?)\n\}/);
    assert.ok(renderFnMatch, 'renderCustomCaseBody found');

    const QUESTION_TEMPLATE = [
      { id: 'q1', num: '01', question: '치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어주세요.' },
      { id: 'q2', num: '02', question: '치료받기 전과 비교해 나아진 몸상태에 대해 적어주세요.' },
      { id: 'q3', num: '03', question: '비슷한 질환을 앓고 계신 환자들에게 하고싶은 말이 있으면 적어주세요.' }
    ];
    function escapeHtml(str) { return str || ''; }
    function parseLegacyContentToQuestions() { return null; }

    const renderBody = new Function('item', 'QUESTION_TEMPLATE', 'escapeHtml', 'parseLegacyContentToQuestions', renderFnMatch[1]);

    const item = {
      sections: [
        { id: 'q1', answer: '너무 힘들어서 외출이 어려웠습니다.' },
        { id: 'q2', answer: '2개월 차부터 불안감이 사라졌습니다.' },
        { id: 'q3', answer: '조기에 해아림을 찾으시길 권합니다.' }
      ]
    };

    const html = renderBody(item, QUESTION_TEMPLATE, escapeHtml, parseLegacyContentToQuestions);
    assert.ok(html.includes('01'), 'Contains 01 badge');
    assert.ok(html.includes('02'), 'Contains 02 badge');
    assert.ok(html.includes('03'), 'Contains 03 badge');
    assert.ok(html.includes('너무 힘들어서 외출이 어려웠습니다.'), 'Contains answer 1');
    assert.ok(html.includes('2개월 차부터 불안감이 사라졌습니다.'), 'Contains answer 2');
    assert.ok(html.includes('조기에 해아림을 찾으시길 권합니다.'), 'Contains answer 3');
  });

  // TEST F: Markdown download formats as clean Hugo headings
  await test('TEST F: Markdown export generates clean Hugo headings (### 1., ### 2., ### 3.) without bold syntax overlay', () => {
    assert.ok(mainJs.includes('### 1. ${QUESTION_TEMPLATE[0].question}'), 'Markdown has clean H3 for Q1');
    assert.ok(mainJs.includes('### 2. ${QUESTION_TEMPLATE[1].question}'), 'Markdown has clean H3 for Q2');
    assert.ok(mainJs.includes('### 3. ${QUESTION_TEMPLATE[2].question}'), 'Markdown has clean H3 for Q3');
    assert.ok(!mainJs.includes('**### 1.'), 'Must NOT use bold overlay syntax on headings');
  });

  // TEST G: Summary preview truncated to 80-120 chars while preserving raw answers
  await test('TEST G: getCaseSummaryPreview truncates preview text gracefully without mutating raw answers', () => {
    const summaryFnMatch = mainJs.match(/function getCaseSummaryPreview\(item\) \{([\s\S]*?)\n\}/);
    assert.ok(summaryFnMatch, 'getCaseSummaryPreview found');

    const getPreview = new Function('item', 'parseLegacyContentToQuestions', summaryFnMatch[1]);

    const longAnswer = '매우 고통스러웠던 경험이었습니다. '.repeat(20);
    const item = {
      sections: [
        { id: 'q1', answer: longAnswer },
        { id: 'q2', answer: '호전됨' },
        { id: 'q3', answer: '추천함' }
      ]
    };

    const preview = getPreview(item, () => null);
    assert.ok(preview.length <= 120, 'Preview length must be <= 120 chars');
    assert.ok(preview.endsWith('...'), 'Preview must end with ellipsis');
    assert.strictEqual(item.sections[0].answer, longAnswer, 'Original raw answer must NOT be truncated');
  });

  // TEST H: CSS responsive rules for mobile
  await test('TEST H: CSS has responsive mobile media queries for question cards and reader sections', () => {
    assert.ok(styleCss.includes('.case-question-card'), 'case-question-card styled');
    assert.ok(styleCss.includes('.case-display-section'), 'case-display-section styled');
    assert.ok(styleCss.includes('@media (max-width: 768px)'), 'Mobile media query exists');
  });

  console.log(`\n🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
}

runAll();
