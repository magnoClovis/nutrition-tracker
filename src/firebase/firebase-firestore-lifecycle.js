import {
  clearIndexedDbPersistence,
  disableNetwork,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  waitForPendingWrites,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import '../../firebase-firestore-lifecycle.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { getSharedFirebaseApp } from './firebase-app-client.js';

const {
  CACHE_SIZE_BYTES,
  createFirebaseFirestoreLifecycle,
} = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreLifecycle',
  ['CACHE_SIZE_BYTES', 'createFirebaseFirestoreLifecycle'],
);

function createModularFirestoreLifecycle({
  getUid,
  localStorage = globalThis.localStorage,
  resetStorageCaches = () => {},
  BroadcastChannelCtor = globalThis.BroadcastChannel,
} = {}) {
  return createFirebaseFirestoreLifecycle({
    app: getSharedFirebaseApp(),
    sdk: {
      clearIndexedDbPersistence,
      disableNetwork,
      initializeFirestore,
      memoryLocalCache,
      persistentLocalCache,
      persistentMultipleTabManager,
      terminate,
      waitForPendingWrites,
    },
    localStorage,
    getUid,
    resetStorageCaches,
    BroadcastChannelCtor,
    isNativePlatform: () => Capacitor.isNativePlatform(),
  });
}

export {
  CACHE_SIZE_BYTES,
  createFirebaseFirestoreLifecycle,
  createModularFirestoreLifecycle,
};
