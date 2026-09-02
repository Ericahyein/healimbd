const fs = require('fs');
const path = require('path');

/**
 * Scans existing blog markdown files in content/blog/ (Read-Only)
 * and returns matching internal link candidates.
 */
function getExistingBlogPosts(blogDir) {
  const targetDir = blogDir || path.join(__dirname, '../../content/blog');
  if (!fs.existsSync(targetDir)) return [];

  const files = fs.readdirSync(targetDir);
  const posts = [];

  for (const file of files) {
    if (!file.endsWith('.md') || file === '_index.md') continue;
    const filePath = path.join(targetDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const titleMatch = content.match(/^title:\s*["']?([^"'\n\r]+)["']?/m);
    const categoryMatch = content.match(/^category:\s*["']?([^"'\n\r]+)["']?/m);

    const slug = file.replace(/\.md$/, '');
    posts.push({
      slug,
      url: `/blog/${slug}/`,
      title: titleMatch ? titleMatch[1].trim() : slug,
      category: categoryMatch ? categoryMatch[1].trim() : 'general'
    });
  }

  return posts;
}

/**
 * Returns 2~4 recommended internal link suggestions for the target disease
 */
function getRecommendedInternalLinks(diseaseCategory, currentSlug, blogDir) {
  const allPosts = getExistingBlogPosts(blogDir);
  const candidates = allPosts.filter(p => p.slug !== currentSlug);

  // 1. Same category matches
  const sameCat = candidates.filter(p => p.category === diseaseCategory);
  // 2. Related categories
  const otherCat = candidates.filter(p => p.category !== diseaseCategory);

  const selected = [...sameCat.slice(0, 2), ...otherCat.slice(0, 2)].slice(0, 3);
  return selected;
}

module.exports = {
  getExistingBlogPosts,
  getRecommendedInternalLinks
};
