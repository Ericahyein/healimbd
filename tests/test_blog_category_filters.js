const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveBlogCategory, BLOG_CATEGORY_KEYS } = require('../scripts/auto_column/blog_category');
const taxonomy = require('../scripts/auto_column/disease_taxonomy.json');

const expected = {
  'child:separation-anxiety': 'anxiety',
  'child:night-terrors': 'sleep',
  'child:child-enuresis': 'general',
  'depression:burnout-lethargy': 'anxiety',
  'depression:intrusive-thoughts': 'anxiety',
  'headache:tension-headache': 'general',
  'headache:chronic-dizziness': 'general'
};

for (const disease of taxonomy.diseases) {
  for (const angle of disease.topicAngles) {
    const actual = resolveBlogCategory(disease.id, angle.id, disease.category);
    assert.ok(BLOG_CATEGORY_KEYS.has(actual), `${disease.id}/${angle.id} has no list filter`);
    assert.equal(actual, expected[`${disease.id}:${angle.id}`] || disease.category);
  }
}
assert.throws(() => resolveBlogCategory('child', 'unknown-angle', 'child'), /No visible blog category/);
assert.throws(() => resolveBlogCategory('unknown', 'unknown-angle', 'unknown'), /No visible blog category/);

for (const [filename, category] of [
  ['seongnam-bundang-separation-anxiety.md', 'anxiety'],
  ['gyeonggi-gwangju-night-terrors.md', 'sleep'],
  ['gyeonggi-icheon-dizziness-chronic-dizziness.md', 'general'],
  ['yongin-main-depression-burnout-lethargy.md', 'anxiety']
]) {
  const article = fs.readFileSync(path.join(__dirname, '../content/blog', filename), 'utf8');
  assert.match(article.split('---', 3)[1], new RegExp(`^category: "${category}"$`, 'm'), filename);
}

const list = fs.readFileSync(path.join(__dirname, '../layouts/blog/list.html'), 'utf8');
for (const key of BLOG_CATEGORY_KEYS) {
  assert.ok(list.includes(`"key" "${key}"`), `missing list tab: ${key}`);
}
console.log('Blog category mappings and existing column filters passed.');
