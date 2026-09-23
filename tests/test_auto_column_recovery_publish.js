const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const generatorSource = fs.readFileSync(path.join(root, 'scripts/auto_column/ai_generator.js'), 'utf8');
const pipelineSource = fs.readFileSync(path.join(root, 'scripts/auto_column/index.js'), 'utf8');
const workflowSource = fs.readFileSync(path.join(root, '.github/workflows/auto_publish_column.yml'), 'utf8');

assert.ok(
  generatorSource.includes("'복부를 따뜻하게 유지', '복부 보온', '온열 관리'는 이번 칼럼 본문에서 아예 언급하지 마십시오"),
  'IBS writer prompt must explicitly exclude the phrase that caused the production validator failure'
);

assert.ok(
  pipelineSource.includes("ciEvent === 'workflow_dispatch' && forcePublish"),
  'Manual recovery must require both workflow_dispatch and explicit forcePublish'
);
assert.ok(
  pipelineSource.includes("ciEvent === 'push' && forcePublish && process.env.RECOVERY_PUBLISH === 'true'"),
  'Push recovery must require the path-scoped recovery marker in addition to forcePublish'
);
assert.ok(
  pipelineSource.includes("ciRef !== 'refs/heads/main'"),
  'Manual recovery must retain the main-branch guard'
);

assert.ok(
  workflowSource.includes("- cron: '7 8 * * *'"),
  'Afternoon schedule must be 08:07 UTC (17:07 KST)'
);
assert.ok(
  workflowSource.includes("((github.event_name == 'workflow_dispatch' && inputs.force_publish) || github.event_name == 'push') && 'true' || 'false'"),
  'Workflow must pass force publish only for an explicit dispatch or path-scoped recovery push'
);

assert.ok(
  workflowSource.includes("- '.github/auto-column-recovery-request'"),
  'Push recovery must be scoped to the dedicated one-time request file'
);

const productionCondition = "(github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.force_publish) || (github.event_name == 'push' && env.RECOVERY_PUBLISH == 'true')) && github.ref == 'refs/heads/main' && env.AUTO_COLUMN_ENABLED == 'true'";
assert.strictEqual(
  workflowSource.split(productionCondition).length - 1,
  3,
  'Build, asset verification, and commit/push must share the same guarded production condition'
);

console.log('✅ Auto-column recovery publish safeguards verified.');
