const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../firebase-app-client.js'))],
  ['ESM factory', async () => import('../../firebase-app-client.js').then(() => globalThis.FirebaseAppClient)],
];

for (const [format, load] of implementations) {
  test(`${format}: reuses one named Firebase app for Auth, App Check, and Firestore`, async () => {
    const { createFirebaseAppClient } = await load();
    const initialized = [];
    const client = createFirebaseAppClient({
      getApps: () => [],
      initializeApp(config, name) {
        const app = {config, name};
        initialized.push(app);
        return app;
      },
      getConfig: () => ({FB_KEY: 'api-key', FB_PROJECT: 'project-id'}),
      getAppId: () => 'web-app-id',
    });

    const first = client.getApp();
    assert.strictEqual(client.getApp(), first);
    assert.equal(initialized.length, 1);
    assert.equal(first.name, 'trofia-shared');
    assert.deepEqual(first.config, {
      apiKey: 'api-key',
      appId: 'web-app-id',
      authDomain: 'project-id.firebaseapp.com',
      projectId: 'project-id',
    });
  });

  test(`${format}: adopts an existing shared app without reinitializing`, async () => {
    const { createFirebaseAppClient } = await load();
    const existing = {name: 'trofia-shared'};
    let initializations = 0;
    const client = createFirebaseAppClient({
      getApps: () => [existing],
      initializeApp() { initializations++; },
      getConfig: () => ({FB_KEY: 'api-key', FB_PROJECT: 'project-id'}),
      getAppId: () => 'web-app-id',
    });
    assert.strictEqual(client.getApp(), existing);
    assert.equal(initializations, 0);
  });

  test(`${format}: fails closed without the registered Firebase Web app id`, async () => {
    const { createFirebaseAppClient } = await load();
    const client = createFirebaseAppClient({
      getApps: () => [],
      initializeApp() { throw new Error('must not initialize'); },
      getConfig: () => ({FB_KEY: 'api-key', FB_PROJECT: 'project-id'}),
      getAppId: () => ' ',
    });
    assert.throws(() => client.getApp(), error => error.code === 'firebase-web-app-not-configured');
  });
}
