const assert = require('assert');
const fs = require('fs');
const path = require('path');
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
const read = url => fs.readFileSync(path.join(output, url.replace(/^\//, ''), 'index.html'), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1], m[2] ?? m[3] ?? m[4]]));
const ids = html => [...html.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => m[1] ?? m[2] ?? m[3]);
for (const slug of ['panic', 'dizziness', 'autonomic', 'insomnia', 'adhd', 'anxiety']) {
  const html = read(`/conditions/${slug}/`);
  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(m => attrs(m[0]));
  const sectionIds = ids(html);
  assert(html.includes('condition-patient-flow'), `${slug}: patient-first flow`);
  assert.strictEqual(sectionIds.length, new Set(sectionIds).size, `${slug}: unique anchors`);
  let last = -1;
  for (const id of [`${slug}-observation`, `${slug}-assessment`, 'visit-process', `${slug}-treatment`, `${slug}-follow-up`, 'visit-preparation', 'faq', 'related-columns', 'guide-resources', 'visit-location', 'clinic-visit-summary']) {
    const at = html.search(new RegExp(`\\bid=(?:"${id}"|${id})(?:[\\s>])`));
    assert(at > last, `${slug}: ${id} follows the previous section`);
    last = at;
  }
  for (const a of anchors) {
    if (a.href?.startsWith('#')) assert(sectionIds.includes(a.href.slice(1)), `${slug}: valid anchor ${a.href}`);
    else if (a.href?.startsWith('/')) {
      const [url, hash] = a.href.split('#');
      if (/^\/inquiry\/inq_[0-9A-Za-z_-]+\/$/.test(url)) {
        assert(fs.existsSync(path.join(__dirname, '../functions/inquiry/[id].js')), 'dynamic inquiry route exists');
        read('/inquiry/');
        continue;
      }
      const target = read(url);
      if (hash) assert(ids(target).includes(hash), `${slug}: valid cross-page fragment`);
    }
  }
  const channel = anchors.filter(a => a.href === 'https://www.youtube.com/@healimtv');
  assert.strictEqual(channel.length, 1, `${slug}: exact channel URL`);
  assert(channel[0].target === '_blank' && channel[0].rel.includes('noopener'));
  assert(anchors.some(a => a.href === '/reviews/guide/'));
  assert(!/<iframe\b/.test(html) && !html.includes('images/reviews/'), `${slug}: protected review/video behavior`);
  assert.strictEqual((html.match(/<h1\b/g) || []).length, 1);
  const graph = [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)].filter(m => attrs(m[1]).type === 'application/ld+json').flatMap(m => JSON.parse(m[2])['@graph'] || []);
  const faq = graph.find(n => n['@type'] === 'FAQPage');
  assert(faq.mainEntity.length >= 12, `${slug}: detailed FAQ`);
  assert.strictEqual(faq.mainEntity.length, (html.match(/<details\b/g) || []).length);
  for (const item of faq.mainEntity) assert(html.includes(item.name) && html.includes(item.acceptedAnswer.text));
  const page = graph.find(n => Array.isArray(n['@type']) && n['@type'].includes('MedicalWebPage'));
  assert(!page.reviewedBy && !page.lastReviewed, `${slug}: no unconfirmed medical review`);
  assert.strictEqual(page.dateModified, '2026-10-28');
  if (slug !== 'tic') assert(!anchors.some(a => /#(?:tic-observation|tic-treatment|adult-tics)$/.test(a.href || '')), `${slug}: no tic-specific navigation`);
}
for (const url of ['/', '/guide/']) assert(read(url).includes('/conditions/dizziness/'), `${url}: dizziness is discoverable`);
assert(read('/blog/gyeonggi-icheon-dizziness-chronic-dizziness/').includes('/conditions/dizziness/'), 'dizziness column links back to the guide');
console.log('✅ Six expanded guides: section order, all links, FAQ/schema parity, correct navigation, review privacy and dizziness discovery passed.');
