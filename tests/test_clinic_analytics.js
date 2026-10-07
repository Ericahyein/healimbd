const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/analytics.js'), 'utf8');
const id = 'G-VT6QHEM9MR';

function setup({ url = 'https://healimbd.com/', referrer = '', navigator = {}, disabled = false } = {}) {
  const scripts = [], listeners = [];
  const location = new URL(url);
  const window = { ['ga-disable-' + id]: disabled };
  const document = {
    currentScript: { dataset: { measurementId: id, hostname: 'healimbd.com',
      phone: '031-716-8575', naverUrl: 'https://naver.me/xbARooIc', kakaoUrl: 'https://pf.kakao.com/_NEUHT' } },
    referrer, createElement: () => ({}), head: { appendChild: s => scripts.push(s) },
    addEventListener: (name, listener, capture) => listeners.push({ name, listener, capture })
  };
  const context = vm.createContext({ window, document, location, navigator, URL, URLSearchParams, Set, Date });
  const run = () => vm.runInContext(source, context);
  run();
  const commands = () => Array.from(window.dataLayer || [], item => Array.from(item));
  const click = (href, placement = '', hidden = false, prevented = false) => {
    const link = { href, closest: selector => selector === '[data-nosnippet]' ? hidden : selector === placement };
    const event = { target: { closest: () => link }, defaultPrevented: prevented,
      preventDefault: () => { throw new Error('Analytics must not block navigation'); } };
    for (const entry of listeners) entry.listener(event);
  };
  return { window, document, scripts, listeners, commands, run, click };
}

const main = setup({ url: 'https://healimbd.com/conditions/tic/?name=PATIENT&phone=01012345678&utm_source=chatgpt.com#private',
  referrer: 'https://chatgpt.com/c/private-conversation?email=private@example.com' });
assert.equal(main.scripts.length, 1);
assert.equal(main.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + id);
const config = main.commands().find(c => c[0] === 'config')[2];
assert.equal(config.page_location, 'https://healimbd.com/conditions/tic/');
assert.equal(config.page_referrer, 'https://chatgpt.com');
assert.equal(config.campaign_source, 'chatgpt.com');
assert.equal(config.allow_google_signals, false);
assert.equal(config.allow_ad_personalization_signals, false);
assert.equal(config.send_page_view, false);
assert.equal(main.commands().filter(c => c[1] === 'page_view').length, 1);
assert.equal(main.listeners[0].capture, true);
main.click('tel:031-716-8575', '.floating-quick-bar');
main.click('https://naver.me/xbARooIc?name=PRIVATE', '.clinic-visit-summary');
main.click('https://pf.kakao.com/_NEUHT/chat', '.modal-opt-card');
const events = main.commands().filter(c => c[0] === 'event');
assert.deepEqual(events.map(c => c[1]), ['page_view', 'phone_click', 'naver_booking_click', 'kakao_click']);
assert.deepEqual(events.slice(1).map(c => c[2].contact_placement), ['floating_bar', 'visit_summary', 'contact_modal']);
assert(!JSON.stringify(main.commands()).match(/PATIENT|PRIVATE|01012345678|private-conversation|private@example/));
main.click('tel:01012345678');
main.click('https://naver.me/other-clinic');
main.click('https://pf.kakao.com/_OTHER/chat');
main.click('https://naver.me/xbARooIc', '', true);
main.click('tel:031-716-8575', '', false, true);
assert.equal(main.commands().filter(c => c[0] === 'event').length, 4);
main.run();
assert.equal(main.scripts.length, 1, 'Repeated execution must not load a second tag');
assert.equal(main.listeners.length, 1, 'Repeated initialization must not double-count clicks');

for (const options of [
  { url: 'http://localhost:1313/' }, { url: 'https://feat-analytics.healimbd.pages.dev/' },
  { url: 'https://healimbd.com.evil.test/' }, { navigator: { doNotTrack: '1' } },
  { navigator: { globalPrivacyControl: true } }, { disabled: true }
]) {
  const state = setup(options);
  assert.equal(state.scripts.length, 0);
  assert.equal(state.commands().length, 0);
}
for (const page of ['inquiry/PATIENT-123/', 'reviews/PATIENT-123/']) {
  const state = setup({ url: 'https://healimbd.com/' + page + '?email=private@example.com', referrer: 'not a URL' });
  const options = state.commands().find(c => c[0] === 'config')[2];
  assert(!JSON.stringify(options).includes('PATIENT'));
  assert.equal(options.page_location, 'https://healimbd.com/' + page.split('/')[0] + '/');
  assert.equal(options.page_referrer, '');
}
const unknown = setup({ url: 'https://healimbd.com/account/PATIENT?utm_source=private@example.com' });
assert.equal(unknown.commands().find(c => c[0] === 'config')[2].page_location, 'https://healimbd.com/other/');
assert(!JSON.stringify(unknown.commands()).includes('private@example.com'));

// Verify the actual full-site Hugo output when a build directory is supplied.
if (process.argv[2]) {
  const output = path.resolve(process.argv[2]);
  for (const name of ['index.html', 'conditions/tic/index.html', 'inquiry/index.html', 'privacy/index.html']) {
    const html = fs.readFileSync(path.join(output, name), 'utf8');
    assert.equal((html.match(/id=(?:"clinic-analytics"|clinic-analytics)/g) || []).length, 1, name);
    assert(html.includes(id), name);
    assert(html.includes('data-hostname=healimbd.com') || html.includes('data-hostname="healimbd.com"'), name);
  }
}
console.log('✅ GA4 pageviews, source sanitization, contact clicks, private paths and production guards passed');
