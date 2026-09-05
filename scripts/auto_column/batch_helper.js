const fs = require('fs');
const path = require('path');

const QA_RESULTS_PATH = path.join(__dirname, '../../data/auto_column_qa_results.json');

const BATCH_DEFINITIONS = {
  'batch-1': ['qa-03-adhd-child', 'qa-08-sleep', 'qa-06-anxiety', 'qa-09-autonomic'],
  'batch-2': ['qa-02-tourette', 'qa-04-adhd-adult', 'qa-07-social-phobia', 'qa-10-hyperhidrosis'],
  'batch-3': ['qa-11-ibs', 'qa-12-syncope', 'qa-13-headache', 'qa-14-dizziness'],
  'batch-4': ['qa-15-depression', 'qa-16-ocd', 'qa-17-separation-anxiety', 'qa-18-night-terrors'],
  'batch-5': ['qa-19-child-enuresis', 'qa-20-fatigue']
};

// Explicit approved/excluded targets: qa-01-tic and qa-05-panic must never run in batches
const ALWAYS_EXCLUDED_QA_IDS = new Set(['qa-01-tic', 'qa-05-panic']);

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
 * Parses user batch input string (e.g. "batch-1", "batch-1 (qa-03-adhd-child...)")
 */
function parseBatchKey(input) {
  if (!input || typeof input !== 'string') return 'batch-1';
  const match = input.trim().match(/^(batch-[1-5])/i);
  return match ? match[1].toLowerCase() : input.trim().toLowerCase();
}

/**
 * Resolves targets for a given batch key, strictly filtering out approved targets
 */
function getBatchTargets(batchInput) {
  const batchKey = parseBatchKey(batchInput);
  const rawTargets = BATCH_DEFINITIONS[batchKey] || [];

  const currentResults = loadQAResults();
  const approvedQaIds = new Set(
    currentResults
      .filter(r => r.humanReviewStatus === 'approved')
      .map(r => r.qaId)
  );

  // Filter out always excluded targets AND already approved targets
  const activeTargets = rawTargets.filter(qaId => {
    if (ALWAYS_EXCLUDED_QA_IDS.has(qaId)) {
      console.warn(`⚠️ Target ${qaId} is explicitly excluded (already approved / baseline). Skipping.`);
      return false;
    }
    if (approvedQaIds.has(qaId)) {
      console.warn(`⚠️ Target ${qaId} is already approved in QA history. Skipping.`);
      return false;
    }
    return true;
  });

  return activeTargets;
}

/**
 * Finds all qa-result-*.json files recursively in a directory
 */
function findResultFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findResultFiles(fullPath));
    } else if (entry.isFile() && entry.name.startsWith('qa-result-') && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Merges downloaded QA result artifacts into data/auto_column_qa_results.json
 * Preserves human-reviewed status (never automatically sets 'approved').
 */
function mergeBatchQAResults(downloadDir) {
  console.log(`\n🔍 Searching for QA result artifacts in: ${downloadDir}`);
  const resultFiles = findResultFiles(downloadDir);
  console.log(`📁 Found ${resultFiles.length} result file(s) to merge.`);

  if (resultFiles.length === 0) {
    console.warn('⚠️ No QA result files found to merge.');
    return { mergedCount: 0, updatedQaIds: [] };
  }

  const currentResults = loadQAResults();
  const updatedQaIds = [];

  for (const filePath of resultFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const singleRecord = JSON.parse(raw);

      if (!singleRecord || !singleRecord.qaId) {
        console.warn(`⚠️ Skipping invalid QA result file: ${filePath}`);
        continue;
      }

      const existingIdx = currentResults.findIndex(r => r.qaId === singleRecord.qaId);

      // Compute status safely
      let finalStatus = singleRecord.humanReviewStatus;
      if (existingIdx >= 0) {
        // If already human-approved, NEVER downgrade or alter
        if (currentResults[existingIdx].humanReviewStatus === 'approved') {
          finalStatus = 'approved';
        } else if (currentResults[existingIdx].humanReviewStatus === 'needs_revision' && singleRecord.validationPassed) {
          finalStatus = 'generated';
        }
      } else {
        finalStatus = singleRecord.validationPassed ? 'generated' : 'needs_revision';
      }

      const mergedRecord = {
        ...singleRecord,
        humanReviewStatus: finalStatus
      };

      if (existingIdx >= 0) {
        currentResults[existingIdx] = { ...currentResults[existingIdx], ...mergedRecord };
      } else {
        currentResults.push(mergedRecord);
      }

      updatedQaIds.push(singleRecord.qaId);
      console.log(`✅ Merged QA result for [${singleRecord.qaId}] (Passed: ${singleRecord.validationPassed}, Status: ${finalStatus})`);
    } catch (err) {
      console.error(`❌ Failed to merge ${filePath}:`, err.message);
    }
  }

  // Ensure directory exists and write
  const dir = path.dirname(QA_RESULTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(QA_RESULTS_PATH, JSON.stringify(currentResults, null, 2), 'utf-8');
  console.log(`\n💾 Successfully persisted merged QA results to: ${QA_RESULTS_PATH}`);
  console.log(`📊 Total targets updated: ${updatedQaIds.length} (${updatedQaIds.join(', ')})`);

  return { mergedCount: updatedQaIds.length, updatedQaIds };
}

// CLI handler for GitHub Actions workflow
if (require.main === module) {
  const [command, arg] = process.argv.slice(2);

  if (command === 'get-batch-targets') {
    const targets = getBatchTargets(arg || 'batch-1');
    process.stdout.write(JSON.stringify(targets));
  } else if (command === 'merge-results') {
    const downloadDir = arg || path.join(__dirname, '../../downloaded_qa_results');
    mergeBatchQAResults(downloadDir);
  } else {
    console.log('Usage: node batch_helper.js <get-batch-targets|merge-results> [arg]');
  }
}

module.exports = {
  BATCH_DEFINITIONS,
  ALWAYS_EXCLUDED_QA_IDS,
  parseBatchKey,
  getBatchTargets,
  findResultFiles,
  mergeBatchQAResults
};
