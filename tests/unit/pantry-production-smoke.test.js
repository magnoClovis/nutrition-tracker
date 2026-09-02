const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const script = fs.readFileSync(path.join(root, "scripts/smoke-pantry-production.mjs"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/pantry-production-smoke.yml"), "utf8");

test("production pantry smoke uses one disposable account and always deletes it", () => {
  assert.match(script, /AUTH_BASE\s*=\s*"https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts"/);
  assert.match(script, /\$\{AUTH_BASE\}:signUp/);
  assert.match(script, /finally\s*\{/);
  assert.match(script, /\$\{AUTH_BASE\}:delete/);
  assert.match(script, /production-endpoint-smoke-failed/);
  assert.doesNotMatch(script, /console\.(?:log|error)\([^\n]*(?:idToken|password|email)/);
});

test("production pantry smoke is limited to pantry contract changes", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /worker\/src\/pantry-suggestions\.js/);
  assert.match(workflow, /scripts\/smoke-pantry-production\.mjs/);
  assert.match(workflow, /timeout-minutes:\s*5/);
  assert.match(workflow, /node scripts\/smoke-pantry-production\.mjs/);
});
