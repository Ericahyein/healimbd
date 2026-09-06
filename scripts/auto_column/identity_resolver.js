/**
 * Unified Content Identity Resolver
 * Shared 100% by both QA Dry-Run Orchestrator and Scheduled Production Topic Planner.
 *
 * Resolves:
 * - contentDiseaseLabel (titleDisease)
 * - seoDiseaseLabel
 * - thumbnailDiseaseLabel
 * - slugDiseaseLabel
 * - ageGroup
 * - canonicalCategory (Hugo category)
 */

const SPECIAL_ANGLE_IDENTITIES = {
  // 1. Tourette within tic (qa-02)
  'parent-guidance': {
    contentDiseaseLabel: '뚜렛증후군',
    seoDiseaseLabel: '뚜렛증후군',
    thumbnailDiseaseLabel: '뚜렛증후군',
    slugDiseaseLabel: 'tourette',
    ageGroup: 'child',
    category: 'tic'
  },
  // 2. Adult ADHD (qa-04)
  'adult-work-mistakes': {
    contentDiseaseLabel: 'ADHD',
    seoDiseaseLabel: '성인 ADHD',
    thumbnailDiseaseLabel: '성인 ADHD',
    slugDiseaseLabel: 'adhd',
    ageGroup: 'adult',
    category: 'adhd'
  },
  // 3. Social Phobia within anxiety (qa-07)
  'presentation-anxiety': {
    contentDiseaseLabel: '사회공포증',
    seoDiseaseLabel: '사회공포증',
    thumbnailDiseaseLabel: '사회공포증',
    slugDiseaseLabel: 'social-phobia',
    ageGroup: 'adult',
    category: 'anxiety'
  },
  // 4. Dizziness within headache (qa-14)
  'chronic-dizziness': {
    contentDiseaseLabel: '어지럼증',
    seoDiseaseLabel: '어지럼증',
    thumbnailDiseaseLabel: '어지럼증',
    slugDiseaseLabel: 'dizziness',
    ageGroup: 'adult',
    category: 'headache'
  },
  // 5. OCD within depression category (qa-16)
  'intrusive-thoughts': {
    contentDiseaseLabel: '강박증/OCD',
    seoDiseaseLabel: '강박증',
    thumbnailDiseaseLabel: '강박증',
    slugDiseaseLabel: 'ocd',
    ageGroup: 'adult',
    category: 'depression'
  },
  // 6. Separation anxiety within child category (qa-17)
  'separation-anxiety': {
    contentDiseaseLabel: '소아 분리불안',
    seoDiseaseLabel: '소아 분리불안',
    thumbnailDiseaseLabel: '소아 분리불안',
    slugDiseaseLabel: 'separation-anxiety',
    ageGroup: 'child',
    category: 'child'
  },
  'school-reluctance': {
    contentDiseaseLabel: '소아 분리불안',
    seoDiseaseLabel: '소아 분리불안',
    thumbnailDiseaseLabel: '소아 분리불안',
    slugDiseaseLabel: 'separation-anxiety',
    ageGroup: 'child',
    category: 'child'
  },
  // 7. Night terrors within child category (qa-18)
  'night-terrors': {
    contentDiseaseLabel: '소아 야경증',
    seoDiseaseLabel: '소아 야경증',
    thumbnailDiseaseLabel: '소아 야경증',
    slugDiseaseLabel: 'night-terrors',
    ageGroup: 'child',
    category: 'child'
  },
  'screaming-sleep': {
    contentDiseaseLabel: '소아 야경증',
    seoDiseaseLabel: '소아 야경증',
    thumbnailDiseaseLabel: '소아 야경증',
    slugDiseaseLabel: 'night-terrors',
    ageGroup: 'child',
    category: 'child'
  },
  // 8. Enuresis within child category (qa-19)
  'child-enuresis': {
    contentDiseaseLabel: '소아 야뇨증',
    seoDiseaseLabel: '소아 야뇨증',
    thumbnailDiseaseLabel: '소아 야뇨증',
    slugDiseaseLabel: 'child-enuresis',
    ageGroup: 'child',
    category: 'child'
  },
  // 9. Chronic fatigue / burnout within autonomic category (qa-20)
  'brain-fog-fatigue': {
    contentDiseaseLabel: '만성피로',
    seoDiseaseLabel: '만성피로',
    thumbnailDiseaseLabel: '만성피로',
    slugDiseaseLabel: 'fatigue',
    ageGroup: 'adult',
    category: 'autonomic'
  }
};

