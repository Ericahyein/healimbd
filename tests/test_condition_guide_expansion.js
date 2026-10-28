const assert = require('assert');
const fs = require('fs');
const path = require('path');
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
const root = path.resolve(__dirname, '..');
const structure = JSON.parse(fs.readFileSync(path.join(root, 'data/condition_reference_structure.json'), 'utf8'));
const expectedCounts = {panic:14, dizziness:14, autonomic:14, insomnia:12, adhd:12, anxiety:11};
const read = url => fs.readFileSync(path.join(output, url.replace(/^\//, ''), 'index.html'), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1], m[2] ?? m[3] ?? m[4]]));
const ids = text => [...text.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => m[1] ?? m[2] ?? m[3]);
const plain = text => text.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
for (const [slug, expected] of Object.entries(structure)) {
  const text = read(`/conditions/${slug}/`);
  assert(text.includes('reference-condition-page'));
  assert(!text.includes('class=condition-toc') && !text.includes('class="condition-toc"'), `${slug}: old sidebar is replaced`);
  assert(!text.includes('condition-answer-box'), `${slug}: old answer box is replaced`);
  const sections = [...text.matchAll(/<section\b[^>]*>/g)].map(m=>({at:m.index,attrs:attrs(m[0])}));
  const main = sections.filter(s=>s.attrs['data-reference-section']);
  assert.strictEqual(main.length, expectedCounts[slug], `${slug}: reference main section count`);
  assert.deepStrictEqual(main.map(s=>s.attrs['data-reference-section']),expected.section_keys,`${slug}: exact reference main section order`);
  assert.deepStrictEqual(main.map(s=>plain(text.slice(s.at).match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)[1])),expected.section_titles,`${slug}: reference heading hierarchy`);
  const modules = sections.filter(s=>s.attrs['data-reference-module']);
  assert.deepStrictEqual(modules.map(s=>s.attrs['data-reference-module']),expected.module_order,`${slug}: insights, TV, books, FAQ, reviews, columns and visit follow reference order`);
  assert(text.includes('reference-checklist') && text.includes('reference-treatment') && text.includes('reference-doctor'));
  assert.strictEqual(sections.filter(s=>s.attrs.id==='guide-resources').length,1);
  const anchors = [...text.matchAll(/<a\b[^>]*>/g)].map(m=>attrs(m[0]));
  assert.strictEqual(anchors.filter(a=>a.class==='reference-video').length,3,`${slug}: three video cards`);
  assert.strictEqual(anchors.filter(a=>a.class==='reference-book').length,2,`${slug}: two book cards`);
  const sectionIds = ids(text);
  assert.strictEqual(sectionIds.length,new Set(sectionIds).size,`${slug}: unique anchors`);
  for (const a of anchors) {
    if (a.href?.startsWith('#')) assert(sectionIds.includes(a.href.slice(1)),`${slug}: valid anchor ${a.href}`);
    else if (a.href?.startsWith('/')) {
      const [url, hash] = a.href.split('#');
      if (/^\/inquiry\/inq_[0-9A-Za-z_-]+\/$/.test(url)) {
        assert(fs.existsSync(path.join(root,'functions/inquiry/[id].js')));
        continue;
      }
      const target = read(url);
      if (hash) assert(ids(target).includes(hash));
    }
  }
  assert(anchors.some(a=>a.href==='https://www.youtube.com/@healimtv'));
  assert(anchors.some(a=>a.href==='/reviews/guide/'));
  assert(!/<iframe\b/.test(text) && !text.includes('images/reviews/'),`${slug}: no autoplay embed or protected review originals`);
  assert(!/김대억|16년 임상|박사 대표원장/.test(text),`${slug}: Daegu credentials are not reassigned to Bundang`);
  const graph = [...text.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)].filter(m=>attrs(m[1]).type==='application/ld+json').flatMap(m=>JSON.parse(m[2])['@graph']||[]);
  const faq = graph.find(n=>n['@type']==='FAQPage');
  assert.strictEqual(faq.mainEntity.length,(text.match(/<details\b/g)||[]).length-2,`${slug}: split FAQ groups match schema; preparation/sources are separate details`);
  for (const item of faq.mainEntity) assert(text.includes(item.name)&&text.includes(item.acceptedAnswer.text));
  const page = graph.find(n=>Array.isArray(n['@type'])&&n['@type'].includes('MedicalWebPage'));
  assert(!page.reviewedBy&&!page.lastReviewed);
  assert.strictEqual((text.match(/<h1\b/g)||[]).length,1);
}
for (const url of ['/','/guide/']) assert(read(url).includes('/conditions/dizziness/'));
assert(read('/blog/gyeonggi-icheon-dizziness-chronic-dizziness/').includes('/conditions/dizziness/'));
console.log('✅ Six reference-matched guides: section counts/headings/order, resource modules, split FAQ/schema, clinical identity and links verified.');
