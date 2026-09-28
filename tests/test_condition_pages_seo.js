const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const tic = read('content/conditions/tic.md');
const panic = read('content/conditions/panic.md');
const layout = read('layouts/conditions/single.html');
const seo = read('layouts/partials/head_seo.html');
const guide = read('layouts/guide/list.html');

for (const [name, content] of [['틱장애', tic], ['공황장애', panic]]) {
  assert(content.includes('seo_title:'), `${name}: unique SEO title required`);
  assert(content.includes('description:'), `${name}: meta description required`);
  assert(content.includes('lastmod:'), `${name}: medical review date required`);
  assert(content.includes('## 참고한 의료 정보'), `${name}: source section required`);
  assert((content.match(/question:/g) || []).length >= 6, `${name}: at least 6 visible FAQs required`);
  assert((content.match(/url: "\/blog\//g) || []).length >= 3, `${name}: at least 3 internal column links required`);
  assert(!/HRV/i.test(content), `${name}: clinic does not perform HRV`);
}

for (const assessment of ['뇌인지검사', '뇌기능검사', '정서심리검사', '문진·설진·복진·진맥']) {
  assert(tic.includes(assessment), `tic: missing actual assessment ${assessment}`);
  assert(panic.includes(assessment), `panic: missing actual assessment ${assessment}`);
}

for (const training of ['뉴로피드백', '밸런싱', 'IM']) {
  assert(tic.includes(training), `tic: missing conditional training ${training}`);
}
assert(panic.includes('훈련치료를 적용하지 않습니다'), 'panic: training exclusion must be explicit');

assert(layout.includes('{{ .Content }}'), 'condition content must be server-rendered');
assert(layout.includes('손지웅 대표원장 의학 정보 검토'), 'visible medical reviewer required');
assert(seo.includes('"MedicalWebPage"'), 'MedicalWebPage schema required');
assert(seo.includes('"reviewedBy"'), 'reviewedBy schema required');
assert(seo.includes('"FAQPage"'), 'FAQPage schema required');
assert(seo.includes('.Params.description | default .Params.summary'), 'explicit meta description must take priority');
assert(guide.includes('/conditions/tic/'), 'guide must link to tic page');
assert(guide.includes('/conditions/panic/'), 'guide must link to panic page');

console.log('✅ Condition detail SEO/content checks passed.');
