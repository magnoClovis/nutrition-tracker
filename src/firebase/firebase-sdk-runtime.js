import { createModularAuthClient } from './firebase-auth-sdk.js';
import { createModularFirestoreRuntime } from './firebase-firestore-sdk.js';
import { createFirebaseBackup } from './firebase-backup-internal.js';
import {
  mergeArrayValues,
  mergeObjectValues,
  normalizedIdentity,
} from './firebase-backup-merge-internal.js';

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
  const backup = createFirebaseBackup({
    getUid: authClient.getUid,
    fbGet3: firestoreRuntime.client.fbGet3,
    fbSet3: firestoreRuntime.client.fbSet3,
    clearLocalFallback: key => localStorage.removeItem(key),
    storageValue2: firestoreRuntime.client.support.storageValue,
    parseStorageJson3: firestoreRuntime.client.support.parseStorageJson,
    loadRootFields3: firestoreRuntime.client.support.loadRootFields,
    listDataKeys3: firestoreRuntime.client.support.listDataKeys,
    getDataDoc3: firestoreRuntime.client.support.getDataDoc,
    patchRootFields3: firestoreRuntime.client.support.patchRootFields,
    normalizedIdentity,
    mergeArrayValues,
    mergeObjectValues,
    prepareExport: firestoreRuntime.lifecycle.prepareBackupExport,
    completeRestore: firestoreRuntime.lifecycle.completeBackupRestore,
  });
  return Object.freeze({
    auth: authClient,
    backup,
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
      applyDailyEntryBatch: firestoreRuntime.client.fbApplyDailyEntryBatch3,
      listDailyEntries: firestoreRuntime.client.fbListDailyEntries3,
      listDailyEntriesCompatible: firestoreRuntime.client.fbListDailyEntriesCompatible3,
      readDailyStateCompatible: firestoreRuntime.client.fbReadDailyStateCompatible3,
      migrateDailyEntries: firestoreRuntime.client.fbMigrateDailyEntries3,
    }),
    sync: firestoreRuntime.syncState,
    lifecycle: firestoreRuntime.lifecycle,
  });
}

export { createModularFirebaseRuntime };
