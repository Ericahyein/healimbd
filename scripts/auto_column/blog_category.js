// Keep published column categories aligned with the visible filters on /blog/.
const BLOG_CATEGORY_KEYS = new Set([
  'tic', 'adhd', 'panic', 'anxiety', 'sleep', 'autonomic',
  'hyperhidrosis', 'ibs', 'syncope', 'general'
]);

const CHILD_CATEGORY_BY_TOPIC = Object.freeze({
  'separation-anxiety': 'anxiety',
  'night-terrors': 'sleep',
  'child-enuresis': 'general'
});

function resolveBlogCategory(diseaseId, topicAngleId, taxonomyCategory) {
  let category = taxonomyCategory;

  if (diseaseId === 'child') {
    category = CHILD_CATEGORY_BY_TOPIC[topicAngleId];
    if (!category) {
      throw new Error(`No visible blog category for child topic: ${topicAngleId}`);
    }
  } else if (diseaseId === 'depression') {
    category = 'anxiety';
  } else if (diseaseId === 'headache') {
    category = 'general';
  }

  if (!BLOG_CATEGORY_KEYS.has(category)) {
    throw new Error(`No visible blog category for disease: ${diseaseId} (${category})`);
  }
  return category;
}

module.exports = { resolveBlogCategory, BLOG_CATEGORY_KEYS };
