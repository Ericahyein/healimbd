const assert = require('assert');
const fs = require('fs');
const path = require('path');

const history = require('../data/auto_column_history.json');
const {
  getConditionPageForCategory,
  getRecommendedInternalLinks
} = require('../scripts/auto_column/internal_linker');
const { generateArticleBody, loadMedicalKnowledge } = require('../scripts/auto_column/ai_generator');
const { validateArticleContent } = require('../scripts/auto_column/content_validator');

const ROOT = path.join(__dirname, '..');

(async () => {
  const plan = {
    geo: { displayName: '성남', fullName: '성남시' },
    disease: { id: 'tic', name: '틱장애', category: 'tic', categoryName: '틱장애·뚜렛' },
    titleDisease: '틱장애',
    ageGroup: 'child',
    topicAngle: { id: 'cough-distinction', titleSuffix: '헛기침이 반복될 때 관찰할 점' }
  };
  const knowledge = loadMedicalKnowledge('tic');
  const links = getRecommendedInternalLinks('tic', 'not-an-existing-slug');
  assert.strictEqual(links[0].url, '/conditions/tic/', 'condition pillar must be the first recommendation');

  const body = await generateArticleBody(plan, { summary: '테스트 요약' }, knowledge, links, '');
  assert(body.includes('](/conditions/tic/)'), 'offline and fallback generation must contain the condition pillar');

  const verifiedUrls = knowledge.evidenceNotes
    .filter(note => note.sourceVerified === true && note.productionUsable === true)
    .map(note => note.sourceUrl || note.source?.url)
    .filter(Boolean);
  assert(verifiedUrls.filter(url => body.includes(url)).length >= 2, 'generated body must contain at least two verified sources');

  const strictValidation = validateArticleContent({
    title: '[성남 틱장애] 헛기침이 반복될 때 관찰할 점',
    summary: '반복되는 헛기침을 살펴볼 때 필요한 관찰 기준과 생활 관리 방향을 안내합니다.',
    category: 'tic',
    body,
    hashtags: ['성남', '틱장애정보', '틱장애관찰', '증상관찰', '해아림의학칼럼'],
    keywords: ['헛기침이 반복될 때 관찰할 점', '틱장애 헛기침이 반복될 때 관찰할 점', '성남 헛기침이 반복될 때 관찰할 점', '틱장애 증상 관찰'],
    geoId: 'seongnam-main',
    diseaseId: 'tic',
    titleDisease: '틱장애',
    seoDiseaseLabel: '틱장애',
    ageGroup: 'child',
    topicAngle: plan.topicAngle,
    knowledge,
    requireConditionPillar: true,
    requireVerifiedSources: true
  });
  assert.deepStrictEqual(strictValidation.errors, [], `strict production validation failed: ${strictValidation.errors.join('; ')}`);

  for (const item of history) {
    const filePath = path.join(ROOT, 'content/blog', `${item.slug}.md`);
    const markdown = fs.readFileSync(filePath, 'utf8');
    assert(markdown.includes('author: "해아림한의원 의료 콘텐츠팀"'), `${item.slug}: content-team author required`);
    assert(markdown.includes('medical_information_reviewer: "손지웅 대표원장"'), `${item.slug}: medical-standard reviewer required`);
    assert(markdown.includes('lastmod:'), `${item.slug}: lastmod required`);
    const frontMatterEnd = markdown.indexOf('\n---', 4);
    const frontMatter = frontMatterEnd >= 0 ? markdown.slice(0, frontMatterEnd) : markdown;
    assert(!frontMatter.includes(`- "${item.displayRegion} ${item.disease}`), `${item.slug}: generic region+disease keyword must be removed`);
    assert(!/한방치료|치료"/m.test(frontMatter.split('keywords:')[1] || ''), `${item.slug}: generic treatment keyword must be removed`);

    const conditionPage = getConditionPageForCategory(item.disease);
    if (conditionPage) {
      const bodyOnly = frontMatterEnd >= 0 ? markdown.slice(frontMatterEnd + 4) : markdown;
      assert(bodyOnly.includes(conditionPage.url), `${item.slug}: mapped condition pillar required in article body`);
    }

    const itemKnowledge = loadMedicalKnowledge(item.disease);
    const itemVerifiedUrls = itemKnowledge.evidenceNotes
      .filter(note => note.sourceVerified === true && note.productionUsable === true)
      .map(note => note.sourceUrl || note.source?.url)
      .filter(Boolean);
    assert(itemVerifiedUrls.filter(url => markdown.includes(url)).length >= 2, `${item.slug}: two verified sources required`);
  }

  const generatorSource = fs.readFileSync(path.join(ROOT, 'scripts/auto_column/index.js'), 'utf8');
  assert(!generatorSource.includes('`${currentPlan.geo.displayName}${cleanSeoDisease}`'), 'exact region+disease hashtag must be removed');
  assert(!generatorSource.includes('`${seoDisease} 한방치료`'), 'generic disease-treatment keyword must be removed');
  assert(generatorSource.includes('search_intent: "long_tail_column"'), 'long-tail intent marker required');

  const template = fs.readFileSync(path.join(ROOT, 'layouts/blog/single.html'), 'utf8');
  assert(template.includes('.Params.content_author'), 'template must distinguish content-team articles');
  assert(template.includes('의료정보 기준 감수'), 'template must disclose medical-standard review scope');

  console.log('✅ Column pillar links, honest authorship, verified sources, and long-tail metadata verified.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