const BASE_DISEASE_IDENTITIES = {
  tic: {
    contentDiseaseLabel: '틱장애',
    seoDiseaseLabel: '틱장애',
    thumbnailDiseaseLabel: '틱장애',
    slugDiseaseLabel: 'tic',
    ageGroup: 'child',
    category: 'tic'
  },
  adhd: {
    contentDiseaseLabel: 'ADHD',
    seoDiseaseLabel: 'ADHD',
    thumbnailDiseaseLabel: 'ADHD',
    slugDiseaseLabel: 'adhd',
    ageGroup: 'child',
    category: 'adhd'
  },
  panic: {
    contentDiseaseLabel: '공황장애',
    seoDiseaseLabel: '공황장애',
    thumbnailDiseaseLabel: '공황장애',
    slugDiseaseLabel: 'panic',
    ageGroup: 'adult',
    category: 'panic'
  },
  anxiety: {
    contentDiseaseLabel: '불안장애',
    seoDiseaseLabel: '불안장애',
    thumbnailDiseaseLabel: '불안장애',
    slugDiseaseLabel: 'anxiety',
    ageGroup: 'adult',
    category: 'anxiety'
  },
  sleep: {
    contentDiseaseLabel: '불면증',
    seoDiseaseLabel: '불면증',
    thumbnailDiseaseLabel: '불면증',
    slugDiseaseLabel: 'sleep',
    ageGroup: 'adult',
    category: 'sleep'
  },
  autonomic: {
    contentDiseaseLabel: '자율신경실조증',
    seoDiseaseLabel: '자율신경실조증',
    thumbnailDiseaseLabel: '자율신경실조증',
    slugDiseaseLabel: 'autonomic',
    ageGroup: 'adult',
    category: 'autonomic'
  },
  hyperhidrosis: {
    contentDiseaseLabel: '다한증',
    seoDiseaseLabel: '다한증',
    thumbnailDiseaseLabel: '다한증',
    slugDiseaseLabel: 'hyperhidrosis',
    ageGroup: 'mixed',
    category: 'hyperhidrosis'
  },
  ibs: {
    contentDiseaseLabel: '과민성대장증후군',
    seoDiseaseLabel: '과민성대장증후군',
    thumbnailDiseaseLabel: '과민성대장증후군',
    slugDiseaseLabel: 'ibs',
    ageGroup: 'adult',
    category: 'ibs'
  },
  syncope: {
    contentDiseaseLabel: '미주신경성 실신',
    seoDiseaseLabel: '미주신경성 실신',
    thumbnailDiseaseLabel: '미주신경성 실신',
    slugDiseaseLabel: 'syncope',
    ageGroup: 'mixed',
    category: 'syncope'
  },
  headache: {
    contentDiseaseLabel: '두통',
    seoDiseaseLabel: '두통',
    thumbnailDiseaseLabel: '두통',
    slugDiseaseLabel: 'headache',
    ageGroup: 'adult',
    category: 'headache'
  },
  depression: {
    contentDiseaseLabel: '우울증',
    seoDiseaseLabel: '우울증',
    thumbnailDiseaseLabel: '우울증',
    slugDiseaseLabel: 'depression',
    ageGroup: 'adult',
    category: 'depression'
  },
  child: {
    contentDiseaseLabel: '소아신경',
    seoDiseaseLabel: '소아신경',
    thumbnailDiseaseLabel: '소아신경',
    slugDiseaseLabel: 'child',
    ageGroup: 'child',
    category: 'child'
  }
};

/**
 * Resolves content identity attributes consistently across QA and Production.
 * @param {string} diseaseId - Disease category identifier (e.g. 'depression', 'anxiety')
 * @param {string|object} topicAngle - Topic angle ID or object with id
 * @param {object} [overrides={}] - Optional explicit overrides
 * @returns {object} { contentDiseaseLabel, titleDisease, seoDiseaseLabel, thumbnailDiseaseLabel, slugDiseaseLabel, ageGroup, category }
 */
function resolveContentIdentity(diseaseId, topicAngle, overrides = {}) {
  const angleId = typeof topicAngle === 'object' && topicAngle !== null 
    ? (topicAngle.id || '') 
    : (topicAngle || '');

  const special = SPECIAL_ANGLE_IDENTITIES[angleId];
  const base = BASE_DISEASE_IDENTITIES[diseaseId] || {
    contentDiseaseLabel: diseaseId,
    seoDiseaseLabel: diseaseId,
    thumbnailDiseaseLabel: diseaseId,
    slugDiseaseLabel: diseaseId,
    ageGroup: 'mixed',
    category: diseaseId
  };

  const resolved = special || base;

  const contentDiseaseLabel = overrides.contentDiseaseLabel || overrides.titleDisease || resolved.contentDiseaseLabel;
  const titleDisease = overrides.titleDisease || contentDiseaseLabel;

  return {
    contentDiseaseLabel,
    titleDisease,
    seoDiseaseLabel: overrides.seoDiseaseLabel || resolved.seoDiseaseLabel,
    thumbnailDiseaseLabel: overrides.thumbnailDiseaseLabel || resolved.thumbnailDiseaseLabel,
    slugDiseaseLabel: overrides.slugDiseaseLabel || resolved.slugDiseaseLabel,
    ageGroup: overrides.ageGroup || resolved.ageGroup,
    category: overrides.category || resolved.category
  };
}

/**
 * Canonical Article Slug Builder
 * Shared 100% by both QA and Production.
 * Deduplicates disease and topic angle segment if slugDiseaseLabel === topicAngleId.
 *
 * @param {string} geoId - e.g. 'yongin-cheoin', 'seongnam-main'
 * @param {string} slugDiseaseLabel - e.g. 'separation-anxiety', 'ocd', 'depression'
 * @param {string} topicAngleId - e.g. 'separation-anxiety', 'intrusive-thoughts', 'burnout-lethargy'
 * @returns {string} Clean, deduplicated slug (e.g. 'yongin-cheoin-separation-anxiety')
 */
function buildArticleSlug(geoId, slugDiseaseLabel, topicAngleId) {
  const normGeo = String(geoId || '').toLowerCase().trim();
  const normDisease = String(slugDiseaseLabel || '').toLowerCase().trim();
  const normAngle = String(topicAngleId || '').toLowerCase().trim();

  let rawSlug;
  if (normDisease === normAngle || !normAngle) {
    rawSlug = `${normGeo}-${normDisease}`;
  } else {
    rawSlug = `${normGeo}-${normDisease}-${normAngle}`;
  }
  return rawSlug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

module.exports = {
  SPECIAL_ANGLE_IDENTITIES,
  BASE_DISEASE_IDENTITIES,
  resolveContentIdentity,
  buildArticleSlug
};

