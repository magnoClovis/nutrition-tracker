const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../app-check-client.js'))],
  ['ESM factory', async () => import('../../app-check-client.js').then(() => globalThis.AppCheckClient)],
];

for (const [format, load] of implementations) {
  test(`${format}: accepts only a non-expired native Play Integrity token`, async () => {
    const { AppCheckClientError, normalizeNativeAppCheckToken } = await load();
    assert.deepEqual(
      normalizeNativeAppCheckToken({token: 'native', expireTimeMillis: 2_000}, 1_000),
      {token: 'native', expireTimeMillis: 2_000},
    );
    for (const result of [
      null,
      {token: ' ', expireTimeMillis: 2_000},
      {token: 'native'},
      {token: 'native', expireTimeMillis: 1_000},
    ]) {
      assert.throws(
        () => normalizeNativeAppCheckToken(result, 1_000),
        error => error instanceof AppCheckClientError && error.code === 'app-check-token-invalid',
      );
    }
  });

  test(`${format}: preserves the frozen legacy native and web adapters`, async t => {
    const { createAppCheckClient } = await load();
    await t.test('native', async () => {
      const calls = [];
      const plugin = {
        async initialize(options) { calls.push(['initialize', options]); },
        async getToken(options) { calls.push(['getToken', options]); return {token: 'legacy-native'}; },
      };
      const client = createAppCheckClient({
        getPlugin: () => plugin,
        isNativePlatform: () => true,
      });
      assert.equal(await client.getToken(), 'legacy-native');
      assert.deepEqual(calls, [
        ['initialize', {isTokenAutoRefreshEnabled: true}],
        ['getToken', {forceRefresh: false}],
      ]);
    });
    await t.test('web', async () => {
      const calls = [];
      const client = createAppCheckClient({
        getPlugin: () => null,
        isNativePlatform: () => false,
        async initializeWeb() { calls.push('initialize'); },
        async getWebToken() { calls.push('token'); return 'legacy-web'; },
      });
      assert.equal(await client.getToken(), 'legacy-web');
      assert.deepEqual(calls, ['initialize', 'token']);
    });
  });

  test(`${format}: initializes the Play Integrity CustomProvider bridge once`, async () => {
    const { createAppCheckClient } = await load();
    const calls = [];
    const client = createAppCheckClient({
      isNativePlatform: () => true,
      async initializeNativeBridge() { calls.push('initializeNativeBridge'); },
      async getSdkToken() { calls.push('getSdkToken'); return {token: 'native-sdk-token'}; },
    });

    await Promise.all([client.initialize(), client.initialize()]);
    assert.equal(await client.getToken(), 'native-sdk-token');
    assert.deepEqual(calls, ['initializeNativeBridge', 'getSdkToken']);
  });

  test(`${format}: initializes reCAPTCHA Enterprise once on web`, async () => {
    const { createAppCheckClient } = await load();
    const calls = [];
    const client = createAppCheckClient({
      isNativePlatform: () => false,
      async initializeWeb() { calls.push('initializeWeb'); },
      async getSdkToken() { calls.push('getSdkToken'); return {token: 'web-sdk-token'}; },
    });

    await Promise.all([client.initialize(), client.initialize()]);
    assert.equal(await client.getToken(), 'web-sdk-token');
    assert.deepEqual(calls, ['initializeWeb', 'getSdkToken']);
  });

  test(`${format}: fails closed when the selected provider is absent`, async t => {
    const { AppCheckClientError, createAppCheckClient } = await load();
    await t.test('web', async () => {
      const client = createAppCheckClient({
        isNativePlatform: () => false,
        async getSdkToken() { return {token: 'unused'}; },
      });
      await assert.rejects(client.getToken(), error =>
        error instanceof AppCheckClientError && error.code === 'app-check-web-not-configured');
    });
    await t.test('native', async () => {
      const client = createAppCheckClient({
        isNativePlatform: () => true,
        async getSdkToken() { return {token: 'unused'}; },
      });
      await assert.rejects(client.getToken(), error =>
        error instanceof AppCheckClientError && error.code === 'app-check-plugin-unavailable');
    });
  });

  test(`${format}: rejects invalid SDK tokens and sanitizes provider failures`, async t => {
    const { AppCheckClientError, createAppCheckClient } = await load();
    await t.test('invalid token', async () => {
      const client = createAppCheckClient({
        isNativePlatform: () => false,
        async initializeWeb() {},
        async getSdkToken() { return {token: ' '}; },
      });
      await assert.rejects(client.getToken(), error =>
        error instanceof AppCheckClientError && error.code === 'app-check-token-invalid');
    });
    await t.test('provider failure', async () => {
      const cause = new Error('provider detail must stay internal');
      const client = createAppCheckClient({
        isNativePlatform: () => true,
        async initializeNativeBridge() {},
        async getSdkToken() { throw cause; },
      });
      await assert.rejects(client.getToken(), error =>
        error instanceof AppCheckClientError &&
        error.code === 'app-check-token-unavailable' && error.cause === cause);
    });
  });
}
