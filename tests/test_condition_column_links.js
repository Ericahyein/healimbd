const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Render the real partials in an isolated Hugo site: no external modules or network.
const root = path.resolve(__dirname, '..');
// The two-step mode also supports sandboxes where Node cannot spawn subprocesses.
const mode = process.argv[2];
const fixture = mode ? path.resolve(process.argv[3]) : fs.mkdtempSync(path.join(os.tmpdir(), 'condition-links-'));
const write = (name, text) => {
  const file = path.join(fixture, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const page = (name, params, body = '') => write(`content/${name}.md`, `---\n${params}\n---\n${body}`);

try {
  if (mode !== '--verify') {
  write('hugo.toml', 'baseURL = "https://example.test/"\n');
  for (const name of ['condition_related_posts.html', 'column_condition_link.html']) {
    write(`layouts/partials/${name}`, fs.readFileSync(path.join(root, 'layouts/partials', name), 'utf8'));
  }
  write('layouts/conditions/single.html', '{{ partial "condition_related_posts.html" . | jsonify | safeHTML }}');
  write('layouts/blog/single.html', '{{ .Content }}{{ partial "column_condition_link.html" . }}');
  page('conditions/tic', `title: "Tic"\ncondition_name: "틱장애"\ncolumn_categories: ["tic", "tourette"]\nrelated_posts:\n  - {url: "/blog/fallback/", title: "Supporting", label: "Related"}\n  - {url: "/blog/missing/", title: "Missing", label: "Related"}`);
  page('conditions/panic', `title: "Panic"\ncondition_name: "공황장애"\ncolumn_categories: ["panic"]\nrelated_posts:\n  - {url: "/blog/fallback/", title: "Supporting", label: "Related"}\n  - {url: "/blog/fallback/", title: "Duplicate", label: "Related"}\n  - {url: "/blog/missing/", title: "Missing", label: "Related"}`);
  page('blog/draft', 'title: "Draft"\ndate: 2020-01-09\ndraft: true\ncategory: "tic"');
  page('blog/latest', 'title: "[분당 틱장애] Latest"\ndate: 2020-01-08\ncategory: "tic"');
  page('blog/existing', 'title: "Existing"\ndate: 2020-01-07\ncategory: "tic"', '[Existing link](/conditions/tic/)');
  page('blog/pillar', 'title: "Explicit pillar"\ndate: 2020-01-06\ncategory: "legacy"\ncondition_pillar: "/conditions/tic/"');
  page('blog/older', 'title: "Older"\ndate: 2020-01-05\ncategory: "tourette"');
  page('blog/stale', 'title: "Stale pillar"\ndate: 2020-01-04\ncategory: "tic"\ncondition_pillar: "/conditions/deleted/"');
  page('blog/fallback', 'title: "Supporting"\ndate: 2020-01-03\ncategory: "general"');
  page('blog/unknown', 'title: "Unknown"\ndate: 2020-01-02\ncategory: "unmapped"');
  }
  if (mode !== '--prepare' && mode !== '--verify') {
  const build = spawnSync(process.env.HUGO_BIN || 'hugo', ['--source', fixture, '--buildDrafts'], { encoding: 'utf8' });
  if (build.error) throw build.error;
  assert.strictEqual(build.status, 0, `Hugo fixture failed:\n${build.stdout}\n${build.stderr}`);
  }
  if (mode !== '--prepare') {
  const html = name => fs.readFileSync(path.join(fixture, 'public', name, 'index.html'), 'utf8');
  const tic = JSON.parse(html('conditions/tic'));
  assert.deepStrictEqual(tic.map(item => item.url), ['/blog/latest/', '/blog/existing/', '/blog/pillar/'], 'newest matching published columns must win, even when drafts are included in a preview');
  assert.strictEqual(tic[0].title, 'Latest', 'card title should omit the old regional prefix');
  const panic = JSON.parse(html('conditions/panic'));
  assert.deepStrictEqual(panic.map(item => item.url), ['/blog/fallback/'], 'curated fallback must resolve to a page and exclude duplicates and missing pages');
  for (const slug of ['latest', 'pillar', 'stale']) {
    assert(html(`blog/${slug}`).includes('href="/conditions/tic/"'), `${slug}: missing reverse condition link`);
  }
  assert.strictEqual((html('blog/existing').match(/href="\/conditions\/tic\/"/g) || []).length, 1, 'existing body link must not gain a duplicate fallback');
  assert(!html('blog/unknown').includes('/conditions/'), 'unmapped articles must not receive an unrelated condition link');
  assert(!html('blog/fallback').includes('/conditions/'), 'general articles must not receive a guessed condition link');
  console.log('✅ Rendered condition/column link behavior passed.');
  }
} finally {
  if (!mode) fs.rmSync(fixture, { recursive: true, force: true });
}
