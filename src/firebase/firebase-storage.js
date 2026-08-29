import { createFirebaseConfig } from '../leaf/firebase-config-internal.js';
import { createModularFirebaseRuntime } from './firebase-sdk-runtime.js';

const {
  FB_PROJECT, FB_KEY, FB_BASE, AUTH_BASE, TOKEN_BASE,
  REPORT_SERVER_URL, REPORTS_ENABLED,
} = createFirebaseConfig();

let runtime = null;

function getRuntime() {
  if (!runtime) runtime = createModularFirebaseRuntime();
  return runtime;
}

const initializeFirebase = () => getRuntime().auth.initialize();
const fbSignIn = (...args) => getRuntime().auth.fbSignIn(...args);
const fbSignUp = (...args) => getRuntime().auth.fbSignUp(...args);
const fbUpdateProfile = (...args) => getRuntime().auth.fbUpdateProfile(...args);
const fbSendVerificationEmail = (...args) => getRuntime().auth.fbSendVerificationEmail(...args);
const fbSendPasswordResetEmail = (...args) => getRuntime().auth.fbSendPasswordResetEmail(...args);
const fbCheckEmailVerified = (...args) => getRuntime().auth.fbCheckEmailVerified(...args);
const fbRefreshToken = (...args) => getRuntime().auth.fbRefreshToken(...args);
const fbToken = (...args) => getRuntime().auth.fbToken(...args);
const fbSignOut = (...args) => getRuntime().auth.fbSignOut(...args);
const fbIsLoggedIn = () => runtime?.auth.fbIsLoggedIn() === true;
const fbReauthenticate = (...args) => getRuntime().auth.fbReauthenticate(...args);
const fbUpdatePassword = (...args) => getRuntime().auth.fbUpdatePassword(...args);
const fbPrepareAccountDeletion = () => getRuntime().auth.flushBeforeAccountDeletion();
const fbFinalizeAccountDeletion = () => getRuntime().auth.finalizeAccountDeletion();
const fbHeaders = async () => ({Authorization: `Bearer ${await fbToken()}`});

// Keep the historical mutable facade shape used by the orchestration harness;
// the underlying modular runtime remains encapsulated and immutable.
const storage = {
  get: (...args) => getRuntime().storage.get(...args),
  getMany: (...args) => getRuntime().storage.getMany(...args),
  set: (...args) => getRuntime().storage.set(...args),
  delete: (...args) => getRuntime().storage.delete(...args),
  list: (...args) => getRuntime().storage.list(...args),
  subscribeMany: (...args) => getRuntime().storage.subscribeMany(...args),
  setDailyEntry: (...args) => getRuntime().storage.setDailyEntry(...args),
  deleteDailyEntry: (...args) => getRuntime().storage.deleteDailyEntry(...args),
  applyDailyEntryBatch: (...args) => getRuntime().storage.applyDailyEntryBatch(...args),
  listDailyEntries: (...args) => getRuntime().storage.listDailyEntries(...args),
  listDailyEntriesCompatible: (...args) => getRuntime().storage.listDailyEntriesCompatible(...args),
  readDailyStateCompatible: (...args) => getRuntime().storage.readDailyStateCompatible(...args),
  migrateDailyEntries: (...args) => getRuntime().storage.migrateDailyEntries(...args),
  listDailyDates: (...args) => getRuntime().storage.listDailyDates(...args),
  replaceDailyAggregate: (...args) => getRuntime().storage.replaceDailyAggregate(...args),
};

const fbGet = (...args) => storage.get(...args);
const fbSet = (...args) => storage.set(...args);
const fbDel = (...args) => storage.delete(...args);
const fbList = (...args) => storage.list(...args);
const fbGet3 = fbGet;
const fbSet3 = fbSet;
const fbDel3 = fbDel;
const fbList3 = fbList;
const exportFullAccountBackup = (...args) => getRuntime().backup.exportFullAccountBackup3(...args);
const validateFullAccountBackup = (...args) => getRuntime().backup.validateFullAccountBackup3(...args);
const previewFullAccountBackupImport = (...args) => getRuntime().backup.previewFullAccountBackupImport3(...args);
const importFullAccountBackup = (...args) => getRuntime().backup.importFullAccountBackup3(...args);
const _saveSession = () => {};

async function debugNutritionStorage(keys = []) {
  const requested = keys.length ? keys : [
    'pantry_v2', 'suppPantry', 'weightHistory', 'goalHistory',
    'mealTemplates', 'customGoals', 'trainingByDate',
  ];
  const result = {};
  for (const key of requested) result[key] = await storage.get(key).catch(() => null);
  return Object.freeze(result);
}

function debugFirestoreReadMetrics({reset = false} = {}) {
  return reset
    ? getRuntime().diagnostics.resetReadMetrics()
    : getRuntime().diagnostics.readMetrics();
}

const facade = {
  _saveSession, initializeFirebase, fbSignIn, fbSignUp, fbUpdateProfile,
  fbSendVerificationEmail, fbSendPasswordResetEmail, fbCheckEmailVerified,
  fbRefreshToken, fbToken, fbSignOut, fbIsLoggedIn, fbReauthenticate,
  fbUpdatePassword, fbPrepareAccountDeletion, fbFinalizeAccountDeletion,
  fbHeaders, fbGet, fbSet, fbDel, fbList, fbGet3, fbSet3, fbDel3, fbList3,
  exportFullAccountBackup, validateFullAccountBackup,
  previewFullAccountBackupImport, importFullAccountBackup,
  debugNutritionStorage, debugFirestoreReadMetrics,
  FB_PROJECT, FB_KEY, FB_BASE, AUTH_BASE, TOKEN_BASE,
  REPORT_SERVER_URL, REPORTS_ENABLED, storage,
};

Object.assign(globalThis, facade);

export {
  AUTH_BASE, FB_BASE, FB_KEY, FB_PROJECT, REPORTS_ENABLED, REPORT_SERVER_URL,
  TOKEN_BASE, _saveSession, debugNutritionStorage, debugFirestoreReadMetrics,
  exportFullAccountBackup,
  fbCheckEmailVerified, fbDel, fbDel3, fbFinalizeAccountDeletion, fbGet, fbGet3,
  fbHeaders, fbIsLoggedIn, fbList, fbList3, fbPrepareAccountDeletion,
  fbReauthenticate, fbRefreshToken, fbSendPasswordResetEmail,
  fbSendVerificationEmail, fbSet, fbSet3, fbSignIn, fbSignOut, fbSignUp,
  fbToken, fbUpdatePassword, fbUpdateProfile, importFullAccountBackup,
  initializeFirebase, previewFullAccountBackupImport, storage,
  validateFullAccountBackup,
};
