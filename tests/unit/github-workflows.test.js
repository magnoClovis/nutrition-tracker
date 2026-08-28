const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const ci = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
const pages = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');

test('runs authenticated verification only in CI for each SHA', () => {
  assert.match(ci, /NUTRITION_TEST_EMAIL:\s*\$\{\{ secrets\.NUTRITION_TEST_EMAIL \}\}/);
  assert.match(ci, /npm run test:smoke/);
  assert.match(ci, /group:\s*nutrition-authenticated-suite/);
  assert.match(ci, /cancel-in-progress:\s*false/);
  assert.doesNotMatch(pages, /NUTRITION_TEST_(?:EMAIL|PASSWORD)/);
  assert.doesNotMatch(pages, /test:smoke|Full Windows verification|pull_request:/);
});

test('deploys Pages only after successful main CI and checks out its exact SHA', () => {
  assert.match(pages, /workflow_run:[\s\S]*workflows: \[CI\][\s\S]*branches: \[main\]/);
  assert.match(pages, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(pages, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/);
  assert.doesNotMatch(pages, /^\s+quality:/m);
});
