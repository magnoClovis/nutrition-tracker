const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const script = fs.readFileSync(path.join(root, "scripts/validate-c08-production.mjs"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/c08-production-validation.yml"), "utf8");
const pantryWorkflow = fs.readFileSync(path.join(root, ".github/workflows/pantry-production-smoke.yml"), "utf8");

test("C08 production validation is bounded, sanitized, and deletes its disposable account", () => {
  assert.match(script, /EXPECTED_CALLS\s*=\s*4/);
  assert.match(script, /evaluations\.length !== EXPECTED_CALLS/);
  assert.match(script, /food-pt/);
  assert.match(script, /dish-en/);
  assert.match(script, /pantry-es/);
  assert.match(script, /narrative-pt/);
  assert.match(script, /finally\s*\{/);
  assert.match(script, /\$\{AUTH_BASE\}:delete/);
  assert.doesNotMatch(script, /console\.(?:log|error)\([^\n]*(?:idToken|password|email|responseBody)/);
});

test("C08 production validation runs only when the latest commit changes its runtime inputs", () => {
  assert.match(workflow, /fetch-depth:\s*2/);
  assert.match(workflow, /git diff --quiet HEAD\^ HEAD/);
  assert.match(workflow, /if: steps\.runtime\.outputs\.changed == 'true'/);
  assert.match(workflow, /node scripts\/validate-c08-production\.mjs/);
  assert.match(workflow, /timeout-minutes:\s*8/);
});

test("the pantry production smoke also avoids repeating a real call after documentation-only commits", () => {
  assert.match(pantryWorkflow, /fetch-depth:\s*2/);
  assert.match(pantryWorkflow, /git diff --quiet HEAD\^ HEAD/);
  assert.match(pantryWorkflow, /if: steps\.runtime\.outputs\.changed == 'true'/);
});
