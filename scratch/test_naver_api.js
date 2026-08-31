const https = require('https');
const fs = require('fs');

async function testEndpoint(name, url, method = 'GET', postData = null, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://m.place.naver.com',
        'Referer': 'https://m.place.naver.com/hospital/1272285133/review/visitor',
        ...headers
      }
    };

    if (postData) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${name}] Status: ${res.statusCode}, Length: ${data.length}`);
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (e) => {
      console.log(`[${name}] Error: ${e.message}`);
      resolve({ error: e.message });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  // Test 1: REST endpoint
  await testEndpoint('REST v1', 'https://m.place.naver.com/rest/hospital/1272285133/review/visitor?page=1&size=30');
  
  // Test 2: GraphQL endpoint on pcmap-api
  const gqlQuery = JSON.stringify([
    {
      operationName: "getVisitorReviews",
      variables: {
        input: {
          businessId: "1272285133",
          businessType: "hospital",
          page: 1,
          size: 50,
          isPhotoUsed: false
        }
      },
      query: "query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { items { id rating author { nickname id } body created media { type url } highlightReviewContent } total count } }"
    }
  ]);
  
  await testEndpoint('GQL pcmap', 'https://pcmap-api.place.naver.com/graphql', 'POST', gqlQuery, {
    'Origin': 'https://pcmap.place.naver.com',
    'Referer': 'https://pcmap.place.naver.com/hospital/1272285133/review/visitor'
  });

  // Test 3: GraphQL endpoint on api.place.naver.com
  await testEndpoint('GQL api.place', 'https://api.place.naver.com/graphql', 'POST', gqlQuery, {
    'Origin': 'https://m.place.naver.com',
    'Referer': 'https://m.place.naver.com/hospital/1272285133/review/visitor'
  });
}

run();
