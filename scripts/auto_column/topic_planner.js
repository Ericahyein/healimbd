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
 * Returns KST calendar date string: YYYY-MM-DD using Asia/Seoul timezone.
 */
function getKstDateString(dateInput = new Date()) {
  const d = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Converts a date to a KST Date object representing UTC midnight of that KST calendar day.
 */
function getKstCalendarDate(dateInput = new Date()) {
  const dateStr = getKstDateString(dateInput);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Derives a deterministic integer day seed from the KST calendar date.
 */
function getKstDaySeed(dateInput = new Date()) {
  const calDate = getKstCalendarDate(dateInput);
  return Math.floor(calDate.getTime() / (24 * 60 * 60 * 1000));
}

/**
 * Converts a date to an ISO 8601 string with KST offset (+09:00).
 * e.g. 2026-09-06T16:30:00.000Z -> 2026-09-07T01:30:00.000+09:00
 */
function getKstIsoString(dateInput = new Date()) {
  const d = new Date(dateInput);
  const kstMs = d.getTime() + (9 * 60 * 60 * 1000);
  const kst = new Date(kstMs);
  return kst.toISOString().replace('Z', '+09:00');
}

/**
 * Calculates the difference in calendar days between two dates in KST.
 * (e.g. 2026-09-07 and 2026-09-08 returns 1)
 */
function getKstCalendarDayDiff(earlierDate, laterDate) {
  const d1 = getKstCalendarDate(earlierDate);
  const d2 = getKstCalendarDate(laterDate);
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round((d2.getTime() - d1.getTime()) / oneDayMs);
}

/**
 * Checks if a specific disease was published within the last 3 calendar days in KST.
 * HARD BLOCK: Minimum 3 days interval required.
 * - Day diff 0 (same day) -> in cooldown (true)
 * - Day diff 1 -> in cooldown (true)
 * - Day diff 2 -> in cooldown (true)
 * - Day diff >= 3 -> allowed (false)
 */
function isDiseaseIn3DayCooldown(history, diseaseId, now = new Date()) {
  return history.some(item => {
    if (item.disease === diseaseId && item.publishDate) {
      const dayDiff = getKstCalendarDayDiff(item.publishDate, now);
      return dayDiff >= 0 && dayDiff < 3;
    }
    return false;
  });
}

/**
 * Checks if today already has a post and returns its parentRegion & disease (KST calendar day)
 */
function getTodayPublishedItems(history, now = new Date()) {
  const todayKst = getKstDateString(now);
  return history.filter(item => {
    if (!item.publishDate) return false;
    const itemKst = getKstDateString(item.publishDate);
    return itemKst === todayKst;
  });
}

/**
 * Verifies if medical knowledge exists and is approved for a given disease.
 */
function isMedicalKnowledgeApproved(diseaseId) {
  try {
    const mkPath = path.join(__dirname, 'medical_knowledge', `${diseaseId}.json`);
    if (!fs.existsSync(mkPath)) return false;
    const raw = fs.readFileSync(mkPath, 'utf-8');
    const mk = JSON.parse(raw);
    return mk && mk.reviewStatus === 'approved';
  } catch (e) {
    return false;
  }
}

const SCORE_EPSILON = 1e-6;

/**
 * Groups candidates primarily by score descending, sorts each tied group
 * lexicographically by stableKey, and rotates tied candidates by daySeed % group.length.
 */
function sortAndRotateCandidates(candidates, daySeed) {
  if (candidates.length <= 1) return candidates;

  candidates.sort((a, b) => b.score - a.score);

  const groups = [];
  let currentGroup = [];
  let currentScore = null;

  for (const cand of candidates) {
    if (currentScore === null || Math.abs(cand.score - currentScore) <= SCORE_EPSILON) {
      currentGroup.push(cand);
      if (currentScore === null) currentScore = cand.score;
    } else {
      groups.push(currentGroup);
      currentGroup = [cand];
      currentScore = cand.score;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  const result = [];
  for (const group of groups) {
    group.sort((a, b) => a.stableKey.localeCompare(b.stableKey));
    if (group.length > 1) {
      const offset = ((daySeed % group.length) + group.length) % group.length;
      result.push(...group.slice(offset), ...group.slice(0, offset));
    } else {
      result.push(...group);
    }
  }
  return result;
}

/**
 * Selects the optimal (geo, disease, topicAngle) combination
 */
function planNextColumn(options = {}) {
  const history = loadHistory(options.historyPath);
  const now = options.now || new Date();
  const daySeed = getKstDaySeed(now);

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
      // Rule 0: Medical knowledge must exist and be approved
      if (!isMedicalKnowledgeApproved(disease.id)) continue;

      // Rule 1: No same disease in same day
      if (todayDiseases.has(disease.id)) continue;

      // Rule 2: 90-day cooldown for same geo + disease
      if (isGeoDiseaseIn90DayCooldown(history, region.id, disease.id, now)) continue;

      // Rule 3: HARD BLOCK 3-day cooldown for same disease (minimum 3 calendar days interval)
      if (isDiseaseIn3DayCooldown(history, disease.id, now)) continue;

      // Score candidate (higher score = better fit)
      let score = 100;
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
        score,
        stableKey: `${region.id}|${disease.id}`
      });
    }
  }

  if (validCandidates.length === 0) {
    throw new Error('All geo-disease combinations are currently in cooldown. Please review history.');
  }

  // Stable group sort & date-based rotation for tied candidates
  const rotatedCandidates = sortAndRotateCandidates(validCandidates, daySeed);

  // Find best candidate that has an eligible topic angle not in excludedPlanKeys
  const excludedPlanKeys = options.excludedPlanKeys || new Set();

  for (const cand of rotatedCandidates) {
    const excludedAngleIdsForCand = new Set();
    (cand.disease.topicAngles || []).forEach(a => {
      const keyColon = `${cand.region.id}:${cand.disease.id}:${a.id}`;
      const keyPipe = `${cand.region.id}|${cand.disease.id}|${a.id}`;
      if (excludedPlanKeys.has(keyColon) || excludedPlanKeys.has(keyPipe)) {
        excludedAngleIdsForCand.add(a.id);
      }
    });

    const chosenAngle = selectTopicAngleForDisease(cand.disease, history, excludedAngleIdsForCand);
    if (chosenAngle) {
      const plan = buildProductionTopicPlan(cand.region, cand.disease, chosenAngle, now);
      plan.score = cand.score;
      return plan;
    }
  }

  throw new Error('No available candidate topic plans remain after exclusions.');
}

