const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../firebase-firestore-lifecycle.js'))],
  ['browser namespace', async () => import('../../firebase-firestore-lifecycle.js')
    .then(() => globalThis.FirebaseFirestoreLifecycle)],
];

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

function fixture(api, {
  uid = 'user-a', initial = {}, clearFailure = null, native = false,
} = {}) {
  const calls = [];
  const localStorage = memoryStorage(initial);
  const instances = [];
  let currentUid = uid;
  let resetCount = 0;
  const listeners = [];
  class FakeBroadcastChannel {
    constructor(name) { calls.push(['channel', name]); }
    addEventListener(type, listener) { if (type === 'message') listeners.push(listener); }
    postMessage(message) { calls.push(['broadcast', message]); }
    close() { calls.push(['close']); }
  }
  const sdk = {
    memoryLocalCache() {
      calls.push(['memoryCache']);
      return {kind: 'memory'};
    },
    persistentMultipleTabManager() {
      calls.push(['multipleTabs']);
      return {kind: 'multiple-tabs'};
    },
    persistentLocalCache(settings) {
      calls.push(['persistentCache', settings]);
      return {kind: 'persistent', settings};
    },
    initializeFirestore(app, settings) {
      const instance = {id: instances.length + 1, app, settings};
      instances.push(instance);
      calls.push(['initialize', instance]);
      return instance;
    },
    async disableNetwork(instance) { calls.push(['disable', instance.id]); },
    async terminate(instance) { calls.push(['terminate', instance.id]); },
    async clearIndexedDbPersistence(instance) {
      calls.push(['clear', instance.id]);
      if (clearFailure) throw clearFailure;
    },
    async waitForPendingWrites(instance) { calls.push(['wait', instance.id]); },
  };
  const lifecycle = api.createFirebaseFirestoreLifecycle({
    app: {name: 'trofia-shared'},
    sdk,
    localStorage,
    getUid: () => currentUid,
    resetStorageCaches() { resetCount++; },
    BroadcastChannelCtor: FakeBroadcastChannel,
    settleTabs: async () => { calls.push(['settle']); },
    isNativePlatform: () => native,
  });
  return {
    api, calls, instances, lifecycle, localStorage, listeners,
    resetCount: () => resetCount,
    setUid(value) { currentUid = value; },
  };
}

for (const [format, load] of implementations) {
  test(`${format}: configures a 100 MB persistent multi-tab cache`, async () => {
    const api = await load();
    const f = fixture(api, {native: true});
    const first = f.lifecycle.getFirestore();
    assert.strictEqual(f.lifecycle.getFirestore(), first);
    assert.equal(api.CACHE_SIZE_BYTES, 100 * 1024 * 1024);
    assert.deepEqual(first.settings.localCache.settings, {
      cacheSizeBytes: api.CACHE_SIZE_BYTES,
      tabManager: {kind: 'multiple-tabs'},
    });
  });

  test(`${format}: uses memory on untrusted web and enables persistence only by explicit choice`, async () => {
    const api = await load();
    const f = fixture(api);
    assert.equal(f.lifecycle.getFirestore().settings.localCache.kind, 'memory');
    await f.lifecycle.setTrustedDevice(true);
    assert.equal(f.localStorage.getItem(api.TRUSTED_DEVICE_KEY), 'true');
    assert.equal(f.lifecycle.getFirestore().settings.localCache.kind, 'persistent');
    await f.lifecycle.setTrustedDevice(false);
    assert.equal(f.localStorage.getItem(api.TRUSTED_DEVICE_KEY), null);
    assert.equal(f.lifecycle.getFirestore().settings.localCache.kind, 'memory');
  });

  test(`${format}: purges IndexedDB before assigning its cache to another account`, async () => {
    const api = await load();
    const f = fixture(api, {initial: {[api.CACHE_OWNER_KEY]: 'user-a'}});
    const first = f.lifecycle.getFirestore();
    f.setUid('user-b');
    await f.lifecycle.synchronizeUser('user-b');

    assert.deepEqual(f.calls.filter(call => ['disable', 'terminate', 'clear'].includes(call[0])), [
      ['disable', first.id], ['terminate', first.id], ['clear', first.id],
    ]);
    assert.equal(f.localStorage.getItem(api.CACHE_OWNER_KEY), 'user-b');
    assert.equal(f.localStorage.getItem(api.WRITE_BLOCK_KEY), null);
    assert.notStrictEqual(f.lifecycle.getFirestore(), first);
  });

  test(`${format}: deletion waits for old writes, then blocks replay and retains the lock`, async () => {
    const api = await load();
    const f = fixture(api, {initial: {[api.CACHE_OWNER_KEY]: 'user-a'}});
    const first = f.lifecycle.getFirestore();
    await f.lifecycle.flushBeforeAccountDeletion();
    assert.deepEqual(f.calls.find(call => call[0] === 'wait'), ['wait', first.id]);

    await f.lifecycle.sealAccountDeletion('user-a');
    assert.throws(() => f.lifecycle.assertWritesAllowed(), error =>
      error.code === 'firestore-writes-blocked');
    assert.equal(JSON.parse(f.localStorage.getItem(api.WRITE_BLOCK_KEY)).reason, 'account-deletion');
    assert.equal(f.calls.some(call => call[0] === 'clear'), true);
  });

  test(`${format}: a failed purge remains fail-closed and does not clear ownership`, async () => {
    const api = await load();
    const f = fixture(api, {
      initial: {[api.CACHE_OWNER_KEY]: 'user-a'},
      clearFailure: Object.assign(new Error('another tab'), {code: 'failed-precondition'}),
    });
    f.lifecycle.getFirestore();
    await assert.rejects(f.lifecycle.clearForSignOut('user-a'), error =>
      error.code === 'firestore-cache-cleanup-failed');
    assert.throws(() => f.lifecycle.assertWritesAllowed(), error =>
      error.code === 'firestore-writes-blocked');
    assert.equal(f.localStorage.getItem(api.CACHE_OWNER_KEY), 'user-a');
  });

  test(`${format}: recovers a transient block after restart but never reopens a deleted UID`, async () => {
    const api = await load();
    const transient = fixture(api, {initial: {
      [api.WRITE_BLOCK_KEY]: JSON.stringify({uid: 'user-a', reason: 'sign-out'}),
    }});
    await transient.lifecycle.synchronizeUser('user-a');
    assert.equal(transient.localStorage.getItem(api.WRITE_BLOCK_KEY), null);
    transient.lifecycle.assertWritesAllowed();

    const deleted = fixture(api, {initial: {
      [api.WRITE_BLOCK_KEY]: JSON.stringify({uid: 'user-a', reason: 'account-deletion'}),
    }});
    await assert.rejects(deleted.lifecycle.synchronizeUser('user-a'), error =>
      error.code === 'firestore-deletion-user-blocked');
    assert.throws(() => deleted.lifecycle.assertWritesAllowed(), error =>
      error.code === 'firestore-writes-blocked');
  });

  test(`${format}: remote account deletion blocks this tab and purges its instance`, async () => {
    const api = await load();
    const f = fixture(api, {initial: {[api.CACHE_OWNER_KEY]: 'user-a'}});
    f.lifecycle.getFirestore();
    f.listeners[0]({data: {type: 'purge', uid: 'user-a', reason: 'account-deletion'}});
    await new Promise(resolve => setImmediate(resolve));
    assert.throws(() => f.lifecycle.assertWritesAllowed(), error =>
      error.code === 'firestore-writes-blocked');
    assert.equal(f.calls.some(call => call[0] === 'clear'), true);
  });
}
