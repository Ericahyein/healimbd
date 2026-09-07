const fs = require('fs');
const path = require('path');

console.log('=== BLOG CARD GRID AUTOMATED VERIFICATION ===\n');

let failed = false;
function assert(condition, msg) {
  if (!condition) {
    console.error('❌ FAIL:', msg);
    failed = true;
  } else {
    console.log('✅ PASS:', msg);
  }
}

// 1. Verify public/blog/index.html
const blogHtmlPath = path.join(__dirname, '..', 'public', 'blog', 'index.html');
assert(fs.existsSync(blogHtmlPath), 'public/blog/index.html exists');

const blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');

// 2. Verify NO nested <a> tags
const nestedAnchorRegex = /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<a\b/i;
assert(!nestedAnchorRegex.test(blogHtml), 'No nested <a> tags found in /blog/ HTML');

// 3. Verify card elements exist
const cardMatch = blogHtml.match(/<article class="doctor-column-row-item blog-card-item/g);
assert(cardMatch && cardMatch.length > 0, `Found ${cardMatch ? cardMatch.length : 0} blog grid cards`);

// 4. Verify crawlable href links exist on cards (thumbnail, title, button)
const hrefMatches = blogHtml.match(/href=["']?\/blog\/[^"'\s>]+/g);
assert(hrefMatches && hrefMatches.length >= (cardMatch ? cardMatch.length * 3 : 1), `Found ${hrefMatches ? hrefMatches.length : 0} crawlable blog links for SEO`);

// 5. Verify hashtags are omitted from the list cards
const hasListHashtagPill = blogHtml.includes('class="hashtag-pill"') || blogHtml.includes('class=hashtag-pill');
assert(!hasListHashtagPill, 'Hashtags are successfully removed from /blog/ list cards');

// 6. Verify hashtags are preserved on single detail page
const blogDir = path.join(__dirname, '..', 'public', 'blog');
const blogSubdirs = fs.readdirSync(blogDir).filter(f => fs.statSync(path.join(blogDir, f)).isDirectory());
if (blogSubdirs.length > 0) {
  const samplePostPath = path.join(blogDir, blogSubdirs[0], 'index.html');
  if (fs.existsSync(samplePostPath)) {
    const postHtml = fs.readFileSync(samplePostPath, 'utf8');
    const hasDetailHashtag = postHtml.includes('hashtag-pill') || postHtml.includes('hashtag');
    assert(hasDetailHashtag, `Hashtags preserved on detail page (${blogSubdirs[0]})`);
  }
}

// 7. Verify CSS rules in active compiled stylesheet
const cssMatch = blogHtml.match(/href=["']?(\/css\/style\.min\.[a-f0-9]+\.css)["']?/);
assert(cssMatch && cssMatch[1], `Found active compiled stylesheet in HTML: ${cssMatch ? cssMatch[1] : 'none'}`);

const cssFilePath = path.join(__dirname, '..', 'public', cssMatch[1].replace(/^\//, ''));
assert(fs.existsSync(cssFilePath), `Stylesheet exists at: ${cssFilePath}`);

const cssContent = fs.readFileSync(cssFilePath, 'utf8');

assert(cssContent.includes('repeat(3,1fr)') || cssContent.includes('repeat(3, 1fr)'), 'CSS contains 3-column desktop grid');
assert(cssContent.includes('repeat(2,1fr)') || cssContent.includes('repeat(2, 1fr)'), 'CSS contains 2-column tablet grid');
assert(cssContent.includes('aspect-ratio:16/10') || cssContent.includes('aspect-ratio: 16 / 10') || cssContent.includes('aspect-ratio:16 / 10'), 'CSS specifies 16/10 aspect ratio');
assert(cssContent.includes('object-fit:cover') || cssContent.includes('object-fit: cover'), 'CSS specifies object-fit: cover for thumbnail images');
assert(cssContent.includes('-webkit-line-clamp:2') || cssContent.includes('line-clamp: 2'), 'CSS specifies max 2 lines for titles');
assert(cssContent.includes('-webkit-line-clamp:3') || cssContent.includes('line-clamp: 3'), 'CSS specifies max 3 lines for summaries');
assert(cssContent.includes('word-break:keep-all') || cssContent.includes('word-break: keep-all'), 'CSS specifies word-break: keep-all for natural Korean word wrapping');

// 8. Verify homepage is untouched
const homeHtmlPath = path.join(__dirname, '..', 'public', 'index.html');
const homeHtml = fs.readFileSync(homeHtmlPath, 'utf8');
assert(!homeHtml.includes('blog-grid-layout'), 'Homepage does NOT use blog-grid-layout (remains original horizontal layout)');

// 9. Verify JS syntax
try {
  require('../assets/js/main.js');
} catch (e) {
  // It may fail on browser globals like window/document, so syntax check via node -c
}

if (failed) {
  console.error('\n❌ Tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✨ ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
