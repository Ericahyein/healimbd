const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Inspect Hugo output, not template strings: only the standalone guide may be indexed.
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
const read = relative => fs.readFileSync(path.join(output, relative), 'utf8');
const guide = read('reviews/guide/index.html');
const robots = html => html.match(/<meta\s+name=["']?robots["']?\s+content=["']([^"']+)["']/i)?.[1];
assert.strictEqual(robots(guide), 'index, follow');
assert(guide.includes('https://healimbd.com/reviews/guide/'), 'guide needs its own canonical');
assert(/<title>분당 치료후기 열람 안내 \| 해아림한의원 분당점<\/title>/.test(guide));
assert.strictEqual((guide.match(/<h1(?:\s|>)/g) || []).length, 1);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(filename) : entry.name.endsWith('.html') ? [filename] : [];
  });
}
const protectedPages = htmlFiles(path.join(output, 'reviews'))
  .filter(filename => filename !== path.join(output, 'reviews/guide/index.html'));
assert(protectedPages.length >= 2, 'catalogue and authenticated detail must still be built');
for (const filename of protectedPages) {
  assert.strictEqual(robots(fs.readFileSync(filename, 'utf8')), 'noindex, nofollow', filename);
}
const sitemapReviews = [...read('sitemap.xml').matchAll(/<loc>([^<]+\/reviews\/[^<]*)<\/loc>/g)]
  .map(match => match[1]);
assert.deepStrictEqual(sitemapReviews, ['https://healimbd.com/reviews/guide/']);

// This public document must not bootstrap the review grids, reader, or original media.
for (const forbidden of ['direct-cases-grid', 'naver-reviews-grid', 'review-detail-page-root',
  'custom-reader-photo', 'firebasestorage.googleapis.com', 'treatment_review_previews',
  'treatment_reviews/', 'streamReviewOriginal', 'AggregateRating']) {
  assert(!guide.includes(forbidden), `public guide contains protected content hook: ${forbidden}`);
}
const graphs = [...guide.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));
assert(graphs.length > 0, 'structured metadata must be valid JSON');
assert(!graphs.some(graph => JSON.stringify(graph).includes('"@type":"Review"')));

for (const condition of ['tic', 'adhd', 'panic', 'anxiety', 'insomnia', 'autonomic', 'hyperhidrosis', 'ibs', 'syncope']) {
  assert(guide.includes(`/conditions/${condition}/`), `missing disease link: ${condition}`);
  assert(fs.existsSync(path.join(output, 'conditions', condition, 'index.html')));
}
for (const fragment of ['handwritten-reviews', 'naver-reviews']) {
  assert(guide.includes(`/reviews/#${fragment}`));
  assert(new RegExp(`id=["']?${fragment}["'\\s>]`).test(read('reviews/index.html')));
}
for (const source of ['index.html', 'reviews/index.html', 'conditions/tic/index.html']) {
  assert(read(source).includes('/reviews/guide/'), `guide must be discoverable from ${source}`);
}
console.log(`Public review guide passed: ${protectedPages.length} protected pages stay noindex; sitemap exposes only the guide.`);
