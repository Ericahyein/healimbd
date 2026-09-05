const fs = require('fs');
const path = require('path');

const geoHierarchy = require('./geo_hierarchy.json');
const diseaseTaxonomy = require('./disease_taxonomy.json');

const QA_TARGETS_PATH = path.join(__dirname, 'qa_targets.json');
const QA_RESULTS_PATH = path.join(__dirname, '../../data/auto_column_qa_results.json');

/**
 * Loads all QA targets
 */
function loadQATargets() {
  if (!fs.existsSync(QA_TARGETS_PATH)) {
    throw new Error(`QA targets file not found at: ${QA_TARGETS_PATH}`);
  }
  const raw = fs.readFileSync(QA_TARGETS_PATH, 'utf-8');
  return JSON.parse(raw).targets || [];
}

/**
 * Parses user input (e.g. "qa-01-tic" or "qa-01-tic (소아 틱장애 / media-exposure)") to find target
 */
function parseQATargetId(input) {
  if (!input || typeof input !== 'string') return null;
  const match = input.trim().match(/^(qa-\d{2}-[a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : input.trim().toLowerCase();
}

/**
 * Finds a specific target by qaId
 */
function findQATarget(qaIdOrInput) {
  const qaId = parseQATargetId(qaIdOrInput);
  if (!qaId || qaId === 'auto') return null;

  const targets = loadQATargets();
  return targets.find(t => t.qaId.toLowerCase() === qaId) || null;
}

/**
 * Builds a pipeline plan object specifically for a QA target
 */
function buildQAPlan(target, now = new Date()) {
  if (!target) {
    throw new Error('Valid QA target is required to build QA plan');
  }

  // 1. Resolve GEO from geo_hierarchy
  const geo = geoHierarchy.regions.find(r => r.id === target.recommendedGeo);
  if (!geo) {
    throw new Error(`Canonical recommendedGeo '${target.recommendedGeo}' not found in geo_hierarchy.json for ${target.qaId}`);
  }

  // 2. Resolve disease from disease_taxonomy
  const disease = diseaseTaxonomy.diseases.find(d => d.id === target.diseaseId);
  if (!disease) {
    throw new Error(`Disease ID '${target.diseaseId}' not found in disease_taxonomy.json for ${target.qaId}`);
  }

  // 3. Resolve topicAngle from disease.topicAngles
  const topicAngle = (disease.topicAngles || []).find(a => a.id === target.topicAngle);
  if (!topicAngle) {
    throw new Error(`Topic angle '${target.topicAngle}' not found in disease '${target.diseaseId}' for ${target.qaId}`);
  }

  // 4. Build canonical title and slug
  const titleDisease = target.titleDisease || target.canonicalDiseaseLabel || disease.name;
  const titlePrefix = geo.canonicalTitle.replace('{disease}', titleDisease);
  const titleCandidate = `${titlePrefix} ${topicAngle.titleSuffix}`;
  const rawSlug = `${geo.id}-${disease.id}-${topicAngle.id}`;
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  return {
    status: 'ready',
    qaId: target.qaId,
    displayDisease: target.displayDisease,
    titleDisease,
    ageGroup: target.ageGroup,
    isQAOverride: true,
    geo,
    disease,
    topicAngle,
    titleCandidate,
    slug,
    score: 999,
    timestamp: now.toISOString()
  };
}

/**
 * Loads current QA results history
 */
function loadQAResults() {
  if (!fs.existsSync(QA_RESULTS_PATH)) return [];
  try {
    const raw = fs.readFileSync(QA_RESULTS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse QA results JSON, defaulting to empty:', err.message);
    return [];
  }
}

/**
 * Records QA result into data/auto_column_qa_results.json
 * IMPORTANT: humanReviewStatus will NEVER automatically become 'approved'.
 * It strictly defaults to 'generated' upon passing, requiring human review.
 */
function recordQAResult({ qaId, validationPassed, humanReviewStatus, estimatedCostUSD, articleSlug, validationErrors, notes }) {
  const currentResults = loadQAResults();
  const existingIdx = currentResults.findIndex(r => r.qaId === qaId);

  // Default: validationPassed=true -> 'generated', validationPassed=false -> 'needs_revision'
  const computedStatus = humanReviewStatus || (validationPassed ? 'generated' : 'needs_revision');

  const newRecord = {
    qaId,
    diseaseId: qaId.split('-')[2] || 'unknown',
    displayDisease: '',
    topicAngle: '',
    recommendedGeo: '',
    testedAt: new Date().toISOString(),
    validationPassed: !!validationPassed,
    humanReviewStatus: computedStatus,
    notes: notes || (validationPassed ? 'Dry-run QA 검증 통과 (인간 검토 대기)' : 'Dry-run QA 검증 실패 (수정 필요)'),
    validationErrors: validationErrors || [],
    estimatedCostUSD: Number(estimatedCostUSD || 0),
    estimatedCost: Number(estimatedCostUSD || 0),
    articleSlug: articleSlug || null
  };

  // Supplement metadata from target if available
  const target = findQATarget(qaId);
  if (target) {
    newRecord.diseaseId = target.diseaseId;
    newRecord.displayDisease = target.displayDisease;
    newRecord.topicAngle = target.topicAngle;
    newRecord.recommendedGeo = target.recommendedGeo;
  }

  if (existingIdx >= 0) {
    // If human had previously reviewed ('approved' or 'needs_revision') and this run passed,
    // preserve the human review decision unless an explicit humanReviewStatus is provided
    if (validationPassed && !humanReviewStatus) {
      if (currentResults[existingIdx].humanReviewStatus === 'approved') {
        newRecord.humanReviewStatus = 'approved';
      } else if (currentResults[existingIdx].humanReviewStatus === 'needs_revision') {
        newRecord.humanReviewStatus = 'needs_revision';
      }
    }
    currentResults[existingIdx] = { ...currentResults[existingIdx], ...newRecord };
  } else {
    currentResults.push(newRecord);
  }

  const dir = path.dirname(QA_RESULTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(QA_RESULTS_PATH, JSON.stringify(currentResults, null, 2), 'utf-8');
  console.log(`📝 QA Result safely recorded in: ${QA_RESULTS_PATH} for [${qaId}] (humanReviewStatus: ${newRecord.humanReviewStatus})`);

  // Also safely output a single result artifact file for batch QA aggregator
  writeSingleQAResult(newRecord);
}

/**
 * Writes a standalone QA result JSON file into auto_column_artifacts
 */
function writeSingleQAResult(record, customArtifactDir) {
  if (!record || !record.qaId) return;
  const artifactDir = customArtifactDir || path.join(__dirname, '../../auto_column_artifacts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  const singlePath = path.join(artifactDir, `qa-result-${record.qaId}.json`);
  fs.writeFileSync(singlePath, JSON.stringify(record, null, 2), 'utf-8');
  console.log(`📄 Standalone QA result artifact saved: ${singlePath}`);
}

module.exports = {
  loadQATargets,
  parseQATargetId,
  findQATarget,
  buildQAPlan,
  loadQAResults,
  recordQAResult,
  writeSingleQAResult
};
