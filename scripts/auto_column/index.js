const fs = require('fs');
const path = require('path');

const { planNextColumn, loadHistory, getKstIsoString } = require('./topic_planner');
const { findQATarget, buildQAPlan, recordQAResult, loadQAResults, writeSingleQAResult } = require('./qa_manager');
const {
  loadMedicalKnowledge,
  generateTopicOutline,
  generateArticleBody,
  generateThumbnailCopy,
  generateBackgroundImage,
  regenerateArticleTitle
} = require('./ai_generator');
const {
  validateArticleContent,
  checkTitleSimilarity,
  checkSlugCollision
} = require('./content_validator');
const { compositeThumbnail } = require('./thumbnail_engine');
const { resolveBlogCategory } = require('./blog_category');
const { getRecommendedInternalLinks } = require('./internal_linker');

// Telemetry & Cost Estimation Constants
const COST_RATES = {
  lunaIn: 0.20 / 1000000,    // $0.20 per 1M tokens
  lunaOut: 0.80 / 1000000,   // $0.80 per 1M tokens
  terraIn: 2.50 / 1000000,   // $2.50 per 1M tokens
  terraOut: 10.00 / 1000000, // $10.00 per 1M tokens
  imageUnit: 0.040           // $0.040 per 1024x1024 image
};

// Retry Limits and Safety Constraints
const MAX_TITLE_REGEN_ATTEMPTS = 3;   // Max 3 AI title regenerations per candidate (Level A)
const MAX_FALLBACK_CANDIDATES = 2;     // Max 2 alternative fallback candidates (Total: 1 initial + 2 fallbacks = 3)
const MAX_TOTAL_TITLE_REGENS = 9;      // Absolute upper bound across entire execution: 3 candidates * 3 regens = 9
const MAX_BODY_GENS_PER_CANDIDATE = 1; // Exactly 1 body generation per candidate
const MAX_TOTAL_BODY_GENS = 3;         // Absolute upper bound: max 3 body generations across execution
const MAX_TOTAL_IMAGE_GENS = 1;        // Absolute upper bound: max 1 image generation only after 100% validation pass

const TITLE_RETRYABLE_ERROR_TYPES = ['TITLE_SIMILARITY', 'TITLE_DUPLICATE', 'SLUG_COLLISION'];
const FAIL_CLOSED_ERROR_TYPES = [
  'MEDICAL_KNOWLEDGE_UNAPPROVED',
  'GEO_CONSISTENCY_VIOLATION',
  'PROHIBITED_CLAIM',
  'ADVERTISING_RISK',
  'CURE_GUARANTEE',
  'CLINICAL_VALIDATOR_FAILURE',
  'INSUFFICIENT_EVIDENCE',
  'FULL_VALIDATION_FAILURE',
  'SECURITY_ERROR',
  'UNKNOWN_ERROR'
];

