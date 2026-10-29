const assert = require('assert');
const fs = require('fs');
const path = require('path');
const output = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
const read = url => fs.readFileSync(path.join(output, url.replace(/^\//, ''), 'index.html'), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1],m[2]??m[3]??m[4]]));
const links = html => [...html.matchAll(/<a\b[^>]*>/g)].map(m=>attrs(m[0]));
const ids = html => [...html.matchAll(/<[a-z][^>]*\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>m[1]??m[2]??m[3]);
const graph = html => [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)].filter(m=>attrs(m[1]).type==='application/ld+json').flatMap(m=>JSON.parse(m[2])['@graph']||[]);
const local = read('/conditions/tic/1/');
const pillar = read('/conditions/tic/');
const title = '용인 틱장애 치료 병원 ㅣ 해아림한의원';
assert.strictEqual(local.match(/<title>([^<]+)<\/title>/)[1],title);
assert.strictEqual(local.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1],title);
assert.strictEqual((local.match(/<h1\b/g)||[]).length,1);
const meta = [...local.matchAll(/<meta\b[^>]*>/g)].map(m=>attrs(m[0]));
assert.strictEqual(meta.find(m=>m.property==='og:title').content,title);
assert.strictEqual(meta.find(m=>m.property==='twitter:title').content,title);
assert(!meta.some(m=>m.name==='robots'&&/noindex/.test(m.content)));
assert([...local.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0])).some(m=>m.rel==='canonical'&&m.href==='https://healimbd.com/conditions/tic/1/'));
assert(local.includes('daegu-local-hero')&&!local.includes('condition-photo-hero')&&!local.includes('reference-shell'),'independent reference design, without the existing photo-hero layout');
assert.strictEqual((local.match(/class=(?:"daegu-local-card"|daegu-local-card)/g)||[]).length,3);
assert.strictEqual((local.match(/class=(?:"daegu-local-question"|daegu-local-question)/g)||[]).length,3);
const localFaq=graph(local).find(n=>n['@type']==='FAQPage').mainEntity;
const sourceFaq=graph(pillar).find(n=>n['@type']==='FAQPage').mainEntity;
assert.strictEqual(localFaq.length,7);
assert.deepStrictEqual(localFaq.slice(-4),sourceFaq.slice(-4),'bottom FAQs come from the original tic guide');
for(const q of localFaq)assert(local.includes(q.name)&&local.includes(q.acceptedAnswer.text),'every schema answer is visible');
const sourceColumns=links(pillar).filter(a=>a.class==='reference-column').map(a=>a.href);
assert.deepStrictEqual(links(local).filter(a=>a.class==='daegu-local-column-card').map(a=>a.href),sourceColumns,'same selected treatment columns');
assert.strictEqual(links(local).filter(a=>a.class==='daegu-local-review-card'&&a.href==='/reviews/guide/').length,3,'protected review guide is retained');
assert(links(pillar).some(a=>a.href==='/conditions/tic/1/'),'number 1 opens the separate page');
for(const index of ['/','/guide/','/areas/yongin/'])assert(!links(read(index)).some(a=>a.href==='/conditions/tic/1/'),'new page is not a treatment-list card');
assert(!fs.existsSync(path.join(output,'condition-local/index.html')),'no generated local-page archive');
assert(fs.readFileSync(path.join(output,'sitemap.xml'),'utf8').includes('https://healimbd.com/conditions/tic/1/'));
assert(!/김대억|053-751|두산위브|CST|GAP 인증|16여 년/.test(local),'Daegu-specific practitioner, contacts and unverified treatments are not carried over');
const clinic=graph(local).find(n=>n['@type']==='MedicalClinic');
assert.strictEqual(clinic.address.addressLocality,'성남시 분당구');
assert.strictEqual(ids(local).length,new Set(ids(local)).size);
for(const a of links(local)){
 if(!a.href?.startsWith('/')&&!a.href?.startsWith('#'))continue;
 const [pathname,fragment]=a.href.split('#');const target=pathname?read(pathname):local;
 if(fragment)assert(ids(target).includes(fragment),`live anchor ${a.href}`);
}

