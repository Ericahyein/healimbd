const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, validateDraft, renderHtml, requestJson, adapt, sendDocument, main } = require('../scripts/auto_column/telegram_delivery');
const source = { slug: 'test-column', title: '원문 제목', body: '의학정보와 주의사항. '.repeat(60), url: 'https://healimbd.com/blog/test-column/' };
const draft = { title: '다르게 쓴 제목', intro: '차분한 도입', sections: Array.from({length:3}, (_, i) => ({heading:`소제목 ${i}`, paragraphs:['의학정보를 유지하면서 표현을 바꾼 내용입니다. '.repeat(6)]})), closing: '평가가 필요한 경우 진료를 받으세요.' };
const env = {OPENAI_API_KEY:'fake-key', TELEGRAM_BOT_TOKEN:'fake-token', TELEGRAM_CHAT_ID:'123'};
const completion = obj => ({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(obj)}}]})});
test('existing published article only, no path traversal', () => {
  assert.match(loadSource().url, /^https:\/\/healimbd.com\/blog\//);
  assert.throws(() => loadSource('../../etc/passwd'));
});
test('reject unchanged title, missing structure and extreme shortening', () => {
  assert.equal(validateDraft(draft, source), draft);
  assert.throws(() => validateDraft({...draft,title:source.title}, source));
  assert.throws(() => validateDraft({...draft,sections:[]}, source));
  assert.throws(() => validateDraft({...draft,sections:draft.sections.map(s=>({...s,paragraphs:['짧음']}))}, source));
});
test('HTML escapes all model text and is self-contained and responsive', () => {
  const html = renderHtml({...draft,title:'<script>alert(1)</script>',intro:'<img src=x onerror=alert(1)>'}, source);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('lang="ko"'));
  assert.ok(html.includes('name="viewport"'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes(source.url));
});
test('medical comparison failure blocks adaptation', async () => {
  let calls=0;
  await assert.rejects(adapt(source,env,async()=>completion(calls++ ? {approved:false}:draft)), /검수 미통과/);
  assert.equal(calls,2);
});
test('medical comparison success returns draft', async () => {
  let calls=0;
  assert.deepEqual(await adapt(source,env,async()=>completion(calls++ ? {approved:true}:draft)),draft);
});
test('network error never exposes token or URL and is not blindly retried', async () => {
  let calls=0;
  await assert.rejects(requestJson('https://api.telegram.org/botSECRET/sendDocument', {}, 'Telegram',async()=>{calls++;throw new Error('SECRET');}), error=>!error.message.includes('SECRET'));
  assert.equal(calls,1);
});
test('send uses attached UTF-8 HTML and exact personal chat ID', async () => {
  const id=await sendDocument('<html>한글</html>',source,draft.title,env,async(url,options)=>{
    assert.equal(options.method,'POST');
    assert.equal(options.body.get('chat_id'),'123');
    assert.equal(options.body.get('document').name,'test-column-adapted.html');
    assert.equal(await options.body.get('document').text(),'<html>한글</html>');
    return {ok:true,json:async()=>({ok:true,result:{message_id:9}})};
  });
  assert.equal(id,9);
});
test('missing secrets and invalid recipient fail before API calls', async()=>{
  await assert.rejects(main({}),/OPENAI_API_KEY/);
  await assert.rejects(main({...env,TELEGRAM_CHAT_ID:'@unknown'}),/개인 숫자 ID/);
});
test('Telegram rejects are failures, not success', async()=>{
  await assert.rejects(sendDocument('html',source,draft.title,env,async()=>({ok:true,json:async()=>({ok:false})})),/전송 확인 실패/);
});
