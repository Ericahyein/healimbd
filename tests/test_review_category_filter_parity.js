const fs = require('fs');
const assert = require('assert');

const reviewsLayout = fs.readFileSync('layouts/reviews/list.html', 'utf8');
const adminModal = fs.readFileSync('layouts/partials/admin_case_modal.html', 'utf8');
const mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

const expectedCategories = [
  ['tic', '소아 틱장애·뚜렛'],
  ['adhd', '주의집중력 (소아·성인 ADHD)'],
  ['panic', '공황장애'],
  ['anxiety', '불안장애·사회공포증'],
  ['sleep', '수면·불면증'],
  ['autonomic', '자율신경실조증'],
  ['hyperhidrosis', '다한증 (손발·전신·안면)'],
  ['ibs', '과민성대장증후군'],
  ['syncope', '미주신경성 실신'],
  ['etc', '기타 신경정신 질환']
];

function normalizeLabel(value) {
  return value.replace(/\s*·\s*/g, '·').replace(/\s+/g, ' ').trim();
}

function extractWriterCategories() {
  const select = adminModal.match(/<select id="case-input-category" required>([\s\S]*?)<\/select>/);
  assert.ok(select, 'admin writer category select must exist');
  return [...select[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map(([, key, label]) => [key, normalizeLabel(label)]);
}

function extractDesktopFilters() {
  const tabs = reviewsLayout.match(/<div class="cases-category-tabs" id="category-tabs-container">([\s\S]*?)<\/div>/);
  assert.ok(tabs, 'handwritten review desktop tabs must exist');
  return [...tabs[1].matchAll(/data-filter="([^"]+)">([^<]+)<\/button>/g)]
    .filter(([_, key]) => key !== 'all')
    .map(([, key, label]) => [key, normalizeLabel(label)]);
}

function extractMobileFilters() {
  const dropdown = reviewsLayout.match(/<div class="mobile-category-dropdown" id="handwritten-mobile-dropdown">([\s\S]*?)<\/div>/);
  assert.ok(dropdown, 'handwritten review mobile dropdown must exist');
  return [...dropdown[1].matchAll(/data-value="([^"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g)]
    .filter(([_, key]) => key !== 'all')
    .map(([, key, label]) => [key, normalizeLabel(label)]);
}

assert.deepStrictEqual(extractWriterCategories(), expectedCategories, 'writer categories changed unexpectedly');
assert.deepStrictEqual(extractDesktopFilters(), expectedCategories, 'desktop filters must match writer categories');
assert.deepStrictEqual(extractMobileFilters(), expectedCategories, 'mobile filters must match writer categories');

for (const [key] of expectedCategories) {
  assert.ok(mainJs.includes(`${key}: [` ) || mainJs.includes(`cat === '${key}'`) || mainJs.includes('cat === filter'), `filter logic must support ${key}`);
}

assert.ok(mainJs.includes("if (cat === 'tic-adhd') return filter === 'tic' || filter === 'adhd';"), 'legacy tic-adhd reviews remain discoverable');
assert.ok(mainJs.includes("if (cat === 'mood' || cat === 'depression' || cat === 'hwabyung') return filter === 'etc';"), 'legacy mood reviews remain discoverable');

console.log('✅ Treatment review writer categories and list filters are identical on desktop and mobile.');
