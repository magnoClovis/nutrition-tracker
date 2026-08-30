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
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  assert.match(workflow, /FIREBASE_APPCHECK_DEBUG_TOKEN:\s*\$\{\{ secrets\.FIREBASE_APPCHECK_DEBUG_TOKEN \}\}/);
  assert.match(config, /globalSetup: require\.resolve\('\.\/tests\/smoke\/app-check-global-setup\.js'\)/);
  assert.match(config, /FIREBASE_APPCHECK_DEBUG_TOKEN \? 'off' : 'retain-on-failure'/);
  const fixture = fs.readFileSync(path.join(root, 'tests/smoke/app-check-fixture.js'), 'utf8');
  assert.match(fixture, /page\.route\(`\$\{FIRESTORE_ORIGIN\}\/\*\*`/);
});
