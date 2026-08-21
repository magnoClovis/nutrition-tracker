const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../account-deletion-client.js'))],
  ['ESM', () => import('../../src/firebase/account-deletion-client.js')],
];

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    clear() { values.clear(); },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    snapshot() { return Object.fromEntries(values); },
  };
}

for (const [format, load] of implementations) {
  test(`${format}: sends Firebase Auth and App Check tokens using the callable protocol`, async () => {
    const { createAccountDeletionClient, REQUEST_ID_KEY } = await load();
    const sessionStorage = memoryStorage();
    const requests = [];
    const client = createAccountDeletionClient({
      sessionStorage,
      randomUUID: () => '12345678-1234-1234-1234-123456789abc',
      functionUrl: 'https://example.test/requestAccountDeletion',
      getIdToken: async () => 'id-token',
      getAppCheckToken: async () => 'app-check-token',
      async fetchRequest(url, options) {
        requests.push({url, options});
        return {
          ok: true,
          async json() {
            return {result: {status: 'accepted', requestId: '12345678-1234-1234-1234-123456789abc'}};
          },
        };
      },
    });

    assert.equal((await client.requestDeletion()).status, 'accepted');
    assert.equal(sessionStorage.getItem(REQUEST_ID_KEY), '12345678-1234-1234-1234-123456789abc');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer id-token');
    assert.equal(requests[0].options.headers['X-Firebase-AppCheck'], 'app-check-token');
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      data: {requestId: '12345678-1234-1234-1234-123456789abc'},
    });
  });

  test(`${format}: reuses the same request id after an ambiguous network failure`, async () => {
    const { AccountDeletionClientError, createAccountDeletionClient } = await load();
    const sessionStorage = memoryStorage();
    const requestIds = [];
    let attempt = 0;
    const client = createAccountDeletionClient({
      sessionStorage,
      randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      functionUrl: 'https://example.test/requestAccountDeletion',
      getIdToken: async () => 'id-token',
      getAppCheckToken: async () => 'app-check-token',
      async fetchRequest(_url, options) {
        requestIds.push(JSON.parse(options.body).data.requestId);
        attempt += 1;
        if (attempt === 1) throw new Error('connection reset');
        return {
          ok: true,
          async json() {
            return {result: {status: 'accepted', requestId: requestIds[0]}};
          },
        };
      },
    });

    await assert.rejects(
      client.requestDeletion(),
      error => error instanceof AccountDeletionClientError &&
        error.code === 'deletion-request-network-failed',
    );
    await client.requestDeletion();
    assert.deepEqual(requestIds, [
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ]);
  });

  test(`${format}: preserves only neutral language/theme preferences during cleanup`, async () => {
    const { clearLocalAccountData } = await load();
    const localStorage = memoryStorage({
      appLang: 'es',
      appDarkMode: 'false',
      appThemeDefaultDarkV1: '1',
      fb_email: 'person@example.test',
      fb_refresh: 'secret-refresh',
      pantry_v2: 'private nutrition',
      goalToastPhrase_2026_08_21: 'hello',
    });
    const sessionStorage = memoryStorage({
      trofia_ai_status: 'private status',
      trofia_account_deletion_request_id: 'request-id',
    });

    clearLocalAccountData({localStorage, sessionStorage});
    assert.deepEqual(localStorage.snapshot(), {
      appLang: 'es',
      appDarkMode: 'false',
      appThemeDefaultDarkV1: '1',
    });
    assert.deepEqual(sessionStorage.snapshot(), {});
  });

  test(`${format}: rejects invalid callable success payloads`, async () => {
    const { AccountDeletionClientError, createAccountDeletionClient } = await load();
    const client = createAccountDeletionClient({
      sessionStorage: memoryStorage(),
      randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      functionUrl: 'https://example.test/requestAccountDeletion',
      getIdToken: async () => 'id-token',
      getAppCheckToken: async () => 'app-check-token',
      fetchRequest: async () => ({ok: true, json: async () => ({result: {status: 'done'}})}),
    });
    await assert.rejects(
      client.requestDeletion(),
      error => error instanceof AccountDeletionClientError &&
        error.code === 'deletion-response-invalid',
    );
  });
}
