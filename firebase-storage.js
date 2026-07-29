// Firebase auth and Firestore persistence adapter.
// Public functions are assigned to window/storage because the app is loaded as
// plain browser scripts. Keep persistence concerns here so app.js can focus on UI,
// calculations, and user flows.
// ── Firebase config ──────────────────────────────────────────
const {
  FB_PROJECT,
  FB_KEY,
  FB_BASE,
  AUTH_BASE,
  TOKEN_BASE,
  REPORT_SERVER_URL,
  REPORTS_ENABLED
} = window.FirebaseConfigInternal.createFirebaseConfig();

// ── Auth state ───────────────────────────────────────────────
let _firebaseFirestore = null;
let _firebaseMigration = null;
const _firebaseAuth = window.FirebaseAuthInternal.createFirebaseAuth({
  apiKey: FB_KEY,
  authBase: AUTH_BASE,
  tokenBase: TOKEN_BASE,
  fetchRequest: (...args) => fetch(...args),
  localStorage,
  resetStorageCaches: () => {
    if (_firebaseFirestore) _firebaseFirestore.resetStorageCaches();
  }
});

window._saveSession = _firebaseAuth._saveSession;

async function fbSignIn(email, password) { return _firebaseAuth.fbSignIn(email, password); }
async function fbSignUp(email, password) { return _firebaseAuth.fbSignUp(email, password); }
async function fbUpdateProfile(displayName) { return _firebaseAuth.fbUpdateProfile(displayName); }
async function fbSendVerificationEmail() { return _firebaseAuth.fbSendVerificationEmail(); }
async function fbSendPasswordResetEmail(email) { return _firebaseAuth.fbSendPasswordResetEmail(email); }
async function fbCheckEmailVerified() { return _firebaseAuth.fbCheckEmailVerified(); }
async function fbRefreshToken() { return _firebaseAuth.fbRefreshToken(); }
async function fbToken() { return _firebaseAuth.fbToken(); }
function fbSignOut() { return _firebaseAuth.fbSignOut(); }
function fbIsLoggedIn() { return _firebaseAuth.fbIsLoggedIn(); }

// ── Key namespacing (each user gets their own data) ───────────
// All keys are prefixed with the user's UID internally.
// The app uses plain keys like "pantry_v2" and never se??es the prefix.
// Legacy uid_field helpers removed from active persistence. Kept data is read by the migration layer below.

// ── Firestore helpers (authenticated + namespaced) ────────────
async function fbHeaders() {
  return _firebaseAuth.fbHeaders();
}

async function fbGetLegacyInactive(k) {
  return null;
}

async function fbSetLegacyInactive(k, v) {
}

async function fbDelLegacyInactive(k) {
}

async function fbListLegacyInactive(p) {
  return {keys: []};
}

_firebaseFirestore = window.FirebaseFirestoreInternal.createFirebaseFirestore({
  firestoreBase: FB_BASE,
  getUid: _firebaseAuth.getUid,
  getAuthHeaders: () => _firebaseAuth.fbHeaders(),
  fetchRequest: (...args) => fetch(...args),
  localStorage,
  runLegacyMigration: (...args) => _firebaseMigration.migrateLegacyNutritionDocsV2(...args),
  runStorageMigration: (...args) => _firebaseMigration.migrateStorageToFirestoreV3(...args)
});

const {
  getUid: _getUid,
  stripLegacyUid2: _stripLegacyUid2,
  userDocUrl2: _userDocUrl2,
  decodeFsValue2: _decodeFsValue2,
  storageValue2: _storageValue2,
  fetchUserDocFields2: _fetchUserDocFields2,
  patchUserFields2: _patchUserFields2,
  mergeUserDocCache2: _mergeUserDocCache2,
  legacyGet2: _legacyGet2,
  localFallbackGet3: _localFallbackGet3,
  isEmptyStoredValue3: _isEmptyStoredValue3,
  loadRootFields3: _loadRootFields3,
  patchRootFields3: _patchRootFields3,
  getDataDoc3: _getDataDoc3,
  setDataDoc3: _setDataDoc3,
  deleteDataDoc3: _deleteDataDoc3,
  listDataKeys3: _listDataKeys3,
  listLegacyKeys3: _listLegacyKeys3,
  parseStorageJson3: _parseStorageJson3,
  isProfileKey3: _isProfileKey3,
  normalizeProfileValue3: _normalizeProfileValue3,
  legacyDelete3: _legacyDelete3
} = _firebaseFirestore.support;

