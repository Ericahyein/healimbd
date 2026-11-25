// Run with: node tests/test_inquiry_archive.js
// Exercises the real edge handlers against paginated Firestore responses, and
// executes the browser script to catch the original SSR-overwrite regression.
import assert from 'node:assert/strict';
import { inquiryShell } from './fixtures/inquiry-shell.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { generateKeyPairSync } from 'node:crypto';
import { onRequestGet as board, onRequestHead as boardHead } from '../functions/inquiry/index.js';
import { onRequestGet as detail } from '../functions/inquiry/[id].js';
import { onRequestGet as sitemap } from '../functions/sitemap-inquiry.xml.js';

const originalFetch = globalThis.fetch;
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const assetHtml = '<!doctype html><html><head><link rel=canonical href=https://healimbd.com/inquiry/><meta property=og:url content=https://healimbd.com/inquiry/></head><body><a class="inquiry-tab-btn active" data-category="all" href="/inquiry/">전체</a><a class=inquiry-tab-btn data-category=sleep href="/inquiry/?category=sleep">불면증</a><form action=/inquiry/ method=get><input id=inquiry-search-input name=q><input id=inquiry-search-category name=category></form><table><tbody id=inquiry-list-tbody></tbody></table><nav id=inquiry-pagination-nav></nav></body></html>';
const sharedAssetHtml = inquiryShell.replace(/<main[^>]*>[\s\S]*?<\/main>/, () =>
  '<main>' + assetHtml.match(/<body>([\s\S]*?)<\/body>/)[1] + '</main>'
).replace('</head>', assetHtml.match(/<head>([\s\S]*?)<\/head>/)[1] + '</head>');
const env = {
  FIREBASE_SERVICE_ACCOUNT_EMAIL: 'fixture@example.com', FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey,
  ASSETS: { fetch: async () => new Response(sharedAssetHtml) }
};
const documents = Array.from({ length: 651 }, (_, i) => ({
  name: `projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_archive_${String(i).padStart(4, '0')}`,
  fields: {
    title: { stringValue: i === 650 ? '오래된 글 $& <script> 검사 상담' : `검토용 상담 ${i}` },
    category: { stringValue: i === 650 ? '수면·불면증' : 'tic' },
    content: { stringValue: i === 650 ? '오래된수면검색어' : '검토용 질문입니다.' },
    region: { stringValue: '분당' }, ageText: { stringValue: '30대' }, gender: { stringValue: 'female' },
    createdAt: { timestampValue: new Date(Date.UTC(2026, 10, 24) - i * 60000).toISOString() },
    status: { stringValue: i === 649 ? 'pending' : 'answered' },
    answer: { stringValue: i === 649 ? '' : '검토용 답변입니다.' },
    updatedAt: { timestampValue: '2026-11-24T01:00:00.000Z' }
  }
}));
const calls = [];
let fail = '';
let repeatToken = false;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  calls.push({ url, options });
  if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture-token', expires_in: 3600 });
  if (fail && url.href.includes(fail)) return new Response('fixture failure', { status: 503 });
  if (url.pathname.endsWith(':runAggregationQuery')) return Response.json([{ result: { aggregateFields: { total: { integerValue: String(documents.length) } } } }]);
  if (url.pathname.endsWith(':runQuery')) {
    const query = JSON.parse(options.body).structuredQuery;
    assert.equal(query.limit, 10, 'normal pages only request ten documents');
    assert.deepEqual(query.orderBy.map(x => x.field.fieldPath), ['createdAt', '__name__']);
    return Response.json(documents.slice(query.offset, query.offset + query.limit).map(document => ({ document })));
  }
  if (url.pathname.endsWith('/online_inquiries')) {
    const start = Number(url.searchParams.get('pageToken') || 0);
    const next = start + 300 < documents.length ? String(start + 300) : '';
    return Response.json({ documents: documents.slice(start, start + 300), nextPageToken: repeatToken ? '300' : next });
  }
  const id = url.pathname.split('/').pop();
  const document = documents.find(d => d.name.endsWith('/' + id));
  return document ? Response.json(document) : new Response('{}', { status: 404 });
};
const context = suffix => ({ request: new Request('https://healimbd.com/inquiry/' + suffix), env });
let passed = 0;
async function check(name, fn) { await fn(); console.log('PASS:', name); passed++; }
try {
  await check('page six returns older posts, native links and its own canonical without a full collection read', async () => {
    calls.length = 0;
    const response = await board(context('?page=6'));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal((html.match(/data-ssr-inquiry="true"/g) || []).length, 10);
    assert.ok(html.includes('/inq_archive_0050/'));
    assert.ok(!html.includes('/inq_archive_0000/'));
    assert.ok(html.includes('href="/inquiry/?page=7"'));
    assert.ok(html.includes('href="https://healimbd.com/inquiry/?page=6"'));
    assert.ok(!calls.some(c => c.url.searchParams.has('pageSize')));
  });
  await check('last page after 300 posts preserves literal patient text and escapes markup', async () => {
    const html = await (await board(context('?page=66'))).text();
    assert.ok(html.includes('오래된 글 $&amp; &lt;script&gt; 검사 상담'));
    assert.ok(!html.includes('<script> 검사 상담'));
    assert.equal((html.match(/data-ssr-inquiry="true"/g) || []).length, 1);
  });
  await check('all posts remain reachable through next-page links', async () => {
    const ids = new Set();
    for (let page = 1; page <= 66; page++) {
      const html = await (await board(context('?page=' + page))).text();
      for (const match of html.matchAll(/href="\/inquiry\/(inq_archive_\d+)\/"/g)) {
        assert.ok(!ids.has(match[1]), 'no duplicate fixture on separate pages'); ids.add(match[1]);
      }
      if (page < 66) assert.ok(html.includes(`href="/inquiry/?page=${page + 1}"`));
    }
    assert.equal(ids.size, 651);
  });
  await check('search finds old content beyond the third Firestore batch, with noindex', async () => {
    calls.length = 0;
    const response = await board(context('?q=' + encodeURIComponent('오래된수면검색어')));
    const html = await response.text();
    assert.ok(html.includes('/inq_archive_0650/'));
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
    assert.equal(calls.filter(c => c.url.searchParams.has('pageSize')).length, 3);
  });
  await check('category filtering includes legacy labels and no-JS selection, empty searches remain empty', async () => {
    const html = await (await board(context('?category=sleep'))).text();
    assert.ok(html.includes('/inq_archive_0650/'));
    assert.ok(html.includes('class="inquiry-tab-btn active" data-category=sleep'));
    assert.ok(html.includes('name="category" value="sleep"'));
    const empty = await (await board(context('?q=not-found'))).text();
    assert.ok(empty.includes('조건에 맞는 상담글이 없습니다.'));
    assert.ok(empty.includes('data-server-inquiry-list="true"'));
    assert.ok(!empty.includes('/inq_archive_0000/'));
  });
  await check('page bounds, invalid input and reflected search values are safe', async () => {
    const out = await (await board(context('?page=999'))).text();
    assert.ok(out.includes('href="https://healimbd.com/inquiry/?page=66"'));
    for (const p of ['0', '-1', 'NaN', '1e20', '6junk']) {
      const html = await (await board(context('?page=' + p))).text();
      assert.ok(html.includes('/inq_archive_0000/'));
    }
    const html = await (await board(context('?q=' + encodeURIComponent('$&"><script>')))).text();
    assert.ok(html.includes('value="$&amp;&quot;&gt;&lt;script&gt;"'));
    assert.ok(!html.includes('value="<input'));
  });
  await check('sitemap includes 650 answered posts across all batches and the latest modification', async () => {
    const response = await sitemap({ env }); const xml = await response.text();
    assert.equal(response.status, 200);
    assert.equal((xml.match(/<loc>/g) || []).length, 650);
    assert.ok(xml.includes('/inq_archive_0650/'));
    assert.ok(!xml.includes('/inq_archive_0649/'));
    assert.ok(xml.includes('<lastmod>2026-11-24</lastmod>'));
  });
  await check('old direct URLs render their question, answer, canonical and schema', async () => {
    const id = 'inq_archive_0650';
    const response = await detail({ ...context(id + '/'), params: { id } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'index, follow');
    assert.ok(html.includes('검토용 답변입니다.'));
    assert.ok(html.includes('https://healimbd.com/inquiry/' + id + '/'));
    assert.ok(html.includes('"dateModified":"2026-11-24T01:00:00.000Z"'));
  });
  await check('whitespace-only answers stay out of search and the sitemap', async () => {
    const doc = documents[650]; doc.fields.answer.stringValue = '  ';
    try {
      const response = await detail({ ...context('inq_archive_0650/'), params: { id: 'inq_archive_0650' } });
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
      assert.ok(!(await (await sitemap({ env })).text()).includes('/inq_archive_0650/'));
    } finally { doc.fields.answer.stringValue = '검토용 답변입니다.'; }
  });
  await check('transient failures return 503 rather than deleting pages or publishing partial sitemaps', async () => {
    fail = ':runAggregationQuery'; assert.equal((await board(context(''))).status, 503);
    fail = 'pageToken=600'; assert.equal((await sitemap({ env })).status, 503);
    fail = '/online_inquiries/inq_archive_0650';
    assert.equal((await detail({ ...context('inq_archive_0650/'), params: { id: 'inq_archive_0650' } })).status, 503);
    fail = '';
    assert.equal((await detail({ ...context('inq_missing/'), params: { id: 'inq_missing' } })).status, 404);
    repeatToken = true; assert.equal((await sitemap({ env })).status, 503); repeatToken = false;
  });
  await check('HEAD has the same status/canonical headers and no response body', async () => {
    const response = await boardHead(context('?page=6'));
    assert.equal(response.status, 200); assert.equal(await response.text(), '');
  });
  await check('browser preserves SSR despite an old 50-item cache and uses URL navigation', async () => {
    const tbody = { innerHTML: 'SERVER PAGE SIX' };
    const navigations = [];
    const noop = () => {};
    const sandbox = {
      console, URLSearchParams, setTimeout: noop, setInterval: noop, clearInterval: noop,
      document: { addEventListener: noop, querySelector: sel => sel.includes('data-server-inquiry-list') ? tbody : null, getElementById: id => id === 'inquiry-list-tbody' ? tbody : null },
      window: { addEventListener: noop, location: { search: '?page=6', pathname: '/inquiry/', assign: url => navigations.push(url) } },
      localStorage: { getItem: () => JSON.stringify(documents.slice(0, 50)), removeItem: noop },
      sessionStorage: { getItem: () => null }, navigator: {}
    };
    vm.createContext(sandbox);
    vm.runInContext(readFileSync('assets/js/main.js', 'utf8'), sandbox);
    vm.runInContext("db = { collection() { throw new Error('public SSR list must not start a snapshot'); } }; listenToCloudInquiries(); renderInquiryList();", sandbox);
    assert.equal(tbody.innerHTML, 'SERVER PAGE SIX');
    vm.runInContext("goToInquiryPage(7); filterInquiryCategory('sleep', '불면증');", sandbox);
    assert.equal(navigations[0], '/inquiry/?page=7');
    assert.equal(navigations[1], '/inquiry/?page=1&category=sleep');
  });
  await check('administrators can find records older than the former 100-post limit', async () => {
    const tbody = { innerHTML: '' };
    const noop = () => {};
    const sandbox = {
      console, URLSearchParams,
      document: { addEventListener: noop, querySelector: () => null, getElementById: id => id === 'admin-inquiries-tbody' ? tbody : null },
      window: { addEventListener: noop }, localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null }, navigator: {}
    };
    vm.createContext(sandbox);
    vm.runInContext(readFileSync('assets/js/main.js', 'utf8'), sandbox);
    sandbox.fixture = documents.map(d => ({ id: d.name.split('/').pop(), data: () => Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue || v.timestampValue || ''])) }));
    vm.runInContext("db = { collection() { return { orderBy() { return this; }, onSnapshot(callback) { callback({ forEach: fn => fixture.forEach(fn) }); return () => {}; } }; } }; listenToAdminInquiries(); currentAdminSearch = '오래된'; renderAdminInquiries();", sandbox);
    assert.ok(tbody.innerHTML.includes('inq_archive_0650'));
    assert.ok(!tbody.innerHTML.includes('inq_archive_0000'));
  });
  console.log(`All ${passed} inquiry archive scenarios passed.`);
} finally { globalThis.fetch = originalFetch; }

