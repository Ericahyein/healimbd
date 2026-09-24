const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT } = require('./thumbnail_engine');

async function runPrePublishCheck() {
  console.log('🔍 Starting Doctor Column Pre-Publish Validation...');

  // 1. Read history file to get current published slug
  const historyPath = path.join(__dirname, '../../data/auto_column_history.json');
  if (!fs.existsSync(historyPath)) {
    throw new Error(`❌ Missing history file: ${historyPath}`);
  }
  const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  if (!Array.isArray(history) || history.length === 0) {
    throw new Error('❌ History is empty or invalid array.');
  }
  const latestEntry = history[history.length - 1];
  const slug = latestEntry.slug ? latestEntry.slug.trim() : null;
  if (!slug) {
    throw new Error('❌ Latest history entry does not have a valid slug.');
  }
  console.log(`📌 Checking latest column slug: ${slug}`);

  // 2. Read Markdown file and check front matter
  const mdPath = path.join(__dirname, `../../content/blog/${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    throw new Error(`❌ Markdown file does not exist: ${mdPath}`);
  }
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const frontMatterMatch = mdContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontMatterMatch) {
    throw new Error('❌ Markdown does not contain valid YAML front matter.');
  }
  const frontMatter = frontMatterMatch[1];
  const imageMatch = frontMatter.match(/^image:\s*["']?([^"'\r\n]+)["']?/m);
  if (!imageMatch || !imageMatch[1].trim()) {
    throw new Error('❌ Front matter "image" field is missing or empty.');
  }
  const imageRelPath = imageMatch[1].trim();
  console.log(`  ✅ Front matter image field found: ${imageRelPath}`);

  // 3. Check referenced image exists in static/
  const staticImagePath = path.join(__dirname, '../../static', imageRelPath);
  if (!fs.existsSync(staticImagePath)) {
    throw new Error(`❌ Referenced image file not found in static: ${staticImagePath}`);
  }
  console.log(`  ✅ Static image file exists: ${staticImagePath}`);

  // 4. Decode image and check dimensions / MIME format
  const metadata = await sharp(staticImagePath).metadata();
  console.log(`  ✅ Image decoded: format=${metadata.format}, width=${metadata.width}, height=${metadata.height}`);
  if (!metadata.width || metadata.width <= 0 || !metadata.height || metadata.height <= 0) {
    throw new Error(`❌ Invalid image dimensions: width=${metadata.width}, height=${metadata.height}`);
  }
  if (metadata.width !== THUMBNAIL_WIDTH || metadata.height !== THUMBNAIL_HEIGHT) {
    throw new Error(`❌ Thumbnail must be exactly ${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}, received ${metadata.width}x${metadata.height}.`);
  }
  const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
  if (!allowedFormats.includes(metadata.format)) {
    throw new Error(`❌ Disallowed image format: ${metadata.format} (allowed: ${allowedFormats.join(', ')})`);
  }

  // 5. If WebP counterpart exists, verify it as well
  const staticWebpPath = staticImagePath.replace(/\.jpe?g$/i, '.webp');
  if (fs.existsSync(staticWebpPath)) {
    const webpMeta = await sharp(staticWebpPath).metadata();
    if (webpMeta.format !== 'webp' || webpMeta.width !== THUMBNAIL_WIDTH || webpMeta.height !== THUMBNAIL_HEIGHT) {
      throw new Error(`❌ Invalid WebP counterpart: ${staticWebpPath}`);
    }
    console.log(`  ✅ WebP counterpart verified: format=webp, width=${webpMeta.width}, height=${webpMeta.height}`);
  }

  // 6. Check Hugo public build output
  const publicImagePath = path.join(__dirname, '../../public', imageRelPath);
  if (!fs.existsSync(publicImagePath)) {
    throw new Error(`❌ Image not found in public build output: ${publicImagePath}. (Run hugo first)`);
  }
  console.log(`  ✅ Public image build output confirmed: ${publicImagePath}`);

  // 7. Verify rendered HTML of Featured Article in public/blog/index.html
  const blogIndexPath = path.join(__dirname, '../../public/blog/index.html');
  if (!fs.existsSync(blogIndexPath)) {
    throw new Error(`❌ public/blog/index.html not found: ${blogIndexPath}`);
  }
  const blogHtml = fs.readFileSync(blogIndexPath, 'utf-8');
  const featuredArticleMatch = blogHtml.match(/<article class=featured-article-item[^>]*>[\s\S]*?<\/article>/);
  if (!featuredArticleMatch) {
    throw new Error('❌ Featured Article element not found in public/blog/index.html');
  }
  const featuredHtml = featuredArticleMatch[0];

  // Check if featured article references the slug and image
  if (!featuredHtml.includes(slug)) {
    throw new Error(`❌ Featured Article does not link to latest slug: ${slug}`);
  }

  // If source tag with webp is present, verify webp file exists in public
  const sourceWebpMatch = featuredHtml.match(/<source\s+srcset=([^ >]+)\s+type=image\/webp>/);
  if (sourceWebpMatch) {
    const webpUrl = sourceWebpMatch[1].replace(/["']/g, '');
    const cleanWebp = webpUrl.startsWith('/') ? webpUrl.slice(1) : webpUrl;
    const publicWebpPath = path.join(__dirname, '../../public', cleanWebp);
    if (!fs.existsSync(publicWebpPath)) {
      throw new Error(`❌ Featured Article specifies WebP source (${webpUrl}), but file does not exist: ${publicWebpPath}`);
    }
    console.log(`  ✅ Featured Article WebP source verified: ${publicWebpPath}`);
  }

  // Check img src tag exists in public
  const imgMatch = featuredHtml.match(/<img\s+src=([^ >]+)/);
  if (!imgMatch) {
    throw new Error('❌ Featured Article does not have an <img> tag.');
  }
  const imgUrl = imgMatch[1].replace(/["']/g, '');
  const cleanImg = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
  const targetPublicImg = path.join(__dirname, '../../public', cleanImg);
  if (!fs.existsSync(targetPublicImg)) {
    throw new Error(`❌ Featured Article <img> src (${imgUrl}) does not exist in public: ${targetPublicImg}`);
  }
  console.log(`  ✅ Featured Article <img> src verified in public: ${targetPublicImg}`);

  console.log('🎉 ALL PRE-PUBLISH VALIDATIONS PASSED! Safe to commit and publish.');
}

if (require.main === module) {
  runPrePublishCheck().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runPrePublishCheck };
