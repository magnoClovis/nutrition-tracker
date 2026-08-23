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

// ── Firestore helpers (authenticated + namespaced) ────────────
async function fbHeaders() {
  return _firebaseAuth.fbHeaders();
}

_firebaseFirestore = window.FirebaseFirestoreInternal.createFirebaseFirestore({
  firestoreBase: FB_BASE,
  getUid: _firebaseAuth.getUid,
  getAuthHeaders: () => _firebaseAuth.fbHeaders(),
  fetchRequest: (...args) => fetch(...args)
});

const {
  getUid: _getUid,
  storageValue: _storageValue,
  loadRootFields: _loadRootFields,
  patchRootFields: _patchRootFields,
  getDataDoc: _getDataDoc,
  listDataKeys: _listDataKeys,
  parseStorageJson: _parseStorageJson
} = _firebaseFirestore.support;
async function fbGet3(k) { return _firebaseFirestore.fbGet3(k); }
async function fbSet3(k, v) { return _firebaseFirestore.fbSet3(k, v); }
async function fbDel3(k) { return _firebaseFirestore.fbDel3(k); }
async function fbList3(p) { return _firebaseFirestore.fbList3(p); }
async function fbGet(k) { return fbGet3(k); }
async function fbSet(k, v) { return fbSet3(k, v); }
async function fbDel(k) { return fbDel3(k); }
async function fbList(p) { return fbList3(p); }
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
  storageValue2: _storageValue,
  parseStorageJson3: _parseStorageJson,
  loadRootFields3: _loadRootFields,
  listDataKeys3: _listDataKeys,
  getDataDoc3: _getDataDoc,
  patchRootFields3: _patchRootFields,
  normalizedIdentity: window.FirebaseBackupMergeInternal.normalizedIdentity,
  mergeArrayValues: window.FirebaseBackupMergeInternal.mergeArrayValues,
  mergeObjectValues: window.FirebaseBackupMergeInternal.mergeObjectValues
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
 * Console-only diagnostic helper for canonical storage issues.
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
  const rootFields = await _loadRootFields().catch(() => ({}));
  const dataKeys = new Set(await _listDataKeys().catch(() => []));
  const result = {
    uid: _getUid(),
    rootKeys: Object.keys(rootFields).filter(k => !k.startsWith("_")),
    dataKeys: Array.from(dataKeys),
    keys: {}
  };
  for (const key of requested) {
    const data = await _getDataDoc(key).catch(() => null);
    result.keys[key] = {
      root: rootFields[key] !== undefined && rootFields[key] !== null,
      data: !!data,
      valuePreview: data?.value || (rootFields[key] !== undefined ? _storageValue(rootFields[key]) : null)
    };
  }
  console.table(result.keys);
  return result;
};

window.storage = {get:fbGet, set:fbSet, delete:fbDel, list:fbList};

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