_firebaseMigration = window.FirebaseMigrationInternal.createFirebaseMigration({
  firestoreBase: FB_BASE,
  getUid: _getUid,
  getAuthHeaders: () => _firebaseAuth.fbHeaders(),
  fetchRequest: (...args) => fetch(...args),
  firestoreSupport: _firebaseFirestore.support
});

const {
  migrateLegacyNutritionDocsV2: migrateLegacyNutritionDocs,
  migrateStorageToFirestoreV3,
  cleanupLegacyNutritionDocsV3
} = _firebaseMigration;

window.migrateLegacyNutritionDocs = migrateLegacyNutritionDocs;

async function fbGet(k) { return _firebaseFirestore.fbGetV2(k); }
async function fbSet(k, v) { return _firebaseFirestore.fbSetV2(k, v); }
async function fbDel(k) { return _firebaseFirestore.fbDelV2(k); }
async function fbList(p) { return _firebaseFirestore.fbListV2(p); }

const _firebaseAccountData = window.FirebaseAccountDataInternal.createFirebaseAccountData({
  getUid: _getUid,
  getAuthHeaders: () => _firebaseAuth.fbHeaders(),
  resetStorageCaches: () => _firebaseFirestore.resetStorageCaches(),
  fetchRequest: (...args) => fetch(...args),
  firestorePort: {
    listDataKeys3: _listDataKeys3,
    listLegacyKeys3: _listLegacyKeys3,
    deleteDataDoc3: _deleteDataDoc3,
    legacyDelete3: _legacyDelete3,
    getUserDocumentUrl: _userDocUrl2
  }
});

const {deleteCurrentUserFirestoreData3} = _firebaseAccountData;

window.migrateStorageToFirestoreV3 = migrateStorageToFirestoreV3;
window.migrateLegacyNutritionDocs = migrateStorageToFirestoreV3;
window.normalizeCurrentUserStorage = migrateStorageToFirestoreV3;
window.cleanupLegacyNutritionDocs = cleanupLegacyNutritionDocsV3;
window.deleteCurrentUserFirestoreData = deleteCurrentUserFirestoreData3;
async function fbGet3(k) { return _firebaseFirestore.fbGet3(k); }
async function fbSet3(k, v) { return _firebaseFirestore.fbSet3(k, v); }
async function fbDel3(k) { return _firebaseFirestore.fbDel3(k); }
async function fbList3(p) { return _firebaseFirestore.fbList3(p); }
function clearImportedLocalFallback(k) {
  try {
    const uid = _getUid();
    if (uid) localStorage.removeItem(uid + "_" + k);
    localStorage.removeItem(k);
  } catch (_) {}
}

const _firebaseBackup = window.FirebaseBackupInternal.createFirebaseBackup({
  getUid: _getUid,
  fbGet3,
  fbSet3,
  clearLocalFallback: clearImportedLocalFallback,
  storageValue2: _storageValue2,
  parseStorageJson3: _parseStorageJson3,
  loadRootFields3: _loadRootFields3,
  listDataKeys3: _listDataKeys3,
  listLegacyKeys3: _listLegacyKeys3,
  getDataDoc3: _getDataDoc3,
  legacyGet2: _legacyGet2,
  patchRootFields3: _patchRootFields3,
  normalizedIdentity: _firebaseMigration.mergeHelpers.normalizedIdentity3,
  mergeArrayValues: _firebaseMigration.mergeHelpers.mergeArrayValues3,
  mergeObjectValues: _firebaseMigration.mergeHelpers.mergeObjectValues3
});

