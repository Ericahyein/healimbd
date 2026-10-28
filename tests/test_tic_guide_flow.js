const assert = require('assert');
const fs = require('fs');
const path = require('path');
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
const html = url => fs.readFileSync(path.join(output, url.replace(/^\//, ''), 'index.html'), 'utf8');
const text = html('/conditions/tic/');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(m => [m[1], m[2] ?? m[3] ?? m[4]]));
const ids = page => [...page.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => m[1] ?? m[2] ?? m[3]);
const anchors = [...text.matchAll(/<a\b[^>]*>/g)].map(m => attrs(m[0]));
const order = ['id=tic-observation', 'id=tic-assessment', 'id=visit-process', 'id=tic-treatment', 'id=adult-tics', 'id=tic-doctor', 'id=faq', 'id=guide-resources', 'id=network-books', 'id=network-faq', 'id=patient-stories', 'id=related-columns', 'id=visit-location', 'id=clinic-visit-summary', 'id=visit-preparation'];
let last = -1;
for (const marker of order) {
  const pattern = marker.includes('=') ? marker.replace('=', '=(?:"|\')?') : marker;
  const at = text.search(new RegExp(pattern));
  assert(at > last, `patient reading order: ${marker} follows the previous section`);
  last = at;
}
assert.strictEqual([...text.matchAll(/<h1\b/g)].length, 1);
assert.strictEqual(ids(text).length, new Set(ids(text)).size, 'no duplicate section anchors');
assert.strictEqual((text.match(/id=(?:"clinic-visit-summary"|clinic-visit-summary)/g) || []).length, 1, 'single detailed visit summary');
const channel = anchors.filter(a => a.href === 'https://www.youtube.com/@healimtv');
assert.strictEqual(channel.length, 1, 'use the exact user-selected channel once');
assert.strictEqual(channel[0].target, '_blank');
assert(channel[0].rel.includes('noopener') && channel[0].rel.includes('noreferrer'));
assert(!/<iframe\b/i.test(text), 'no third-party video embed or autoplay');
assert(anchors.some(a => a.href === '/reviews/guide/'), 'public review access guide');
assert(!/images\/reviews\//.test(text), 'no member-only review originals exposed');
for (const a of anchors) {
  if (!a.href?.startsWith('/') && !a.href?.startsWith('#')) continue;
  const [pathname, fragment] = a.href.split('#');
  const target = pathname ? html(pathname) : text;
  if (fragment) assert(ids(target).includes(fragment), `valid anchor ${a.href}`);
}
const scripts = [...text.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)];
const graph = scripts.filter(m => attrs(m[1]).type === 'application/ld+json').flatMap(m => JSON.parse(m[2])['@graph'] || []);
const page = graph.find(n => Array.isArray(n['@type']) && n['@type'].includes('MedicalWebPage'));
assert(!page.reviewedBy && !page.lastReviewed, 'review completion remains unconfirmed');
assert.strictEqual(page.dateModified, '2026-10-28');
const faq = graph.find(n => n['@type'] === 'FAQPage');
assert.strictEqual(faq.mainEntity.length, 16, 'retain existing FAQs and include questions about home/school differences, tests, recurrence and Tourette symptoms');
for (const item of faq.mainEntity) assert(text.includes(item.name) && text.includes(item.acceptedAnswer.text));
for (const region of ['yongin', 'gyeonggi-gwangju']) assert(anchors.some(a => a.href === `/areas/${region}/tic/`));
// Every condition now uses the same reference layout, including the full tic body.
for (const slug of ['tic','panic','autonomic','insomnia','adhd','anxiety','hyperhidrosis','ibs','syncope']) {
  const guide = html('/conditions/' + slug + '/');
  assert(guide.includes('reference-condition-page'), slug + ': shared reference layout');
  assert(!guide.includes('condition-patient-flow'), slug + ': retired body template is not rendered');
}
console.log('✅ Tic guide reading order, exact channel, protected reviews, live anchors, honest review state and all nine reference layouts verified.');
