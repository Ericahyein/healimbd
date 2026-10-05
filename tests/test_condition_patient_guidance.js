const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'condition-patient-guidance-'));
const slugs = ['tic', 'adhd', 'panic', 'anxiety', 'insomnia', 'autonomic', 'hyperhidrosis', 'ibs', 'syncope'];
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
  for (const name of ['condition_medical_review.html', 'condition_related_posts.html', 'head_seo.html', 'clinic_visit_summary.html']) {
    write('layouts/partials/' + name, fs.readFileSync(path.join(root, 'layouts/partials', name), 'utf8'));
  }
  write('layouts/conditions/single.html', fs.readFileSync(path.join(root, 'layouts/conditions/single.html'), 'utf8'));
  write('layouts/_default/baseof.html', '<!doctype html><html><head>{{ partial "head_seo.html" . }}</head><body>{{ block "main" . }}{{ end }}</body></html>');
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
  const html = slug => fs.readFileSync(path.join(fixture, 'public/conditions', slug, 'index.html'), 'utf8');
  for (const slug of slugs) {
    const text = html(slug);
    const h1s = [...text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    assert.strictEqual(h1s.length, 1, slug + ': exactly one page heading');
    const heading = h1s[0][1].replace(/<\/span>/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const source = fs.readFileSync(path.join(root, 'content/conditions', slug + '.md'), 'utf8');
    const conditionName = source.match(/^condition_name: "([^"]+)"$/m)[1];
    assert.strictEqual(heading, `분당 ${conditionName} 진료 안내`, slug + ': consistent local clinic heading');
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
    assert(meta && meta.includes('최종 수정:') && meta.includes('2026.10.05'), slug + ': modification date must be visible');
    assert(meta.includes('의료 콘텐츠팀'), slug + ': visible author must match actual editing scope');
    assert(!meta.includes('의학적 검토:') && !meta.includes('검토일:'), slug + ': no unconfirmed visible review');
    assert(!('reviewedBy' in page) && !('lastReviewed' in page), slug + ': no unconfirmed schema review');
    assert.strictEqual(page.author['@type'], 'Organization');
    assert.strictEqual(page.author.name, '해아림한의원 분당점 의료 콘텐츠팀');
    assert.strictEqual(page.dateModified, '2026-10-05');
    assert.strictEqual(page.datePublished, '2026-09-28');
    assert(text.includes('가상의 예시입니다') && text.includes('실제 환자 사례나 진단 결과가 아닙니다'), slug + ': hypothetical record label required');
    assert(!text.includes('**'), slug + ': raw markdown must not be visible');
    assert(!text.includes('HRV'), slug + ': no unperformed test');
    const faq = schemas(text).find(node => node['@type'] === 'FAQPage');
    assert.strictEqual(faq.mainEntity.length, 8, slug + ': one distinct question added');
    assert.strictEqual(new Set(faq.mainEntity.map(item => item.name)).size, 8, slug + ': FAQs must be unique');
    for (const question of faq.mainEntity) assert(text.includes(question.name), slug + ': schema FAQ must also be visible');
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
  console.log('✅ Nine local clinic headings, valid quick links, patient guides and review-date cases passed.');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