const {
  exportFullAccountBackup3,
  validateFullAccountBackup3,
  previewFullAccountBackupImport3,
  importFullAccountBackup3
} = _firebaseBackup;

window.exportFullAccountBackup = exportFullAccountBackup3;
window.importFullAccountBackup = importFullAccountBackup3;
window.validateFullAccountBackup = validateFullAccountBackup3;
window.previewFullAccountBackupImport = previewFullAccountBackupImport3;


/**
 * Console-only diagnostic helper for storage migration issues.
 * Example:
 *   await debugNutritionStorage(["pantry_v2", "weightHistory", "goalHistory"])
 */
window.debugNutritionStorage = async function debugNutritionStorage(keys) {
  const requested = keys || [
    "pantry_v2",
    "suppPantry",
    "weightHistory",
    "goalHistory",
    "mealTemplates",
    "customGoals",
    "trainingByDate"
  ];
  const rootFields = await _loadRootFields3().catch(() => ({}));
  const dataKeys = new Set(await _listDataKeys3().catch(() => []));
  const result = {
    uid: _getUid(),
    rootKeys: Object.keys(rootFields).filter(k => !k.startsWith("_")),
    dataKeys: Array.from(dataKeys),
    keys: {}
  };
  for (const key of requested) {
    const data = await _getDataDoc3(key).catch(() => null);
    const legacy = await _legacyGet2(key).catch(() => null);
    const local = _localFallbackGet3(key);
    result.keys[key] = {
      root: rootFields[key] !== undefined && rootFields[key] !== null,
      data: !!data,
      legacy: !!legacy,
      local: !!local,
      valuePreview: data?.value || (rootFields[key] !== undefined ? _storageValue2(rootFields[key]) : legacy?.value || local?.value || null)
    };
  }
  console.table(result.keys);
  return result;
};

fbGet = fbGet3;
fbSet = fbSet3;
fbDel = fbDel3;
fbList = fbList3;
window.storage = {get:fbGet3, set:fbSet3, delete:fbDel3, list:fbList3};

window.FirebaseStorage = {
  _saveSession: window._saveSession,
  fbSignIn,
  fbSignUp,
  fbUpdateProfile,
  fbSendVerificationEmail,
  fbSendPasswordResetEmail,
  fbCheckEmailVerified,
  fbRefreshToken,
  fbToken,
  fbSignOut,
  fbIsLoggedIn,
  fbHeaders,
  fbGet,
  fbSet,
  fbDel,
  fbList,
  fbGet3,
  fbSet3,
  fbDel3,
  fbList3,
  fbGetLegacyInactive,
  fbSetLegacyInactive,
  fbDelLegacyInactive,
  fbListLegacyInactive,
  migrateStorageToFirestoreV3: window.migrateStorageToFirestoreV3,
  migrateLegacyNutritionDocs: window.migrateLegacyNutritionDocs,
  normalizeCurrentUserStorage: window.normalizeCurrentUserStorage,
  cleanupLegacyNutritionDocs: window.cleanupLegacyNutritionDocs,
  deleteCurrentUserFirestoreData: window.deleteCurrentUserFirestoreData,
  exportFullAccountBackup: window.exportFullAccountBackup,
  validateFullAccountBackup: window.validateFullAccountBackup,
  previewFullAccountBackupImport: window.previewFullAccountBackupImport,
  importFullAccountBackup: window.importFullAccountBackup,
  debugNutritionStorage: window.debugNutritionStorage,
  FB_PROJECT,
  FB_KEY,
  FB_BASE,
  AUTH_BASE,
  TOKEN_BASE,
  REPORT_SERVER_URL,
  REPORTS_ENABLED,
  storage: window.storage
};

