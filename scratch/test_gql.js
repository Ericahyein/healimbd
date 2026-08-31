const https = require('https');

const query = JSON.stringify({
  query: `query getVisitorReviews($input: VisitorReviewsInput!) {
    visitorReviews(input: $input) {
      items {
        id
        rating
        author {
          nickname
          id
        }
        body
        created
        visited
        representativeVisitDateTime
        votedKeywords {
          code
          iconUrl
          name
          userSelectCount
        }
      }
      total
    }
  }`,
  variables: {
    input: {
      businessId: "1272285133",
      businessType: "hospital",
      page: 1,
      size: 50,
      isPhotoUsed: false
    }
  }
});

const req = https.request({
  hostname: 'api.place.naver.com',
  port: 443,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(query),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Origin': 'https://pcmap.place.naver.com',
    'Referer': 'https://pcmap.place.naver.com/'
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body.substring(0, 1000));
  });
});

req.on('error', e => console.error(e));
req.write(query);
req.end();
