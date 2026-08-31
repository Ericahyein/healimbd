const fs = require('fs');

const content = fs.readFileSync('scratch/script_4.txt', 'utf-8');
const apolloMatch = content.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);
const apollo = JSON.parse(apolloMatch[1]);

console.log('All VisitorReview IDs:');
const reviews = [];
Object.keys(apollo).forEach(k => {
  if (k.startsWith('VisitorReview:')) {
    reviews.push(apollo[k]);
  }
});

console.log(`Total VisitorReviews in Apollo: ${reviews.length}`);
reviews.forEach((r, idx) => {
  console.log(`\n[${idx + 1}] ID: ${r.id} | Visited: ${r.visited} | Created: ${r.created}`);
  console.log(`Body: ${r.body || '(No text body - keyword only review)'}`);
  if (r.visitCategories) {
    console.log('Categories:', JSON.stringify(r.visitCategories));
  }
});
