const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('assets/js/main.js');
const template = read('layouts/review-view/list.html');
const content = read('content/review-view/_index.md');
const partial = read('layouts/partials/admin_case_modal.html');

assert(main.includes("window.location.href = `/reviews/view/?id=${encodeURIComponent(caseId)}`"), 'review cards must navigate to a full detail page');
assert(main.includes('function initReviewDetailPage()'), 'full-page review loader must initialize from the URL');
assert(main.includes("firebase.appCheck().getToken(true)"), 'protected image loading must refresh App Check token');
assert(main.includes("new Promise(resolve => setTimeout(() => resolve(''), 15000))"), 'image loading must have a timeout');
assert(main.indexOf("pageRoot.style.display = 'block'") < main.indexOf('const resolvedUrl = await Promise.race(['), 'review body must appear before the original image finishes loading');
assert(main.includes("const tagList = Array.isArray(found.hashtags)"), 'footer keywords must retain their own tag list');
assert(template.includes('id="review-detail-page-root"'), 'full-page reader root must exist');
assert(template.includes('id="custom-reader-photo"'), 'full-page reader must include the original image');
assert(template.includes('id="review-photo-status"'), 'image loading failures must be visible');
assert(!template.includes('custom-reader-summary-bar'), 'top summary and keyword banner must be removed');
assert(!template.includes('custom-reader-date-wrap'), 'review publication date must not be shown');
assert(!template.includes('custom-reader-author-wrap'), 'only treatment duration belongs in the header metadata');
assert(template.includes('id="custom-reader-duration-wrap"'), 'treatment duration must remain visible');
assert(read('assets/css/review-detail.css').includes('justify-content:flex-end'), 'treatment duration must be right aligned');
assert(content.includes('url: "/reviews/view/"'), 'detail route must be stable');
assert(partial.includes('{{ if not .Params.review_detail_page }}'), 'legacy modal must not duplicate reader IDs on the full page');

console.log('Review full-page detail checks passed.');
