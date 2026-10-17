const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, validateDraft, sourceToDraft, renderHtml, requestJson, adapt, sendDocument, main } = require('../scripts/auto_column/telegram_delivery');
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
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /class="homepage-banner" href="https:\/\/healimbd.com\/"/);
  assert.match(html, /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
  assert.ok(html.includes('img-src data:'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('lang="ko"'));
  assert.ok(html.includes('name="viewport"'));
  assert.ok(html.includes('Content-Security-Policy'));
  assert.ok(html.includes(source.url));
});
test('medical comparison failure blocks adaptation', async () => {
  let calls=0;
  await assert.rejects(adapt(source,env,async()=>completion(calls++ % 2 ? {approved:false,issues:['복약 주의사항을 보존하세요']}:draft)), /검수 미통과/);
  assert.equal(calls,10);
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
test('shared editorial layout includes working section anchors and three distinct contact links',()=>{
  const html=renderHtml(draft,source);
  const contacts=require('../data/column_contact.json');
  for(const url of [contacts.phone_url,contacts.kakao_url,contacts.naver_url]) assert.ok(html.includes(`href="${url}"`));
  assert.ok(html.includes('class="column-reading"'));
  assert.ok(html.includes('class="column-toc"'));
  for(let i=1;i<=draft.sections.length;i++){
    assert.ok(html.includes(`href="#topic-${i}"`));
    assert.ok(html.includes(`id="topic-${i}"`));
  }
});

test('failed comparison feeds corrections into one revision and still requires approval', async()=>{
  let calls=0;
  const responses=[draft,{approved:false,issues:['복약 주의사항을 보존하세요']},draft,{approved:true,issues:[]}];
  const result=await adapt(source,env,async(url,options)=>{
    if(calls===2) assert.ok(options.body.includes('복약 주의사항을 보존하세요'));
    return completion(responses[calls++]);
  });
  assert.deepEqual(result,draft);
  assert.equal(calls,4);
});

test('malformed draft is revised before review or delivery',async()=>{
 const responses=[{title:'잘못된 구조'},draft,{approved:true,issues:[]}];let calls=0;
 assert.deepEqual(await adapt(source,env,async()=>completion(responses[calls++])),draft);
 assert.equal(calls,3);
});

test('editorial framing feedback causes a fresh draft before medical review',async()=>{
  const repeated='약을 임의로 중단하지 말고 처방 의료진과 상의하세요.';
  const invalid={...draft,sections:draft.sections.map(s=>({...s,paragraphs:[...s.paragraphs,repeated,repeated]}))};
  const responses=[invalid,draft,{approved:true,issues:[]}];let calls=0;
  const result=await adapt(source,env,async(url,options)=>{
    if(calls===1) assert.match(options.body,/Editorial framing violation/);
    return completion(responses[calls++]);
  });
  assert.deepEqual(result,draft);
  assert.equal(calls,3);
});

test('final HTML shares website styling and places the centered half-width homepage link above contact', () => {
  const html=renderHtml(draft,source);
  assert.ok(html.includes('counter(article-topic,decimal-leading-zero)'));
  assert.equal((html.match(/<section class="column-topic">/g)||[]).length,draft.sections.length);
  assert.ok(html.includes('카카오 1:1 상담'));
  assert.ok(html.includes('data:image/webp;base64,'));
  assert.ok(!html.includes('/images/philosophy-closing.webp'));
  assert.ok(!html.includes('{{'));
  assert.match(html, /\.homepage-banner\{display:block;width:50%;margin:0 auto\}/);
  assert.ok(html.indexOf('<div class="homepage-banner-wrap">') < html.indexOf('<aside'));
  assert.ok(html.includes('font-src data:'));
  assert.ok(html.includes('data:font/woff2;base64,'));
});

test('rich paragraph formatting preserves lists and emphasis without allowing HTML', () => {
 const {renderBlocks} = require('../scripts/auto_column/telegram_delivery');
 assert.equal(renderBlocks('- 하나\n- **둘**'), '<ul><li>하나</li><li><strong>둘</strong></li></ul>');
 assert.equal(renderBlocks('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
 assert.ok(renderBlocks('| 항목 | 설명 |\n| --- | --- |\n| 가 | 나 |').includes('<th scope="col">항목</th>'));
});

test('source-preserved fallback keeps published emergency and medication instructions', () => {
  for (const slug of ['gyeonggi-gwangju-syncope-exercise-syncope', 'seongnam-main-panic-medication-discussion']) {
    const published = loadSource(slug);
    const original = published.body.replace(/<\/?div\b[^>]*>/g, '').trim();
    const fallback = sourceToDraft(published);
    const recovered = fallback.sections.map(s => s.paragraphs.join('\n')).join('\n');
    for (const line of original.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('## '))) {
      assert.ok(recovered.includes(line), `missing published line in ${slug}: ${line.slice(0, 50)}`);
    }
    const html = renderHtml(fallback, published, { sourcePreserved: true });
    assert.match(html, /원문 보존 HTML/);
    assert.match(html, /내용 검수 완료 · 2026-10-17/);
    assert.match(html, /검수 범위: 본문·공개 출처/);
    assert.ok(!html.includes('AI가 각색한 글'));
    assert.ok(html.includes(published.url));
    assert.ok(html.includes('href="https://'));
  }
});

test('source-preserved Telegram attachment is named and labeled honestly', async () => {
  await sendDocument('<html>원문</html>', source, source.title, env, async(url, options) => {
    assert.equal(options.body.get('document').name, 'test-column-source.html');
    assert.match(options.body.get('caption'), /원문 보존 HTML/);
    return { ok:true, json:async()=>({ok:true,result:{message_id:10}}) };
  }, { sourcePreserved:true });
});

test('published internal links resolve to the clinic site in source HTML', () => {
  const { renderBlocks } = require('../scripts/auto_column/telegram_delivery');
  const html = renderBlocks('[공황장애 안내](/conditions/panic/)와 [공식 자료](https://example.org/guide)', { sourceLinks:true });
  assert.match(html, /href="https:\/\/healimbd.com\/conditions\/panic\/"/);
  assert.match(html, /href="https:\/\/example.org\/guide"/);
});
