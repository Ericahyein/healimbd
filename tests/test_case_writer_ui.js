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

const singleHtmlPath = path.join(__dirname, '..', 'layouts', 'reviews', 'single.html');
const singleHtml = fs.readFileSync(singleHtmlPath, 'utf8');

const listHtmlPath = path.join(__dirname, '..', 'layouts', 'reviews', 'list.html');
const listHtml = fs.readFileSync(listHtmlPath, 'utf8');

async function runAll() {
  // TEST 1: Upload date is NOT displayed to users in review pages
  await test('TEST 1: Upload date (meta-date / date fallback) is hidden from review front UI', () => {
    assert.ok(!singleHtml.includes('class="meta-date"'), 'meta-date span removed from single review page');
    assert.ok(!listHtml.includes('.Date.Format'), 'Review list card does not fallback to upload date');
    assert.ok(!mainJs.includes('${item.duration || item.date}'), 'Custom cases list does not fallback to item.date');
    assert.ok(!mainJs.includes('${found.duration || found.date}'), 'Custom case reader does not fallback to found.date');
  });

  // TEST 2: Treatment duration is properly preserved and displayed
  await test('TEST 2: Treatment duration is properly displayed on single page and list cards', () => {
    assert.ok(singleHtml.includes('class="meta-duration"'), 'meta-duration exists on single review page');
    assert.ok(listHtml.includes('class="case-duration-text"'), 'case-duration-text exists on review list');
    assert.ok(mainJs.includes("치료기간: ${item.duration || '치료 완료'}"), 'Case duration preserved with fallback');
  });

  // TEST 3: .md download button completely removed
  await test('TEST 3: .md download button is completely removed from writer modal HTML', () => {
    assert.ok(!modalHtml.includes('.md 파일 다운로드'), 'No .md download button text in modal HTML');
    assert.ok(!modalHtml.includes('downloadCaseMarkdown'), 'No downloadCaseMarkdown call in modal HTML');
    assert.ok(!mainJs.includes('function downloadCaseMarkdown'), 'downloadCaseMarkdown function is removed from main.js');
  });

  // TEST 4: Exactly 3 buttons exist in writer modal: 취소, 임시저장, 등록하기
  await test('TEST 4: Modal actions strictly contains only 3 buttons: 취소, 임시저장, 등록하기', () => {
    const writerActionsMatch = modalHtml.match(/<div class="modal-actions writer-actions">([\s\S]*?)<\/div>/);
    assert.ok(writerActionsMatch, 'writer-actions container found');
    const actionsHtml = writerActionsMatch[1];

    const buttonMatches = actionsHtml.match(/<button[\s\S]*?<\/button>/g);
    assert.strictEqual(buttonMatches.length, 3, 'Must have exactly 3 buttons');
    assert.ok(actionsHtml.includes('취소'), 'Contains 취소 button');
    assert.ok(actionsHtml.includes('임시저장'), 'Contains 임시저장 button');
    assert.ok(actionsHtml.includes('등록하기'), 'Contains 등록하기 button');
    assert.ok(!actionsHtml.includes('홈페이지에 즉시 등록하기'), 'Long text replaced with short 등록하기');
  });

  // TEST 5 & 6: Strict 1-row layout on PC and Mobile without text wrapping
  await test('TEST 5 & 6: CSS enforces 1-row layout with grid and white-space: nowrap for both PC and mobile', () => {
    assert.ok(styleCss.includes('.modal-actions.writer-actions {'), 'writer-actions CSS rule exists');
    assert.ok(styleCss.includes('white-space: nowrap !important;'), 'white-space: nowrap !important prevents button text wrapping');
    assert.ok(styleCss.includes('grid-template-columns: 0.9fr 1.3fr 2.2fr;') || styleCss.includes('grid-template-columns'), 'Grid columns defined');
    assert.ok(styleCss.includes('grid-template-columns: 0.85fr 1.25fr 1.9fr !important;'), 'Mobile responsive grid columns defined');
  });

  // TEST 7: Visual separation between question and answer
  await test('TEST 7: Visual separation between Question Header and Answer Box is distinct', () => {
    assert.ok(styleCss.includes('.case-display-section {'), 'case-display-section exists');
    assert.ok(styleCss.includes('.section-question-title {'), 'section-question-title exists');
    assert.ok(styleCss.includes('.case-section-answer {'), 'case-section-answer exists');

    // Answer box has distinct crisp white background and border
    assert.ok(styleCss.includes('background: #FFFFFF; /* High contrast crisp white inner box */') || styleCss.includes('background: #FFFFFF;'), 'Answer box has distinct white background');
    assert.ok(styleCss.includes('white-space: pre-wrap;'), 'Preserves multiline line breaks');
  });

  // TEST 8: Question texts in modal and constant match exact paper clinic template
  await test('TEST 8: Question texts match exact clinic template without alterations', () => {
    assert.ok(modalHtml.includes('치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어주세요.'), 'Q1 label matches');
    assert.ok(modalHtml.includes('치료받기 전과 비교해 나아진 몸상태에 대해 적어주세요.'), 'Q2 label matches');
    assert.ok(modalHtml.includes('비슷한 질환을 앓고 계신 환자들에게 하고싶은 말이 있으면 적어주세요.'), 'Q3 label matches');

    assert.ok(mainJs.includes("question: '치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어주세요.'"), 'Q1 constant matches');
    assert.ok(mainJs.includes("question: '치료받기 전과 비교해 나아진 몸상태에 대해 적어주세요.'"), 'Q2 constant matches');
    assert.ok(mainJs.includes("question: '비슷한 질환을 앓고 계신 환자들에게 하고싶은 말이 있으면 적어주세요.'"), 'Q3 constant matches');
  });

  // TEST 9: Safe parsing for legacy content
  await test('TEST 9: Safe parsing only parses 3 clear questions and rejects arbitrary numbered content', () => {
    const parseFnMatch = mainJs.match(/function parseLegacyContentToQuestions\(rawContent\) \{([\s\S]*?)\n\}/);
    assert.ok(parseFnMatch, 'parseLegacyContentToQuestions found');
    const parseLegacy = new Function('rawContent', parseFnMatch[1]);

    const arbitraryNumbers = "일지 1. 증상 2. 치료 3. 귀가";
    assert.strictEqual(parseLegacy(arbitraryNumbers), null, 'Arbitrary numbers return null');

    const validLegacy = `### 1. 치료 받기 전 증상들로 인해 얼마나 힘들었는지 구체적으로 적어 주세요.
눈깜빡임이 심했습니다.

---

### 2. 치료받기 전과 비교해 나아진 몸 상태에 대해 적어 주세요.
호전되었습니다.

---

### 3. 비슷한 질환을 앓고 계신 환자들에게 하고 싶은 말이 있으면 적어 주세요.
추천합니다.`;
    const parsed = parseLegacy(validLegacy);
    assert.ok(parsed, 'Valid legacy parsed');
    assert.ok(parsed.q1.includes('눈깜빡임'), 'q1 extracted');
  });

  // TEST 10: Clean Hugo markdown format without bold overlay syntax
  await test('TEST 10: Combined content uses clean Hugo markdown (### 1. ...) without bold overlay', () => {
    assert.ok(mainJs.includes('### 1. ${QUESTION_TEMPLATE[0].question}'), 'Clean H3 syntax for Q1');
    assert.ok(!mainJs.includes('**### 1.'), 'No bold overlay on H3 headings');
  });

  console.log(`\n🎉 ALL ${passed} TESTS PASSED SUCCESSFULLY!`);
}

runAll();

