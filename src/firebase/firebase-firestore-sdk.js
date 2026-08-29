import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import '../../firebase-firestore-sdk.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { createModularFirestoreLifecycle } from './firebase-firestore-lifecycle.js';
import { createFirestoreSyncState } from './firebase-sync-state.js';

const {
  buildDailyEntryDocument,
  createFirebaseFirestoreSdk,
  mergeCompatibleDailyEntries,
  normalizeDailyEntryIdentity,
  normalizeLegacyDailyEntries,
} = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreSdk',
  [
    'createFirebaseFirestoreSdk',
    'buildDailyEntryDocument',
    'normalizeDailyEntryIdentity',
    'normalizeLegacyDailyEntries',
    'mergeCompatibleDailyEntries',
  ],
);

function createModularFirestoreRuntime({
  getUid,
  localStorage = globalThis.localStorage,
  BroadcastChannelCtor = globalThis.BroadcastChannel,
} = {}) {
  let client;
  const syncState = createFirestoreSyncState();
  const lifecycle = createModularFirestoreLifecycle({
    getUid,
    localStorage,
    BroadcastChannelCtor,
    resetStorageCaches: () => client?.resetStorageCaches(),
    resetSyncState: syncState.reset,
  });
  client = createFirebaseFirestoreSdk({
    firestore: lifecycle.getFirestore,
    getUid,
    assertWritesAllowed: lifecycle.assertWritesAllowed,
    dailyWriteCoordinator: syncState,
    sdk: {
      arrayUnion,
      collection,
      deleteDoc,
      deleteField,
      doc,
      getDoc,
      getDocFromCache,
      getDocs,
      onSnapshot,
      serverTimestamp,
      setDoc,
      writeBatch,
    },
  });
  return Object.freeze({client, lifecycle, syncState});
}

function createModularFirestoreClient(options) {
  return createModularFirestoreRuntime(options).client;
}

export {
  buildDailyEntryDocument,
  createFirebaseFirestoreSdk,
  createModularFirestoreClient,
  createModularFirestoreRuntime,
  mergeCompatibleDailyEntries,
  normalizeDailyEntryIdentity,
  normalizeLegacyDailyEntries,
};
