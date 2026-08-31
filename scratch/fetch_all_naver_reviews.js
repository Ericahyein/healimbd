const https = require('https');
const fs = require('fs');

async function fetchReviews(page = 1, size = 50) {
  return new Promise((resolve) => {
    const url = `https://m.place.naver.com/rest/hospital/1272285133/review/visitor?page=${page}&size=${size}&isPhotoUsed=false&sort=recent`;
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://m.place.naver.com/hospital/1272285133/review/visitor'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error(`Page ${page} JSON parse error:`, e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Page ${page} Request error:`, e.message);
      resolve(null);
    });

    req.end();
  });
}

async function getAllReviews() {
  console.log('Fetching Page 1...');
  const page1 = await fetchReviews(1, 50);
  if (!page1) {
    console.log('Failed to fetch page 1');
    return;
  }

  fs.writeFileSync('scratch/naver_rest_page1.json', JSON.stringify(page1, null, 2), 'utf-8');
  console.log('Page 1 keys:', Object.keys(page1));
  if (page1.total) console.log('Total reviews in Naver:', page1.total);
  if (page1.items) console.log('Page 1 items count:', page1.items.length);

  let allItems = page1.items || [];
  let page = 2;
  const total = page1.total || 150;

  while (allItems.length < total && page <= 10) {
    console.log(`Fetching Page ${page}... (Current collected: ${allItems.length})`);
    const res = await fetchReviews(page, 50);
    if (!res || !res.items || res.items.length === 0) {
      console.log(`No more items at page ${page}`);
      break;
    }
    allItems = allItems.concat(res.items);
    page++;
    // Polite delay
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`Total collected reviews across all pages: ${allItems.length}`);
  fs.writeFileSync('scratch/all_naver_rest_reviews.json', JSON.stringify(allItems, null, 2), 'utf-8');
}

getAllReviews();
