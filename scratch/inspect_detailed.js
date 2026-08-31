const fs = require('fs');

const reviews = JSON.parse(fs.readFileSync('scratch/formatted_real_reviews.json', 'utf-8'));

// Filter only the real reviews with full text or meaningful content
const detailedReviews = reviews.filter(r => r.summary && r.summary.length > 20);

console.log(`Detailed real reviews count: ${detailedReviews.length}`);
detailedReviews.forEach((r, idx) => {
  console.log(`\n=== Review #${idx + 1} ===`);
  console.log(`Author: ${r.author} (${r.rawAuthor}) | Date: ${r.date} | Category: ${r.categoryName}`);
  console.log(`Title: ${r.title}`);
  console.log(`Keywords: ${r.keywords.join(', ')}`);
  console.log(`Summary: ${r.summary}`);
});
