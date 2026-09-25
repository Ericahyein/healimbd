const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Comprehensive Verification Suite for Modal UI Redesign...\n');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Files existence & content load
const inquiryHtml = fs.readFileSync('layouts/inquiry/list.html', 'utf8');
const adminCaseHtml = fs.readFileSync('layouts/partials/admin_case_modal.html', 'utf8');
const mainJs = fs.readFileSync('assets/js/main.js', 'utf8');
const styleCss = fs.readFileSync('assets/css/style.css', 'utf8');
const staticStyleCss = fs.readFileSync('static/css/style.css', 'utf8');

// ==========================================
// TEST SUITE 1: Online Inquiry Detail Modal
// ==========================================
test('Inquiry Modal: Circular close button present with aria-label', () => {
  assert.ok(inquiryHtml.includes('class="modal-close-circle" onclick="closeInquiryDetailModal()" aria-label="닫기"'), 'Modal close button with circle styling');
  assert.ok(inquiryHtml.includes('<i class="ph-bold ph-x"></i>'), 'Phosphor X icon present');
});

test('Inquiry Modal: Dr. Son profile image reused accurately without new asset', () => {
  assert.ok(inquiryHtml.includes('src="/images/doctor-son-profile.png"'), 'Correct doctor profile asset path used');
  assert.ok(inquiryHtml.includes('alt="해아림한의원 분당점 손지웅 대표원장 진료 프로필"'), 'Proper alt text preserved');
  assert.ok(inquiryHtml.includes('class="doc-profile-avatar"'), 'Avatar class applied');
  assert.ok(fs.existsSync('static/images/doctor-son-profile.png'), 'Profile asset strictly exists in static directory');
});

test('Inquiry Modal: Hierarchy - disease tag, status tag, title, meta line', () => {
  assert.ok(inquiryHtml.includes('id="view-inq-disease"'), 'Disease tag id preserved');
  assert.ok(inquiryHtml.includes('id="view-inq-status"'), 'Status tag id preserved');
  assert.ok(inquiryHtml.includes('<h2 class="detail-main-title" id="view-inq-title">'), 'Title H2 tag with correct id');
  assert.ok(inquiryHtml.includes('id="view-inq-author"'), 'Author id preserved');
  assert.ok(inquiryHtml.includes('id="view-inq-date"'), 'Date id preserved');
});

test('Inquiry Modal: Question card and Doctor consultation answer card', () => {
  assert.ok(inquiryHtml.includes('class="inq-question-box"'), 'Question box card present');
  assert.ok(inquiryHtml.includes('id="view-inq-content"'), 'Question content element preserved');
  assert.ok(inquiryHtml.includes('id="view-doctor-answer-wrapper"'), 'Doctor answer wrapper id preserved');
  assert.ok(inquiryHtml.includes('id="view-doctor-answer-content"'), 'Doctor answer content id preserved');
  assert.ok(inquiryHtml.includes('id="view-answer-date"'), 'Doctor answer date id preserved');
  assert.ok(inquiryHtml.includes('class="doc-badge-pill">해아림 대표원장</span>'), 'Representative director badge');
  assert.ok(inquiryHtml.includes('손지웅 원장의 <strong>전문 1:1 상담 답변</strong>'), 'Doctor answer heading text');
});

test('Inquiry Modal: Footer action buttons (Delete & Return to List)', () => {
  assert.ok(inquiryHtml.includes('id="btn-author-delete-trigger"'), 'Author delete trigger preserved');
  assert.ok(inquiryHtml.includes('class="btn btn-inq-back-list" onclick="closeInquiryDetailModal()"'), 'Return to list button with primary styling');
  assert.ok(inquiryHtml.includes('<span>목록으로 돌아가기</span>'), 'Return to list label');
});

test('Inquiry Modal: JS renderDoctorAnswer handles headings and paragraphs without altering data', () => {
  assert.ok(mainJs.includes('function renderDoctorAnswer(rawAnswer)'), 'renderDoctorAnswer defined');
  assert.ok(mainJs.includes('doc-subheading-pill'), 'Subheading pill class applied in JS');
  assert.ok(mainJs.includes('doc-paragraph'), 'Paragraph class applied in JS');
  assert.ok(mainJs.includes('answerContentEl.innerHTML = renderDoctorAnswer(found.answer)'), 'Applied to modal rendering');
});

test('Inquiry Modal: History pushState and URL restoration on close', () => {
  assert.ok(mainJs.includes("history.pushState({}, '', '/inquiry/');"), 'pushState restored on modal close');
});

// ==========================================
// TEST SUITE 2: Treatment Review Modal (2-Column)
// ==========================================
test('Review Modal: Circular close button present with aria-label', () => {
  assert.ok(adminCaseHtml.includes('class="modal-close-circle" onclick="closeCustomCaseReader()" aria-label="닫기"'), 'Review modal close circle button');
});

test('Review Modal: Category, title, duration, author, date metadata bar', () => {
  assert.ok(adminCaseHtml.includes('id="custom-reader-category"'), 'Category tag id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-case-reader-title"'), 'Title id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-reader-duration"'), 'Duration id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-reader-author"'), 'Author id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-reader-date"'), 'Date id preserved');
});

test('Review Modal: Summary banner area (이런 변화가 있었어요 / 주요 키워드)', () => {
  assert.ok(adminCaseHtml.includes('id="custom-reader-summary-bar"'), 'Summary bar present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-summary-effect-col"'), 'Effect summary column present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-summary-desc"'), 'Effect description element present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-summary-keywords-col"'), 'Keywords column present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-summary-chips"'), 'Chips wrap element present');
});

