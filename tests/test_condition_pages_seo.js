const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const conditions = {
  '틱장애': read('content/conditions/tic.md'),
  'ADHD': read('content/conditions/adhd.md'),
  '공황장애': read('content/conditions/panic.md'),
  '불안장애': read('content/conditions/anxiety.md'),
  '불면증': read('content/conditions/insomnia.md'),
  '자율신경실조증': read('content/conditions/autonomic.md'),
  '다한증': read('content/conditions/hyperhidrosis.md'),
  '과민성대장증후군': read('content/conditions/ibs.md'),
  '미주신경성 실신': read('content/conditions/syncope.md'),
};
const tic = conditions['틱장애'];
const panic = conditions['공황장애'];
const layout = read('layouts/conditions/single.html');
const seo = read('layouts/partials/head_seo.html');
const guide = read('layouts/guide/list.html') + read('layouts/partials/condition_photo_cards.html');

for (const [name, content] of Object.entries(conditions)) {
  assert(content.includes('seo_title:'), `${name}: unique SEO title required`);
  assert(content.includes('description:'), `${name}: meta description required`);
  assert(content.includes('lastmod:'), `${name}: content modification date required`);
  assert(content.includes('## 참고한 의료 정보'), `${name}: source section required`);
  assert((content.match(/question:/g) || []).length >= 6, `${name}: at least 6 visible FAQs required`);
  const chosen = content.match(/^featured_column: "\/blog\/([^/]+)\/"$/m)?.[1];
  assert(chosen, `${name}: one explicitly chosen column required`);
  const column = read(`content/blog/${chosen}.md`);
  assert(!/^draft:\s*true$/m.test(column), `${name}: chosen column must be published`);
  assert(!/HRV/i.test(content), `${name}: clinic does not perform HRV`);
  for (const area of ['분당', '판교', '성남', '용인', '경기광주']) {
    assert(content.includes(area), `${name}: missing nearby service area ${area}`);
  }
  assert(!content.includes('수지'), `${name}: Suji must not be targeted on condition pages`);
  assert(content.includes('## 성남·분당·판교·용인·경기광주에서'), `${name}: visible local-intent section required`);
}

for (const assessment of ['뇌인지검사', '뇌기능검사', '정서심리검사', '문진·설진·복진·진맥']) {
  for (const [name, content] of Object.entries(conditions)) {
    assert(content.includes(assessment), `${name}: missing actual assessment ${assessment}`);
  }
}

for (const training of ['뉴로피드백', '밸런싱', 'IM']) {
  assert(tic.includes(training), `tic: missing conditional training ${training}`);
}
assert(panic.includes('훈련치료를 적용하지 않습니다'), 'panic: training exclusion must be explicit');
for (const name of ['불안장애', '불면증', '자율신경실조증', '다한증', '과민성대장증후군', '미주신경성 실신']) {
  assert(!conditions[name].includes('뉴로피드백'), `${name}: neurofeedback is limited to tic and ADHD`);
  assert(!conditions[name].includes('밸런싱'), `${name}: balancing is limited to tic and ADHD`);
  assert(!/(^|[^A-Za-z])IM([^A-Za-z]|$)/m.test(conditions[name]), `${name}: IM is limited to tic and ADHD`);
}
for (const training of ['뉴로피드백', '밸런싱', 'IM']) {
  assert(conditions['ADHD'].includes(training), `ADHD: missing conditional training ${training}`);
}

assert(layout.includes('{{ .Content }}'), 'condition content must be server-rendered');
assert(layout.includes('condition_medical_review.html'), 'visible review uses explicit editorial record');
assert(layout.includes('최종 수정:'), 'content modification date must be labelled separately');
assert(layout.includes('$medicalReview.confirmed'), 'unconfirmed review must not be displayed');
assert(seo.includes('"MedicalWebPage"'), 'MedicalWebPage schema required');
assert(seo.includes('"reviewedBy"'), 'reviewedBy schema required');
assert(seo.includes('"FAQPage"'), 'FAQPage schema required');
for (const area of ['성남시 분당구', '판교', '용인시', '경기도 광주시']) {
  assert(seo.includes(area), `schema: missing nearby service area ${area}`);
}
assert(seo.includes('.Params.description | default .Params.summary'), 'explicit meta description must take priority');
for (const slug of ['tic', 'adhd', 'panic', 'anxiety', 'insomnia', 'autonomic', 'hyperhidrosis', 'ibs', 'syncope']) {
  assert(guide.includes(`/conditions/${slug}/`), `guide must link to ${slug} page`);
}

console.log('✅ Condition detail SEO/content checks passed.');
