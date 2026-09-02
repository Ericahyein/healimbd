const fs = require('fs');
const path = require('path');

const { planNextColumn, loadHistory } = require('./topic_planner');
const {
  loadMedicalKnowledge,
  generateTopicOutline,
  generateArticleBody,
  generateThumbnailCopy,
  generateBackgroundImage
} = require('./ai_generator');
const { validateArticleContent } = require('./content_validator');
const { compositeThumbnail } = require('./thumbnail_engine');
const { getRecommendedInternalLinks } = require('./internal_linker');

// Telemetry & Cost Estimation Constants
const COST_RATES = {
  lunaIn: 0.20 / 1000000,    // $0.20 per 1M tokens
  lunaOut: 0.80 / 1000000,   // $0.80 per 1M tokens
  terraIn: 2.50 / 1000000,   // $2.50 per 1M tokens
  terraOut: 10.00 / 1000000, // $10.00 per 1M tokens
  imageUnit: 0.040           // $0.040 per 1024x1024 image
};

async function runAutoColumnPipeline() {
  console.log('====================================================');
  console.log('🚀 Healim Bundang Doctor Column AI Pipeline Starting');
  console.log('====================================================');

  const apiKey = process.env.OPENAI_API_KEY || '';
  const autoEnabled = process.env.AUTO_COLUMN_ENABLED === 'true';
  const forcePublish = process.env.FORCE_PUBLISH === 'true';
  const isDryRun = !autoEnabled && !forcePublish;

  console.log('⚙️ Configuration State:', {
    AUTO_COLUMN_ENABLED: autoEnabled,
    FORCE_PUBLISH: forcePublish,
    RUN_MODE: isDryRun ? 'DRY_RUN (Preview & Artifact Only)' : 'PRODUCTION_PUBLISH',
    API_KEY_CONFIGURED: !!apiKey
  });

  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY is not set. Running in Offline Mock Test Mode.');
  }

  const telemetry = {
    lunaInTokens: 0,
    lunaOutTokens: 0,
    terraInTokens: 0,
    terraOutTokens: 0,
    imageCount: 0
  };

  // 1. Topic Planning & History Check
  console.log('\n[1/6] Planning next column with geo & disease rotation...');
  const plan = planNextColumn({ force: forcePublish });
  if (plan.status === 'daily_limit_reached') {
    console.log(`ℹ️ ${plan.message}`);
    return;
  }

  console.log(`✅ Selected Target: [${plan.geo.displayName}] ${plan.disease.name}`);
  console.log(`📌 Topic Angle: ${plan.topicAngle.titleSuffix}`);
  console.log(`🏷️ Canonical Title: ${plan.titleCandidate}`);
  console.log(`🔗 Slug: ${plan.slug}`);

  // 2. Load Medical Knowledge Grounding
  console.log('\n[2/6] Loading approved medical knowledge...');
  const knowledge = loadMedicalKnowledge(plan.disease.id);
  console.log(`📖 Medical Knowledge Loaded (${knowledge.diseaseId}): reviewStatus = '${knowledge.reviewStatus}'`);

  if (!isDryRun && knowledge.reviewStatus !== 'approved') {
    console.error(`❌ Cannot publish to production: Medical knowledge for '${plan.disease.id}' is '${knowledge.reviewStatus}'. Must be 'approved' by medical director.`);
    process.exit(1);
  }

  // 3. AI Generation (Luna: Outline & Summary & Copy, Terra: Article Body)
  console.log('\n[3/6] Generating content via OpenAI Models (Luna: Planner, Terra: Writer)...');
  const internalLinks = getRecommendedInternalLinks(plan.disease.category, plan.slug);
  const outline = await generateTopicOutline(plan, knowledge, apiKey, telemetry);
  const articleBody = await generateArticleBody(plan, outline, knowledge, internalLinks, apiKey, telemetry);
  const thumbnailCopy = await generateThumbnailCopy(plan, articleBody, apiKey, telemetry);

  console.log('🎨 Thumbnail Copy generated:', thumbnailCopy);
  console.log('📝 Summary generated:', outline.summary);

  // Dynamic consistent Geo hashtags & keywords (Strictly limited to current GEO)
  const hashtags = [
    `${plan.geo.displayName}${plan.disease.name.replace(/[^가-힣a-zA-Z0-9]/g, '')}`,
    `${plan.geo.displayName}한의원`,
    `${plan.disease.name}치료`,
    `${plan.disease.name}관리`,
    `해아림한의원`
  ];
  const keywords = [
    `${plan.geo.displayName} ${plan.disease.name}`,
    `${plan.geo.fullName} ${plan.disease.name}`,
    `${plan.disease.name} 한방치료`,
    `${plan.topicAngle.titleSuffix}`
  ];

  // 4. 3-Tier Content, GEO Consistency & Medical Safety Validation (STRICT GATEKEEPER)
  console.log('\n[4/6] Running 3-Tier Validator (Global + GEO Consistency + Disease Specific)...');
  const history = loadHistory();
  const validation = validateArticleContent({
    title: plan.titleCandidate,
    summary: outline.summary || '',
    category: plan.disease.category,
    body: articleBody,
    hashtags,
    keywords,
    geoId: plan.geo.id,
    diseaseId: plan.disease.id,
    thumbnailCopy,
    knowledge,
    history
  });

  if (!validation.valid) {
    console.error('❌ Validation Failed with errors:', validation.errors);
    console.warn('🛑 HALTING PIPELINE: Background image generation and Sharp synthesis are ABORTED to avoid unnecessary API costs.');

    if (isDryRun) {
      const artifactDir = path.join(__dirname, '../../auto_column_artifacts');
      if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

      fs.writeFileSync(path.join(artifactDir, 'validation-report.json'), JSON.stringify(validation, null, 2), 'utf-8');
      fs.writeFileSync(path.join(artifactDir, 'generation-metadata.json'), JSON.stringify({
        mode: 'DRY_RUN_FAILED_VALIDATION',
        plan,
        thumbnailCopy,
        internalLinks: validation.internalLinks,
        errors: validation.errors,
        telemetry,
        generatedAt: new Date().toISOString()
      }, null, 2), 'utf-8');
    }

    throw new Error(`Article validation failed with ${validation.errors.length} error(s). Check auto_column_artifacts/validation-report.json`);
  }

  console.log('✅ 3-Tier Article validation passed 100% with 0 errors.');
  console.log(`🔗 Verified internal links attached: ${validation.internalLinks.length}`);
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Validation Warnings:', validation.warnings);
  }

  // 5. Generate Thumbnail & Composite (ONLY REACHED AFTER 100% VALIDATION PASS)
  console.log('\n[5/6] Validation passed. Generating background image & compositing 800x800 thumbnail...');
  const bgImageBuffer = await generateBackgroundImage(plan.disease.id, plan.disease.name, plan.topicAngle.focus, apiKey, telemetry);

  const thumbFilename = `${plan.slug}.jpg`;
  const thumbRelativePath = `images/blog/${thumbFilename}`;
  const localThumbPath = isDryRun 
    ? path.join(__dirname, '../../auto_column_artifacts', thumbFilename)
    : path.join(__dirname, '../../static/images/blog', thumbFilename);

  await compositeThumbnail({
    bgImageBuffer,
    outputPath: localThumbPath,
    yellowText: thumbnailCopy.yellowText,
    whiteText: thumbnailCopy.whiteText,
    greenText: thumbnailCopy.greenText
  });
  console.log(`🖼️ Thumbnail successfully created at: ${localThumbPath}`);

  // 6. Build Final Front Matter & Markdown Document
  const todayIso = new Date().toISOString();
  const hashtagsYaml = hashtags.map(h => `  - "${h}"`).join('\n');
  const keywordsYaml = keywords.map(k => `  - "${k}"`).join('\n');

  const finalMarkdown = `---
title: "${plan.titleCandidate.replace(/"/g, '\\"')}"
date: ${todayIso}
category: "${plan.disease.category}"
category_name: "${plan.disease.categoryName}"
author: "손지웅 대표원장"
image: "${thumbRelativePath}"
summary: "${(outline.summary || '').replace(/"/g, '\\"')}"
hashtags:
${hashtagsYaml}
keywords:
${keywordsYaml}
---

${articleBody}
`;

  // Calculate Cost Telemetry
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

  const metadataReport = {
    mode: isDryRun ? 'DRY_RUN' : 'PRODUCTION_PUBLISH',
    reviewStatusNotice: knowledge.reviewStatus !== 'approved' ? 'DRY RUN - MEDICAL KNOWLEDGE NOT YET HUMAN APPROVED' : 'HUMAN APPROVED',
    plan,
    thumbnailCopy,
    internalLinks: validation.internalLinks,
    modelsUsed: {
      planner: process.env.OPENAI_PLANNER_MODEL || 'gpt-5.6-luna',
      writer: process.env.OPENAI_WRITER_MODEL || 'gpt-5.6-terra',
      image: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    },
    generatedAt: todayIso
  };

  if (isDryRun) {
    console.log('\n[6/6] Outputting Dry-Run Artifacts (No Git Commit)...');
    const artifactDir = path.join(__dirname, '../../auto_column_artifacts');
    if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

    fs.writeFileSync(path.join(artifactDir, 'article.md'), finalMarkdown, 'utf-8');
    fs.writeFileSync(path.join(artifactDir, 'validation-report.json'), JSON.stringify(validation, null, 2), 'utf-8');
    fs.writeFileSync(path.join(artifactDir, 'generation-metadata.json'), JSON.stringify(metadataReport, null, 2), 'utf-8');
    fs.writeFileSync(path.join(artifactDir, 'cost-report.json'), JSON.stringify(costReport, null, 2), 'utf-8');

    console.log('📦 Dry-run artifacts generated in: auto_column_artifacts/');
    console.log('📊 Telemetry Cost Summary:', costReport);
    console.log('\n🎉 Phase 1 Dry-Run Completed Successfully. Production repository is 100% UNTOUCHED.');
  } else {
    console.log('\n[6/6] Writing to Production Repository...');
    const articlePath = path.join(__dirname, '../../content/blog', `${plan.slug}.md`);
    fs.writeFileSync(articlePath, finalMarkdown, 'utf-8');

    // Update history
    const historyPath = path.join(__dirname, '../../data/auto_column_history.json');
    const updatedHistory = [...history, {
      publishDate: todayIso,
      geoId: plan.geo.id,
      displayRegion: plan.geo.displayName,
      parentRegion: plan.geo.parentRegion,
      regionType: plan.geo.regionType,
      disease: plan.disease.id,
      topicAngle: plan.topicAngle.id,
      title: plan.titleCandidate,
      slug: plan.slug
    }];
    fs.writeFileSync(historyPath, JSON.stringify(updatedHistory, null, 2), 'utf-8');

    console.log(`🎉 Column successfully published to production: ${articlePath}`);
  }
}

if (require.main === module) {
  runAutoColumnPipeline().catch(err => {
    console.error('💥 Pipeline Execution Ended:', err.message);
    process.exit(1);
  });
}

module.exports = {
  runAutoColumnPipeline
};
