const fs = require('fs');
const path = require('path');

const geoHierarchy = require('./geo_hierarchy.json');
const diseaseTaxonomy = require('./disease_taxonomy.json');
const { resolveContentIdentity, buildArticleSlug } = require('./identity_resolver');

const HISTORY_PATH = path.join(__dirname, '../../data/auto_column_history.json');

function loadHistory(customPath) {
  const target = customPath || HISTORY_PATH;
  if (!fs.existsSync(target)) return [];
  try {
    const raw = fs.readFileSync(target, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse history JSON, defaulting to empty:', err.message);
    return [];
  }
}

/**
 * Checks if a specific geoId + disease was published within last 90 days
 */
function isGeoDiseaseIn90DayCooldown(history, geoId, diseaseId, now = new Date()) {
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - ninetyDaysMs);

  return history.some(item => {
    if (item.geoId === geoId && item.disease === diseaseId) {
      const pubDate = new Date(item.publishDate);
      return pubDate >= cutoff;
    }
    return false;
  });
}

/**
 * Checks if a specific disease was published within last 3 days (72 hours)
 */
function isDiseaseIn3DayCooldown(history, diseaseId, now = new Date()) {
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - threeDaysMs);

  return history.some(item => {
    if (item.disease === diseaseId) {
      const pubDate = new Date(item.publishDate);
      return pubDate >= cutoff;
    }
    return false;
  });
}

/**
 * Checks if today already has a post and returns its parentRegion & disease
 */
function getTodayPublishedItems(history, now = new Date()) {
  const todayStr = now.toISOString().slice(0, 10);
  return history.filter(item => {
    return item.publishDate && item.publishDate.startsWith(todayStr);
  });
}

/**
 * Selects the optimal (geo, disease, topicAngle) combination
 */
function planNextColumn(options = {}) {
  const history = loadHistory(options.historyPath);
  const now = options.now || new Date();

  const activeRegions = geoHierarchy.regions.filter(r => 
    ['city', 'district', 'selected_local_area', 'special_area'].includes(r.regionType)
  );

  const todayPosts = getTodayPublishedItems(history, now);

  // If already 2 posts published today (and not force), signal limit
  if (todayPosts.length >= 2 && !options.force) {
    return {
      status: 'daily_limit_reached',
      message: 'Already published 2 columns today. Maximum daily limit reached.',
      todayCount: todayPosts.length
    };
  }

  const todayDiseases = new Set(todayPosts.map(p => p.disease));
  const todayParents = new Set(todayPosts.map(p => p.parentRegion));

  // Build candidate combinations
  const validCandidates = [];

  for (const region of activeRegions) {
    for (const disease of diseaseTaxonomy.diseases) {
      // Rule 1: No same disease in same day
      if (todayDiseases.has(disease.id)) continue;

      // Rule 2: 90-day cooldown for same geo + disease
      if (isGeoDiseaseIn90DayCooldown(history, region.id, disease.id, now)) continue;

      // Rule 3: 3-day cooldown for same disease (if pool allows)
      const in3Day = isDiseaseIn3DayCooldown(history, disease.id, now);

      // Score candidate (higher score = better fit)
      let score = 100;
      if (in3Day) score -= 50; // Penalty if 3-day rule violated (used as fallback if pool exhausted)
      if (todayParents.has(region.parentRegion)) score -= 30; // Encourage diverse parent region for day's 2nd post

      // Last published time penalty for region and disease
      const lastGeoUse = history.slice().reverse().find(h => h.geoId === region.id);
      if (lastGeoUse) {
        const daysAgo = (now.getTime() - new Date(lastGeoUse.publishDate).getTime()) / (24 * 3600 * 1000);
        score += Math.min(daysAgo, 30); // Bonus for older unused regions
      } else {
        score += 35; // Never used region bonus
      }

      validCandidates.push({
        region,
        disease,
        score
      });
    }
  }

  if (validCandidates.length === 0) {
    throw new Error('All geo-disease combinations are currently in cooldown. Please review history.');
  }

  // Sort candidates by score descending
  validCandidates.sort((a, b) => b.score - a.score);
  const best = validCandidates[0];

  // Select topic angle that was least recently used for this disease
  const pastAnglesForDisease = history
    .filter(h => h.disease === best.disease.id)
    .map(h => h.topicAngle);

  const availableAngles = best.disease.topicAngles || [];
  let chosenAngle = availableAngles[0];

  for (const angle of availableAngles) {
    if (!pastAnglesForDisease.includes(angle.id)) {
      chosenAngle = angle;
      break;
    }
  }

  const plan = buildProductionTopicPlan(best.region, best.disease, chosenAngle, now);
  plan.score = best.score;
  return plan;
}

/**
 * Builds a planned topic object for a specific region, disease, and chosen angle using resolveContentIdentity.
 */
function buildProductionTopicPlan(region, disease, chosenAngle, now = new Date()) {
  const identity = resolveContentIdentity(disease.id, chosenAngle.id);

  // Build canonical title and slug using resolved identity and canonical slug builder
  const titlePrefix = region.canonicalTitle.replace('{disease}', identity.titleDisease);
  const titleCandidate = `${titlePrefix} ${chosenAngle.titleSuffix}`;
  const slug = buildArticleSlug(region.id, identity.slugDiseaseLabel, chosenAngle.id);

  return {
    status: 'ready',
    geo: region,
    disease,
    titleDisease: identity.titleDisease,
    thumbnailDiseaseLabel: identity.thumbnailDiseaseLabel,
    seoDiseaseLabel: identity.seoDiseaseLabel,
    ageGroup: identity.ageGroup,
    topicAngle: chosenAngle,
    titleCandidate,
    slug,
    timestamp: now.toISOString()
  };
}

module.exports = {
  loadHistory,
  isGeoDiseaseIn90DayCooldown,
  isDiseaseIn3DayCooldown,
  getTodayPublishedItems,
  planNextColumn,
  buildProductionTopicPlan
};
