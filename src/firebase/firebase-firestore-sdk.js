import {
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
} from 'firebase/firestore';
import '../../firebase-firestore-sdk.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { createModularFirestoreLifecycle } from './firebase-firestore-lifecycle.js';

const {
  buildDailyEntryDocument,
  createFirebaseFirestoreSdk,
  normalizeDailyEntryIdentity,
} = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreSdk',
  ['createFirebaseFirestoreSdk', 'buildDailyEntryDocument', 'normalizeDailyEntryIdentity'],
);

function createModularFirestoreRuntime({
  getUid,
  localStorage = globalThis.localStorage,
  BroadcastChannelCtor = globalThis.BroadcastChannel,
} = {}) {
  let client;
  const lifecycle = createModularFirestoreLifecycle({
    getUid,
    localStorage,
    BroadcastChannelCtor,
    resetStorageCaches: () => client?.resetStorageCaches(),
  });
  client = createFirebaseFirestoreSdk({
    firestore: lifecycle.getFirestore,
    getUid,
    assertWritesAllowed: lifecycle.assertWritesAllowed,
    sdk: {
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
    },
  });
  return Object.freeze({client, lifecycle});
}

function createModularFirestoreClient(options) {
  return createModularFirestoreRuntime(options).client;
}

export {
  buildDailyEntryDocument,
  createFirebaseFirestoreSdk,
  createModularFirestoreClient,
  createModularFirestoreRuntime,
  normalizeDailyEntryIdentity,
};
