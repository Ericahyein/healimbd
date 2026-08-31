const fs = require('fs');
const https = require('https');

const options = {
  hostname: 'm.place.naver.com',
  port: 443,
  path: '/hospital/1272285133/review/visitor',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('scratch/naver_place.html', data, 'utf-8');
    console.log('Saved naver_place.html, length:', data.length);
    
    // Check for apollo state
    const match = data.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});<\/script>/);
    if (match) {
      console.log('Found APOLLO_STATE! Length:', match[1].length);
      fs.writeFileSync('scratch/apollo_state.json', match[1], 'utf-8');
      
      try {
        const apollo = JSON.parse(match[1]);
        const keys = Object.keys(apollo);
        console.log('Total Apollo Keys:', keys.length);
        
        // Find review keys
        const reviewKeys = keys.filter(k => k.toLowerCase().includes('review') || k.toLowerCase().includes('visitor'));
        console.log('Review-related keys:', reviewKeys.slice(0, 20));
      } catch (e) {
        console.error('Failed to parse Apollo JSON:', e.message);
      }
    } else {
      console.log('No APOLLO_STATE found.');
      const nextMatch = data.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextMatch) {
        console.log('Found NEXT_DATA! Length:', nextMatch[1].length);
        fs.writeFileSync('scratch/next_data.json', nextMatch[1], 'utf-8');
      }
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.end();
