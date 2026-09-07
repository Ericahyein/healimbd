// Comprehensive Test Suite for Inquiry SSR Edge Function & Dynamic Sitemap Indexing
import assert from 'assert';
import crypto from 'crypto';
import { onRequestGet as handleInquirySSR, buildSeoTitle, getRepresentativeDisease } from '../functions/inquiry/[id].js';
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

        // Check doctor answer
        assert.ok(html.includes('손지웅 대표원장입니다'), 'Doctor answer must be in raw HTML');

        console.log('✅ PASS: Answered inquiry SSR verified with SEO title, raw on-screen H1, and index,follow.');
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
                  answeredAt: { timestampValue: '2026-09-06T10:00:00Z' }
                }
              },
              // 2. Live Pending inquiry (MUST be EXCLUDED)
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

        console.log('✅ PASS: Sitemap has 0 sample posts, includes live answered, and excludes pending.');
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
