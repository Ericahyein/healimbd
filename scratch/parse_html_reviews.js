const fs = require('fs');

const html = fs.readFileSync('scratch/naver_place.html', 'utf-8');

// Find all script contents or JSON blobs
const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log('Total script tags:', scripts.length);

scripts.forEach((s, idx) => {
  if (s.includes('visitorReviews') || s.includes('review') || s.includes('방문자리뷰') || s.includes('친절해요') || s.includes('nickname')) {
    console.log(`Script ${idx} matched! Length: ${s.length}`);
    fs.writeFileSync(`scratch/script_${idx}.txt`, s, 'utf-8');
  }
});
