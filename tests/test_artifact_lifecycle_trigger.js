const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runIntentionalFailureTrigger() {
  console.log('🧪 Starting Artifact Lifecycle Intentional Failure Trigger Test...');

  const rootDir = path.resolve(__dirname, '..');
  const artifactDir = path.join(rootDir, 'auto_column_artifacts');

  // Clean artifact directory prior to execution
  if (fs.existsSync(artifactDir)) {
    for (const f of fs.readdirSync(artifactDir)) {
      try { fs.unlinkSync(path.join(artifactDir, f)); } catch (e) {}
    }
  } else {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('1. Executing auto-column pipeline subprocess with INTENTIONAL_VALIDATOR_FAILURE=true...');
  const fixtureDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'healim-artifact-fixture-'));
  const fixtureHistoryPath = path.join(fixtureDir, 'history.json');
  const fixtureBlogDir = path.join(fixtureDir, 'content_blog');
  fs.writeFileSync(fixtureHistoryPath, '[]', 'utf-8');
  fs.mkdirSync(fixtureBlogDir, { recursive: true });

  const childScript = `
    const { runAutoColumnPipeline } = require('./scripts/auto_column/index');
    runAutoColumnPipeline({
      apiKey: '',
      isDryRun: true,
      historyPath: ${JSON.stringify(fixtureHistoryPath)},
      blogDir: ${JSON.stringify(fixtureBlogDir)},
      artifactDir: ${JSON.stringify(artifactDir)},
      now: new Date('2026-08-07T09:00:00+09:00')
    }).then(() => process.exit(0)).catch(err => {
      console.error('Pipeline Execution Ended:', err.message);
      process.exit(1);
    });
  `;

  const child = spawnSync('node', ['-e', childScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      INTENTIONAL_VALIDATOR_FAILURE: 'true',
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REF: 'refs/pull/3/merge',
      AUTO_COLUMN_ENABLED: 'false',
      FORCE_PUBLISH: 'false',
      OPENAI_API_KEY: '' // Mock / offline execution (0 secrets)
    },
    encoding: 'utf-8'
  });

  const exitCode = child.status;
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';

  try { fs.rmSync(fixtureDir, { recursive: true, force: true }); } catch (e) {}

  console.log(`   Captured Subprocess Exit Code: ${exitCode}`);
  console.log(`   Captured stderr snippet: ${(stderr.slice(0, 300) || '(empty)').replace(/\n/g, ' ')}`);

  // 2. Assert exit code is exactly 1 (Fail-Closed)
  assert.strictEqual(exitCode, 1, `Subprocess must fail-closed with exit code 1, but exited with ${exitCode}`);

  // 3. Assert expected validator error type in stderr / stdout
  const combinedOutput = stdout + '\n' + stderr;
  const hasExpectedError = combinedOutput.includes('Article validation failed') &&
    (combinedOutput.includes('완치') || combinedOutput.includes('금지') || combinedOutput.includes('광고'));
  assert.strictEqual(
    hasExpectedError,
    true,
    'Subprocess output must contain expected validator error (Article validation failed / prohibited medical claim)'
  );
  console.log('✅ Asserted expected validator error type and exit code 1.');

  // 4. Assert all 4 required JSON artifacts were generated
  const expectedFiles = [
    'validation-report.json',
    'retry-report.json',
    'generation-metadata.json',
    'cost-report.json'
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(artifactDir, file);
    assert.strictEqual(fs.existsSync(filePath), true, `Required artifact file '${file}' must exist in auto_column_artifacts/`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, `Artifact '${file}' must not be empty`);
    console.log(`   Found artifact: ${file} (${stat.size} bytes)`);
  }

  // 5. Assert that no content files (.md, .jpg, .webp) exist in auto_column_artifacts
  const actualFiles = fs.readdirSync(artifactDir);
  for (const file of actualFiles) {
    assert.ok(!file.endsWith('.md'), `Content markdown '${file}' must NOT be written on validation failure`);
    assert.ok(!file.endsWith('.jpg'), `Content image '${file}' must NOT be written on validation failure`);
    assert.ok(!file.endsWith('.webp'), `Content webp '${file}' must NOT be written on validation failure`);
  }

  console.log('🎉 Intentional Failure Trigger Test Succeeded! Diagnostic artifacts are ready for CI upload.\n');
}

if (require.main === module) {
  try {
    runIntentionalFailureTrigger();
  } catch (err) {
    console.error('💥 Intentional Failure Trigger Assertion Failed:', err.message);
    process.exit(1);
  }
}

module.exports = {
  runIntentionalFailureTrigger
};
