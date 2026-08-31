const fs = require('fs');
const path = require('path');

function checkFileContains(filePath, patterns) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n--- Checking [${path.basename(filePath)}] ---`);
  let allPass = true;
  patterns.forEach(pat => {
    const isReg = pat instanceof RegExp;
    const found = isReg ? pat.test(content) : content.includes(pat);
    console.log(`  [${found ? 'PASS' : 'FAIL'}] Contains ${isReg ? pat.toString() : `"${pat}"`}`);
    if (!found) allPass = false;
  });
  return allPass;
}

const inquiryHtml = path.join(__dirname, '../public/inquiry/index.html');
const blogHtml = path.join(__dirname, '../public/blog/index.html');
const reviewsHtml = path.join(__dirname, '../public/reviews/index.html');
const indexHtml = path.join(__dirname, '../public/index.html');
const mainJs = path.join(__dirname, '../assets/js/main.js');

let ok = true;
ok = checkFileContains(inquiryHtml, [
  /id=["']?inq-hashtags["']?/,
  /btn-draft-save/,
  /id=["']?view-inq-hashtags["']?/,
  /id=["']?inquiry-empty-state["']?/
]) && ok;

ok = checkFileContains(blogHtml, [
  /column-list-wrap/,
  /id=["']?column-cards-grid["']?/,
  /id=["']?column-empty-state["']?/,
  /id=["']?column-input-hashtags["']?/,
  /id=["']?col-reader-hashtags["']?/,
  /btn-draft-save/
]) && ok;

ok = checkFileContains(reviewsHtml, [
  /id=["']?case-input-hashtags["']?/,
  /id=["']?custom-reader-hashtags["']?/,
  /btn-draft-save/
]) && ok;

ok = checkFileContains(indexHtml, [
  /column-list-wrap/,
  /id=["']?column-cards-grid["']?/,
  /id=["']?column-empty-state["']?/
]) && ok;

ok = checkFileContains(mainJs, [
  'saveCaseDraft',
  'loadCaseDraft',
  'saveColumnDraft',
  'loadColumnDraft',
  'saveInquiryDraft',
  'loadInquiryDraft',
  'renderHashtagPills',
  'parseHashtags',
  'doctor-column-row-item',
  'col-row-thumb-wrap',
  'DEFAULT_INQUIRIES = []',
  'DEFAULT_COLUMNS_DATA = {}'
]) && ok;

console.log(`\n=============================`);
console.log(`Overall Verification: ${ok ? 'SUCCESS' : 'FAILURE'}`);
console.log(`=============================\n`);
process.exit(ok ? 0 : 1);