const regionNames = ['용인','경기광주','성남','이천','안성','여주','판교','수지'];
const expectedUrls = regionNames.map((_,i)=>'/conditions/tic/'+(i+1)+'/');
const regionNav = pillar.match(/<nav\b[^>]*class=(?:"condition-region-links"|condition-region-links)[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert(regionNav, 'regional navigation is visible on the tic pillar');
assert.deepStrictEqual(links(regionNav).map(a=>a.href), expectedUrls, 'numbers 1–8 link to the requested regions in order');
const descriptions = new Set();
const localIntroductions = new Set();
const localQuestions = new Set();
for (const [index, name] of regionNames.entries()) {
  const url = expectedUrls[index];
  const html = read(url);
  const expectedTitle = name+' 틱장애 치료 병원 ㅣ 해아림한의원';
  assert.strictEqual(html.match(/<title>([^<]+)<\/title>/)[1], expectedTitle);
  assert.strictEqual(html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1], expectedTitle);
  assert.strictEqual((html.match(/<h1\b/g)||[]).length,1);
  const metadata = [...html.matchAll(/<meta\b[^>]*>/g)].map(m=>attrs(m[0]));
  assert.strictEqual(metadata.find(m=>m.property==='og:title').content,expectedTitle);
  assert.strictEqual(metadata.find(m=>m.property==='twitter:title').content,expectedTitle);
  const description = metadata.find(m=>m.name==='description').content;
  assert(!descriptions.has(description), name+': distinct regional search description');
  descriptions.add(description);
  assert(!metadata.some(m=>m.name==='robots'&&/noindex/i.test(m.content)));
  assert([...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0])).some(m=>m.rel==='canonical'&&m.href==='https://healimbd.com'+url));
  assert(fs.readFileSync(path.join(output,'sitemap.xml'),'utf8').includes('https://healimbd.com'+url));
  assert(html.includes(name+'에서 틱장애 치료를 고민하는'),name+': correct visible regional introduction');
  assert(html.includes('3. '+name+' 틱장애 진료에서'),name+': correct regional FAQ heading');
  const intro = html.match(/<section\b[^>]*class=(?:"daegu-local-intro"|daegu-local-intro)[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert(intro && !localIntroductions.has(intro),name+': substantive individual visit introduction');
  localIntroductions.add(intro);
  const schema = graph(html);
  assert.strictEqual(schema.find(n=>n['@type']==='MedicalClinic').address.addressLocality,'성남시 분당구');
  const breadcrumb = schema.find(n=>n['@type']==='BreadcrumbList').itemListElement;
  assert.strictEqual(breadcrumb.at(-1).name,name,name+': regional breadcrumb agrees with page');
  const faqs = schema.find(n=>n['@type']==='FAQPage').mainEntity;
  assert.strictEqual(faqs.length,7);
  assert.deepStrictEqual(faqs.slice(-4),sourceFaq.slice(-4));
  for (const item of faqs) assert(html.includes(item.name)&&html.includes(item.acceptedAnswer.text));
  for (const item of faqs.slice(0,3)) {
    assert(!localQuestions.has(item.name),name+': local FAQ questions are independently written');
    localQuestions.add(item.name);
  }
  assert.strictEqual((html.match(/<h4\b/g)||[]).length,4,name+': four approved care steps are available');
  assert.deepStrictEqual(links(html).filter(a=>a.class==='daegu-local-column-card').map(a=>a.href),sourceColumns);
  assert.strictEqual(links(html).filter(a=>a.class==='daegu-local-review-card'&&a.href==='/reviews/guide/').length,3);
  const reservation=links(html).find(a=>a.class?.split(' ').includes('daegu-local-naver'));
  assert.strictEqual(reservation?.href,'https://naver.me/xbARooIc',name+': same branded Naver reservation');
  for (const indexUrl of ['/','/guide/']) assert(!links(read(indexUrl)).some(a=>a.href===url),name+': remains outside treatment lists');
  assert.strictEqual(ids(html).length,new Set(ids(html)).size,name+': unique anchors');
  for (const a of links(html)) {
    if(!a.href?.startsWith('/')&&!a.href?.startsWith('#'))continue;
    const [pathname,fragment]=a.href.split('#');const target=pathname?read(pathname):html;
    if(fragment)assert(ids(target).includes(fragment),name+': valid anchor '+a.href);
  }
}
console.log('✅ All eight numbered regional tic pages: requested titles, H1, order, distinct visit content, shared clinical resources, indexing and live links verified.');

console.log('✅ Separate Daegu-style Yongin page: exact metadata, original FAQ/columns, protected reviews, real clinic details, sitemap and links verified.');
