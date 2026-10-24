const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Check the rendered search entry points and their real, crawlable connections.
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
const hub = html('/areas/yongin/');
assert(hub.includes('용인 틱장애·ADHD·공황장애 진료 안내'));
const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
const titles = new Set();
const descriptions = new Set();
const topicHeadings = new Set();

for (const [slug, name] of Object.entries(conditions)) {
  const url = `/areas/yongin/${slug}/`;
  const text = html(url);
  const pageLinks = links(text);
  const pageIds = ids(text);
  const h1 = [...text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.strictEqual(h1.length, 1, `${slug}: one page heading`);
  assert(h1[0][1].includes(`용인 ${name}`), `${slug}: regional condition heading`);
  const title = text.match(/<title>([^<]*)<\/title>/)?.[1];
  const canonical = [...text.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).find(a => a.rel === 'canonical');
  const meta = [...text.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0]));
  const description = meta.find(a => a.name === 'description')?.content;
  assert(title?.includes(`용인 ${name}`) && description?.includes(name), `${slug}: condition-specific search metadata`);
  assert(!titles.has(title) && !descriptions.has(description), `${slug}: unique title and description`);
  titles.add(title); descriptions.add(description);
  assert.strictEqual(canonical?.href, `https://healimbd.com${url}`, `${slug}: distinct canonical URL`);
  assert(!meta.some(a => a.name === 'robots' && /noindex/i.test(a.content)), `${slug}: indexable`);
  assert(sitemap.includes(`https://healimbd.com${url}`), `${slug}: sitemap entry`);
  for (const parent of ['/areas/yongin/', '/areas/suji/', '/areas/giheung/', '/areas/cheoin/']) {
    assert(links(html(parent)).includes(url), `${slug}: discoverable from ${parent}`);
  }
  assert(links(html(`/conditions/${slug}/`)).includes(url), `${slug}: linked from the clinical guide`);
  for (const target of ['/areas/yongin/', `/conditions/${slug}/#visit-process`, '/areas/suji/', '/areas/giheung/', '/areas/cheoin/']) {
    assert(pageLinks.includes(target), `${slug}: useful visit and clinical connections ${target}`);
  }
  assert.strictEqual((text.match(/class=(?:"area-faq-item"|area-faq-item)/g) || []).length, 3, `${slug}: visible local FAQs`);
  const source = fs.readFileSync(path.join(root, 'content/areas', `yongin-${slug}.md`), 'utf8');
  const headings = [...source.matchAll(/^### (.+)$/gm)].map(m => m[1]);
  assert.strictEqual(headings.length, 3, `${slug}: substantive clinical topics`);
  for (const heading of headings) {
    assert(!topicHeadings.has(heading), `${slug}: clinical topics are not just a regional-name substitution`);
    topicHeadings.add(heading);
  }
  const graph = schemas(text);
  const page = graph.find(n => Array.isArray(n['@type']) && n['@type'].includes('MedicalWebPage'));
  assert.strictEqual(page?.about?.name, name, `${slug}: medical topic agrees with visible content`);
  const faq = graph.find(n => n['@type'] === 'FAQPage');
  assert.strictEqual(faq?.mainEntity?.length, 3, `${slug}: FAQ schema matches visible entries`);
  for (const item of faq.mainEntity) {
    assert(text.includes(item.name) && text.includes(item.acceptedAnswer.text), `${slug}: no hidden FAQ answers`);
  }
  const breadcrumb = graph.find(n => n['@type'] === 'BreadcrumbList');
  assert.strictEqual(breadcrumb.itemListElement.length, 4, `${slug}: regional hierarchy`);
  assert.strictEqual(breadcrumb.itemListElement[2].item, 'https://healimbd.com/areas/yongin/');
  const clinic = graph.find(n => n['@type'] === 'MedicalClinic');
  assert.strictEqual(clinic.address.addressLocality, '성남시 분당구', `${slug}: no invented Yongin clinic address`);
  if (/medical_review_status: source_based/.test(source)) {
    assert(!page.reviewedBy && !page.lastReviewed, `${slug}: no fabricated medical-review completion`);
  }
  assert.strictEqual(pageIds.length, new Set(pageIds).size, `${slug}: no duplicate anchors`);
  for (const link of pageLinks) {
    if (!link.startsWith('/') && !link.startsWith('#')) continue;
    const [pathname, fragment] = link.split('#');
    const target = pathname ? html(pathname) : text;
    if (fragment) assert(ids(target).includes(fragment), `${slug}: live target anchor ${link}`);
  }
}
assert(links(html('/')).includes('/areas/yongin/'), 'home page exposes the regional hub');
let linkedColumns = 0;
for (const file of fs.readdirSync(path.join(root, 'content/blog')).filter(f => f.startsWith('yongin-') && f.endsWith('.md'))) {
  const source = fs.readFileSync(path.join(root, 'content/blog', file), 'utf8').split('---')[1];
  const pillar = source.match(/^condition_pillar:\s*["']?\/conditions\/([^/]+)\/["']?\s*$/m)?.[1];
  if (!conditions[pillar]) continue;
  const permalink = `/blog/${file.replace(/\.md$/, '')}/`;
  if (!fs.existsSync(path.join(output, permalink, 'index.html'))) continue;
  assert(links(html(permalink)).includes(`/areas/yongin/${pillar}/`), `${file}: regional column links to matching local guide`);
  linkedColumns++;
}
assert(linkedColumns >= 15, 'existing Yongin columns participate in the regional clinical connections');
console.log(`✅ Nine Yongin clinical search pages: metadata, discovery, FAQ, real address, anchors and ${linkedColumns} column links verified.`);
