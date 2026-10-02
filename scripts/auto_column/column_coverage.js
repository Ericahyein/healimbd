const fs = require('fs');
const path = require('path');
const { CONDITION_PAGES } = require('./internal_linker');

const BLOG_DIR = path.join(__dirname, '../../content/blog');
const MINIMUM_CONDITION_COLUMNS = 3;
// Larger than the 45-point geo+disease recency range, but stops at three columns.
const COVERAGE_POINTS_PER_MISSING_COLUMN = 60;

// Read only the top-level scalar fields used by the site's YAML front matter.
// Do not match body text or infer a disease from titles and filenames.
function readScalar(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!match) return undefined;
  const raw = match[1].trim();
  if (raw.startsWith('"')) {
    const quoted = raw.match(/^"((?:\\.|[^"\\])*)"(?:\s+#.*)?$/);
    return quoted ? JSON.parse(`"${quoted[1]}"`) : undefined;
  }
  if (raw.startsWith("'")) {
    const quoted = raw.match(/^'((?:''|[^'])*)'(?:\s+#.*)?$/);
    return quoted ? quoted[1].replace(/''/g, "'") : undefined;
  }
  return raw.replace(/\s+#.*$/, '').trim();
}

function publicationTime(value) {
  if (!value) return NaN;
  // Hugo's configured timeZone is Asia/Seoul, including date-only front matter.
  const input = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value;
  return new Date(input).getTime();
}

function countPublishedConditionColumns(blogDir = BLOG_DIR, now = new Date()) {
  const counts = Object.fromEntries(Object.keys(CONDITION_PAGES).map(category => [category, 0]));
  const categoriesByPillar = new Map(Object.entries(CONDITION_PAGES).map(([category, page]) => [page.url, category]));
  // A missing/unreadable source directory must not look like zero published columns.
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === '_index.md') continue;
    const markdown = fs.readFileSync(path.join(blogDir, entry.name), 'utf8');
    const frontMatter = markdown.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (!frontMatter || String(readScalar(frontMatter, 'draft')).toLowerCase() === 'true') continue;
    const date = publicationTime(readScalar(frontMatter, 'date'));
    const publishDate = readScalar(frontMatter, 'publishDate');
    const scheduled = publishDate === undefined ? date : publicationTime(publishDate);
    const expiryDate = readScalar(frontMatter, 'expiryDate');
    if (!Number.isFinite(date) || !Number.isFinite(scheduled) || date > now.getTime() || scheduled > now.getTime()) continue;
    if (expiryDate !== undefined && (!Number.isFinite(publicationTime(expiryDate)) || publicationTime(expiryDate) <= now.getTime())) continue;

    // An explicit empty or conflicting pillar never falls back to an umbrella
    // category (e.g. OCD/depression sharing anxiety, or night terrors sharing sleep).
    const pillar = readScalar(frontMatter, 'condition_pillar');
    const hasPillar = /^condition_pillar:/m.test(frontMatter);
    const category = hasPillar
      ? categoriesByPillar.get(String(pillar || '').replace(/\/$/, '') + '/')
      : readScalar(frontMatter, 'category');
    if (Object.hasOwn(counts, category)) counts[category]++;
  }
  return counts;
}

function getCoveragePriority(disease, counts) {
  // Other diseases continue their existing rotation; only the nine condition
  // pages get the temporary minimum-content boost.
  if (!Object.hasOwn(CONDITION_PAGES, disease.id)) return { publishedCount: null, missingCount: 0, bonus: 0 };
  const publishedCount = counts[disease.id] || 0;
  const missingCount = Math.max(0, MINIMUM_CONDITION_COLUMNS - publishedCount);
  return { publishedCount, missingCount, bonus: missingCount * COVERAGE_POINTS_PER_MISSING_COLUMN };
}

module.exports = { countPublishedConditionColumns, getCoveragePriority, MINIMUM_CONDITION_COLUMNS, COVERAGE_POINTS_PER_MISSING_COLUMN };
