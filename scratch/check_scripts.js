const fs = require('fs');
const html = fs.readFileSync('public/reviews/index.html', 'utf-8');
const scripts = html.match(/<script[^>]*src="[^"]+"[^>]*><\/script>/g);
console.log('Generated script tags:', scripts);
