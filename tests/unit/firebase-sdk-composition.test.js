const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('App Check, modular Auth, and modular Firestore depend on the same lazy Firebase app', () => {
  const appCheck = read('src/firebase/app-check-client.js');
  const auth = read('src/firebase/firebase-auth-sdk.js');
  const firestore = read('src/firebase/firebase-firestore-sdk.js');
  const lifecycle = read('src/firebase/firebase-firestore-lifecycle.js');
  assert.match(appCheck, /getSharedFirebaseApp\(\)/);
  assert.match(auth, /getAuth\(getSharedFirebaseApp\(\)\)/);
  assert.match(lifecycle, /getSharedFirebaseApp\(\)/);
  assert.match(lifecycle, /persistentLocalCache/);
  assert.match(lifecycle, /persistentMultipleTabManager/);
  assert.match(lifecycle, /CACHE_SIZE_BYTES/);
  assert.match(appCheck, /new CustomProvider\(\{getToken: readNativeToken\}\)/);
  assert.match(appCheck, /new ReCaptchaEnterpriseProvider\(siteKey\)/);
  assert.match(appCheck, /normalizeNativeAppCheckToken\(result\)/);
});

test('the staged lifecycle clears persistent data and guards writes across account boundaries', () => {
  const lifecycle = read('firebase-firestore-lifecycle.js');
  const adapter = read('firebase-firestore-sdk.js');
  const runtime = read('src/firebase/firebase-sdk-runtime.js');
  assert.match(lifecycle, /clearIndexedDbPersistence/);
  assert.match(lifecycle, /sealAccountDeletion/);
  assert.match(lifecycle, /flushBeforeAccountDeletion/);
  assert.match(lifecycle, /BroadcastChannelCtor/);
  assert.match(adapter, /assertWritesAllowed\(\)/);
  assert.match(runtime, /userLifecycle:\s*firestoreRuntime\.lifecycle/);
  assert.match(runtime, /resetStorageCaches:\s*firestoreRuntime\.client\.resetStorageCaches/);
  assert.match(runtime, /getMany:\s*firestoreRuntime\.client\.fbGetMany3/);
  assert.match(runtime, /subscribeMany:\s*firestoreRuntime\.client\.fbSubscribeMany3/);
});

test('the modular Firestore adapter uses SDK operations instead of raw REST fetches', () => {
  const adapter = read('firebase-firestore-sdk.js');
  const composition = read('src/firebase/firebase-firestore-sdk.js');
  assert.doesNotMatch(adapter, /fetchRequest|firestore\.googleapis\.com|Authorization:\s*["']Bearer/);
  assert.doesNotMatch(composition, /fetch\s*\(/);
  for (const operation of ['getDoc', 'setDoc', 'deleteDoc', 'getDocs']) {
    assert.match(adapter, new RegExp(`sdk\\.${operation}\\(`));
  }
});

test('the modular Auth adapter remains staged and does not cut over active sessions yet', () => {
  const activeFacade = read('src/firebase/firebase-storage.js');
  const app = read('src/App.jsx');
  assert.doesNotMatch(activeFacade, /firebase-auth-sdk/);
  assert.doesNotMatch(app, /createModularAuthClient/);
  assert.match(activeFacade, /firebase-auth-internal/);
});

test('the modular Firestore adapter remains staged until the coordinated Auth cutover', () => {
  const activeFacade = read('src/firebase/firebase-storage.js');
  assert.doesNotMatch(activeFacade, /firebase-firestore-sdk/);
  assert.match(activeFacade, /firebase-firestore-internal/);
});
