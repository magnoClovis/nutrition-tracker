const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  FIRESTORE_ORIGIN,
  buildFirestoreHeaders,
  exchangeDebugToken,
  installCiAppCheck,
  readCiAppCheckConfig,
} = require('../smoke/app-check-ci');

test('reads App Check CI secrets without accepting blank values', () => {
  assert.deepEqual(readCiAppCheckConfig({
    FIREBASE_APPCHECK_DEBUG_TOKEN: ' debug-secret ',
    VITE_FIREBASE_WEB_APP_ID: ' web-app ',
  }), { debugToken: 'debug-secret', appId: 'web-app' });
  assert.deepEqual(readCiAppCheckConfig({}), { debugToken: '', appId: '' });
});

test('exchanges the registered debug secret for a short-lived App Check token', async () => {
  const calls = [];
  const token = await exchangeDebugToken({
    debugToken: 'registered-debug-secret',
    appId: '1:123:web:abc',
    async fetchRequest(url, init) {
      calls.push({ url, init });
      return { ok: true, async json() { return { token: ' short-lived-token ', ttl: '3600s' }; } };
    },
  });

  assert.equal(token, 'short-lived-token');
  assert.match(calls[0].url, /firebaseappcheck\.googleapis\.com\/v1\/projects\/123\/apps\/1%3A123%3Aweb%3Aabc:exchangeDebugToken\?key=/);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    debugToken: 'registered-debug-secret',
    limitedUse: false,
  });
  await assert.rejects(exchangeDebugToken({
    debugToken: 'secret',
    appId: '1:123:web:abc',
    async fetchRequest() { return { ok: false }; },
  }), /app-check-ci-exchange-failed/);
  await assert.rejects(exchangeDebugToken({
    debugToken: 'secret',
    appId: 'not-a-firebase-app-id',
    async fetchRequest() { return { ok: true }; },
  }), /app-check-ci-app-id-invalid/);
});

test('installs the SDK debug provider and builds protected legacy REST headers', () => {
  const previous = globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN;
  try {
    installCiAppCheck('debug-secret');
    const headers = buildFirestoreHeaders({ authorization: 'Bearer id-token' }, 'short-lived-token');
    const preserved = buildFirestoreHeaders({ 'x-firebase-appcheck': 'sdk-token' }, 'short-lived-token');

    assert.equal(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN, 'debug-secret');
    assert.equal(headers['X-Firebase-AppCheck'], 'short-lived-token');
    assert.equal(headers.authorization, 'Bearer id-token');
    assert.equal(preserved['x-firebase-appcheck'], 'sdk-token');
  } finally {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = previous;
  }
});

test('wires the secret only into smoke CI and disables secret-bearing traces', () => {
  const root = path.resolve(__dirname, '..', '..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const pagesWorkflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  const pantryWorkflow = fs.readFileSync(path.join(root, '.github/workflows/pantry-production-smoke.yml'), 'utf8');
  const pantrySmoke = fs.readFileSync(path.join(root, 'scripts/smoke-pantry-production.mjs'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  const cutoverConfig = fs.readFileSync(path.join(root, 'playwright.cutover.config.js'), 'utf8');
  const pagesConfig = fs.readFileSync(path.join(root, 'playwright.pages.config.js'), 'utf8');
  assert.match(workflow, /FIREBASE_APPCHECK_DEBUG_TOKEN:\s*\$\{\{ secrets\.FIREBASE_APPCHECK_DEBUG_TOKEN \}\}/);
  assert.match(pagesWorkflow, /FIREBASE_APPCHECK_DEBUG_TOKEN:\s*\$\{\{ secrets\.FIREBASE_APPCHECK_DEBUG_TOKEN \}\}/);
  assert.match(pantryWorkflow, /FIREBASE_APPCHECK_DEBUG_TOKEN:\s*\$\{\{ secrets\.FIREBASE_APPCHECK_DEBUG_TOKEN \}\}/);
  assert.match(pantryWorkflow, /VITE_FIREBASE_WEB_APP_ID:\s*\$\{\{ vars\.VITE_FIREBASE_WEB_APP_ID \}\}/);
  assert.match(pantrySmoke, /exchangeDebugToken\(readCiAppCheckConfig\(\)\)/);
  assert.match(pantrySmoke, /"X-Firebase-AppCheck": appCheckToken/);
  assert.match(config, /globalSetup: require\.resolve\('\.\/tests\/smoke\/app-check-global-setup\.js'\)/);
  assert.match(config, /FIREBASE_APPCHECK_DEBUG_TOKEN \? 'off' : 'retain-on-failure'/);
  assert.match(cutoverConfig, /globalSetup: require\.resolve\('\.\/tests\/smoke\/app-check-global-setup\.js'\)/);
  assert.match(cutoverConfig, /FIREBASE_APPCHECK_DEBUG_TOKEN \? 'off' : 'retain-on-failure'/);
  assert.match(pagesConfig, /FIREBASE_APPCHECK_DEBUG_TOKEN \? 'off' : 'retain-on-failure'/);
  const fixture = fs.readFileSync(path.join(root, 'tests/smoke/app-check-fixture.js'), 'utf8');
  assert.match(fixture, /target\.route\(`\$\{FIRESTORE_ORIGIN\}\/\*\*`/);
  assert.match(fixture, /module\.exports = \{ expect, installCiAppCheckForContext, installCiAppCheckForTarget, test \}/);
  const cutover = fs.readFileSync(path.join(root, 'tests/smoke/cutover-visual-matrix.spec.js'), 'utf8');
  assert.match(cutover, /await installCiAppCheckForContext\(context\)/);
});

test('installs the debug provider for Pages without granting Firestore headers', async () => {
  const { installCiAppCheckForTarget } = require('../smoke/app-check-fixture');
  const calls = [];
  const target = {
    async addInitScript(fn, value) { calls.push(['script', fn, value]); },
    async route() { calls.push(['route']); },
  };

  await installCiAppCheckForTarget(target, {
    credentialsAvailable: false,
    env: { FIREBASE_APPCHECK_DEBUG_TOKEN: 'pages-debug-secret' },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'script');
  assert.equal(calls[0][2], 'pages-debug-secret');
});

test('keeps authenticated Firestore setup fail-closed when its exchanged token is absent', async () => {
  const { installCiAppCheckForTarget } = require('../smoke/app-check-fixture');
  const target = {
    async addInitScript() {},
    async route() { throw new Error('route must not be installed'); },
  };

  await assert.rejects(installCiAppCheckForTarget(target, {
    credentialsAvailable: true,
    env: { FIREBASE_APPCHECK_DEBUG_TOKEN: 'registered-debug-secret' },
  }), /app-check-ci-token-unavailable/);
});
