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

const DISEASE_RELEVANCE_MAP = {
  tic: ['tic', 'adhd', 'child', 'sleep'],
  adhd: ['adhd', 'tic', 'child', 'sleep'],
  child: ['child', 'tic', 'adhd', 'sleep'],
  panic: ['panic', 'anxiety', 'autonomic', 'sleep', 'syncope'],
  anxiety: ['anxiety', 'panic', 'autonomic', 'sleep', 'depression'],
  sleep: ['sleep', 'anxiety', 'panic', 'depression', 'autonomic'],
  autonomic: ['autonomic', 'panic', 'anxiety', 'syncope', 'hyperhidrosis', 'ibs'],
  hyperhidrosis: ['hyperhidrosis', 'autonomic', 'anxiety'],
  ibs: ['ibs', 'autonomic', 'anxiety', 'panic'],
  syncope: ['syncope', 'autonomic', 'panic', 'anxiety'],
  headache: ['headache', 'autonomic', 'sleep', 'anxiety'],
  depression: ['depression', 'anxiety', 'sleep', 'autonomic']
};

/**
 * Sanitizes legacy titles into neutral, clinical anchor texts
 */
function sanitizeAnchorTitle(rawTitle, slug) {
  let clean = rawTitle || slug || '';
  // 1. Remove [지역 질환] regional brackets
  clean = clean.replace(/^\[[가-힣\s]+\]\s*/, '');
  // 2. Sanitize legacy marketing phrases
  clean = clean.replace(/두뇌\s*밸런스\s*치료법?/g, '상태 평가 및 임상 가이드');
  clean = clean.replace(/근본\s*치료법?/g, '한방 관리 요령');
  clean = clean.replace(/수면제\s*의존\s*없이\s*자연\s*수면\s*리듬\s*되찾기/g, '수면 위생과 한방 관리 가이드');
  clean = clean.replace(/교감신경\s*불균형\s*바로잡기/g, '자율신경 불균형 임상 가이드');
  return clean.trim();
}

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

    const rawTitle = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
    const cleanTitle = sanitizeAnchorTitle(rawTitle, file.replace(/\.md$/, ''));

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
 * Returns 2~4 strictly relevant internal link suggestions for the target disease
 * - Prioritizes same-category articles
 * - Allows clinically related categories only (e.g. tic -> adhd/sleep, panic -> anxiety/autonomic)
 * - Excludes unrelated categories to prevent forced irrelevant links
 */
function getRecommendedInternalLinks(diseaseCategory, currentSlug, blogDir) {
  const allBlogPosts = getExistingBlogPosts(blogDir);
  const candidates = allBlogPosts.filter(p => p.slug !== currentSlug);

  const allowedRelated = DISEASE_RELEVANCE_MAP[diseaseCategory] || [diseaseCategory];

  // 1. Same category blog matches (up to 2)
  const sameCat = candidates.filter(p => p.category === diseaseCategory || p.category.includes(diseaseCategory));
  // 2. Strictly related category blog posts (up to 1~2)
  const relatedCat = candidates.filter(p => 
    p.category !== diseaseCategory && 
    allowedRelated.some(rel => p.category === rel || p.category.includes(rel))
  );

  const selected = [];

  if (sameCat.length > 0) {
    selected.push(...sameCat.slice(0, 2));
  }

  if (relatedCat.length > 0 && selected.length < 3) {
    selected.push(...relatedCat.slice(0, 3 - selected.length));
  }

  // Fill with core site pages if needed to guarantee 2~3 verified links
  if (selected.length < 2) {
    for (const core of CORE_PAGES) {
      if (selected.length >= 2) break;
      if (!selected.some(s => s.url === core.url)) {
        selected.push(core);
      }
    }
  }

  return selected.slice(0, 4);
}

module.exports = {
  CORE_PAGES,
  DISEASE_RELEVANCE_MAP,
  sanitizeAnchorTitle,
  getExistingBlogPosts,
  isInternalUrlValid,
  getRecommendedInternalLinks
};
