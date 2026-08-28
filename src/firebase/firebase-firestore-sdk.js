import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import '../../firebase-firestore-sdk.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { createModularFirestoreLifecycle } from './firebase-firestore-lifecycle.js';

const { createFirebaseFirestoreSdk } = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreSdk',
  ['createFirebaseFirestoreSdk'],
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
      getDocs,
      setDoc,
    },
  });
  return Object.freeze({client, lifecycle});
}

function createModularFirestoreClient(options) {
  return createModularFirestoreRuntime(options).client;
}

export {
  createFirebaseFirestoreSdk,
  createModularFirestoreClient,
  createModularFirestoreRuntime,
};
