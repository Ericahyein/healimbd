const assert = require('assert');
const fs = require('fs');
const path = require('path');

const output = path.resolve(process.argv[2] || 'public');
const html = slug => fs.readFileSync(path.join(output, 'blog', slug, 'index.html'), 'utf8');
const team = '해아림한의원 의료 콘텐츠팀';
// Hugo minification may remove optional attribute quotes.
const attributes = tag => Object.fromEntries([...tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(match => [match[1], match[2] ?? match[3] ?? match[4]]));
const tags = (text, name) => [...text.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(match => attributes(match[0]));
const schemaArticle = text => {
  const blocks = [...text.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)]
    .filter(match => attributes(match[1]).type === 'application/ld+json');
  const nodes = blocks.flatMap(match => JSON.parse(match[2])['@graph'] || []);
  return nodes.find(node => node['@type'] === 'Article');
};

for (const [slug, pillar] of [
  ['bundang-autonomic-nervous-system-recovery', 'autonomic'],
  ['bundang-insomnia-sleep-disorder-cure', 'insomnia'],
  ['bundang-tic-disorder-brain-balance-treatment', 'tic'],
  ['bundang-panic-disorder-treatment-guide', 'panic']
]) {
  const text = html(slug);
  assert(!text.includes('**'), `${slug}: emphasis markup must render without visible delimiters`);
  const tables = [...text.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)];
  assert.strictEqual(tables.length, 1, `${slug}: observation table must remain intact`);
  const wrapped = [...text.matchAll(/(<div\b[^>]*>)\s*(<table\b[^>]*>[\s\S]*?<\/table>)\s*<\/div>/g)]
    .filter(match => attributes(match[1]).class === 'column-table-scroll');
  assert.strictEqual(wrapped.length, tables.length, `${slug}: each table needs its own scroll container`);
  assert.strictEqual(attributes(wrapped[0][1]).tabindex, '0', `${slug}: overflow must be keyboard accessible`);
  assert.strictEqual(tags(wrapped[0][2], 'th').length, 2, `${slug}: both column headers must remain`);
  assert.strictEqual(tags(wrapped[0][2], 'td').length, 10, `${slug}: all five two-column records must remain`);
  const trust = [...text.matchAll(/(<aside\b[^>]*>)[\s\S]*?<\/aside>/g)]
    .find(match => attributes(match[1]).class === 'blog-author-trust-box')?.[0];
  assert(trust && trust.includes(team), `${slug}: content-team identity must be visible`);
  assert(trust.includes('공개 의료정보 출처를 바탕으로 정리'), `${slug}: source-based scope must be visible`);
  assert(!trust.includes('의료정보 기준 감수'), `${slug}: no reviewer may be invented`);
  assert(tags(text, 'meta').some(tag => tag.property === 'article:author' && tag.content === team), `${slug}: Open Graph author must match visible author`);
  const article = schemaArticle(text);
  assert(article, `${slug}: Article schema required`);
  assert.strictEqual(article.author['@type'], 'Organization');
  assert.strictEqual(article.author.name, team);
  assert(!article.contributor && !article.reviewedBy, `${slug}: schema may not invent medical review`);
  assert(article.datePublished.startsWith('2026-08-31'), `${slug}: original publication date must remain`);
  assert(article.dateModified.startsWith('2026-10-01'), `${slug}: substantial revision date required`);
  assert(tags(text, 'link').some(tag => tag.rel === 'canonical' && tag.href === `https://healimbd.com/blog/${slug}/`), `${slug}: indexed address must remain canonical`);
  assert(tags(text, 'a').some(tag => tag.href === `/conditions/${pillar}/`), `${slug}: direct condition link required`);
  assert(!tags(text, 'meta').some(tag => tag.name === 'robots' && /noindex/.test(tag.content)), `${slug}: refreshed article must remain indexable`);
  assert(!text.includes('수지'), `${slug}: displayed article text must use the agreed regions`);
  const sources = new Set(tags(text, 'a').map(tag => tag.href).filter(href => /^https:\/\/(?:www\.)?(?:nhlbi\.nih\.gov|niddk\.nih\.gov|nimh\.nih\.gov|cdc\.gov|nhs\.uk)\//.test(href)));
  assert(sources.size >= 3, `${slug}: three relevant external references required`);
  if (pillar === 'tic' || pillar === 'panic') {
    for (const claim of ['기저핵 기능 미성숙', '반동 현상으로 증상이 배가', '4-7-8', '재발 없는', '감각통합훈련', 'HRV']) {
      assert(!text.includes(claim), `${slug}: unsupported claim or unprovided service must not reappear (${claim})`);
    }
    if (pillar === 'tic') assert(text.includes('뉴로피드백·밸런싱·IM') && text.includes('평가 후 선택적으로 활용'));
    if (pillar === 'panic') assert(!text.includes('뉴로피드백') && !text.includes('밸런싱') && !text.includes('IM 훈련'));
  }
}

// Existing medical-standard review remains explicit on articles with a named reviewer.
const standard = html('seongnam-main-tic-media-exposure');
assert(standard.includes('의료정보 기준 감수 · 손지웅 대표원장'));
assert.strictEqual(schemaArticle(standard).author.name, team);

for (const [slug, published, pillar] of [
  ['yongin-cheoin-autonomic-digestive-dizziness', '2026-09-28', '/conditions/autonomic/'],
  ['yongin-main-headache-tension-headache', '2026-09-30', '/guide/']
]) {
  const text = html(slug);
  const article = schemaArticle(text);
  assert(article && article.author.name === team);
  assert(!article.contributor && !article.reviewedBy, `${slug}: rewritten article must not claim unverified physician review`);
  assert(article.datePublished.startsWith(published));
  assert(article.dateModified.startsWith('2026-10-01'));
  assert(tags(text, 'link').some(tag => tag.rel === 'canonical' && tag.href === `https://healimbd.com/blog/${slug}/`));
  assert(tags(text, 'a').some(tag => tag.href === pillar));
  const tables = [...text.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)];
  assert.strictEqual(tables.length, 1);
  assert.strictEqual(tags(tables[0][0], 'th').length, 2);
  assert.strictEqual(tags(tables[0][0], 'td').length, 10);
  assert(text.includes('column-table-scroll'));
  assert(!text.includes('WHO') && !text.includes('PPPD') && !text.includes('자율신경 반응도'));
}
console.log('✅ Rendered column authorship, review scope, references, dates, canonical URLs, pillar links and accessible tables passed.');
