const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../app-check-client.js'))],
  ['ESM factory', async () => import('../../app-check-client.js').then(() => globalThis.AppCheckClient)],
];

for (const [format, load] of implementations) {
  test(`${format}: initializes Play Integrity once and returns a validated token`, async () => {
    const { createAppCheckClient } = await load();
    const calls = [];
    const plugin = {
      async initialize(options) { calls.push(['initialize', options]); },
      async getToken(options) { calls.push(['getToken', options]); return {token: 'app-check-token'}; },
    };
    const client = createAppCheckClient({
      getPlugin: () => plugin,
      isNativePlatform: () => true,
    });

    await Promise.all([client.initialize(), client.initialize()]);
    assert.equal(await client.getToken(), 'app-check-token');
    assert.deepEqual(calls, [
      ['initialize', {isTokenAutoRefreshEnabled: true}],
      ['getToken', {forceRefresh: false}],
    ]);
  });

  test(`${format}: fails closed on web until reCAPTCHA Enterprise is configured`, async () => {
    const { AppCheckClientError, createAppCheckClient } = await load();
    const client = createAppCheckClient({
      getPlugin: () => null,
      isNativePlatform: () => false,
    });
    await assert.rejects(
      client.getToken(),
      error => error instanceof AppCheckClientError &&
        error.code === 'app-check-web-not-configured',
    );
  });
}
