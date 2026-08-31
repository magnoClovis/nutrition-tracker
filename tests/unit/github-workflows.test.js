const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const ci = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
const pages = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');
const documentationPreflight = fs.readFileSync(
  path.join(root, '.github', 'workflows', 'documentation-preflight.yml'),
  'utf8'
);

const documentationOnlyPatterns = ['documentation/**', '*.md', '*.txt'];

function matchesDocumentationOnlyPattern(filePath) {
  if (filePath.startsWith('documentation/')) return true;
  if (filePath.includes('/')) return false;
  return filePath.endsWith('.md') || filePath.endsWith('.txt');
}

function heavyCiIsSkipped(changedPaths) {
  return changedPaths.length > 0 && changedPaths.every(matchesDocumentationOnlyPattern);
}

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

test('skips heavy CI only when every changed file is documentation-only', () => {
  for (const pattern of documentationOnlyPatterns) {
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurrences = ci.match(new RegExp(`- ['"]${escapedPattern}['"]`, 'g')) || [];
    assert.equal(occurrences.length, 2, `${pattern} must be ignored for push and pull_request`);
  }

  assert.equal(
    heavyCiIsSkipped(['documentation/README.md', 'documentation/estado-atual/ROADMAP.md']),
    true
  );
  assert.equal(heavyCiIsSkipped(['README.md', 'bug-inventory.txt']), true);
  assert.equal(heavyCiIsSkipped(['documentation/README.md', 'src/App.jsx']), false);
  assert.equal(heavyCiIsSkipped(['README.md', '.github/workflows/ci.yml']), false);
  assert.equal(heavyCiIsSkipped(['docs/README.md']), false);
});

test('runs a lightweight preflight for documentation path changes', () => {
  assert.match(documentationPreflight, /name:\s*Documentation preflight/);
  assert.match(documentationPreflight, /paths:[\s\S]*'documentation\/\*\*'[\s\S]*'\*\.md'[\s\S]*'\*\.txt'/);
  assert.match(documentationPreflight, /scripts\/preflight-release\.ps1/);
  assert.doesNotMatch(documentationPreflight, /npm ci|playwright|test:smoke|test:unit/);
});
