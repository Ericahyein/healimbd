const fs = require('fs');
const https = require('https');

// Extract all reviews from the APOLLO_STATE in script_4.txt
const content = fs.readFileSync('scratch/script_4.txt', 'utf-8');
const apolloMatch = content.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);

let initialReviews = [];
if (apolloMatch) {
  const apollo = JSON.parse(apolloMatch[1]);
  Object.keys(apollo).forEach(k => {
    if (k.startsWith('VisitorReview:')) {
      const item = apollo[k];
      initialReviews.push(item);
    }
  });
}
console.log(`Extracted ${initialReviews.length} initial reviews from Apollo state!`);

// Function to fetch more pages using Cookie/Header from the successful request
async function fetchAllPages() {
  const allReviews = [...initialReviews];
  console.log('Sample parsed review item:');
  if (initialReviews.length > 0) {
    console.log(JSON.stringify(initialReviews[0], null, 2));
  }
  
  // Format and save the real reviews JSON
  fs.writeFileSync('scratch/real_naver_reviews.json', JSON.stringify(initialReviews, null, 2), 'utf-8');
}

fetchAllPages();