/**
 * Selects the optimal topic angle for a disease, prioritizing unused angles
 * and then least-recently-used (LRU) angles, while excluding any rejected angle IDs.
 */
function selectTopicAngleForDisease(disease, history, excludedAngleIds = new Set()) {
  const availableAngles = (disease.topicAngles || []).filter(a => !excludedAngleIds.has(a.id));
  if (availableAngles.length === 0) return null;

  // 1. Check for angles never used in history
  const usedAngleIds = new Set(history.filter(h => h.disease === disease.id).map(h => h.topicAngle));
  for (const angle of availableAngles) {
    if (!usedAngleIds.has(angle.id)) {
      return angle;
    }
  }

  // 2. All available angles have been used in history -> select Least Recently Used (oldest publishDate)
  let oldestAngle = availableAngles[0];
  let oldestDate = Infinity;

  for (const angle of availableAngles) {
    const lastUse = history.slice().reverse().find(h => h.disease === disease.id && h.topicAngle === angle.id);
    if (lastUse && lastUse.publishDate) {
      const pubTime = new Date(lastUse.publishDate).getTime();
      if (pubTime < oldestDate) {
        oldestDate = pubTime;
        oldestAngle = angle;
      }
    } else {
      return angle;
    }
  }

  return oldestAngle;
}

/**
 * Returns ranked candidate plans sorted by score descending, respecting rotation policies.
 * Excludes combinations listed in excludedPlanKeys.
 */
function getRankedCandidatePlans(options = {}, excludedPlanKeys = new Set()) {
  const history = loadHistory(options.historyPath);
  const now = options.now || new Date();
  const daySeed = getKstDaySeed(now);

  const activeRegions = geoHierarchy.regions.filter(r =>
    ['city', 'district', 'selected_local_area', 'special_area'].includes(r.regionType)
  );

  const todayPosts = getTodayPublishedItems(history, now);

  const todayDiseases = new Set(todayPosts.map(p => p.disease));
  const todayParents = new Set(todayPosts.map(p => p.parentRegion));

  // Build candidate combinations
  const validCandidates = [];

  for (const region of activeRegions) {
    for (const disease of diseaseTaxonomy.diseases) {
      if (!isMedicalKnowledgeApproved(disease.id)) continue;
      if (todayDiseases.has(disease.id)) continue;
      if (isGeoDiseaseIn90DayCooldown(history, region.id, disease.id, now)) continue;
      if (isDiseaseIn3DayCooldown(history, disease.id, now)) continue;

      let score = 100;
      if (todayParents.has(region.parentRegion)) score -= 30;

      const lastGeoUse = history.slice().reverse().find(h => h.geoId === region.id);
      if (lastGeoUse) {
        const daysAgo = (now.getTime() - new Date(lastGeoUse.publishDate).getTime()) / (24 * 3600 * 1000);
        score += Math.min(daysAgo, 30);
      } else {
        score += 35;
      }

      validCandidates.push({
        region,
        disease,
        score,
        stableKey: `${region.id}|${disease.id}`
      });
    }
  }

  const rotatedCandidates = sortAndRotateCandidates(validCandidates, daySeed);
  const candidatePlans = [];

  for (const cand of rotatedCandidates) {
    const availableAngles = cand.disease.topicAngles || [];
    for (const angle of availableAngles) {
      const keyColon = `${cand.region.id}:${cand.disease.id}:${angle.id}`;
      const keyPipe = `${cand.region.id}|${cand.disease.id}|${angle.id}`;
      if (excludedPlanKeys.has(keyColon) || excludedPlanKeys.has(keyPipe)) continue;

      const plan = buildProductionTopicPlan(cand.region, cand.disease, angle, now);
      plan.score = cand.score;
      candidatePlans.push(plan);
    }
  }

  return candidatePlans;
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
  getKstCalendarDate,
  getKstDaySeed,
  getKstIsoString,
  getKstDateString,
  getKstCalendarDayDiff,
  isMedicalKnowledgeApproved,
  SCORE_EPSILON,
  sortAndRotateCandidates,
  planNextColumn,
  selectTopicAngleForDisease,
  getRankedCandidatePlans,
  buildProductionTopicPlan
};
