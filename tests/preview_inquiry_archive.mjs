// Build a standalone review artifact from the real Hugo asset and edge handler.
// All names, questions and answers below are synthetic review data.
import { readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { onRequestGet } from '../functions/inquiry/index.js';
const asset = readFileSync('public/inquiry/index.html', 'utf8');
const cssFile = asset.match(/href="?(\/css\/style\.min\.[a-f0-9]+\.css)/)[1];
const css = readFileSync('public' + cssFile, 'utf8');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const titles = ['눈을 자주 깜빡이는 아이, 언제 상담을 받아야 할까요?', '해야 할 일을 자꾸 미루는데 검사가 필요할까요?', '밤중에 자주 깨는 불면증을 상담하고 싶어요.'];
const docs = Array.from({ length: 151 }, (_, i) => ({ name: 'projects/fixture/databases/(default)/documents/online_inquiries/inq_preview_' + i, fields: {
  title: { stringValue: '[검토용 예시 ' + (151 - i) + '] ' + titles[i % 3] },
  category: { stringValue: ['tic', 'adhd', 'sleep'][i % 3] },
  content: { stringValue: '검토용으로 만든 질문입니다.' },
  region: { stringValue: ['분당', '용인', '판교'][i % 3] }, ageText: { stringValue: '30대' }, gender: { stringValue: 'female' },
  createdAt: { timestampValue: new Date(Date.UTC(2026, 10, 24) - i * 86400000).toISOString() },
  status: { stringValue: 'answered' }, answer: { stringValue: '검토용 답변입니다.' }
} }));
const env = { FIREBASE_SERVICE_ACCOUNT_EMAIL: 'fixture@example.com', FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey, ASSETS: { fetch: async () => new Response(asset) } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture', expires_in: 3600 });
  if (url.pathname.endsWith(':runAggregationQuery')) return Response.json([{ result: { aggregateFields: { total: { integerValue: '151' } } } }]);
  if (url.pathname.endsWith(':runQuery')) {
    const { offset, limit } = JSON.parse(options.body).structuredQuery;
    return Response.json(docs.slice(offset, offset + limit).map(document => ({ document })));
  }
  return Response.json({ documents: docs });
};
const scenarios = [['첫 페이지', ''], ['6페이지 · 이전 글', '?page=6'], ['16페이지 · 마지막 글', '?page=16'], ['불면증 검색 예시', '?q=' + encodeURIComponent('불면증')], ['불면증 분류 예시', '?category=sleep']];
const panels = [];
try {
  for (const [label, query] of scenarios) {
    const response = await onRequestGet({ request: new Request('https://healimbd.com/inquiry/' + query), env });
    if (response.status !== 200) throw new Error('Preview render failed');
    const html = await response.text();
    if (!html.includes('data-server-inquiry-list="true"')) throw new Error('Missing SSR marker in built HTML');
    panels.push({ label, html: html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)[0] });
  }
} finally { globalThis.fetch = realFetch; }
const buttons = panels.map((p, i) => `<button type="button" data-panel="${i}">${p.label}</button>`).join('');
const sections = panels.map((p, i) => `<section class="preview-panel"${i ? ' hidden' : ''}>${p.html}</section>`).join('');
writeFileSync('docs/inquiry-archive-preview.html', `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>문의게시판 수정 검토</title><style>${css}\n.preview-bar{position:sticky;top:0;z-index:2000;background:#0f172a;color:white;padding:16px 24px;font:16px/1.6 sans-serif}.preview-bar button{font:inherit;margin:8px 8px 0 0;padding:8px 12px;border-radius:8px;border:1px solid #94a3b8;background:white;color:#0f172a;cursor:pointer}.preview-bar button[aria-pressed=true]{background:#bae6fd}.preview-panel[hidden]{display:none}.preview-panel .inquiry-hero{display:none}.preview-panel .btn-inquiry-write-trigger{display:none}.preview-panel .inquiry-board-section{padding-top:32px}</style><body class="inquiry-page inquiry-page-body"><div class="preview-bar"><strong>문의게시판 수정 검토 · 배포 전</strong><p>아래 글은 실제 환자글이 아닌 검토용 예시입니다. 위에서 화면을 선택해 확인하세요. 본 파일은 화면 검토용이며 내부 페이지 링크·검색 제출·글쓰기는 연결하지 않았습니다.</p><nav>${buttons}</nav><p id="preview-message" aria-live="polite"></p></div>${sections}<script>const buttons=document.querySelectorAll('[data-panel]');buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{document.querySelectorAll('.preview-panel').forEach((p,j)=>p.hidden=i!==j);buttons.forEach((x,j)=>x.setAttribute('aria-pressed',String(i===j)));document.getElementById('preview-message').textContent='';}});document.querySelectorAll('.preview-panel a,.preview-panel button').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById('preview-message').textContent='화면 검토는 위의 예시 선택 버튼을 이용해 주세요.';}));document.querySelectorAll('form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();document.getElementById('preview-message').textContent='위에서 불면증 검색 예시를 선택해 주세요.';}));</script></body></html>`);
console.log('Saved docs/inquiry-archive-preview.html with five real SSR snapshots and synthetic data.');
