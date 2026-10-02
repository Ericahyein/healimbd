const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CONDITION_PAGES } = require('../scripts/auto_column/internal_linker');
const { countPublishedConditionColumns, getCoveragePriority } = require('../scripts/auto_column/column_coverage');
const { planNextColumn, getRankedCandidatePlans, getKstCalendarDayDiff } = require('../scripts/auto_column/topic_planner');
const { checkClinicFacts, selectEvidenceNotes } = require('../scripts/auto_column/medical_policy');
const taxonomy = require('../scripts/auto_column/disease_taxonomy.json');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'healim-coverage-'));
const blogDir = path.join(temp, 'blog');
const historyPath = path.join(temp, 'history.json');
const now = new Date('2026-10-02T09:07:00+09:00');
fs.mkdirSync(blogDir);
const write = (slug, fields) => fs.writeFileSync(path.join(blogDir, `${slug}.md`), `---\n${/^date:/m.test(fields) ? '' : 'date: 2025-01-01\n'}${fields}\n---\nBody\n`);
const fixture = (id, count) => {
  for (let i = 0; i < count; i++) write(`${id}-${i}`, `category: "${id}"\ncondition_pillar: "${CONDITION_PAGES[id].url}"`);
};
try {
  // Include manual and automatic Markdown files; never count body text, drafts,
  // future/expired posts, or an umbrella category with an explicit empty pillar.
  write('manual', 'category: "tic-adhd"\ncondition_pillar: "/conditions/tic/"');
  write('legacy', 'category: ibs # legacy scalar');
  write('draft', 'category: ibs\ndraft: true # unpublished');
  write('future', 'category: ibs\npublishDate: 2026-10-03');
  write('future-date', 'category: ibs\ndate: 2026-10-03');
  write('expired', 'category: ibs\nexpiryDate: 2026-10-01');
  write('ocd', 'category: anxiety\ncondition_pillar: ""');
  write('conflict', 'category: anxiety\ncondition_pillar: "/conditions/ibs/"');
  write('unsupported', 'category: anxiety\ncondition_pillar: "/conditions/unknown/"');
  fs.writeFileSync(path.join(blogDir, 'body-only.md'), 'Body\ncategory: ibs\n');
  fs.writeFileSync(path.join(blogDir, '_index.md'), '---\ndate: 2025-01-01\ncategory: ibs\n---\n');
  const counts = countPublishedConditionColumns(blogDir, now);
  assert.strictEqual(counts.tic, 1);
  assert.strictEqual(counts.adhd, 0, 'manual compound category is counted only for its explicit pillar');
  assert.strictEqual(counts.ibs, 2);
  assert.strictEqual(counts.anxiety, 0);
  assert.strictEqual(countPublishedConditionColumns(blogDir, new Date('2026-10-03T00:00:00+09:00')).ibs, 4, 'date-only publication uses KST midnight');
  assert.throws(() => countPublishedConditionColumns(path.join(temp, 'missing'), now), /ENOENT/);
  assert.strictEqual(getCoveragePriority({ id: 'child', category: 'sleep' }, counts).bonus, 0, 'shared sleep category may not boost night terrors');

  fs.rmSync(blogDir, { recursive: true }); fs.mkdirSync(blogDir);
  for (const id of Object.keys(CONDITION_PAGES)) fixture(id, id === 'hyperhidrosis' ? 1 : id === 'syncope' ? 1 : id === 'ibs' ? 2 : 3);
  let history = [];
  const save = () => fs.writeFileSync(historyPath, JSON.stringify(history));
  save();
  const options = { blogDir, historyPath, now };
  const plan = planNextColumn(options);
  assert(['hyperhidrosis', 'syncope'].includes(plan.disease.id), 'one-column diseases precede diseases with two or more columns');
  assert.strictEqual(plan.coverage.publishedCount, 1);
  assert.strictEqual(plan.coverage.bonus, 120);
  assert.strictEqual(plan.stableKey, getRankedCandidatePlans(options)[0].stableKey, 'both planner entry points use the same coverage ranking');
  const excludedTopicKeys = new Set([`${plan.disease.id}|${plan.topicAngle.id}`]);
  const retry = planNextColumn({ ...options, excludedTopicKeys });
  assert(!excludedTopicKeys.has(`${retry.disease.id}|${retry.topicAngle.id}`));

  // A shortfall never bypasses the minimum three KST calendar days or the daily limit.
  history = [{ disease: 'hyperhidrosis', topicAngle: 'hands-feet-sweat', publishDate: '2026-10-01T09:07:00+09:00' }]; save();
  assert(!getRankedCandidatePlans(options).some(p => p.disease.id === 'hyperhidrosis'));
  history.push({ disease: 'ibs', topicAngle: 'food-diary', publishDate: now.toISOString() }); save();
  assert(!getRankedCandidatePlans(options).some(p => p.disease.id === 'ibs'));
  history.push({ disease: 'tic', topicAngle: 'media-exposure', publishDate: now.toISOString() }); save();
  assert.strictEqual(planNextColumn(options).status, 'daily_limit_reached');
  assert.deepStrictEqual(getRankedCandidatePlans(options), []);

  // Simulate publication by writing the same Markdown source the next real job
  // will see. History alone is not a substitute for a published article.
  history = []; save();
  const topicKeys = new Set();
  for (let day = 0; day < 14; day++) {
    for (const hour of [9, 17]) {
      const date = new Date(Date.UTC(2026, 9, 2 + day, hour - 9, 7));
      const next = planNextColumn({ blogDir, historyPath, now: date });
      const key = `${next.disease.id}|${next.topicAngle.id}`;
      assert(!topicKeys.has(key), 'changing region may not recycle a topic');
      topicKeys.add(key);
      assert(['성남', '분당', '판교', '용인', '경기광주'].includes(next.geo.displayName));
      for (const previous of history.filter(p => p.disease === next.disease.id)) assert(getKstCalendarDayDiff(previous.publishDate, date) >= 3);
      const before = countPublishedConditionColumns(blogDir, date);
      assert.strictEqual(next.coverage.bonus, getCoveragePriority(next.disease, before).bonus);
      history.push({ disease: next.disease.id, topicAngle: next.topicAngle.id, geoId: next.geo.id, parentRegion: next.geo.parentRegion, publishDate: date.toISOString(), slug: next.slug }); save();
      const pillar = CONDITION_PAGES[next.disease.id]?.url || '';
      write(next.slug, `category: "${next.disease.category}"\ncondition_pillar: "${pillar}"`);
    }
    assert.strictEqual(planNextColumn({ blogDir, historyPath, now: new Date(Date.UTC(2026, 9, 2 + day, 11)) }).status, 'daily_limit_reached');
    if (day === 6) {
      const completed = countPublishedConditionColumns(blogDir, new Date('2026-10-09T00:00:00+09:00'));
      for (const id of ['hyperhidrosis', 'syncope', 'ibs']) assert(completed[id] >= 3, `${id}: sparse conditions should reach minimum coverage within the first week`);
    }
  }
  const completed = countPublishedConditionColumns(blogDir, new Date('2026-10-16T09:07:00+09:00'));
  for (const disease of taxonomy.diseases) assert.strictEqual(getCoveragePriority(disease, completed).bonus, 0, 'boost must end at three existing articles');
  for (const candidate of getRankedCandidatePlans({ blogDir, historyPath, now: new Date('2026-10-16T09:07:00+09:00') })) assert.strictEqual(candidate.coverage.bonus, 0);

  const root = path.join(__dirname, '..');
  const slug = 'seongnam-wirye-hyperhidrosis-compensatory-concern';
  const markdown = fs.readFileSync(path.join(root, 'content/blog', `${slug}.md`), 'utf8');
  const knowledge = require('../scripts/auto_column/medical_knowledge/hyperhidrosis.json');
  assert(!markdown.includes('걱정 없이'));
  assert(markdown.includes('article_review_status: "source_based"'));
  assert(!markdown.includes('medical_information_reviewer:'));
  assert(markdown.includes('date: 2026-09-22T16:18:37.221+09:00'));
  assert(markdown.includes('| 확인 항목 | 기록할 내용 |'));
  assert(checkClinicFacts(markdown, 'hyperhidrosis').valid);
  assert(markdown.includes('본원의 한약·침구 치료가 수술 후 보상성 발한을 예방하거나 제거한다는 근거로 제시하는 것은 아닙니다'));
  for (const host of ['www.aad.org', 'www.bad.org.uk']) assert(markdown.split('### 참고한 공식 의학 자료')[0].includes(host), 'sources must explain claims in the body');
  const surgicalSources = selectEvidenceNotes(knowledge, 'compensatory-concern');
  assert(surgicalSources.some(n => n.sourceUrl === 'https://www.aad.org/public/diseases/a-z/hyperhidrosis-treatment'));
  assert(surgicalSources.some(n => n.sourceUrl === 'https://www.bad.org.uk/pils/hyperhidrosis'));
  assert(!selectEvidenceNotes(knowledge, 'sweat-diary').some(n => n.sourceUrl === 'https://www.aad.org/public/diseases/a-z/hyperhidrosis-treatment'));
  assert(require('../data/auto_column_history.json').find(p => p.slug === slug).title === markdown.match(/^title: "(.+)"/m)[1]);
  if (process.argv[2]) {
    const output = path.resolve(process.argv[2]);
    const html = fs.readFileSync(path.join(output, 'blog', slug, 'index.html'), 'utf8');
    const page = fs.readFileSync(path.join(output, 'conditions/hyperhidrosis/index.html'), 'utf8');
    const title = '수술 후 보상성 다한증이 걱정될 때 확인할 점';
    assert(html.includes(title) && page.includes(title), 'article and condition card must display the current title');
    assert(!html.includes('걱정 없이') && !page.includes('걱정 없이'));
    assert(html.includes('column-table-scroll') && html.includes('<table'), 'record table must render with its scroll wrapper');
    assert.strictEqual((html.match(/class=(?:"|')?column-table-scroll(?:"|')?(?:\s|>)/g) || []).length, 1, 'Hugo table render hook must provide one scroll wrapper without nested focus regions');
    assert(html.includes('공개 의료정보 출처를 바탕으로 정리'));
    assert(!html.includes('의료정보 기준 감수'));
    const nodes = [...html.matchAll(/<script\b[^>]*type=(?:"|')?application\/ld\+json(?:"|')?[^>]*>([\s\S]*?)<\/script>/g)]
      .flatMap(m => JSON.parse(m[1])['@graph'] || []);
    const article = nodes.find(n => n['@type'] === 'Article');
    assert(article && article.author.name === '해아림한의원 의료 콘텐츠팀');
    assert(!article.reviewedBy && !article.contributor);
    assert(article.datePublished.startsWith('2026-09-22'));
    assert(article.dateModified.startsWith('2026-10-02'));
    assert(html.includes(`https://healimbd.com/blog/${slug}/`));
    for (const host of ['www.aad.org', 'www.bad.org.uk']) assert(html.includes(host));
  }
  console.log('✅ Published-column counting, sparse-condition priority, KST limits, retry exclusions, 14-day rotation, boost expiry and hyperhidrosis source integrity passed.');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
