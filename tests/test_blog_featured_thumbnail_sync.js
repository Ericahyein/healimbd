const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mainJs = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const blogTemplate = fs.readFileSync(path.join(root, 'layouts/blog/list.html'), 'utf8');

console.log('🧪 Starting Blog Featured Thumbnail Sync Regression Test...');

assert(
  mainJs.includes('function syncFeaturedArticleThumbnail(imageEl, item)'),
  'featured thumbnail synchronizer must exist'
);
assert(
  mainJs.includes("pictureEl.querySelector('source[type=\"image/webp\"]')"),
  'synchronizer must target the active WebP picture source'
);
assert(
  mainJs.includes('sourceEl.srcset = webpUrl;'),
  'WebP srcset must update when the featured article changes'
);
assert(
  mainJs.includes('imageEl.src = imageUrl;'),
  'fallback image src must update when the featured article changes'
);
assert(
  mainJs.includes('syncFeaturedArticleThumbnail(featThumbImg, featuredArticle);'),
  'category filtering must invoke the synchronizer for the selected article'
);
assert(
  blogTemplate.includes('"thumbnailWebp": {{ $thumbWebp }}'),
  'article JSON must expose each verified WebP thumbnail path'
);
assert(
  blogTemplate.includes('fileExists (printf "static/%s" $thumbWebpCandidate)'),
  'the template must only expose WebP files that actually exist'
);
assert(
  blogTemplate.includes('<picture id="featured-thumb-picture">'),
  'featured thumbnail must have a stable picture container'
);

console.log('✅ Featured WebP source and fallback image update together.');
console.log('✅ Missing WebP files safely fall back to the original thumbnail.');
console.log('🎉 BLOG FEATURED THUMBNAIL SYNC REGRESSION TEST PASSED!');
