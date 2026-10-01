// Comprehensive Test Suite for Inquiry SSR Edge Function & Dynamic Sitemap Indexing
import assert from 'assert';
import crypto from 'crypto';
import { onRequestGet as handleInquirySSR, onRequestHead as handleInquiryHead, buildSeoTitle, getRepresentativeDisease } from '../functions/inquiry/[id].js';
import { onRequestGet as handleInquiryListSSR } from '../functions/inquiry/index.js';
import { onRequestGet as handleSitemapXML } from '../functions/sitemap-inquiry.xml.js';

console.log('🧪 Starting Inquiry SSR & Dynamic Sitemap Test Suite...\n');

// Generate valid in-memory RSA keypair for realistic WebCrypto JWT test execution
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const mockEnv = {
  FIREBASE_PROJECT_ID: 'healimbd-b726f',
  FIREBASE_SERVICE_ACCOUNT_EMAIL: 'firebase-adminsdk-mock@healimbd-b726f.iam.gserviceaccount.com',
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey
};

async function runTests() {
  let passed = 0;

  // Global mock fetch dispatcher for auth & Firestore REST
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const urlStr = typeof url === 'string' ? url : (url && url.url) || '';

    // Mock Google OAuth token exchange
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({
        access_token: 'mock_google_oauth_token_xyz',
        expires_in: 3600
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Default to original fetch for other requests
    return originalFetch(url, options);
  };

  try {
    // --- Test 1: Purged Samples Must Return HTTP 404 ---
    console.log('--- 1. Purged Samples 404 Test ---');
    {
      const sampleIds = ['inq_01_autonomic', 'inq_02_adhd', 'inq_03_sleep', 'inq_04_tic'];
      for (const sampleId of sampleIds) {
        const context = {
          request: new Request(`https://healimbd.com/inquiry/${sampleId}/`),
          env: mockEnv,
          params: { id: sampleId }
        };

        const prevFetch = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
          const u = typeof url === 'string' ? url : (url && url.url) || '';
          if (u.includes(`/online_inquiries/${sampleId}`)) {
            return new Response(JSON.stringify({ error: { code: 404, message: 'Document not found' } }), { status: 404 });
          }
          return prevFetch(url, options);
        };

        try {
          const response = await handleInquirySSR(context);
          assert.strictEqual(response.status, 404, `Sample ${sampleId} must return 404`);
          const html = await response.text();
          assert.ok(html.includes('온라인 상담글을 찾을 수 없습니다'), 'Must display friendly 404 page');
        } finally {
          globalThis.fetch = prevFetch;
        }
      }
      console.log('✅ PASS: All 4 purged sample posts strictly return HTTP 404.');
      passed++;
    }

    // --- Test 2: Invalid ID Format Security Rejection ---
    console.log('\n--- 2. Invalid ID Format Security Rejection ---');
    {
      const invalidIds = ['../../admin', 'inq/something', 'post_12345', '<script>alert(1)</script>', '', 'inq_!@#$'];
      for (const badId of invalidIds) {
        const context = {
          request: new Request(`https://healimbd.com/inquiry/${encodeURIComponent(badId)}`),
          env: mockEnv,
          params: { id: badId }
        };
        const response = await handleInquirySSR(context);
        assert.strictEqual(response.status, 404, `Invalid ID "${badId}" must return 404`);
        const html = await response.text();
        assert.ok(html.includes('유효하지 않은 상담글 식별자입니다'), 'Must display invalid id 404 message');
      }
      console.log('✅ PASS: All malformed and malicious IDs are rejected with HTTP 404.');
      passed++;
    }

    // --- Test 3: SEO Title Generation & Disease Normalization ---
    console.log('\n--- 3. SEO Title Generation & Disease Normalization Test ---');
    {
      // Case A: User Example 1
      const titleA = buildSeoTitle({
        region: '분당',
        category: '틱장애·뚜렛',
        title: '아이가 갑자기 눈을 깜빡여요'
      });
      assert.strictEqual(titleA, '[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요 | 해아림한의원 분당점', 'Title A must match example 1');

      // Case B: User Example 2
      const titleB = buildSeoTitle({
        region: '판교',
        category: '수면·불면증',
        title: '불면증 때문에 자도 잔 것 같지 않아요'
      });
      assert.strictEqual(titleB, '[판교 불면증 상담] 불면증 때문에 자도 잔 것 같지 않아요 | 해아림한의원 분당점', 'Title B must match example 2');

      // Case C: Deduplication when title already has brackets e.g. [분당 틱장애]
      const titleC = buildSeoTitle({
        region: '분당',
        category: 'tic',
        title: '[분당 틱장애] 아이가 갑자기 눈을 깜빡여요'
      });
      assert.strictEqual(titleC, '[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요 | 해아림한의원 분당점', 'Bracket tag must not be duplicated');

      // Case D: Deduplication when title already starts with exact standard prefix
      const titleD = buildSeoTitle({
        region: '분당',
        category: 'tic',
        title: '[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요'
      });
      assert.strictEqual(titleD, '[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요 | 해아림한의원 분당점', 'Standard prefix must not be duplicated');

      // Case E: Safe fallback when region and category are missing
      const titleE = buildSeoTitle({
        title: '한방 진료 문의드립니다'
      });
      assert.strictEqual(titleE, '한방 진료 문의드립니다 | 해아림한의원 분당점', 'Fallback when no region/category');

      // Case F: Disease normalization coverage
      assert.strictEqual(getRepresentativeDisease('adhd', ''), 'ADHD');
      assert.strictEqual(getRepresentativeDisease('autonomic', ''), '자율신경실조증');
      assert.strictEqual(getRepresentativeDisease('panic', ''), '공황장애');
      assert.strictEqual(getRepresentativeDisease('anxiety', ''), '불안장애');
      assert.strictEqual(getRepresentativeDisease('hyperhidrosis', ''), '다한증');

      // Combined board categories must not turn every question into depression,
      // or infer vasovagal syncope from nonspecific dizziness.
      const topicCases = [
        ['depression', '', '강박증 치료 꼭 받아야 하나요?', '강박증'],
        ['우울·강박', '', '우울증이면 몸도 무거울 수 있나요?', '우울증'],
        ['우울·강박증', '', '마음이 힘들어 상담드립니다', '우울·강박'],
        ['depression', '', '우울증과 강박증은 어떻게 다른가요?', '우울·강박'],
        ['depression', '', '[경기광주 우울증 상담] 강박증 치료 문의', '강박증'],
        ['depression', '강박장애', '확인 행동 상담 문의', '강박증'],
        ['depression', '우울증', '강박증과 함께 치료할 수 있나요?', '우울증'],
        ['headache', '', '미주신경성 실신을 상담받고 싶어요', '미주신경성 실신'],
        ['두통·어지럼', '', '미주신경성실신 문의드립니다', '미주신경성 실신'],
        ['headache', '미주신경성 실신', '어지럼에 대해 문의드립니다', '미주신경성 실신'],
        ['headache', '', '일어서면 어지럽고 식은땀이 나요', '두통·어지럼증'],
        ['headache', '', '실신의 원인이 궁금해요', '두통·어지럼증'],
        ['etc', '', '미주신경성 실신과 ADHD가 함께 있나요?', ''],
        ['etc', '', '가슴이 두근거리고 잠이 안 와요', ''],
        ['etc', '', '자율신경실조증 치료 문의드립니다', '자율신경실조증'],
        ['tic', '', '틱장애와 ADHD가 함께 있나요?', '틱장애']
      ];
      for (const [category, disease, title, expected] of topicCases) {
        assert.strictEqual(getRepresentativeDisease(category, disease, title), expected, title);
      }
      assert.strictEqual(
        buildSeoTitle({ region: '경기광주', category: 'depression', title: '강박증 치료 꼭 받아야 하나요?' }),
        '[경기광주 강박증 상담] 강박증 치료 꼭 받아야 하나요? | 해아림한의원 분당점',
        'Regression: the real OCD question must not gain a depression prefix'
      );

      console.log('✅ PASS: SEO title generation and normalization rules verified 100%.');
      passed++;
    }

    // --- Test 4: Live Answered Inquiry SSR with SEO Title and Raw H1 ---
    console.log('\n--- 4. Live Answered Inquiry SSR Test (SEO Title + Raw H1) ---');
    {
      const testInquiryId = 'inq_1788331095408';
      const rawTitle = '아이가 갑자기 눈을 깜빡여요';

      const prevFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        const u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.includes('online_inquiries?pageSize=300')) {
          return new Response(JSON.stringify({
            documents: [{
              name: 'projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_related_tic_1',
              fields: {
                category: { stringValue: '틱장애·뚜렛' },
                title: { stringValue: '틱 증상을 지적하면 더 심해질까요?' },
                status: { stringValue: 'answered' },
                answer: { stringValue: '관련 답변입니다.' },
                createdAt: { timestampValue: '2026-09-05T10:00:00Z' }
              }
            }]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (u.includes(`/online_inquiries/${testInquiryId}`)) {
          return new Response(JSON.stringify({
            fields: {
              region: { stringValue: '분당' },
              category: { stringValue: '틱장애·뚜렛' },
              title: { stringValue: rawTitle },
              content: { stringValue: '며칠 전부터 눈을 심하게 깜빡입니다.' },
              status: { stringValue: 'answered' },
              answer: { stringValue: '손지웅 대표원장입니다. 틱 증상의 초기 양상일 수 있습니다.' },
              createdAt: { timestampValue: '2026-09-06T10:00:00Z' },
              answeredAt: { timestampValue: '2026-09-06T12:00:00Z' }
            }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return prevFetch(url, options);
      };

      try {
        const context = {
          request: new Request(`https://healimbd.com/inquiry/${testInquiryId}/`),
          env: mockEnv,
          params: { id: testInquiryId }
        };

        const response = await handleInquirySSR(context);
        assert.strictEqual(response.status, 200, 'Answered inquiry must return 200 OK');
        const html = await response.text();

        // Check SEO title in <title> and og:title
        assert.ok(html.includes('<title>[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요 | 해아림한의원 분당점</title>'), 'SEO Title must be formatted correctly');
        assert.ok(html.includes('<meta property="og:title" content="[분당 틱장애 상담] 아이가 갑자기 눈을 깜빡여요 | 해아림한의원 분당점">'), 'OG Title must match SEO title');

        // Check on-screen H1 retains raw patient title!
        assert.ok(html.includes(`<h1 class="detail-main-title" style="font-size: 1.5rem; font-weight: 800; color: #0F172A; line-height: 1.4; margin: 12px 0 14px;">${rawTitle}</h1>`), 'On-screen H1 must retain raw patient title');

        // Check robots meta
        assert.ok(html.includes('<meta name="robots" content="index,follow">'), 'Answered inquiry must be index,follow');
        assert.strictEqual(response.headers.get('x-robots-tag'), 'index, follow', 'Answered inquiry response header must also be index, follow');

        // Check doctor answer
        assert.ok(html.includes('손지웅 대표원장입니다'), 'Doctor answer must be in raw HTML');
        assert.ok(html.includes('"@type":["WebPage","MedicalWebPage"]'), 'Answered inquiry must use MedicalWebPage structured data');
        assert.ok(!html.includes('"@type":"QAPage"'), 'Single-doctor inquiry must not claim community QAPage eligibility');
        assert.ok(!html.includes('"upvoteCount"'), 'Inquiry schema must not invent voting data');
        assert.ok(html.includes('"reviewedBy"'), 'MedicalWebPage must identify the reviewing doctor');
        assert.ok(html.includes('https://healimbd.com/philosophy/'), 'Reviewing doctor must link to the real profile page');
        assert.ok(html.includes('"@type":"BreadcrumbList"'), 'Answered inquiry must include breadcrumb structured data');
        assert.ok(html.includes('/inquiry/inq_related_tic_1/'), 'Same-disease answered inquiry must be linked in raw HTML');
        assert.ok(html.includes('href="/conditions/tic/"'), 'Inquiry must link to its disease pillar page');
        assert.ok(html.includes('href="/favicon.ico"'), 'Standalone inquiry HTML must declare the site favicon');
        assert.ok(html.includes('href="/guide/"'), 'Inquiry navigation must point to the canonical guide page');
        assert.ok(!html.includes('href="/treatments/"'), 'Inquiry navigation must not point to the retired treatments route');
        assert.ok(html.includes('뇌인지검사·뇌기능검사·정서심리검사'), 'Clinical notice must describe the actual clinic examination set');
        assert.ok(html.includes('031-716-8575'), 'SSR detail must use the current canonical clinic phone number');

        const headResponse = await handleInquiryHead({
          ...context,
          request: new Request(`https://healimbd.com/inquiry/${testInquiryId}/`, { method: 'HEAD' })
        });
        assert.strictEqual(headResponse.status, 200, 'HEAD must match the live answered page status');
        assert.strictEqual(await headResponse.text(), '', 'HEAD must not return an HTML body');

        console.log('✅ PASS: Answered inquiry SSR verified with SEO title, raw on-screen H1, and index,follow.');
        passed++;
      } finally {
        globalThis.fetch = prevFetch;
      }
    }

    // --- Test 4b: Consistent Topic, Real Condition Links and Related Questions ---
    console.log('\n--- 4b. Inquiry Disease Routing Regression Test ---');
    {
      const cases = [
        { category: 'tic', title: '틱장애 치료 문의', topic: '틱장애', route: '/conditions/tic/' },
        { category: 'ADHD·집중력', title: 'ADHD 치료 문의', topic: 'ADHD', route: '/conditions/adhd/' },
        { category: 'panic', title: '공황장애 치료 문의', topic: '공황장애', route: '/conditions/panic/' },
        { category: '불안·공포', title: '불안장애 치료 문의', topic: '불안장애', route: '/conditions/anxiety/' },
        { category: '수면·불면증', title: '불면증 치료 문의', topic: '불면증', route: '/conditions/insomnia/' },
        { category: 'autonomic', title: '자율신경실조증 치료 문의', topic: '자율신경실조증', route: '/conditions/autonomic/' },
        { category: '다한증', title: '다한증 치료 문의', topic: '다한증', route: '/conditions/hyperhidrosis/' },
        { category: 'ibs', title: '과민성대장증후군 치료 문의', topic: '과민성대장증후군', route: '/conditions/ibs/' },
        { category: '두통·어지럼', title: '미주신경성 실신 치료 문의', topic: '미주신경성 실신', route: '/conditions/syncope/' },
        { category: 'headache', disease: '미주신경성 실신', title: '어지럼에 대해 문의드립니다', topic: '미주신경성 실신', route: '/conditions/syncope/' },
        { category: 'depression', title: '강박증 치료 꼭 받아야 하나요?', topic: '강박증', route: '/guide/' },
        { category: '우울·강박', title: '우울증이면 몸도 무거울 수 있나요?', topic: '우울증', route: '/guide/' },
        { category: 'depression', title: '우울증과 강박증이 함께 있나요?', topic: '우울·강박', route: '/guide/' },
        { category: 'headache', title: '일어서면 어지럽고 식은땀이 나요', topic: '두통·어지럼증', route: '/guide/' },
        { category: 'etc', title: '가슴이 두근거리고 잠이 안 와요', topic: '', route: '/guide/' }
      ];
      const related = [
        { id: 'inq_related_ocd', category: '우울·강박', title: '강박증으로 반복 확인을 합니다' },
        { id: 'inq_related_ocd_alias', category: 'etc', disease: '강박장애', title: '확인 행동 상담 문의' },
        { id: 'inq_related_depression', category: 'depression', title: '우울증이면 무기력할 수 있나요?' },
        { id: 'inq_related_syncope', category: 'headache', title: '미주신경성 실신 상담 문의' },
        { id: 'inq_related_dizziness', category: '두통·어지럼', title: '어지럽고 두통이 있어요' },
        { id: 'inq_related_pending_ocd', category: 'depression', title: '강박증 상담 문의', status: 'pending' }
      ];
      const prevFetch = globalThis.fetch;
      try {
        for (const [index, fixture] of cases.entries()) {
          const id = 'inq_topic_test_' + index;
          globalThis.fetch = async (url, options) => {
            const u = typeof url === 'string' ? url : (url && url.url) || '';
            if (u.includes('online_inquiries?pageSize=300')) {
              return new Response(JSON.stringify({
                documents: related.map(item => ({
                  name: 'projects/healimbd-b726f/databases/(default)/documents/online_inquiries/' + item.id,
                  fields: {
                    category: { stringValue: item.category },
                    disease: { stringValue: item.disease || '' },
                    title: { stringValue: item.title },
                    status: { stringValue: item.status || 'answered' },
                    answer: { stringValue: item.status === 'pending' ? '' : '테스트 상담 답변' },
                    createdAt: { timestampValue: '2026-09-01T10:00:00Z' }
                  }
                }))
              }), { status: 200 });
            }
            if (u.includes('/online_inquiries/' + id)) {
              return new Response(JSON.stringify({
                fields: {
                  category: { stringValue: fixture.category },
                  disease: { stringValue: fixture.disease || '' },
                  title: { stringValue: fixture.title },
                  region: { stringValue: '경기광주' },
                  content: { stringValue: '테스트 문의 본문입니다.' },
                  status: { stringValue: 'answered' },
                  answer: { stringValue: '테스트 원장 답변입니다.' }
                }
              }), { status: 200 });
            }
            return prevFetch(url, options);
          };
          const response = await handleInquirySSR({
            request: new Request('https://healimbd.com/inquiry/' + id + '/'),
            env: mockEnv,
            params: { id }
          });
          assert.strictEqual(response.status, 200, fixture.title);
          const html = await response.text();
          const prefix = fixture.topic ? '경기광주 ' + fixture.topic + ' 상담' : '경기광주 상담';
          const expectedTitle = '[' + prefix + '] ' + fixture.title + ' | 해아림한의원 분당점';
          assert.ok(html.includes('<title>' + expectedTitle + '</title>'), fixture.title + ': wrong SEO topic');
          assert.ok(html.includes('property="og:title" content="' + expectedTitle + '"'), fixture.title + ': wrong OG topic');
          assert.ok(html.includes('>' + fixture.title + '</h1>'), 'Patient title must remain unchanged');
          assert.ok(html.includes('테스트 문의 본문입니다.') && html.includes('테스트 원장 답변입니다.'), 'Original content and answer must remain in HTML');
          assert.strictEqual(response.headers.get('x-robots-tag'), 'index, follow');
          const label = fixture.route === '/guide/'
            ? '분당점 진료과목·예약 안내 자세히 보기 →'
            : fixture.topic + ' 증상·검사·치료 안내 자세히 보기 →';
          assert.ok(html.includes('href="' + fixture.route + '" style="color:#0369A1;font-weight:700;text-decoration:none;">' + label + '</a>'), fixture.title + ': wrong guidance link or misleading label');
          assert.ok(!html.includes('/conditions/depression/') && !html.includes('/conditions/ocd/'), 'Unavailable disease detail routes must never be emitted');
          const schemaText = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1];
          const schema = JSON.parse(schemaText);
          const page = schema['@graph'].find(item => Array.isArray(item['@type']) && item['@type'].includes('MedicalWebPage'));
          assert.strictEqual(page.name, expectedTitle, 'Structured page title must match');
          if (fixture.topic) {
            assert.strictEqual(page.about.name, fixture.topic, 'Structured condition topic must match the title');
            assert.ok(html.includes('>' + fixture.topic + '</span>'), 'Displayed condition must use the same topic');
          }
          if (fixture.topic === '강박증') {
            assert.ok(html.includes('/inquiry/inq_related_ocd/'));
            assert.ok(html.includes('/inquiry/inq_related_ocd_alias/'), 'Equivalent explicit metadata must match across board labels');
            assert.ok(!html.includes('/inquiry/inq_related_depression/'), 'OCD must not list depression as the same condition');
            assert.ok(!html.includes('/inquiry/inq_related_pending_ocd/'), 'Unanswered inquiries must remain excluded');
          }
          if (fixture.topic === '미주신경성 실신') {
            assert.ok(html.includes('/inquiry/inq_related_syncope/'));
            assert.ok(!html.includes('/inquiry/inq_related_dizziness/'), 'Generic dizziness must not be treated as syncope');
          }
          if (fixture.topic === '두통·어지럼증') {
            assert.ok(!html.includes('href="/conditions/syncope/"'), 'Symptoms alone must not generate a syncope link');
          }
        }
        console.log('✅ PASS: 9 available disease routes, ambiguous topics, explicit metadata, and related question separation verified.');
        passed++;
      } finally {
        globalThis.fetch = prevFetch;
      }
    }

    // --- Test 5: Pending Inquiry SSR (HTTP 200 & noindex,follow) ---
    console.log('\n--- 5. Pending Inquiry SSR Test (HTTP 200 & noindex,follow) ---');
    {
      const pendingId = 'inq_pending_test_500';

      const prevFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        const u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.includes(`/online_inquiries/${pendingId}`)) {
          return new Response(JSON.stringify({
            fields: {
              region: { stringValue: '성남' },
              category: { stringValue: 'sleep' },
              title: { stringValue: '잠을 잘 못 자요' },
              content: { stringValue: '불면증 상담 문의합니다.' },
              status: { stringValue: 'pending' },
              createdAt: { timestampValue: '2026-09-07T01:00:00Z' }
            }
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return prevFetch(url, options);
      };

      try {
        const context = {
          request: new Request(`https://healimbd.com/inquiry/${pendingId}/`),
          env: mockEnv,
          params: { id: pendingId }
        };

        const response = await handleInquirySSR(context);
        assert.strictEqual(response.status, 200, 'Pending inquiry must return 200 OK');
        const html = await response.text();

        assert.ok(html.includes('<meta name="robots" content="noindex,follow">'), 'Pending inquiry must be noindex,follow');
        assert.strictEqual(response.headers.get('x-robots-tag'), 'noindex, follow', 'Pending inquiry response header must also be noindex, follow');
        assert.ok(html.includes('답변대기'), 'Status badge must show 답변대기');

        console.log('✅ PASS: Pending inquiry SSR verified with noindex,follow.');
        passed++;
      } finally {
        globalThis.fetch = prevFetch;
      }
    }

    // --- Test 6: Dynamic XML Sitemap Filter Test ---
    console.log('\n--- 6. Dynamic XML Sitemap Filter Test (Purged Samples OUT, Pending OUT, Answered IN) ---');
    {
      const prevFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        const u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.includes('online_inquiries?pageSize=300')) {
          return new Response(JSON.stringify({
            documents: [
              // 1. Live Answered inquiry (MUST be in sitemap)
              {
                name: 'projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_1788331095408',
                fields: {
                  title: { stringValue: '실제 운영 답변완료 글' },
                  status: { stringValue: 'answered' },
                  answer: { stringValue: '원장 답변이 등록되었습니다.' },
                  answeredAt: { timestampValue: '2026-09-06T10:00:00Z' }
                }
              },
              // 2. Status says answered but no answer body (MUST be EXCLUDED)
              {
                name: 'projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_empty_answer_test_201',
                fields: {
                  title: { stringValue: '답변 본문이 비어 있는 글' },
                  status: { stringValue: 'answered' },
                  answer: { stringValue: '' },
                  createdAt: { timestampValue: '2026-09-07T00:00:00Z' }
                }
              },
              // 3. Live Pending inquiry (MUST be EXCLUDED)
              {
                name: 'projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_pending_test_200',
                fields: {
                  title: { stringValue: '답변 대기 중인 질문' },
                  status: { stringValue: 'pending' },
                  createdAt: { timestampValue: '2026-09-07T01:00:00Z' }
                }
              }
            ]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return prevFetch(url, options);
      };

      try {
        const context = {
          request: new Request('https://healimbd.com/sitemap-inquiry.xml'),
          env: mockEnv
        };

        const response = await handleSitemapXML(context);
        assert.strictEqual(response.status, 200, 'Sitemap must return 200 OK');
        const xml = await response.text();

        // Check purged samples are 0 count
        assert.ok(!xml.includes('inq_01_autonomic'), 'Sample inq_01 must NOT be in sitemap');
        assert.ok(!xml.includes('inq_02_adhd'), 'Sample inq_02 must NOT be in sitemap');
        assert.ok(!xml.includes('inq_03_sleep'), 'Sample inq_03 must NOT be in sitemap');
        assert.ok(!xml.includes('inq_04_tic'), 'Sample inq_04 must NOT be in sitemap');

        // Check live answered inquiry is IN
        assert.ok(xml.includes('https://healimbd.com/inquiry/inq_1788331095408/'), 'Live answered inquiry must be in sitemap');

        // Check live pending inquiry is OUT
        assert.ok(!xml.includes('inq_pending_test_200'), 'Pending inquiry must NOT be in sitemap');
        assert.ok(!xml.includes('inq_empty_answer_test_201'), 'Inquiry without an answer body must NOT be in sitemap');

        console.log('✅ PASS: Sitemap has 0 sample posts, includes live answered, and excludes pending.');
        passed++;
      } finally {
        globalThis.fetch = prevFetch;
      }
    }

    // --- Test 7: Inquiry List SSR Discovery & Pagination ---
    console.log('\n--- 7. Inquiry List SSR Discovery & Pagination Test ---');
    {
      const prevFetch = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        const u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.includes('online_inquiries?pageSize=300')) {
          const documents = Array.from({ length: 12 }, (_, index) => ({
            name: `projects/healimbd-b726f/databases/(default)/documents/online_inquiries/inq_ssr_${index + 1}`,
            fields: {
              region: { stringValue: index % 2 === 0 ? '용인' : '분당' },
              ageText: { stringValue: '초등학생' },
              gender: { stringValue: 'male' },
              category: { stringValue: 'tic' },
              title: { stringValue: `공개 틱장애 상담 ${index + 1}` },
              status: { stringValue: index === 0 ? 'pending' : 'answered' },
              answer: { stringValue: index === 0 ? '' : '원장 답변' },
              createdAt: { timestampValue: `2026-09-${String(index + 1).padStart(2, '0')}T10:00:00Z` }
            }
          }));
          return new Response(JSON.stringify({ documents }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return prevFetch(url, options);
      };

      try {
        // Hugo minifies production attributes without quotes, so the injector must support that exact shape.
        const assetHtml = '<!doctype html><html><head><link rel=canonical href=https://healimbd.com/inquiry/><meta property=og:url content=https://healimbd.com/inquiry/></head><body><table><tbody id=inquiry-list-tbody></tbody></table><nav class=inquiry-pagination-nav id=inquiry-pagination-nav></nav></body></html>';
        const response = await handleInquiryListSSR({
          request: new Request('https://healimbd.com/inquiry/?page=2'),
          env: {
            ...mockEnv,
            ASSETS: { fetch: async () => new Response(assetHtml, { status: 200 }) }
          }
        });
        assert.strictEqual(response.status, 200);
        const html = await response.text();
        assert.ok(html.includes('data-ssr-inquiry="true"'), 'List HTML must contain server-rendered inquiry rows');
        assert.ok(html.includes('href="/inquiry/inq_ssr_2/"'), 'Older inquiry must remain crawlable on page 2');
        assert.ok(html.includes('href="/inquiry/?page=1"'), 'Pagination must use crawlable href links');
        assert.ok(html.includes('canonical" href="https://healimbd.com/inquiry/?page=2"'), 'Paginated page must self-canonicalize');
        console.log('✅ PASS: Existing inquiries are crawlable through SSR rows and real pagination links.');
        passed++;
      } finally {
        globalThis.fetch = prevFetch;
      }
    }

    console.log(`\n🎉 ALL ${passed} INQUIRY SSR & SITEMAP TESTS PASSED 100%!`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
