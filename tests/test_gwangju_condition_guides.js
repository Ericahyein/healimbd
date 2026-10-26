const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, 'public'));
const conditions = {
  tic: '틱장애', adhd: 'ADHD', panic: '공황장애', anxiety: '불안장애',
  insomnia: '불면증', autonomic: '자율신경실조증', hyperhidrosis: '다한증',
  ibs: '과민성대장증후군', syncope: '미주신경성 실신',
};
const html = url => fs.readFileSync(path.join(output, url.replace(/^\//, ''), 'index.html'), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(m => [m[1], m[2] ?? m[3] ?? m[4]]));
const links = text => [...text.matchAll(/<a\b[^>]*>/g)].map(m => attrs(m[0]).href).filter(Boolean);
const ids = text => [...text.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => m[1] ?? m[2] ?? m[3]);
const schemas = text => [...text.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)]
  .filter(m => attrs(m[1]).type === 'application/ld+json').flatMap(m => JSON.parse(m[2])['@graph'] || []);
const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
const hubUrl = '/areas/gyeonggi-gwangju/';
const hub = html(hubUrl);
assert(hub.includes('경기광주 틱장애·ADHD·공황장애 진료 안내'));
assert(links(html('/')).includes(hubUrl), 'home links to the Gyeonggi-Gwangju hub');
assert(links(html('/areas/')).includes(hubUrl), 'regional index links to the hub');
const titles = new Set();
const descriptions = new Set();
const headings = new Set();

for (const [slug, name] of Object.entries(conditions)) {
  const url = `${hubUrl}${slug}/`;
  const text = html(url);
  const source = fs.readFileSync(path.join(root, 'content/areas', `gyeonggi-gwangju-${slug}.md`), 'utf8');
  const yongin = fs.readFileSync(path.join(root, 'content/areas', `yongin-${slug}.md`), 'utf8');
  const h1s = [...text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.strictEqual(h1s.length, 1, `${slug}: one main heading`);
  assert(h1s[0][1].includes(`경기광주 ${name}`));
  const title = text.match(/<title>([^<]*)<\/title>/)?.[1];
  const metadata = [...text.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0]));
  const description = metadata.find(m => m.name === 'description')?.content;
  const canonical = [...text.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).find(a => a.rel === 'canonical')?.href;
  assert(title?.includes(`경기광주 ${name}`) && description?.includes(name));
  assert(!titles.has(title) && !descriptions.has(description), `${slug}: unique search text`);
  titles.add(title); descriptions.add(description);
  assert.strictEqual(canonical, `https://healimbd.com${url}`);
  assert(!metadata.some(m => m.name === 'robots' && /noindex/i.test(m.content)));
  assert(sitemap.includes(`https://healimbd.com${url}`));
  assert(links(hub).includes(url), `${slug}: hub card uses the new local guide`);
  assert(links(html(`/conditions/${slug}/`)).includes(url), `${slug}: canonical condition exposes local guide`);
  const pageLinks = links(text);
  assert(pageLinks.includes(hubUrl) && pageLinks.includes(`${hubUrl}#area-route-heading`));
  assert(pageLinks.includes(`/conditions/${slug}/#visit-process`));
  const siblings = pageLinks.filter(h => /^\/areas\/gyeonggi-gwangju\/[^/#]+\/$/.test(h));
  assert.strictEqual(new Set(siblings).size, 8, `${slug}: eight same-city sibling guides`);
  assert(!pageLinks.some(h => /^\/areas\/yongin\//.test(h)), `${slug}: no accidental Yongin local navigation`);
  const sidebar = text.match(/<aside\b[^>]*>[\s\S]*?<\/aside>/)?.[0];
  assert(sidebar?.includes('경강선 판교 방면') && sidebar.includes('이매역') && sidebar.includes('신분당선 광교 방면'));
  assert(!/수지·동천|에버라인|처인구/.test(sidebar), `${slug}: city-specific transport`);
  assert.strictEqual((text.match(/class=(?:"area-faq-item"|area-faq-item)/g) || []).length, 4);
  const graph = schemas(text);
  const breadcrumb = graph.find(n => n['@type'] === 'BreadcrumbList');
  assert.strictEqual(breadcrumb.itemListElement.length, 4);
  assert.strictEqual(breadcrumb.itemListElement[2].item, `https://healimbd.com${hubUrl}`);
  assert.strictEqual(breadcrumb.itemListElement[2].name, '경기광주 진료 안내');
  const page = graph.find(n => Array.isArray(n['@type']) && n['@type'].includes('MedicalWebPage'));
  assert.strictEqual(page.about.name, name);
  assert(!page.reviewedBy && !page.lastReviewed, `${slug}: no unconfirmed medical review`);
  const clinic = graph.find(n => n['@type'] === 'MedicalClinic');
  assert.strictEqual(clinic.address.addressLocality, '성남시 분당구');
  const faq = graph.find(n => n['@type'] === 'FAQPage');
  assert.strictEqual(faq.mainEntity.length, 4);
  for (const item of faq.mainEntity) assert(text.includes(item.name) && text.includes(item.acceptedAnswer.text));
  const topics = [...source.matchAll(/^### (.+)$/gm)].map(m => m[1]);
  assert.strictEqual(topics.length, 3);
  for (const heading of topics) {
    assert(!headings.has(heading) && !yongin.includes(`### ${heading}`), `${slug}: not a city-name copy`);
    headings.add(heading);
  }
  const pageIds = ids(text);
  assert.strictEqual(pageIds.length, new Set(pageIds).size);
  for (const link of pageLinks) {
    if (!link.startsWith('/') && !link.startsWith('#')) continue;
    const [pathname, fragment] = link.split('#');
    const target = pathname ? html(pathname) : text;
    if (fragment) assert(ids(target).includes(fragment), `${slug}: live anchor ${link}`);
  }
}

let columnCount = 0;
let curatedCount = 0;
for (const file of fs.readdirSync(path.join(root, 'content/blog')).filter(f => f.startsWith('gyeonggi-gwangju-') && f.endsWith('.md'))) {
  const source = fs.readFileSync(path.join(root, 'content/blog', file), 'utf8').split('---')[1];
  const pillar = source.match(/^condition_pillar:\s*["']?\/conditions\/([^/]+)\/["']?\s*$/m)?.[1];
  const url = `/blog/${file.replace(/\.md$/, '')}/`;
  if (!fs.existsSync(path.join(output, url, 'index.html'))) continue;
  const regionalLinks = links(html(url)).filter(h => /^\/areas\/[^/]+\/[^/#]+\/$/.test(h));
  if (conditions[pillar]) {
    assert.deepStrictEqual(regionalLinks, [`${hubUrl}${pillar}/`], `${file}: exact disease and city association`);
    const guide = fs.readFileSync(path.join(root, 'content/areas', `gyeonggi-gwangju-${pillar}.md`), 'utf8');
    // Future automatic columns get the regional link without requiring every
    // new column to become a hand-selected recommendation on the guide.
    if (guide.includes(`- ${url}`)) {
      assert(links(html(`${hubUrl}${pillar}/`)).includes(url), `${file}: curated article is linked back`);
      curatedCount++;
    }
    columnCount++;
  } else {
    assert.deepStrictEqual(regionalLinks, [], `${file}: no guessed insomnia/autonomic link for night terrors or headache`);
  }
}
assert(columnCount >= 10, 'published matching Gyeonggi-Gwangju columns participate');
assert(curatedCount >= 10, 'the initial relevant article selection links back');
const syncope = html(`${hubUrl}syncope/`);
assert(syncope.includes('운동 중') && syncope.includes('원인 평가') && syncope.includes('119'));
console.log(`✅ Nine Gyeonggi-Gwangju guides: indexing metadata, regional boundaries, routes, truthful review status, FAQ and ${columnCount} two-way column links verified.`);
