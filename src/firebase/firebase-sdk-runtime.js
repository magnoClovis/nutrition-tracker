import { createModularAuthClient } from './firebase-auth-sdk.js';
import { createModularFirestoreRuntime } from './firebase-firestore-sdk.js';

/**
 * Builds the staged C28 SDK runtime with one account lifecycle shared by Auth
 * and Firestore. The active facade will adopt this composition only at the
 * coordinated cutover, when users perform the approved one-time login.
 */
function createModularFirebaseRuntime({
  localStorage = globalThis.localStorage,
  BroadcastChannelCtor = globalThis.BroadcastChannel,
} = {}) {
  let authClient = null;
  const firestoreRuntime = createModularFirestoreRuntime({
    getUid: () => authClient?.getUid() || null,
    localStorage,
    BroadcastChannelCtor,
  });
  authClient = createModularAuthClient({
    localStorage,
    resetStorageCaches: firestoreRuntime.client.resetStorageCaches,
    userLifecycle: firestoreRuntime.lifecycle,
  });
  return Object.freeze({
    auth: authClient,
    firestore: firestoreRuntime.client,
    storage: Object.freeze({
      get: firestoreRuntime.client.fbGet3,
      getMany: firestoreRuntime.client.fbGetMany3,
      set: firestoreRuntime.client.fbSet3,
      delete: firestoreRuntime.client.fbDel3,
      list: firestoreRuntime.client.fbList3,
      subscribeMany: firestoreRuntime.client.fbSubscribeMany3,
      setDailyEntry: firestoreRuntime.client.fbSetDailyEntry3,
      deleteDailyEntry: firestoreRuntime.client.fbDelDailyEntry3,
      listDailyEntries: firestoreRuntime.client.fbListDailyEntries3,
    }),
    lifecycle: firestoreRuntime.lifecycle,
  });
}

export { createModularFirebaseRuntime };
