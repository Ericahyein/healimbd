const https = require('https');
const fs = require('fs');

const url = 'https://m.place.naver.com/rest/hospital/1272285133/review/visitor?page=1&size=30';
const u = new URL(url);

const req = https.request({
  hostname: u.hostname,
  port: 443,
  path: u.pathname + u.search,
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://m.place.naver.com/hospital/1272285133/review/visitor'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Data starts with:', data.substring(0, 300));
    fs.writeFileSync('scratch/rest_v1_output.txt', data, 'utf-8');
    
    // Look for Apollo or JSON
    const apolloMatch = data.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});<\/script>/);
    if (apolloMatch) {
      console.log('Found APOLLO_STATE in rest v1! Length:', apolloMatch[1].length);
      fs.writeFileSync('scratch/apollo_rest_v1.json', apolloMatch[1], 'utf-8');
    }
  });
});

req.end();
