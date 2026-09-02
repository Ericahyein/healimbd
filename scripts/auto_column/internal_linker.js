const fs = require('fs');
const path = require('path');

const CORE_PAGES = [
  {
    title: '해아림한의원 주요 진료과목 안내',
    url: '/treatments/',
    category: 'general'
  },
  {
    title: '온라인 상담 및 진료 예약 안내',
    url: '/inquiry/',
    category: 'general'
  },
  {
    title: '해아림한의원 진료 철학 및 의료진 소개',
    url: '/philosophy/',
    category: 'general'
  },
  {
    title: '환자분들의 솔직한 치료 후기',
    url: '/reviews/',
    category: 'general'
  }
];

/**
 * Scans existing blog markdown files in content/blog/ (Read-Only)
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

    let rawTitle = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
    
    // Clean title for natural cross-article linking:
    // Remove regional prefix [지역 질환] and sanitize legacy overclaim phrases
    let cleanTitle = rawTitle.replace(/^\[[가-힣\s]+\]\s*/, '');
    cleanTitle = cleanTitle.replace(/근본\s*치료법?/g, '한방 관리법');

    const slug = file.replace(/\.md$/, '');
    posts.push({
      slug,
      url: `/blog/${slug}/`,
      title: cleanTitle,
      category: categoryMatch ? categoryMatch[1].trim() : 'general'
    });
  }

  return posts;
}

/**
 * Validates if an internal URL exists in the website content structure
 */
function isInternalUrlValid(url, baseDir) {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.split('#')[0].split('?')[0].replace(/\/$/, '');

  // 1. Core pages check
  if (CORE_PAGES.some(p => p.url.replace(/\/$/, '') === cleanUrl)) {
    return true;
  }

  // 2. Blog post check
  const blogMatch = cleanUrl.match(/^\/blog\/([a-zA-Z0-9_-]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const blogPath = path.join(baseDir || path.join(__dirname, '../../content/blog'), `${slug}.md`);
    return fs.existsSync(blogPath);
  }

  return false;
}

/**
 * Returns 2~4 recommended internal link suggestions for the target disease
 */
function getRecommendedInternalLinks(diseaseCategory, currentSlug, blogDir) {
  const allBlogPosts = getExistingBlogPosts(blogDir);
  const candidates = allBlogPosts.filter(p => p.slug !== currentSlug);

  // 1. Same category blog matches
  const sameCat = candidates.filter(p => p.category === diseaseCategory || p.category.includes(diseaseCategory));
  // 2. Related category blog posts
  const otherCat = candidates.filter(p => p.category !== diseaseCategory && !p.category.includes(diseaseCategory));

  const selected = [];

  if (sameCat.length > 0) {
    selected.push(...sameCat.slice(0, 2));
  }

  if (otherCat.length > 0 && selected.length < 3) {
    selected.push(...otherCat.slice(0, 3 - selected.length));
  }

  // Fill with core site pages if needed to guarantee at least 2~3 verified links
  if (selected.length < 2) {
    for (const core of CORE_PAGES) {
      if (selected.length >= 3) break;
      if (!selected.some(s => s.url === core.url)) {
        selected.push(core);
      }
    }
  }

  return selected.slice(0, 4);
}

module.exports = {
  CORE_PAGES,
  getExistingBlogPosts,
  isInternalUrlValid,
  getRecommendedInternalLinks
};
