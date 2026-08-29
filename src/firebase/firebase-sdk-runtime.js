import { createModularAuthClient } from './firebase-auth-sdk.js';
import { createModularFirestoreRuntime } from './firebase-firestore-sdk.js';
import { createFirebaseBackup } from './firebase-backup-internal.js';
import {
  mergeArrayValues,
  mergeObjectValues,
  normalizedIdentity,
} from './firebase-backup-merge-internal.js';

/**
 * Builds the active C28 SDK runtime with one account lifecycle shared by Auth,
 * Firestore, backup and account deletion.
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
  const dailyBackupDescriptor = key => {
    const match = /^(log_v2|waterIntake|suppLog)_(\d{4}-\d{2}-\d{2})$/.exec(String(key));
    if (!match) return null;
    const mapping = {
      log_v2: {kind: 'meal', stateKey: 'log'},
      waterIntake: {kind: 'water', stateKey: 'waterIntake'},
      suppLog: {kind: 'supplement', stateKey: 'supplementLog'},
    };
    return {...mapping[match[1]], date: match[2]};
  };
  const readBackupValue = async key => {
    const descriptor = dailyBackupDescriptor(key);
    if (!descriptor) return firestoreRuntime.client.fbGet3(key);
    const state = await firestoreRuntime.client.fbReadDailyStateCompatible3(descriptor.date);
    const value = state[descriptor.stateKey];
    const empty = Array.isArray(value) ? value.length === 0 : Object.keys(value || {}).length === 0;
    return empty ? null : {value: JSON.stringify(value)};
  };
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
    readBackupValue,
    exportDailyData: async () => {
      const data = {};
      const dates = await firestoreRuntime.client.fbListDailyDates3();
      for (const date of dates) {
        const state = await firestoreRuntime.client.fbReadDailyStateCompatible3(date);
        if (Object.keys(state.log).length) data[`log_v2_${date}`] = state.log;
        if (state.waterIntake.length) data[`waterIntake_${date}`] = state.waterIntake;
        if (state.supplementLog.length) data[`suppLog_${date}`] = state.supplementLog;
      }
      return data;
    },
    restoreDailyValue: async (key, value) => {
      const descriptor = dailyBackupDescriptor(key);
      if (!descriptor) throw new TypeError('Invalid daily backup key');
      await firestoreRuntime.client.fbReplaceDailyAggregate3(
        descriptor.kind, descriptor.date, value
      );
    },
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
      listDailyDates: firestoreRuntime.client.fbListDailyDates3,
      replaceDailyAggregate: firestoreRuntime.client.fbReplaceDailyAggregate3,
    }),
    sync: firestoreRuntime.syncState,
    lifecycle: firestoreRuntime.lifecycle,
    diagnostics: Object.freeze({
      readMetrics: firestoreRuntime.client.support.readMetricsSnapshot,
      resetReadMetrics: firestoreRuntime.client.support.resetReadMetrics,
    }),
  });
}

export { createModularFirebaseRuntime };
