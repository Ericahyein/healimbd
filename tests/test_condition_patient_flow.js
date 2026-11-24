const assert = require('assert');
const fs = require('fs');
const path = require('path');
const output = path.resolve(process.argv[2] || 'public');
const names = {tic:'틱장애',adhd:'ADHD',panic:'공황장애',anxiety:'불안장애·공포증',insomnia:'불면증',autonomic:'자율신경실조증',hyperhidrosis:'다한증',ibs:'과민성대장증후군',syncope:'어지럼증'};
const regions = ['용인','경기광주','성남','이천','안성','여주','판교','수지'];
const read = url => fs.readFileSync(path.join(output,url.replace(/^\//,''),'index.html'),'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1],m[2]??m[3]??m[4]]));
const tags = (html,name) => [...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','g'))].map(m=>attrs(m[0]));
const ids = html => [...html.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>m[1]??m[2]??m[3]);
const graph = html => [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)].filter(m=>attrs(m[1]).type==='application/ld+json').flatMap(m=>JSON.parse(m[2])['@graph']||[]);
const plain = html => html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8');
let checked=0;
for(const [slug,name] of Object.entries(names)) {
 for(let n=0;n<=8;n++) {
  const url=`/conditions/${slug}/${n?n+'/':''}`;
  const html=read(url),main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1],text=plain(main),pageIds=ids(html);
  const at = id => main.search(new RegExp('\\bid=(?:"'+id+'"|'+id+'[\\s>])'));
  assert.strictEqual((html.match(/<h1\b/g)||[]).length,1,url+': one H1');
  assert.strictEqual(pageIds.length,new Set(pageIds).size,url+': unique anchors');
  assert(tags(html,'link').some(a=>a.rel==='canonical'&&a.href==='https://healimbd.com'+url),url+': old canonical remains');
  assert(!tags(html,'meta').some(a=>a.name==='robots'&&/noindex/i.test(a.content)),url+': crawlable');
  assert(sitemap.includes('https://healimbd.com'+url),url+': in sitemap');
  assert(text.includes('정자역')&&text.includes('405호')&&text.includes('손지웅'),url+': real clinic identity');
  const order=n?['clinic-intro','local-process','local-assessment','local-preparation','local-symptoms','local-reasons','faq','related-columns','local-location']:['clinic-intro','visit-process',slug+'-assessment','visit-preparation-section','faq','related-columns','visit-location'];
  for(let i=0;i<order.length;i++) assert(at(order[i])>=0&&(i===0||at(order[i])>at(order[i-1])),url+': patient reading order '+order[i]);
  assert(!main.includes('id=network-faq')&&!main.includes('id="network-faq"')&&!main.includes('id=clinical-insights'),url+': no separate duplicate FAQ modules');
  const nodes=graph(html),faqs=nodes.find(x=>x['@type']==='FAQPage').mainEntity;
  const faqStart=at('faq'),faqEnd=main.indexOf('</section>',faqStart),faqHtml=main.slice(faqStart,faqEnd);
  assert.strictEqual((faqHtml.match(/<details\b/g)||[]).length,faqs.length,url+': one visible FAQ per schema entry');
  for(const q of faqs) assert(html.includes(q.name)&&html.includes(q.acceptedAnswer.text),url+': visible structured answer');
  if(['tic','adhd'].includes(slug))assert(text.includes('뇌 충동성 검사'),url+': actual impulse assessment included');
  else {
   assert(!text.includes('뇌 충동성 검사'),url+': no impulse test copied into other conditions');
   assert(!text.includes('HRV'),url+': no unperformed test');
   if(slug==='panic'&&!n) assert(text.includes('공황장애에는 해당 훈련치료를 적용하지 않습니다'),url+': explicit training exclusion');
   else assert(!/뉴로피드백|밸런싱|\bIM\b/.test(text),url+': correct training scope');
  }
  if(slug==='syncope') {
   const h1=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
   assert(h1.includes('어지럼증')&&!h1.includes('미주신경성'),url+': dizziness is the primary heading');
   assert(html.match(/<title>([^<]*)<\/title>/)[1].includes('어지럼증'),url+': dizziness search title');
   assert(text.includes('회전감')&&text.includes('아찔함')&&text.includes('균형 불안'),url+': multiple symptom patterns');
   assert(text.includes('미주신경성 실신')&&text.includes('원인 평가'),url+': syncope remains a distinct cause');
   assert(main.indexOf('119')<at(n?'local-process':'visit-process'),url+': urgent symptoms visible before routine booking');
  }
  for(const a of tags(main,'a')) {
   if(!a.href?.startsWith('/')&&!a.href?.startsWith('#'))continue;
   const [pathname,fragment]=a.href.split('#');
   if(pathname&&/^\/inquiry\/inq_/.test(pathname))continue;
   const target=pathname?read(pathname):html;
   if(fragment)assert(ids(target).includes(decodeURIComponent(fragment)),url+': live link '+a.href);
  }
  checked++;
 }
}
for(const url of ['/','/guide/']) {
 const cards=tags(read(url),'a').filter(a=>a.class?.split(' ').includes('treatment-photo-card'));
 assert.strictEqual(cards.length,9,url+': nine cards retained');
 assert(cards.some(a=>a.href==='/conditions/syncope/'&&a['aria-label'].startsWith('어지럼증')),url+': navigation label updated');
}
console.log(`Verified ${checked} patient-first pages: live URLs, consolidated FAQs, clinical test scope and dizziness wording.`);
