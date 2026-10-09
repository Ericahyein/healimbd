const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'condition-patient-guidance-'));
const slugs = ['tic', 'adhd', 'panic', 'anxiety', 'insomnia', 'autonomic', 'hyperhidrosis', 'ibs', 'syncope'];
const areas = ['seongnam', 'pangyo', 'yongin', 'gyeonggi-gwangju', 'suji', 'wirye'];
const write = (name, text) => {
  const dest = path.join(fixture, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
};
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(match => [match[1], match[2] ?? match[3] ?? match[4]]));
const schemas = text => [...text.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)]
  .filter(match => attrs(match[1]).type === 'application/ld+json')
  .flatMap(match => JSON.parse(match[2])['@graph'] || []);
const schemaPage = text => schemas(text).find(node => Array.isArray(node['@type']) && node['@type'].includes('MedicalWebPage'));
const metaBlock = text => text.match(/<div\b[^>]*class=(?:"condition-meta"|condition-meta)[^>]*>([\s\S]*?)<\/div>/)?.[1];

try {
  write('hugo.toml', 'baseURL = "https://healimbd.com/"\ntitle = "해아림한의원 분당점"\n[markup.goldmark.renderer]\nunsafe = true\n');
  write('config/_default/params.yaml', fs.readFileSync(path.join(root, 'config/_default/params.yaml'), 'utf8'));
  for (const name of ['condition_medical_review.html', 'condition_related_posts.html', 'head_seo.html', 'clinic_visit_summary.html', 'page_hero.html']) {
    write('layouts/partials/' + name, fs.readFileSync(path.join(root, 'layouts/partials', name), 'utf8'));
  }
  write('layouts/conditions/single.html', fs.readFileSync(path.join(root, 'layouts/conditions/single.html'), 'utf8'));
  write('layouts/areas/single.html', fs.readFileSync(path.join(root, 'layouts/areas/single.html'), 'utf8'));
  for (const area of areas) {
    write('content/areas/' + area + '.md', fs.readFileSync(path.join(root, 'content/areas', area + '.md'), 'utf8'));
  }
  write('layouts/_default/baseof.html', '<!doctype html><html><head>{{ partial "head_seo.html" . }}</head><body>{{ block "main" . }}{{ end }}</body></html>');
  const genericLayout = '{{ define "main" }}{{ .Content }}{{ end }}';
  write('layouts/_default/list.html', genericLayout);
  write('layouts/_default/single.html', genericLayout);
  write('layouts/sitemap.xml', fs.readFileSync(path.join(root, 'layouts/sitemap.xml'), 'utf8'));
  for (const name of ['conditions/_index.md', 'reviews/guide.md', 'review-view/_index.md']) {
    write('content/' + name, fs.readFileSync(path.join(root, 'content', name), 'utf8'));
  }
  write('content/excluded.md', '---\ntitle: "Excluded fixture"\nrobots: "NOINDEX, follow"\n---\n');
  write('content/public.md', '---\ntitle: "Public fixture"\nrobots: "index, follow"\n---\n');
  for (const slug of slugs) {
    write('content/conditions/' + slug + '.md', fs.readFileSync(path.join(root, 'content/conditions', slug + '.md'), 'utf8'));
  }
  const sample = fs.readFileSync(path.join(root, 'content/conditions/tic.md'), 'utf8');
  const variants = {
    reviewed: 'medical_review_status: "reviewed"\nmedical_reviewer: "손지웅 대표원장"\nmedical_reviewed_at: "2020-01-02"',
    'missing-reviewer': 'medical_review_status: "reviewed"\nmedical_reviewed_at: "2020-01-02"',
    'missing-date': 'medical_review_status: "reviewed"\nmedical_reviewer: "손지웅 대표원장"',
    'unconfirmed-status': 'medical_review_status: "source_based"\nmedical_reviewer: "손지웅 대표원장"\nmedical_reviewed_at: "2020-01-02"',
    'invalid-date': 'medical_review_status: "reviewed"\nmedical_reviewer: "손지웅 대표원장"\nmedical_reviewed_at: "2020-02-31"',
    'future-date': 'medical_review_status: "reviewed"\nmedical_reviewer: "손지웅 대표원장"\nmedical_reviewed_at: "2099-01-01"',
    'other-person': 'medical_review_status: "reviewed"\nmedical_reviewer: "다른 검토자"\nmedical_reviewed_at: "2020-01-02"',
  };
  for (const [slug, fields] of Object.entries(variants)) {
    write('content/conditions/' + slug + '.md', sample.replace('medical_review_status: "source_based"', fields));
  }
  const build = spawnSync(process.env.HUGO_BIN || 'hugo', ['--source', fixture, '--minify'], { encoding: 'utf8' });
  if (build.error) throw build.error;
  assert.strictEqual(build.status, 0, build.stdout + build.stderr);
  const sitemap = fs.readFileSync(path.join(fixture, 'public/sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert(!sitemapUrls.includes('https://healimbd.com/conditions/'), 'noindex condition overview must be absent from sitemap');
  assert(!sitemapUrls.includes('https://healimbd.com/excluded/'), 'explicit noindex is case insensitive');
  assert(!sitemapUrls.includes('https://healimbd.com/reviews/view/'), 'protected review detail remains absent from sitemap');
  assert(sitemapUrls.includes('https://healimbd.com/reviews/guide/'), 'public review guide remains discoverable');
  assert(sitemapUrls.includes('https://healimbd.com/public/'), 'explicit index remains in sitemap');
  const overview = fs.readFileSync(path.join(fixture, 'public/conditions/index.html'), 'utf8');
  const overviewRobots = [...overview.matchAll(/<meta\b[^>]*>/g)].map(match => attrs(match[0])).find(item => item.name === 'robots');
  assert.strictEqual(overviewRobots.content, 'noindex, follow', 'overview remains accessible with its existing robots policy');
  for (const slug of slugs) {
    assert(sitemapUrls.includes(`https://healimbd.com/conditions/${slug}/`), slug + ': indexable disease detail remains in sitemap');
  }
  const html = slug => fs.readFileSync(path.join(fixture, 'public/conditions', slug, 'index.html'), 'utf8');
  for (const slug of slugs) {
    const text = html(slug);
    const h1s = [...text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    assert.strictEqual(h1s.length, 1, slug + ': exactly one page heading');
    const heading = h1s[0][1].replace(/<\/span>/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const source = fs.readFileSync(path.join(root, 'content/conditions', slug + '.md'), 'utf8');
    const lastmod = source.match(/^lastmod: (\d{4}-\d{2}-\d{2})$/m)[1];
    const faqCount = (source.match(/question:/g) || []).length;
    const conditionName = source.match(/^condition_name: "([^"]+)"$/m)[1];
    assert.strictEqual(heading, `${conditionName} 증상·검사·치료 안내`, slug + ': disease-first heading');
    const title = `${conditionName} 증상·검사·치료 안내 | 해아림한의원 분당점`;
    assert.strictEqual(text.match(/<title>([^<]+)<\/title>/)[1], title, slug + ': disease-first search title retains clinic identity');
    assert(text.includes(`content="${title}"`), slug + ': social metadata uses the same title');
    for (const area of areas.slice(0, 4)) {
      assert(text.includes(`/areas/${area}/`), slug + ': regional visit guide is linked ' + area);
      assert(fs.existsSync(path.join(fixture, 'public/areas', area, 'index.html')), slug + ': regional link target exists ' + area);
    }
    const ids = [...text.matchAll(/<[a-z][^>]*\bid=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)]
      .map(match => match[1] ?? match[2] ?? match[3]);
    assert.strictEqual(new Set(ids).size, ids.length, slug + ': no duplicate section IDs');
    const quickNav = text.match(/<nav\b[^>]*class=(?:"condition-quick-links"|condition-quick-links)[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert(quickNav, slug + ': quick navigation is rendered without JavaScript');
    for (const id of ['visit-process', 'visit-preparation', 'clinic-visit-summary', 'faq']) {
      assert(quickNav.includes(`href=#${id}`) || quickNav.includes(`href="#${id}"`), slug + ': missing quick link ' + id);
      assert(ids.includes(id), slug + ': quick link target exists ' + id);
    }
    assert(!quickNav.includes('#related-columns'), slug + ': omit related link when no columns exist in fixture');
    const page = schemaPage(text);
    const clinic = schemas(text).find(node => node['@type'] === 'MedicalClinic');
    assert.strictEqual(clinic.telephone, '031-716-8575');
    assert(text.includes(clinic.address.streetAddress), slug + ': schema address must also be visible');
    assert(text.includes('정자역 3번 출구 도보 2분'), slug + ': visit summary contains transit information');
    assert.strictEqual(clinic.openingHoursSpecification.length, 5, slug + ': weekday lunch breaks remain separate');
    assert(clinic.openingHoursSpecification.some(row => row.closes === '20:00' && row.dayOfWeek.includes('Wednesday')));
    assert(clinic.sameAs.includes('https://map.naver.com/p/entry/place/1272285133'));
    assert(text.includes('clinic-visit-summary') && text.includes('clinic-visit-links'), slug + ': public visit summary and booking links required');
    const meta = metaBlock(text);
    assert(meta && meta.includes('최종 수정:') && meta.includes(lastmod.replaceAll('-', '.')), slug + ': modification date must be visible');
    assert(meta.includes('의료 콘텐츠팀'), slug + ': visible author must match actual editing scope');
    assert(!meta.includes('의학적 검토:') && !meta.includes('검토일:'), slug + ': no unconfirmed visible review');
    assert(!('reviewedBy' in page) && !('lastReviewed' in page), slug + ': no unconfirmed schema review');
    assert.strictEqual(page.author['@type'], 'Organization');
    assert.strictEqual(page.author.name, '해아림한의원 분당점 의료 콘텐츠팀');
    assert.strictEqual(page.dateModified, lastmod);
    assert.strictEqual(page.datePublished, '2026-09-28');
    assert(text.includes('가상의 예시입니다') && text.includes('실제 환자 사례나 진단 결과가 아닙니다'), slug + ': hypothetical record label required');
    assert(!text.includes('**'), slug + ': raw markdown must not be visible');
    assert(!text.includes('HRV'), slug + ': no unperformed test');
    const faq = schemas(text).find(node => node['@type'] === 'FAQPage');
    assert(faqCount >= 8, slug + ': retain patient guidance FAQs');
    assert.strictEqual(faq.mainEntity.length, faqCount, slug + ': schema contains every source FAQ');
    assert.strictEqual(new Set(faq.mainEntity.map(item => item.name)).size, faqCount, slug + ': FAQs must be unique');
    for (const question of faq.mainEntity) assert(text.includes(question.name), slug + ': schema FAQ must also be visible');
    if (slug === 'autonomic') {
      const question = '머리나 얼굴로 열이 오르는 느낌도 자율신경 문제인가요?';
      const detail = [...text.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)]
        .map(match => match[1]).find(item => item.includes(question));
      const item = faq.mainEntity.find(item => item.name === question);
      assert(detail && item, 'autonomic: heat sensation FAQ is visible and structured');
      assert(detail.includes(item.acceptedAnswer.text), 'autonomic: visible answer matches structured data');
      const link = [...detail.matchAll(/<a\b[^>]*>/g)]
        .map(match => attrs(match[0])).find(item => item.href === '/inquiry/inq_1788749317588/');
      assert(link, 'autonomic: related consultation is linked inside the matching FAQ');
      assert(detail.includes('관련 상담: 자율신경실조증 때문에 머리로 열이 오를 수 있나요?'));
    }
  }
  const reviewed = html('reviewed');
  const reviewedPage = schemaPage(reviewed);
  assert(metaBlock(reviewed).includes('의학적 검토: 손지웅 대표원장'));
  assert(metaBlock(reviewed).includes('2020.01.02') && metaBlock(reviewed).includes('2026.10.05'));
  assert.strictEqual(reviewedPage.lastReviewed, '2020-01-02', 'medical review date stays independent of lastmod');
  assert.strictEqual(reviewedPage.dateModified, '2026-10-05');
  assert.strictEqual(reviewedPage.reviewedBy['@id'], 'https://healimbd.com/#doctor-jiwoong-son');
  for (const slug of Object.keys(variants).filter(name => name !== 'reviewed')) {
    const text = html(slug);
    assert(!metaBlock(text).includes('의학적 검토:'), slug + ': invalid or incomplete review must be hidden');
    assert(!('lastReviewed' in schemaPage(text)) && !('reviewedBy' in schemaPage(text)), slug + ': schema must fail closed');
  }
  for (const area of areas) {
    const text = fs.readFileSync(path.join(fixture, 'public/areas', area, 'index.html'), 'utf8');
    const nav = text.match(/<nav\b[^>]*aria-label=(?:"질환별 진료 안내"|'질환별 진료 안내')[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert(nav, area + ': visible condition navigation is rendered');
    assert.strictEqual((nav.match(/<a\b/g) || []).length, 9, area + ': nine distinct condition links');
    for (const slug of slugs) {
      assert(nav.includes(`/conditions/${slug}/`), area + ': condition target is linked ' + slug);
      assert(fs.existsSync(path.join(fixture, 'public/conditions', slug, 'index.html')), area + ': condition target exists ' + slug);
    }
  }
  console.log('✅ Nine disease-first headings, regional guide links, patient guides and review-date cases passed.');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