async function runAutoColumnPipeline(options = {}) {
  console.log('====================================================');
  console.log('🚀 Healim Bundang Doctor Column AI Pipeline Starting');
  console.log('====================================================');

  const apiKey = (options.apiKey !== undefined) ? options.apiKey : (process.env.OPENAI_API_KEY || '');
  const autoEnabled = (options.autoEnabled !== undefined) ? options.autoEnabled : (process.env.AUTO_COLUMN_ENABLED === 'true');
  const forcePublish = (options.forcePublish !== undefined) ? options.forcePublish : (process.env.FORCE_PUBLISH === 'true');
  const isDryRunOption = options.isDryRun;
  const testQATargetInput = (options.testQATarget !== undefined) ? options.testQATarget : (process.env.TEST_QA_TARGET || '');
  const historyPath = options.historyPath || path.join(__dirname, '../../data/auto_column_history.json');
  const blogDir = options.blogDir || path.join(__dirname, '../../content/blog');
  const now = options.now || new Date();
  const mockTitleGenerator = options.mockTitleGenerator || null;
  const mockBodyGenerator = options.mockBodyGenerator || null;
  const mockKnowledge = options.mockKnowledge || null;
  const artifactDir = options.artifactDir || path.join(__dirname, '../../auto_column_artifacts');

  // Ensure artifact directory is clean of stale files from previous executions
  if (fs.existsSync(artifactDir)) {
    for (const f of fs.readdirSync(artifactDir)) {
      try { fs.unlinkSync(path.join(artifactDir, f)); } catch (e) {}
    }
  } else {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const isCiEnv = (process.env.GITHUB_ACTIONS === 'true');
  const ciEvent = process.env.GITHUB_EVENT_NAME || '';
  const ciRef = process.env.GITHUB_REF || '';

  // Strict operating mode guard:
  // Determine if production publish is requested:
  // 1. Explicitly requested via options.isProductionPublish === true
  // 2. Or via options.isDryRun === false
  // 3. Or via env RUN_MODE === 'PRODUCTION_PUBLISH'
  // 4. Or via FORCE_PUBLISH === 'true' (when not explicitly dry-run)
  // 5. Or if running in CI with event 'schedule' on 'refs/heads/main' and AUTO_COLUMN_ENABLED === 'true'
  let isProductionRequested = false;
  if (options.isProductionPublish === true) {
    isProductionRequested = true;
  } else if (isDryRunOption === false) {
    isProductionRequested = true;
  } else if (process.env.RUN_MODE === 'PRODUCTION_PUBLISH') {
    isProductionRequested = true;
  } else if (forcePublish && isDryRunOption !== true && process.env.RUN_MODE !== 'DRY_RUN') {
    isProductionRequested = true;
  } else if (isCiEnv && ciEvent === 'schedule' && ciRef === 'refs/heads/main' && autoEnabled) {
    isProductionRequested = true;
  }

  // Security Fail-Closed Guard:
  // Production publish is ONLY allowed when ALL conditions are strictly met:
  // 1. GITHUB_ACTIONS === 'true'
  // 2. GITHUB_EVENT_NAME === 'schedule', workflow_dispatch with FORCE_PUBLISH === 'true',
  //    or a path-scoped push recovery with FORCE_PUBLISH and RECOVERY_PUBLISH both true
  // 3. GITHUB_REF === 'refs/heads/main'
  // 4. AUTO_COLUMN_ENABLED === 'true'
  // 5. OPENAI_API_KEY is configured
  // FORCE_PUBLISH only opens the explicit workflow_dispatch recovery path; it cannot bypass
  // GitHub Actions, main-branch, enablement, API-key, mock, or validator safeguards.
  if (isProductionRequested) {
    if (!isCiEnv) {
      throw new Error('Security Guard Violation: PRODUCTION_PUBLISH is strictly prohibited outside of GitHub Actions (GITHUB_ACTIONS !== "true"). Halting pipeline (Fail-Closed).');
    }
    const isScheduledPublish = ciEvent === 'schedule';
    const isManualRecoveryPublish = ciEvent === 'workflow_dispatch' && forcePublish;
    const isPathScopedRecoveryPublish = ciEvent === 'push' && forcePublish && process.env.RECOVERY_PUBLISH === 'true';
    if (!isScheduledPublish && !isManualRecoveryPublish && !isPathScopedRecoveryPublish) {
      throw new Error(`Security Guard Violation: PRODUCTION_PUBLISH is strictly prohibited on event '${ciEvent}' without an explicit FORCE_PUBLISH recovery request. Halting pipeline (Fail-Closed).`);
    }
    if (ciRef !== 'refs/heads/main') {
      throw new Error(`Security Guard Violation: PRODUCTION_PUBLISH is strictly prohibited on ref '${ciRef}'. Only 'refs/heads/main' is permitted. Halting pipeline (Fail-Closed).`);
    }
    if (!autoEnabled) {
      throw new Error('Security Guard Violation: AUTO_COLUMN_ENABLED must be "true" for PRODUCTION_PUBLISH. Halting pipeline (Fail-Closed).');
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Security Guard Violation: OPENAI_API_KEY is missing in PRODUCTION_PUBLISH mode. Halting pipeline (Fail-Closed).');
    }
    if (mockTitleGenerator || mockBodyGenerator || mockKnowledge) {
      throw new Error('Security Guard Violation: Mock generator is strictly prohibited in PRODUCTION_PUBLISH mode.');
    }
    if (process.env.INTENTIONAL_VALIDATOR_FAILURE) {
      throw new Error('Security Guard Violation: INTENTIONAL_VALIDATOR_FAILURE is strictly prohibited in PRODUCTION_PUBLISH mode.');
    }
  }

  const isProductionPublish = isProductionRequested;
  const isDryRun = !isProductionPublish;

  console.log('⚙️ Configuration State:', {
    AUTO_COLUMN_ENABLED: autoEnabled,
    FORCE_PUBLISH: forcePublish,
    RUN_MODE: isProductionPublish ? 'PRODUCTION_PUBLISH' : 'DRY_RUN (Preview & Artifact Only)',
    API_KEY_CONFIGURED: !!apiKey,
    TEST_QA_TARGET: testQATargetInput || 'auto (rotation planner)'
  });

  if (!isProductionPublish && !apiKey && !mockTitleGenerator) {
    console.warn('⚠️ OPENAI_API_KEY is not set. Running in Offline Mock Test Mode.');
  }

  // QA Override isolation
  let isQAOverrideRequested = false;
  let qaTarget = null;

  if (isProductionPublish) {
    if (testQATargetInput && testQATargetInput.trim() !== '' && testQATargetInput.trim() !== 'auto') {
      console.warn(`⚠️ WARNING: Running in PRODUCTION_PUBLISH mode. TEST_QA_TARGET ('${testQATargetInput}') is strictly ignored in production.`);
    }
    console.log('🎯 QA Override Active: NO (rotation planner strictly enforced in production)');
  } else {
    // DRY_RUN mode
    if (testQATargetInput && testQATargetInput.trim() !== '' && testQATargetInput.trim() !== 'auto') {
      qaTarget = findQATarget(testQATargetInput);
      if (!qaTarget) {
        throw new Error(`Requested QA target '${testQATargetInput}' could not be resolved in qa_targets.json.`);
      }
      isQAOverrideRequested = true;
      console.log(`🎯 QA Override Active: YES (${qaTarget.qaId} - ${qaTarget.displayDisease})`);
    } else {
      console.log('🎯 QA Override Active: NO (rotation planner)');
    }
  }

  const telemetry = {
    lunaInTokens: 0,
    lunaOutTokens: 0,
    terraInTokens: 0,
    terraOutTokens: 0,
    imageCount: 0
  };

  const history = loadHistory(historyPath);
  const rejectedTitles = new Set();
  const rejectedPlanKeys = new Set();
  const retryReport = {
    attempts: [],
    rejectedTitles: [],
    finalPlan: null,
    totalTitleRegens: 0,
    totalBodyGens: 0,
    success: false
  };

  let totalTitleRegenCount = 0;
  let totalBodyGenCount = 0;
  let totalImageGenCount = 0;
  let winningPlan = null;
  let winningOutline = null;
  let winningArticleBody = null;
  let winningThumbnailCopy = null;
  let winningValidation = null;
  let winningKnowledge = null;
  let winningHashtags = null;
  let winningKeywords = null;

  const maxCandidates = isQAOverrideRequested ? 1 : (1 + MAX_FALLBACK_CANDIDATES);

  for (let candidateIdx = 0; candidateIdx < maxCandidates; candidateIdx++) {
    console.log(`\n----------------------------------------------------`);
    console.log(`[Candidate ${candidateIdx + 1}/${maxCandidates}] Evaluating topic candidate...`);

    let currentPlan;
    if (isQAOverrideRequested) {
      const currentQAResults = loadQAResults();
      const existingRecord = currentQAResults.find(r => r.qaId === qaTarget.qaId);
      if (existingRecord && existingRecord.humanReviewStatus === 'approved') {
        console.log(`\n🛑 [SAFETY SKIP] QA Target [${qaTarget.qaId}] is already approved ('approved').`);
        console.log(`Skipping pipeline execution to preserve human-approved baseline.`);
        writeSingleQAResult({
          ...existingRecord,
          notes: '이미 approved 상태이므로 건너뜀 (기존 승인 결과 보존)'
        });
        return;
      }
      currentPlan = buildQAPlan(qaTarget);
    } else {
      try {
        currentPlan = planNextColumn({
          force: forcePublish,
          excludedPlanKeys: rejectedPlanKeys,
          historyPath,
          now
        });
      } catch (err) {
        console.warn(`⚠️ Candidate planning failed: ${err.message}`);
        break;
      }

      if (currentPlan.status === 'daily_limit_reached') {
        console.log(`ℹ️ ${currentPlan.message}`);
        return;
      }
    }

    const planKey = `${currentPlan.geo.id}:${currentPlan.disease.id}:${currentPlan.topicAngle.id}`;
    const stablePlanKey = `${currentPlan.geo.id}|${currentPlan.disease.id}|${currentPlan.topicAngle.id}`;
    if (rejectedPlanKeys.has(planKey) || rejectedPlanKeys.has(stablePlanKey)) {
      console.warn(`⚠️ Plan combination ${planKey} already rejected in this session. Skipping.`);
      continue;
    }

    console.log(`✅ Selected Target: [${currentPlan.geo.displayName}] ${currentPlan.disease.name}`);
    console.log(`📌 Topic Angle: ${currentPlan.topicAngle.titleSuffix}`);
    console.log(`🏷️ Initial Canonical Title: ${currentPlan.titleCandidate}`);
    console.log(`🔗 Slug: ${currentPlan.slug}`);

    // Load and verify approved medical knowledge: FAIL-CLOSED on missing or unapproved knowledge
    let knowledge;
    try {
      knowledge = mockKnowledge || loadMedicalKnowledge(currentPlan.disease.id);
    } catch (err) {
      console.error(`💥 Fatal: Medical knowledge loading error for '${currentPlan.disease.id}': ${err.message}`);
      throw new Error(`Data Integrity Error: Medical knowledge for '${currentPlan.disease.id}' could not be loaded: ${err.message}`);
    }

    if (!knowledge || knowledge.reviewStatus !== 'approved') {
      const status = knowledge ? knowledge.reviewStatus : 'missing';
      console.error(`💥 Fatal: Medical knowledge for '${currentPlan.disease.id}' is '${status}'. Must be 'approved'. Halting pipeline immediately (Fail-Closed).`);
      throw new Error(`Data Integrity Violation: Medical knowledge for '${currentPlan.disease.id}' has status '${status}' (must be 'approved'). Halting pipeline (Fail-Closed).`);
    }

    // Title Evaluation and Regeneration Loop (Initial Canonical 1 attempt + up to 3 AI regenerations = max 4 checks)
    let candidateTitleValid = false;
    let lastConflictingTitle = null;
    let lastSimilarity = 0;

    for (let titleAttempt = 0; titleAttempt <= MAX_TITLE_REGEN_ATTEMPTS; titleAttempt++) {
      let candidateTitle;

      if (titleAttempt === 0) {
        candidateTitle = currentPlan.titleCandidate;
        console.log(`\n  [Title Check 1/4] Inspecting initial canonical title: "${candidateTitle}"`);
      } else {
        if (totalTitleRegenCount >= MAX_TOTAL_TITLE_REGENS) {
          console.warn(`🛑 Absolute total title regeneration ceiling reached (${MAX_TOTAL_TITLE_REGENS}). Halting title regens.`);
          retryReport.attempts.push({
            candidateIdx: candidateIdx + 1,
            planKey,
            errorType: 'MAX_TOTAL_TITLE_REGENS_EXCEEDED',
            error: `Total title regenerations exceeded ${MAX_TOTAL_TITLE_REGENS}`
          });
          break;
        }

        console.log(`\n  [Title Regen ${titleAttempt}/${MAX_TITLE_REGEN_ATTEMPTS}] Calling AI generator for unique title...`);
        candidateTitle = await regenerateArticleTitle(
          currentPlan,
          lastConflictingTitle || currentPlan.titleCandidate,
          lastSimilarity || 0.8,
          Array.from(rejectedTitles),
          apiKey,
          telemetry,
          {
            mockGenerator: mockTitleGenerator,
            isProductionPublish
          }
        );
        totalTitleRegenCount++;
        retryReport.totalTitleRegens = totalTitleRegenCount;
        console.log(`  📝 AI Generated Title Candidate: "${candidateTitle}"`);
      }

      // Check session duplicate (TITLE_DUPLICATE)
      if (rejectedTitles.has(candidateTitle)) {
        console.warn(`  ⚠️ Candidate title "${candidateTitle}" was already rejected in this session.`);
        retryReport.attempts.push({
          candidateIdx: candidateIdx + 1,
          planKey,
          title: candidateTitle,
          errorType: 'TITLE_DUPLICATE_IN_SESSION',
          error: 'Title was already rejected in this execution session.'
        });
        continue;
      }

      // Check title similarity against history (TITLE_SIMILARITY, strictly enforces 0.75 threshold)
      const titleSimCheck = checkTitleSimilarity(candidateTitle, history, 0.75);
      if (!titleSimCheck.valid) {
        console.warn(`  ❌ ${titleSimCheck.error}`);
        rejectedTitles.add(candidateTitle);
        lastConflictingTitle = titleSimCheck.conflictingTitle;
        lastSimilarity = titleSimCheck.maxSimilarity;
        retryReport.attempts.push({
          candidateIdx: candidateIdx + 1,
          planKey,
          title: candidateTitle,
          errorType: 'TITLE_SIMILARITY',
          conflictingTitle: titleSimCheck.conflictingTitle,
          similarity: Number((titleSimCheck.maxSimilarity * 100).toFixed(1)),
          error: titleSimCheck.error
        });
        continue;
      }

      // Check slug collision (SLUG_COLLISION)
      const slugCheck = checkSlugCollision(currentPlan.slug, blogDir, history);
      if (!slugCheck.valid) {
        console.warn(`  ❌ ${slugCheck.error}`);
        rejectedTitles.add(candidateTitle);
        retryReport.attempts.push({
          candidateIdx: candidateIdx + 1,
          planKey,
          title: candidateTitle,
          errorType: 'SLUG_COLLISION',
          slug: currentPlan.slug,
          error: slugCheck.error
        });
        continue;
      }

      // Title passed initial checks! Synchronize title into currentPlan
      currentPlan.titleCandidate = candidateTitle;
      candidateTitleValid = true;
      console.log(`  ✅ Title uniqueness & slug check passed: "${candidateTitle}"`);
      break;
    }

    if (!candidateTitleValid) {
      console.warn(`⚠️ Title attempts exhausted for candidate [${planKey}]. Moving to Level B fallback candidate.`);
      rejectedPlanKeys.add(planKey);
      rejectedPlanKeys.add(stablePlanKey);
      continue;
    }

    // Synchronize SEO disease and hashtags/keywords with the final passed title
    const seoDisease = currentPlan.seoDiseaseLabel || currentPlan.titleDisease || currentPlan.disease.name;
    const cleanSeoDisease = seoDisease.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const hashtags = [
      `${currentPlan.geo.displayName}${cleanSeoDisease}`,
      `${currentPlan.geo.displayName}한의원`,
      `${cleanSeoDisease}치료`,
      `${cleanSeoDisease}관리`,
      `해아림한의원`
    ];
    const keywords = [
      `${currentPlan.geo.displayName} ${seoDisease}`,
      `${currentPlan.geo.fullName} ${seoDisease}`,
      `${seoDisease} 한방치료`,
      `${currentPlan.titleCandidate.replace(/^\[[^\]]+\]\s*/, '')}`
    ];

    // Check body generation ceiling
    if (totalBodyGenCount >= MAX_TOTAL_BODY_GENS) {
      console.error(`🛑 Absolute total body generation ceiling reached (${MAX_TOTAL_BODY_GENS}). Halting.`);
      throw new Error(`Fatal: Absolute total body generation ceiling exceeded (${MAX_TOTAL_BODY_GENS}). Halting pipeline (Fail-Closed).`);
    }

    // Generate outline, article body, thumbnail copy
    console.log('\nGenerating content via OpenAI Models (Luna: Planner, Terra: Writer)...');
    totalBodyGenCount++;
    retryReport.totalBodyGens = totalBodyGenCount;

    const internalLinks = getRecommendedInternalLinks(currentPlan.disease.category, currentPlan.slug);
    const outline = await generateTopicOutline(currentPlan, knowledge, apiKey, telemetry);
    let articleBody;
    if (mockBodyGenerator) {
      articleBody = typeof mockBodyGenerator === 'function' ? mockBodyGenerator(currentPlan, outline, knowledge) : mockBodyGenerator;
    } else if (process.env.INTENTIONAL_VALIDATOR_FAILURE === 'true') {
      articleBody = (await generateArticleBody(currentPlan, outline, knowledge, internalLinks, apiKey, telemetry)) +
        '\n\n## 완치 안내\n해아림한의원에서는 해당 증상의 100% 완치를 보장합니다.';
    } else {
      articleBody = await generateArticleBody(currentPlan, outline, knowledge, internalLinks, apiKey, telemetry);
    }
    const thumbnailCopy = await generateThumbnailCopy(currentPlan, articleBody, apiKey, telemetry);

    console.log('🎨 Thumbnail Copy generated:', thumbnailCopy);
    console.log('📝 Summary generated:', outline.summary);

    // FULL 3-TIER VALIDATION (GLOBAL + GEO CONSISTENCY + CLINICAL SAFETY + TITLE SIMILARITY GATEKEEPER)
    console.log('\nRunning 3-Tier Validator on generated article...');
    const validation = validateArticleContent({
      title: currentPlan.titleCandidate,
      titleDisease: currentPlan.titleDisease,
      thumbnailDiseaseLabel: currentPlan.thumbnailDiseaseLabel,
      seoDiseaseLabel: currentPlan.seoDiseaseLabel,
      summary: outline.summary || '',
      category: currentPlan.disease.category,
      body: articleBody,
      hashtags,
      keywords,
      geoId: currentPlan.geo.id,
      diseaseId: currentPlan.disease.id,
      ageGroup: currentPlan.ageGroup || (currentPlan.qaTarget && currentPlan.qaTarget.ageGroup) || 'mixed',
      topicAngle: currentPlan.topicAngle,
      qaTarget: currentPlan.qaTarget,
      thumbnailCopy,
      knowledge,
      history
    });

    if (!validation.valid) {
      console.error('❌ Full 3-Tier Validation failed with errors:', validation.errors);
      retryReport.attempts.push({
        candidateIdx: candidateIdx + 1,
        planKey,
        title: currentPlan.titleCandidate,
        errorType: 'FULL_VALIDATION_FAILURE',
        errors: validation.errors
      });

      // Save diagnostic artifacts before halting
      const todayIso = getKstIsoString(now);

      const costUSD = (
        (telemetry.lunaInTokens * COST_RATES.lunaIn) +
        (telemetry.lunaOutTokens * COST_RATES.lunaOut) +
        (telemetry.terraInTokens * COST_RATES.terraIn) +
        (telemetry.terraOutTokens * COST_RATES.terraOut) +
        (telemetry.imageCount * COST_RATES.imageUnit)
      );
      const costReport = {
        telemetry,
        costRates: COST_RATES,
        estimatedCostUSD: Number(costUSD.toFixed(5)),
        estimatedCostKRW: Math.round(costUSD * 1350)
      };

      fs.writeFileSync(path.join(artifactDir, 'validation-report.json'), JSON.stringify(validation, null, 2), 'utf-8');
      fs.writeFileSync(path.join(artifactDir, 'retry-report.json'), JSON.stringify(retryReport, null, 2), 'utf-8');
      fs.writeFileSync(path.join(artifactDir, 'generation-metadata.json'), JSON.stringify({
        mode: isProductionPublish ? 'PRODUCTION_FAILED_VALIDATION' : 'DRY_RUN_FAILED_VALIDATION',
        retryReport,
        totalTitleRegens: totalTitleRegenCount,
        totalBodyGens: totalBodyGenCount,
        telemetry,
        generatedAt: todayIso
      }, null, 2), 'utf-8');
      fs.writeFileSync(path.join(artifactDir, 'cost-report.json'), JSON.stringify(costReport, null, 2), 'utf-8');

      // STRICT FAIL-CLOSED: Body, GEO, Prohibited, Clinical or Evidence Validator failures
      // MUST NEVER be bypassed by switching to alternative candidates!
      throw new Error(`Article validation failed: ${validation.errors.join('; ')}. Halting pipeline immediately (Fail-Closed).`);
    }

    // Success! We found our winning candidate
    console.log('🎉 Full 3-Tier Validation passed 100% with 0 errors.');
    winningPlan = currentPlan;
    winningOutline = outline;
    winningArticleBody = articleBody;
    winningThumbnailCopy = thumbnailCopy;
    winningValidation = validation;
    winningKnowledge = knowledge;
    winningHashtags = hashtags;
    winningKeywords = keywords;
    retryReport.success = true;
    retryReport.finalPlan = {
      geoId: currentPlan.geo.id,
      diseaseId: currentPlan.disease.id,
      topicAngleId: currentPlan.topicAngle.id,
      title: currentPlan.titleCandidate,
      slug: currentPlan.slug
    };
    break;
  }

  const todayIso = getKstIsoString();

  const costUSD = (
    (telemetry.lunaInTokens * COST_RATES.lunaIn) +
    (telemetry.lunaOutTokens * COST_RATES.lunaOut) +
    (telemetry.terraInTokens * COST_RATES.terraIn) +
    (telemetry.terraOutTokens * COST_RATES.terraOut) +
    (telemetry.imageCount * COST_RATES.imageUnit)
  );

  const costReport = {
    telemetry,
    costRates: COST_RATES,
    estimatedCostUSD: Number(costUSD.toFixed(5)),
    estimatedCostKRW: Math.round(costUSD * 1350)
  };

  retryReport.rejectedTitles = Array.from(rejectedTitles);

  if (!winningPlan) {
    console.error('🛑 HALTING PIPELINE: All candidates and title retries failed.');
    console.warn('Background image generation and Sharp synthesis were ABORTED (0 image API calls).');
    console.warn('No content files written, 0 commits generated.');

    // Save diagnostic artifacts without secrets, full prompts, or drafts
    fs.writeFileSync(path.join(artifactDir, 'validation-report.json'), JSON.stringify({
      valid: false,
      errors: retryReport.attempts.map(a => a.error || (a.errors ? a.errors.join('; ') : a.errorType)),
      warnings: []
    }, null, 2), 'utf-8');

    fs.writeFileSync(path.join(artifactDir, 'retry-report.json'), JSON.stringify(retryReport, null, 2), 'utf-8');

    fs.writeFileSync(path.join(artifactDir, 'generation-metadata.json'), JSON.stringify({
      mode: isProductionPublish ? 'PRODUCTION_FAILED_VALIDATION' : 'DRY_RUN_FAILED_VALIDATION',
      retryReport,
      totalTitleRegens: totalTitleRegenCount,
      telemetry,
      generatedAt: todayIso
    }, null, 2), 'utf-8');

    fs.writeFileSync(path.join(artifactDir, 'cost-report.json'), JSON.stringify(costReport, null, 2), 'utf-8');

    throw new Error(`Article validation and title retry failed. Exhausted all ${maxCandidates} candidate(s). Check auto_column_artifacts/retry-report.json`);
  }

  // 5. Generate Thumbnail & Composite (ONLY REACHED AFTER 100% VALIDATION PASS)
  console.log('\n[5/6] Validation passed. Generating background image & compositing 16:10 column-list thumbnail...');
  if (totalImageGenCount >= MAX_TOTAL_IMAGE_GENS) {
    throw new Error(`Fatal: Image generation ceiling exceeded (${MAX_TOTAL_IMAGE_GENS}). Halting pipeline (Fail-Closed).`);
  }
  totalImageGenCount++;
  const bgImageBuffer = await generateBackgroundImage(
    winningPlan.disease.id,
    winningPlan.disease.name,
    winningPlan.topicAngle.id,
    winningPlan.topicAngle.focus,
    apiKey,
    telemetry,
    winningPlan.ageGroup || (winningPlan.qaTarget && winningPlan.qaTarget.ageGroup) || 'mixed'
  );

  const thumbFilename = `${winningPlan.slug}.jpg`;
  const thumbRelativePath = `images/blog/${thumbFilename}`;
  const localThumbPath = isDryRun 
    ? path.join(artifactDir, thumbFilename)
    : path.join(__dirname, '../../static/images/blog', thumbFilename);

  await compositeThumbnail({
    bgImageBuffer,
    outputPath: localThumbPath,
    categoryName: winningPlan.disease.categoryName || winningPlan.disease.name,
    category: winningPlan.disease.category,
    yellowText: winningThumbnailCopy.yellowText,
    whiteText: winningThumbnailCopy.whiteText,
    greenText: winningThumbnailCopy.greenText
  });
  console.log(`🖼️ Thumbnail successfully created at: ${localThumbPath}`);

  // 6. Build Final Front Matter & Markdown Document
  const blogCategory = resolveBlogCategory(winningPlan.disease.id, winningPlan.topicAngle.id, winningPlan.disease.category);
  const hashtagsYaml = winningHashtags.map(h => `  - "${h}"`).join('\n');
  const keywordsYaml = winningKeywords.map(k => `  - "${k}"`).join('\n');

  const finalMarkdown = `---
title: "${winningPlan.titleCandidate.replace(/"/g, '\\"')}"
date: ${todayIso}
category: "${blogCategory}"
category_name: "${winningPlan.disease.categoryName}"
author: "손지웅 대표원장"
image: "${thumbRelativePath}"
summary: "${(winningOutline.summary || '').replace(/"/g, '\\"')}"
hashtags:
${hashtagsYaml}
keywords:
${keywordsYaml}
---

${winningArticleBody}
`;

  const metadataReport = {
    mode: isProductionPublish ? 'PRODUCTION_PUBLISH' : 'DRY_RUN',
    reviewStatusNotice: winningKnowledge.reviewStatus !== 'approved' ? 'DRY RUN - MEDICAL KNOWLEDGE NOT YET HUMAN APPROVED' : 'HUMAN APPROVED',
    plan: winningPlan,
    thumbnailCopy: winningThumbnailCopy,
    internalLinks: winningValidation.internalLinks,
    retryReport,
    imageMetrics: {
      imageGenerationAttempts: telemetry.imageGenerationAttempts || 0,
      imageModerationRetries: telemetry.imageModerationRetries || 0,
      imageGenerationStatus: telemetry.imageGenerationStatus || 'none'
    },
    modelsUsed: {
      planner: process.env.OPENAI_PLANNER_MODEL || 'gpt-5.6-luna',
      writer: process.env.OPENAI_WRITER_MODEL || 'gpt-5.6-terra',
      image: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    },
    generatedAt: todayIso
  };

  // Always write artifacts for traceability
  fs.writeFileSync(path.join(artifactDir, 'article.md'), finalMarkdown, 'utf-8');
  fs.writeFileSync(path.join(artifactDir, 'validation-report.json'), JSON.stringify(winningValidation, null, 2), 'utf-8');
  fs.writeFileSync(path.join(artifactDir, 'retry-report.json'), JSON.stringify(retryReport, null, 2), 'utf-8');
  fs.writeFileSync(path.join(artifactDir, 'generation-metadata.json'), JSON.stringify(metadataReport, null, 2), 'utf-8');
  fs.writeFileSync(path.join(artifactDir, 'cost-report.json'), JSON.stringify(costReport, null, 2), 'utf-8');

  if (isDryRun) {
    console.log('\n[6/6] Outputting Dry-Run Artifacts (No Git Commit)...');
    console.log('📦 Dry-run artifacts generated in: auto_column_artifacts/');
    console.log('📊 Telemetry Cost Summary:', costReport);

    if (winningPlan.qaId) {
      recordQAResult({
        qaId: winningPlan.qaId,
        validationPassed: true,
        estimatedCostUSD: costReport.estimatedCostUSD,
        articleSlug: winningPlan.slug,
        notes: `Dry-run QA 검증 통과 (${winningPlan.displayDisease || winningPlan.disease.name} - ${winningPlan.topicAngle.titleSuffix})`
      });
    }

    console.log('\n🎉 Phase 1 Dry-Run Completed Successfully. Production repository is 100% UNTOUCHED.');
  } else {
    console.log('\n[6/6] Writing to Production Repository...');
    const articlePath = path.join(blogDir, `${winningPlan.slug}.md`);
    fs.writeFileSync(articlePath, finalMarkdown, 'utf-8');

    // Update history atomically with final synchronized values
    const updatedHistory = [...history, {
      publishDate: todayIso,
      geoId: winningPlan.geo.id,
      displayRegion: winningPlan.geo.displayName,
      parentRegion: winningPlan.geo.parentRegion,
      regionType: winningPlan.geo.regionType,
      disease: winningPlan.disease.id,
      topicAngle: winningPlan.topicAngle.id,
      title: winningPlan.titleCandidate,
      slug: winningPlan.slug
    }];
    fs.writeFileSync(historyPath, JSON.stringify(updatedHistory, null, 2), 'utf-8');

    console.log(`🎉 Column successfully published to production: ${articlePath}`);
  }

  return {
    success: true,
    isDryRun,
    plan: winningPlan,
    validation: winningValidation,
    costReport,
    retryReport
  };
}

if (require.main === module) {
  runAutoColumnPipeline().catch(err => {
    console.error('💥 Pipeline Execution Ended:', err.message);
    process.exit(1);
  });
}

module.exports = {
  runAutoColumnPipeline,
  MAX_TITLE_REGEN_ATTEMPTS,
  MAX_FALLBACK_CANDIDATES,
  MAX_TOTAL_TITLE_REGENS,
  MAX_BODY_GENS_PER_CANDIDATE,
  MAX_TOTAL_BODY_GENS,
  MAX_TOTAL_IMAGE_GENS,
  TITLE_RETRYABLE_ERROR_TYPES,
  FAIL_CLOSED_ERROR_TYPES
};