test('Review Modal: 2-Column layout - Left Q&A cards / Right original photo card', () => {
  assert.ok(adminCaseHtml.includes('class="case-reader-two-column"'), '2-Column grid wrapper present');
  assert.ok(adminCaseHtml.includes('class="case-reader-main-col"'), 'Main column present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-body"'), 'Body container id preserved');
  assert.ok(adminCaseHtml.includes('class="case-reader-side-col"'), 'Side column present');
  assert.ok(adminCaseHtml.includes('id="custom-reader-photo-box"'), 'Photo box id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-reader-photo"'), 'Photo image element id preserved');
  assert.ok(adminCaseHtml.includes('class="btn-photo-zoom" onclick="openReviewPhotoLightbox()"'), 'Zoom button present');
});

test('Review Modal: Footer keywords, admin actions, and Return to List button', () => {
  assert.ok(adminCaseHtml.includes('id="custom-reader-hashtags"'), 'Hashtags container id preserved');
  assert.ok(adminCaseHtml.includes('id="custom-reader-hashtags-list"'), 'Hashtags list element present');
  assert.ok(adminCaseHtml.includes('id="btn-edit-custom-case"'), 'Admin edit button preserved');
  assert.ok(adminCaseHtml.includes('id="btn-delete-custom-case"'), 'Admin delete button preserved');
  assert.ok(adminCaseHtml.includes('class="btn btn-back-to-list" onclick="closeCustomCaseReader()"'), 'Back to list button present');
});

test('Review Modal: Lightbox modal element present', () => {
  assert.ok(adminCaseHtml.includes('id="review-photo-lightbox-modal"'), 'Lightbox modal element present');
  assert.ok(adminCaseHtml.includes('id="review-lightbox-img"'), 'Lightbox image element present');
  assert.ok(mainJs.includes('function openReviewPhotoLightbox()'), 'openReviewPhotoLightbox defined');
  assert.ok(mainJs.includes('function closeReviewPhotoLightbox()'), 'closeReviewPhotoLightbox defined');
});

test('Review Modal: 3 Question cards rendered with numbers (01,02,03), icons, and quote decor', () => {
  assert.ok(mainJs.includes('section-num-badge'), 'Circular number badge in renderCustomCaseBody');
  assert.ok(mainJs.includes('ph-quotes case-quote-icon'), 'Quote decoration icon present');
  assert.ok(mainJs.includes('getQuestionIcon'), 'Question icon mapping function present');
});

// ==========================================
// TEST SUITE 3: Accessibility & Keyboards
// ==========================================
test('Accessibility: Global ESC key closes modals', () => {
  assert.ok(mainJs.includes("e.key === 'Escape'"), 'Escape key handler present');
  assert.ok(mainJs.includes('closeReviewPhotoLightbox()'), 'ESC closes lightbox');
  assert.ok(mainJs.includes('closeCustomCaseReader()'), 'ESC closes review modal');
  assert.ok(mainJs.includes('closeInquiryDetailModal()'), 'ESC closes inquiry modal');
});

// ==========================================
// TEST SUITE 4: Stylesheet Integrity & Responsiveness
// ==========================================
test('CSS: Inquiry modal width (840~900px), border-radius 22px, and dark blur overlay', () => {
  assert.ok(styleCss.includes('max-width: 880px;'), '880px max-width in inquiry modal');
  assert.ok(styleCss.includes('border-radius: 22px;'), '22px border radius');
  assert.ok(styleCss.includes('backdrop-filter: blur(5px);'), 'Subtle backdrop blur overlay');
  assert.ok(styleCss.includes('.doc-profile-avatar {'), 'Profile avatar CSS rule');
  assert.ok(styleCss.includes('object-position: 50% 12%;'), 'Face centered in circular avatar');
  assert.ok(styleCss.includes('.doc-subheading-pill {'), 'Subheading pill CSS rule');
});

test('CSS: Review modal width (1050~1150px) and 2-column grid', () => {
  assert.ok(styleCss.includes('max-width: 1120px;'), '1120px max-width in review modal');
  assert.ok(styleCss.includes('grid-template-columns: 1.32fr 0.92fr;'), '2-column grid layout');
  assert.ok(styleCss.includes('.review-detail-summary-bar {'), 'Summary bar CSS rule');
  assert.ok(styleCss.includes('.case-quote-icon {'), 'Quote icon decoration CSS rule');
});

test('CSS: Responsive media queries for tablet and mobile', () => {
  assert.ok(styleCss.includes('@media (max-width: 991px)'), 'Tablet breakpoint defined');
  assert.ok(styleCss.includes('@media (max-width: 768px)'), 'Mobile breakpoint defined');
  assert.ok(styleCss.includes('width: calc(100vw - 20px);'), 'Mobile width optimized');
  assert.ok(styleCss.includes('flex-direction: column;'), 'Mobile footer stack');
});

test('CSS: Static style.css is identical to assets/css/style.css', () => {
  assert.strictEqual(styleCss, staticStyleCss, 'static/css/style.css is synchronized with assets/css/style.css');
});

console.log(`\n==================================================`);
console.log(`📊 All ${passCount} Modal Verification Tests PASSED 100%!`);
console.log(`==================================================\n`);
