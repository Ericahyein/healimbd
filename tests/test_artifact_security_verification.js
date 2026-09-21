const fs = require('fs');
const path = require('path');
const assert = require('assert');

function verifyArtifactSecurityAndSchema(targetDir) {
  console.log('🧪 Starting Artifact Security & Schema Verification Suite...');
  const dir = targetDir || path.resolve(__dirname, '../auto_column_artifacts');
  console.log(`📂 Inspecting artifact directory: ${dir}`);

  assert.strictEqual(fs.existsSync(dir), true, `Target directory '${dir}' does not exist.`);

  // 1. Assert exactly 4 files exist in the artifact directory
  const files = fs.readdirSync(dir).filter(f => !fs.statSync(path.join(dir, f)).isDirectory());
  console.log(`   Found ${files.length} file(s): ${files.join(', ')}`);
  assert.strictEqual(
    files.length,
    4,
    `Artifact directory must contain EXACTLY 4 files. Found ${files.length}: [${files.join(', ')}]`
  );

  const expectedFileNames = [
    'validation-report.json',
    'retry-report.json',
    'generation-metadata.json',
    'cost-report.json'
  ];

  for (const exp of expectedFileNames) {
    assert.ok(files.includes(exp), `Expected artifact '${exp}' is missing from directory.`);
  }

  // 2. Read and parse each JSON file, validating schemas
  const loaded = {};
  for (const f of expectedFileNames) {
    const rawContent = fs.readFileSync(path.join(dir, f), 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      assert.fail(`File '${f}' is not valid JSON: ${e.message}`);
    }
    loaded[f] = { raw: rawContent, json: parsed };
  }

  // Schema: validation-report.json
  const valReport = loaded['validation-report.json'].json;
  assert.strictEqual(typeof valReport.valid, 'boolean', 'validation-report.json must contain boolean "valid"');
  assert.ok(Array.isArray(valReport.errors), 'validation-report.json must contain array "errors"');
  console.log('✅ Schema valid: validation-report.json');

  // Schema: retry-report.json
  const retryReport = loaded['retry-report.json'].json;
  assert.ok(Array.isArray(retryReport.attempts), 'retry-report.json must contain array "attempts"');
  assert.strictEqual(typeof retryReport.totalTitleRegens, 'number', 'retry-report.json must contain number "totalTitleRegens"');
  assert.strictEqual(typeof retryReport.totalBodyGens, 'number', 'retry-report.json must contain number "totalBodyGens"');
  console.log('✅ Schema valid: retry-report.json');

  // Schema: generation-metadata.json
  const genMeta = loaded['generation-metadata.json'].json;
  assert.strictEqual(typeof genMeta.mode, 'string', 'generation-metadata.json must contain string "mode"');
  assert.ok(genMeta.retryReport && typeof genMeta.retryReport === 'object', 'generation-metadata.json must contain object "retryReport"');
  assert.ok(genMeta.telemetry && typeof genMeta.telemetry === 'object', 'generation-metadata.json must contain object "telemetry"');
  assert.strictEqual(typeof genMeta.generatedAt, 'string', 'generation-metadata.json must contain string "generatedAt"');
  console.log('✅ Schema valid: generation-metadata.json');

  // Schema: cost-report.json
  const costReport = loaded['cost-report.json'].json;
  assert.ok(costReport.telemetry && typeof costReport.telemetry === 'object', 'cost-report.json must contain object "telemetry"');
  assert.ok(costReport.costRates && typeof costReport.costRates === 'object', 'cost-report.json must contain object "costRates"');
  assert.strictEqual(typeof costReport.estimatedCostUSD, 'number', 'cost-report.json must contain number "estimatedCostUSD"');
  assert.strictEqual(typeof costReport.estimatedCostKRW, 'number', 'cost-report.json must contain number "estimatedCostKRW"');
  console.log('✅ Schema valid: cost-report.json');

  // 3. Security, Privacy & Secret Scanning across ALL 4 files
  console.log('\n🔒 Running Security, Privacy & Secret Audit on Artifact Contents...');
  for (const f of expectedFileNames) {
    const content = loaded[f].raw;

    // Secret check: OpenAI API keys (sk-...)
    const apiKeyMatch = content.match(/sk-[a-zA-Z0-9_-]{20,}/);
    assert.strictEqual(apiKeyMatch, null, `SECURITY VIOLATION: Found potential OpenAI API key in ${f}`);

    // Secret check: Bearer tokens
    const bearerMatch = content.match(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/i);
    assert.strictEqual(bearerMatch, null, `SECURITY VIOLATION: Found Bearer token in ${f}`);

    // Full Prompt check: raw system prompt or full instruction dumps
    assert.ok(!content.includes('"systemPrompt"'), `SECURITY VIOLATION: Full systemPrompt dumped in ${f}`);
    assert.ok(!content.includes('"fullPrompt"'), `SECURITY VIOLATION: Full prompt dumped in ${f}`);

    // Content check: No full article body or draft dumps
    assert.ok(!content.includes('## 한의학적 변증'), `LEAK VIOLATION: Full medical article body section dumped in ${f}`);

    // Privacy check: Patient resident registration numbers (RRN)
    const rrnMatch = content.match(/\d{6}-[1-4]\d{6}/);
    assert.strictEqual(rrnMatch, null, `PRIVACY VIOLATION: Found resident registration number in ${f}`);

    // Privacy check: Phone numbers
    const phoneMatch = content.match(/010-\d{4}-\d{4}/);
    assert.strictEqual(phoneMatch, null, `PRIVACY VIOLATION: Found phone number in ${f}`);
  }

  console.log('✅ Security, Privacy & Secret Audit passed: 0 API keys, 0 Bearer tokens, 0 prompts, 0 PII leaks.');
  console.log('🎉 ALL ARTIFACT LIFECYCLE & SECURITY AUDITS PASSED 100%!\n');
}

if (require.main === module) {
  const targetDir = process.argv[2] || path.resolve(__dirname, '../auto_column_artifacts');
  try {
    verifyArtifactSecurityAndSchema(targetDir);
  } catch (err) {
    console.error('💥 Artifact Security & Schema Verification Failed:', err.message);
    process.exit(1);
  }
}

module.exports = {
  verifyArtifactSecurityAndSchema
};
