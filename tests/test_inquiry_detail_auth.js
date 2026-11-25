// Exercises the actual SSR handler and shared client code with synthetic
// Firebase accounts/documents. Use Hugo's built shell when available.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import vm from 'node:vm';
import { inquiryShell } from './fixtures/inquiry-shell.js';
import { onRequestGet } from '../functions/inquiry/[id].js';

const builtShell = existsSync('public/inquiry/index.html');
const shell = builtShell ? readFileSync('public/inquiry/index.html', 'utf8') : inquiryShell;
const source = readFileSync('assets/js/main.js', 'utf8');
const id = 'inq_login_regression_old';
const question = { id, title: '검토용 문의', content: '검토용 내용 </script><script>unsafe()</script>', region: '분당', category: 'panic', status: 'pending', answer: '', date: '2026.11.25' };
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const env = { FIREBASE_SERVICE_ACCOUNT_EMAIL: 'fixture@example.com', FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey, ASSETS: { fetch: async () => new Response(shell) } };
const realFetch = globalThis.fetch;
let detailHtml;
try {
  globalThis.fetch = async input => String(input).includes('oauth2.googleapis.com')
    ? Response.json({ access_token: 'fixture', expires_in: 3600 })
    : Response.json({ fields: Object.fromEntries(Object.entries(question).map(([key, value]) => [key, { stringValue: value }])) });
  const context = { request: new Request('https://healimbd.com/inquiry/' + id + '/'), env, params: { id } };
  const response = await onRequestGet(context);
  assert.equal(response.status, 200);
  detailHtml = await response.text();
  for (const name of ['auth-modal', 'inquiry-reply-editor-modal', 'inquiry-detail-data', 'standalone-inquiry-admin-controls']) {
    assert.match(detailHtml, new RegExp('id=["\']?' + name + '["\'\\s>]'));
  }
  const script = detailHtml.match(/src=["']?(\/js\/main\.min\.[a-f0-9]+\.js)/)[1];
  assert.ok(shell.includes(script));
  if (builtShell) assert.ok(existsSync('public' + script), 'detail points at an actual built script');
  const data = JSON.parse(detailHtml.match(/<script type="application\/json" id="inquiry-detail-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.content, question.content);
  assert.ok(!detailHtml.includes('<script>unsafe()'));
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
  const missingShell = { ...env, ASSETS: { fetch: async () => new Response('<html>Incomplete</html>') } };
  assert.equal((await onRequestGet({ ...context, env: missingShell })).status, 503);
} finally { globalThis.fetch = realFetch; }
console.log('PASS: detail shell contains real auth/reply components, escaped seed data and the built script');

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function client(user, record = { ...question }, failSave = false) {
  const nodes = new Map();
  const makeNode = () => {
    const classes = new Set();
    return { style: {}, textContent: '', innerHTML: '', value: '', focus() {},
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, v) => v ? classes.add(c) : classes.delete(c) } };
  };
  for (const match of detailHtml.matchAll(/\bid=["']?([^\s"'>]+)/g)) nodes.set(match[1], makeNode());
  nodes.get('inquiry-detail-data').textContent = JSON.stringify(question);
  for (const name of ['btn-header-login', 'header-user-badge', 'standalone-inquiry-admin-controls']) nodes.get(name).style.display = name === 'btn-header-login' ? 'inline-flex' : 'none';
  const button = makeNode();
  const snapshots = [], listeners = [], writes = [], alerts = [], navigations = [];
  const snapshot = () => ({ exists: true, data: () => record });
  const reference = { onSnapshot(fn) { snapshots.push(fn); fn(snapshot()); return () => {}; } };
  const firestore = { collection(name) {
    if (name === 'admins') return { doc: () => ({ get: async () => ({ exists: false }) }) };
    assert.equal(name, 'online_inquiries');
    return { doc(key) { assert.equal(key, id); return reference; }, orderBy() { throw new Error('detail must never subscribe to the list cache'); } };
  }, async runTransaction(fn) {
    if (failSave) throw new Error('fixture write failure');
    let update;
    await fn({ get: async ref => { assert.equal(ref, reference); return snapshot(); }, update(ref, data) { assert.equal(ref, reference); update = data; } });
    writes.push(update);
    record = { ...record, ...update };
    snapshots.forEach(fn => fn(snapshot()));
  } };
  const auth = { currentUser: user, onAuthStateChanged(fn) { listeners.push(fn); return () => {}; }, async signOut() { this.currentUser = null; for (const fn of listeners) await fn(null); } };
  const firebase = { apps: [{}], auth: () => auth, firestore: () => firestore };
  firebase.firestore.FieldValue = { serverTimestamp: () => ({ toDate: () => new Date('2026-11-25T00:00:00Z') }) };
  const document = { body: makeNode(), addEventListener() {}, getElementById: name => nodes.get(name) || null, querySelector: selector => selector === '#inquiry-reply-editor-modal button[type="submit"]' ? button : null, createElement: makeNode };
  document.body.appendChild = () => {};
  const sandbox = { document, firebase, console: { log() {}, warn() {}, error() {} }, URLSearchParams, navigator: {}, setTimeout() {}, setInterval() {}, clearInterval() {}, localStorage: storage(), sessionStorage: storage(), alert: text => alerts.push(text), window: { addEventListener() {}, location: { pathname: '/inquiry/' + id + '/', assign: url => navigations.push(url) } } };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  vm.runInContext('startTreatmentReviewsSync = () => {}; stopTreatmentReviewsSync = () => {}; initAuth(); initOnlineInquiry();', sandbox);
  return { nodes, auth, listeners, writes, alerts, navigations, sandbox, button, evaluate: code => vm.runInContext(code, sandbox), async restore() { await new Promise(resolve => setImmediate(resolve)); assert.equal(listeners.length, 1, 'one shared auth listener'); await listeners[0](auth.currentUser); } };
}
const admin = { uid: 'fixture_admin', displayName: '관리자', email: 'fixture@example.com', providerData: [], getIdTokenResult: async () => ({ claims: { admin: true } }) };
const state = client(admin);
await state.restore();
assert.equal(state.nodes.get('btn-header-login').style.display, 'none');
assert.equal(state.nodes.get('standalone-inquiry-admin-controls').style.display, 'flex');
assert.equal(state.evaluate('currentOpenedInquiryId'), id);
state.evaluate('openDoctorReplyEditorModal()');
assert.ok(state.nodes.get('inquiry-reply-editor-modal').classList.contains('active'));
assert.ok(state.nodes.get('reply-target-summary').innerHTML.includes(question.title));
state.nodes.get('doctor-reply-textarea').value = '검토용 첫 답변';
await state.evaluate('handleDoctorReplySubmit({ preventDefault() {} })');
assert.equal(state.writes.length, 1);
assert.equal(state.nodes.get('standalone-inquiry-status').textContent, '답변완료');
assert.equal(state.nodes.get('standalone-answer-content').textContent, '검토용 첫 답변');
assert.ok(state.writes[0].answeredAt);
state.nodes.get('doctor-reply-textarea').value = '검토용 수정 답변';
await state.evaluate('handleDoctorReplySubmit({ preventDefault() {} })');
assert.equal(state.writes.length, 2);
assert.ok(!('answeredAt' in state.writes[1]), 'editing preserves first answer date');
assert.equal(state.nodes.get('standalone-answer-content').textContent, '검토용 수정 답변');
assert.equal(state.navigations.length, 0);
await state.evaluate('logoutUser()');
assert.equal(state.nodes.get('standalone-inquiry-admin-controls').style.display, 'none');
assert.equal(state.nodes.get('btn-header-login').style.display, 'inline-flex');
state.evaluate('openAuthModal("login")');
assert.ok(state.nodes.get('auth-modal').classList.contains('active'));
console.log('PASS: restored admin, old direct URL, first save, edit, logout and login-dialog reopening');

const member = client({ ...admin, uid: 'fixture_member', getIdTokenResult: async () => ({ claims: {} }) });
await member.restore();
assert.equal(member.nodes.get('btn-header-login').style.display, 'none', 'regular members stay signed in');
assert.equal(member.nodes.get('standalone-inquiry-admin-controls').style.display, 'none');
member.nodes.get('doctor-reply-textarea').value = 'forbidden';
await member.evaluate('handleDoctorReplySubmit({ preventDefault() {} })');
assert.equal(member.writes.length, 0);
const guest = client(null);
await guest.restore();
guest.evaluate('openAuthModal("login")');
assert.ok(guest.nodes.get('auth-modal').classList.contains('active'));
console.log('PASS: members remain logged in, guests can open login, and non-admin replies are rejected');

const failed = client(admin, { ...question }, true);
await failed.restore();
failed.nodes.get('doctor-reply-textarea').value = '보존할 답변';
await failed.evaluate('handleDoctorReplySubmit({ preventDefault() {} })');
assert.equal(failed.nodes.get('doctor-reply-textarea').value, '보존할 답변');
assert.equal(failed.button.disabled, false);
assert.equal(failed.writes.length, 0);
assert.ok(failed.alerts.some(text => text.includes('답변 저장에 실패')));
// A concurrent first answer must be read from the transaction, not a stale seed.
const edited = client(admin, { ...question, status: 'answered', answer: '다른 관리자 답변', answeredAt: 'original-date' });
await edited.restore();
edited.nodes.get('doctor-reply-textarea').value = '수정';
await edited.evaluate('handleDoctorReplySubmit({ preventDefault() {} })');
assert.ok(!('answeredAt' in edited.writes[0]));
console.log('PASS: failed saves retain the draft, and concurrent replies preserve the original answer date');
