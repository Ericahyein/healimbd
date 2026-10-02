const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Exercise the real Hugo partial, including sparse and invalid selections.
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
const fixture = mode ? path.resolve(process.argv[3]) : fs.mkdtempSync(path.join(os.tmpdir(), 'condition-links-'));
const write = (name, text) => {
  const file = path.join(fixture, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const page = (name, params, body = '') => write(`content/${name}.md`, `---\n${params}\n---\n${body}`);
const build = () => {
  const result = spawnSync(process.env.HUGO_BIN || 'hugo', ['--source', fixture, '--buildDrafts', '--buildFuture', '--cleanDestinationDir'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
};
const html = name => fs.readFileSync(path.join(fixture, 'public', name, 'index.html'), 'utf8');
const links = slug => JSON.parse(html(`conditions/${slug}`));

try {
  if (mode !== '--verify') {
    write('hugo.toml', 'baseURL = "https://example.test/"\n');
    for (const name of ['condition_related_posts.html', 'column_condition_link.html']) {
      write(`layouts/partials/${name}`, fs.readFileSync(path.join(root, 'layouts/partials', name), 'utf8'));
    }
    write('layouts/conditions/single.html', '{{ partial "condition_related_posts.html" . | jsonify | safeHTML }}');
    write('layouts/cases/single.html', '{{ partial "condition_related_posts.html" . | jsonify | safeHTML }}');
    write('layouts/blog/single.html', '{{ .Content }}{{ partial "column_condition_link.html" . }}');
    const ticParams = 'title: "Tic"\ncondition_name: "틱장애"\ncolumn_categories: ["tic", "tourette"]';
    page('conditions/tic', `${ticParams}\nfeatured_column: "/blog/older/"`);
    page('conditions/panic', 'title: "Panic"\ncondition_name: "공황장애"\ncolumn_categories: ["panic"]\nfeatured_column: "/blog/panic-only/"\nrelated_posts:\n  - {url: "/blog/fallback/", title: "Unrelated", label: "Related"}');
    page('conditions/ibs', 'title: "IBS"\ncondition_name: "과민성대장"\ncolumn_categories: ["ibs"]\nfeatured_column: "/blog/ibs-old/"');
    page('conditions/empty', 'title: "Empty"\ncondition_name: "Empty"\ncolumn_categories: ["empty"]\nfeatured_column: "/blog/missing/"');
    for (const [slug, chosen] of Object.entries({missing: 'missing', draft: 'draft', future: 'future', wrong: 'panic-only'})) {
      page(`cases/${slug}`, `${ticParams}\nfeatured_column: "/blog/${chosen}/"`);
    }
    page('cases/wrong-section', `${ticParams}\nfeatured_column: "/conditions/tic/"`);
    page('cases/unconfigured', ticParams);
    page('blog/conflicting', 'title: "Conflicting pillar"\ndate: 2020-01-10\ncategory: "tic"\ncondition_pillar: "/conditions/another/"');
    page('blog/draft', 'title: "Draft"\ndate: 2020-01-09\ndraft: true\ncategory: "tic"');
    page('blog/future', 'title: "Future"\ndate: 2099-01-01\ncategory: "tic"');
    page('blog/latest', 'title: "[분당 틱장애] Latest"\ndate: 2020-01-08\ncategory: "tic"\ncondition_pillar: "/conditions/tic/"');
    page('blog/existing', 'title: "Existing"\ndate: 2020-01-07\ncategory: "tic"', '[Existing link](/conditions/tic/)');
    page('blog/pillar', 'title: "Explicit pillar"\ndate: 2020-01-06\ncategory: "legacy"\ncondition_pillar: "/conditions/tic/"');
    page('blog/older', 'title: "Older"\ndate: 2020-01-05\ncategory: "tourette"');
    page('blog/stale', 'title: "Stale pillar"\ndate: 2020-01-04\ncategory: "tic"\ncondition_pillar: "/conditions/deleted/"');
    page('blog/fallback', 'title: "Supporting"\ndate: 2020-01-03\ncategory: "general"');
    page('blog/unknown', 'title: "Unknown"\ndate: 2020-01-02\ncategory: "unmapped"');
    page('blog/panic-only', 'title: "Panic only"\ndate: 2020-01-01\ncategory: "panic"');
    page('blog/ibs-new', 'title: "IBS new"\ndate: 2020-01-02\ncategory: "ibs"');
    page('blog/ibs-old', 'title: "IBS old"\ndate: 2020-01-01\ncategory: "ibs"');
  }
  if (!mode) build();
  if (mode !== '--prepare') {
    const tic = links('tic');
    assert.deepStrictEqual(tic.map(item => item.url), ['/blog/older/', '/blog/latest/', '/blog/pillar/'], 'chosen older article stays first; newest direct condition links take precedence over a shared legacy category');
    assert.strictEqual(tic[0].label, '틱장애 · 대표 칼럼');
    assert.strictEqual(tic[1].label, '틱장애 · 최신 관련 칼럼');
    assert.strictEqual(tic[1].title, 'Latest', 'regional prefix is removed from the current article title');
    assert.deepStrictEqual(links('panic').map(item => item.url), ['/blog/panic-only/'], 'one article stays one; unrelated curated links do not fill slots');
    assert.deepStrictEqual(links('ibs').map(item => item.url), ['/blog/ibs-old/', '/blog/ibs-new/'], 'two articles appear once each');
    assert.deepStrictEqual(links('empty'), [], 'empty condition has no made-up recommendations');
    for (const slug of ['missing', 'draft', 'future', 'wrong', 'wrong-section', 'unconfigured']) {
      const items = JSON.parse(html(`cases/${slug}`));
      assert(!items.some(item => item.label.includes('대표')), `${slug}: invalid chosen article must not be labelled featured`);
      assert(items.every(item => !['/blog/draft/', '/blog/future/', '/blog/conflicting/', '/blog/stale/'].includes(item.url)), `${slug}: unrelated, draft and future articles excluded`);
    }
    for (const slug of ['latest', 'pillar', 'stale']) {
      assert(html(`blog/${slug}`).includes('href="/conditions/tic/"'), `${slug}: reverse condition link preserved`);
    }
    assert.strictEqual((html('blog/existing').match(/href="\/conditions\/tic\/"/g) || []).length, 1, 'existing body link must not gain a duplicate fallback');
    assert(!html('blog/unknown').includes('/conditions/'), 'unmapped articles must not receive an unrelated condition link');
    assert(!html('blog/fallback').includes('/conditions/'), 'general articles must not receive a guessed condition link');

    // Verify ordering against all nine actual condition pages and current articles.
    if (!mode) {
      fs.rmSync(path.join(fixture, 'content'), { recursive: true, force: true });
      for (const section of ['conditions', 'blog']) {
        for (const name of fs.readdirSync(path.join(root, 'content', section)).filter(name => name.endsWith('.md'))) {
          write(`content/${section}/${name}`, fs.readFileSync(path.join(root, 'content', section, name), 'utf8'));
        }
      }
      build();
      const expectedCounts = {tic: 3, adhd: 3, panic: 3, anxiety: 3, insomnia: 3, autonomic: 3, hyperhidrosis: 1, ibs: 2, syncope: 1};
      for (const [slug, count] of Object.entries(expectedCounts)) {
        const source = fs.readFileSync(path.join(root, 'content/conditions', slug + '.md'), 'utf8');
        const selected = source.match(/^featured_column: "([^"]+)"$/m)?.[1];
        const items = links(slug);
        assert.strictEqual(items.length, count, slug + ': matches available article count');
        assert.strictEqual(items[0].url, selected, slug + ': chosen article is first');
        assert.strictEqual(new Set(items.map(item => item.url)).size, items.length, slug + ': no duplicate cards');
        assert.strictEqual(items.filter(item => item.label.includes('대표')).length, 1, slug + ': exactly one featured article');
        for (const item of items) {
          const column = fs.readFileSync(path.join(root, 'content', item.url.replace(/\/$/, '') + '.md'), 'utf8');
          assert(column.includes(`condition_pillar: "/conditions/${slug}/"`), slug + ': direct matching columns must precede legacy umbrella categories');
        }
      }
    }
    console.log('✅ Featured/current column ordering, sparse conditions, invalid choices and reverse links passed.');
  }
} finally {
  if (!mode) fs.rmSync(fixture, { recursive: true, force: true });
}
