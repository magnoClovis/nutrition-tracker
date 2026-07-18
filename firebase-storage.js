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
  runLegacyMigration: (...args) => migrateLegacyNutritionDocs(...args),
  runStorageMigration: (...args) => migrateStorageToFirestoreV3(...args)
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

async function migrateLegacyNutritionDocs(options) {
  const uid = _getUid();
  if (!uid) return {migrated: 0, skipped: 0};
  const onlyIfMissing = !options || options.onlyIfMissing !== false;
  try {
    const headers = await fbHeaders();
    const [listRes, currentFields] = await Promise.all([
      fetch(FB_BASE + "?pageSize=1000", {headers}),
      _fetchUserDocFields2().catch(() => ({}))
    ]);
    if (!listRes.ok) return {migrated: 0, skipped: 0};
    const data = await listRes.json();
    const prefix = uid + "_";
    const updates = {};
    let skipped = 0;
    (data.documents || []).forEach(doc => {
      const rawId = decodeURIComponent((doc.name || "").split("/").pop() || "");
      if (!rawId.startsWith(prefix)) return;
      const key = _stripLegacyUid2(rawId);
      if (!key || key === rawId) return;
      if (onlyIfMissing && currentFields[key] !== undefined && currentFields[key] !== null) {
        skipped++;
        return;
      }
      const value = _decodeFsValue2(doc.fields?.value);
      if (value !== undefined && value !== null) updates[key] = value;
    });
    const keys = Object.keys(updates);
    if (keys.length) await _patchUserFields2(updates, []);
    _mergeUserDocCache2(currentFields, updates);
    return {migrated: keys.length, skipped};
  } catch(e) {
    return {migrated: 0, skipped: 0, error: e.message || String(e)};
  }
}
window.migrateLegacyNutritionDocs = migrateLegacyNutritionDocs;

async function fbGet(k) { return _firebaseFirestore.fbGetV2(k); }
async function fbSet(k, v) { return _firebaseFirestore.fbSetV2(k, v); }
async function fbDel(k) { return _firebaseFirestore.fbDelV2(k); }
async function fbList(p) { return _firebaseFirestore.fbListV2(p); }

// Firestore v3 algorithms remain in this facade; storage primitives and caches
// live in firebase-firestore-internal.js and are consumed through `support`.
function _knownMigrationKeys3() {
  const base = [
    "pantry", "pantry_v2", "suppPantry", "waterGoal", "waterCustomPreset", "customGoals", "goalHistory",
    "mealTemplates", "weightHistory", "trainingByDate", "birthDate", "gender",
    "activityLevel", "goalType", "goalKg", "goalWeeks", "manualCalorieAdjustment",
    "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
    "userBirth", "userGender", "userActivity", "userGoal",
    "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
    "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
    "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
  ];
  const dateKeys = [];
  for (let i = 0; i < 120; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    dateKeys.push("log_v2_" + date, "notes_" + date, "waterIntake_" + date, "suppLog_" + date);
  }
  return Array.from(new Set([...base, ...dateKeys]));
}

function _normalizedIdentity3(item) {
  if (!item || typeof item !== "object") return JSON.stringify(item);
  if (item.date) return "date:" + item.date;
  if (item.id) return "id:" + item.id;
  if (item.name) return "name:" + String(item.name).trim().toLowerCase();
  return JSON.stringify(item);
}

function _richnessScore3(value) {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.length * 10 + value.reduce((s, item) => s + _richnessScore3(item), 0);
  if (typeof value === "object") return Object.keys(value).length + Object.values(value).reduce((s, item) => s + _richnessScore3(item), 0);
  return String(value).trim() ? 1 : 0;
}

function _mergeArrayValues3(values) {
  const byKey = new Map();
  values.flat().forEach(item => {
    if (item === null || item === undefined) return;
    const identity = _normalizedIdentity3(item);
    const current = byKey.get(identity);
    if (!current || _richnessScore3(item) >= _richnessScore3(current)) byKey.set(identity, item);
  });
  const merged = Array.from(byKey.values());
  if (merged.every(item => item && typeof item === "object" && item.date)) {
    return merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  if (merged.every(item => item && typeof item === "object" && item.name)) {
    return merged.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt"));
  }
  return merged;
}

function _mergeObjectValues3(values) {
  const out = {};
  values.forEach(value => {
    Object.entries(value || {}).forEach(([key, nextValue]) => {
      const currentValue = out[key];
      if (currentValue && typeof currentValue === "object" && nextValue && typeof nextValue === "object" && !Array.isArray(currentValue) && !Array.isArray(nextValue)) {
        out[key] = _richnessScore3(nextValue) >= _richnessScore3(currentValue) ? {...currentValue, ...nextValue} : {...nextValue, ...currentValue};
      } else if (currentValue === undefined || _richnessScore3(nextValue) >= _richnessScore3(currentValue)) {
        out[key] = nextValue;
      }
    });
  });
  return out;
}

function _mergeStoredValues3(candidates) {
  const parsedValues = candidates
    .filter(candidate => candidate && !_isEmptyStoredValue3(candidate.value))
    .map(candidate => _parseStorageJson3(candidate.value))
    .filter(value => value !== null && value !== undefined);

  if (!parsedValues.length) return null;
  if (parsedValues.some(Array.isArray)) return _storageValue2(_mergeArrayValues3(parsedValues.filter(Array.isArray)));
  if (parsedValues.some(value => value && typeof value === "object")) {
    return _storageValue2(_mergeObjectValues3(parsedValues.filter(value => value && typeof value === "object" && !Array.isArray(value))));
  }
  parsedValues.sort((a, b) => _richnessScore3(b) - _richnessScore3(a));
  return _storageValue2(parsedValues[0]);
}

function _legacyAliasesForKey3(key) {
  const aliases = {
    pantry_v2: ["pantry"],
    birthDate: ["userBirth"],
    gender: ["userGender"],
    activityLevel: ["userActivity"]
  };
  return aliases[key] || [];
}

function _extractProfileFromLegacyUserGoal3(rawUserGoal) {
  const userGoal = _parseStorageJson3(rawUserGoal);
  if (!userGoal || typeof userGoal !== "object") return {};
  const out = {};
  if (userGoal.type && !out.goalType) out.goalType = _normalizeProfileValue3("goalType", userGoal.type);
  if (userGoal.goalType && !out.goalType) out.goalType = _normalizeProfileValue3("goalType", userGoal.goalType);
  if (userGoal.kg !== undefined && userGoal.kg !== null) out.goalKg = String(userGoal.kg);
  if (userGoal.goalKg !== undefined && userGoal.goalKg !== null) out.goalKg = String(userGoal.goalKg);
  if (userGoal.weeks !== undefined && userGoal.weeks !== null) out.goalWeeks = String(userGoal.weeks);
  if (userGoal.goalWeeks !== undefined && userGoal.goalWeeks !== null) out.goalWeeks = String(userGoal.goalWeeks);
  return out;
}

/**
 * Temporary account-normalization migration.
 *
 * Purpose: users created during earlier beta builds may have data split across
 * nutrition/{uid}, nutrition/{uid}/data/{key}, legacy nutrition/{uid}_{key}
 * documents, and sometimes browser localStorage. This routine runs after login,
 * copies the richest available data into the final structure, and deletes only
 * the authenticated user's legacy documents/old root fields after a successful
 * write. Once active users have naturally logged in and normalized, this block
 * can be removed together with the temporary legacy-delete Firestore rule.
 */
async function migrateStorageToFirestoreV3(options) {
  if (!_getUid()) return {migrated: 0, cleaned: 0, skipped: 0};
  const cleanup = !options || options.cleanup !== false;
  const now = new Date().toISOString();
  const rootFields = await _loadRootFields3();

  if (rootFields._storageSchemaVerified === true || rootFields._storageSchemaVerified === "true") {
    return {migrated: 0, cleaned: 0, skipped: 1};
  }

  const dataKeys = new Set(await _listDataKeys3().catch(() => []));
  const legacyKeys = await _listLegacyKeys3().catch(() => new Set());
  const rootDeletes = new Set();
  const dataDeletes = new Set();
  const legacyDeletes = new Set();
  const rootUpdates = {};
  let migrated = 0;
  let cleaned = 0;
  let cleanupFailures = 0;

  const finalKeys = _knownMigrationKeys3().filter(key => !["pantry", "userBirth", "userGender", "userActivity", "userGoal"].includes(key));
  const legacyUserGoal = legacyKeys.has("userGoal") ? await _legacyGet2("userGoal").catch(() => null) : null;
  Object.assign(rootUpdates, _extractProfileFromLegacyUserGoal3(legacyUserGoal?.value));
  if (legacyUserGoal) legacyDeletes.add("userGoal");

  for (const key of finalKeys) {
    const aliases = _legacyAliasesForKey3(key);
    const data = dataKeys.has(key) ? await _getDataDoc3(key).catch(() => null) : null;
    const root = rootFields[key] !== undefined && rootFields[key] !== null ? {value: _storageValue2(rootFields[key])} : null;
    const legacyCandidates = [];
    for (const legacyKey of [key, ...aliases]) {
      if (!legacyKeys.has(legacyKey)) continue;
      const legacy = await _legacyGet2(legacyKey).catch(() => null);
      if (legacy) {
        legacyCandidates.push({...legacy, legacyKey});
        legacyDeletes.add(legacyKey);
      }
    }
    const local = _localFallbackGet3(key);
    const mergedValue = _mergeStoredValues3([data, root, local, ...legacyCandidates]);
    if (!mergedValue) continue;

    if (_isProfileKey3(key)) {
      const normalizedValue = _normalizeProfileValue3(key, mergedValue);
      const currentValue = root ? _normalizeProfileValue3(key, root.value) : null;
      if (currentValue !== normalizedValue) {
        rootUpdates[key] = normalizedValue;
        migrated++;
      }
      if (data) dataDeletes.add(key);
    } else {
      if (!data || data.value !== mergedValue) {
        await _setDataDoc3(key, mergedValue);
        dataKeys.add(key);
        migrated++;
      }
      if (root) rootDeletes.add(key);
    }
  }

  if (Object.keys(rootUpdates).length || migrated || cleaned) {
    await _patchRootFields3({
      ...rootUpdates,
      _schemaVersion: 4,
      _storageSchemaVerified: true,
      _storageSchemaVerifiedAt: now,
      _schemaMigratedAt: rootFields._schemaMigratedAt || now,
      _schemaNormalizedAt: now
    }, []);
  } else {
    await _patchRootFields3({
      _storageSchemaVerified: true,
      _storageSchemaVerifiedAt: now
    }, []);
  }

  if (cleanup) {
    for (const key of rootDeletes) {
      try {
        await _patchRootFields3({}, [key]);
        cleaned++;
      } catch (_) {
        cleanupFailures++;
      }
    }
    for (const key of dataDeletes) {
      try {
        await _deleteDataDoc3(key);
        cleaned++;
      } catch (_) {
        cleanupFailures++;
      }
    }
    for (const key of legacyDeletes) {
      try {
        await _legacyDelete3(key);
        cleaned++;
      } catch (_) {
        cleanupFailures++;
      }
    }
    if (cleanupFailures) {
      await _patchRootFields3({_legacyCleanupErrorAt: now}, []);
    } else {
      await _patchRootFields3({_legacyCleanupAt: now}, []);
    }
  }

  return {migrated, cleaned, cleanupFailures, skipped: 0};
}

/**
 * Temporary legacy cleanup for top-level nutrition/{uid}_{key} documents.
 *
 * This is intentionally separate from the normalizer: after a user account has
 * been copied into the current structure, this can keep retrying lightweight
 * deletes in the background without re-running the whole migration. Remove this
 * function after all beta users have been normalized and old docs are gone.
 */
async function cleanupLegacyNutritionDocsV3() {
  if (!_getUid()) return {cleaned: 0, failed: 0, skipped: 1};
  const now = new Date().toISOString();
  const rootFields = await _loadRootFields3();
  if (rootFields._legacyCleanupDone === true || rootFields._legacyCleanupDone === "true") {
    return {cleaned: 0, failed: 0, skipped: 1};
  }

  const legacyKeys = Array.from(await _listLegacyKeys3().catch(() => new Set()));
  if (!legacyKeys.length) {
    await _patchRootFields3({
      _legacyCleanupDone: true,
      _legacyCleanupAt: now
    }, ["_legacyCleanupErrorAt"]);
    return {cleaned: 0, failed: 0, skipped: 0};
  }

  const results = await Promise.allSettled(legacyKeys.map(key => _legacyDelete3(key)));
  const failed = results.filter(result => result.status === "rejected").length;
  const cleaned = results.length - failed;

  if (failed) {
    await _patchRootFields3({
      _legacyCleanupDone: false,
      _legacyCleanupErrorAt: now
    }, []);
  } else {
    await _patchRootFields3({
      _legacyCleanupDone: true,
      _legacyCleanupAt: now
    }, ["_legacyCleanupErrorAt"]);
  }

  return {cleaned, failed, skipped: 0};
}

/**
 * Deletes all Firestore data owned by the currently authenticated user.
 *
 * Firebase Authentication does not cascade-delete Firestore documents. Account
 * deletion must therefore call this before accounts:delete, while the user's
 * token still exists. It removes the current schema first
 * (nutrition/{uid}/data/*, then nutrition/{uid}) and then the temporary legacy
 * nutrition/{uid}_{key} documents used by older beta builds.
 */
async function deleteCurrentUserFirestoreData3() {
  if (!_getUid()) throw new Error("No authenticated user");

  const dataKeys = await _listDataKeys3().catch(() => []);
  const legacyKeys = Array.from(await _listLegacyKeys3().catch(() => new Set()));
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < dataKeys.length; i += 20) {
    const results = await Promise.allSettled(dataKeys.slice(i, i + 20).map(key => _deleteDataDoc3(key)));
    deleted += results.filter(result => result.status === "fulfilled").length;
    failed += results.filter(result => result.status === "rejected").length;
  }

  for (let i = 0; i < legacyKeys.length; i += 20) {
    const results = await Promise.allSettled(legacyKeys.slice(i, i + 20).map(key => _legacyDelete3(key)));
    deleted += results.filter(result => result.status === "fulfilled").length;
    failed += results.filter(result => result.status === "rejected").length;
  }

  const rootDelete = await fetch(_userDocUrl2(), {
    method: "DELETE",
    headers: await fbHeaders()
  });
  if (rootDelete.ok || rootDelete.status === 404) {
    deleted++;
  } else {
    failed++;
  }

  _firebaseFirestore.resetStorageCaches();

  if (failed) throw new Error("Some account data could not be deleted");
  return {deleted, failed};
}

window.migrateStorageToFirestoreV3 = migrateStorageToFirestoreV3;
window.migrateLegacyNutritionDocs = migrateStorageToFirestoreV3;
window.normalizeCurrentUserStorage = migrateStorageToFirestoreV3;
window.cleanupLegacyNutritionDocs = cleanupLegacyNutritionDocsV3;
window.deleteCurrentUserFirestoreData = deleteCurrentUserFirestoreData3;
window.exportFullAccountBackup = exportFullAccountBackup3;
window.importFullAccountBackup = importFullAccountBackup3;
window.validateFullAccountBackup = validateFullAccountBackup3;
window.previewFullAccountBackupImport = previewFullAccountBackupImport3;
async function fbGet3(k) { return _firebaseFirestore.fbGet3(k); }
async function fbSet3(k, v) { return _firebaseFirestore.fbSet3(k, v); }
async function fbDel3(k) { return _firebaseFirestore.fbDel3(k); }
async function fbList3(p) { return _firebaseFirestore.fbList3(p); }

const ACCOUNT_BACKUP_SCHEMA = "nutrition-tracker-account-backup";
const ACCOUNT_BACKUP_VERSION = 3;
const BACKUP_IMPORTABLE_PROFILE_KEYS = new Set([
  "height",
  "activityLevel",
  "goalType",
  "goalKg",
  "goalWeeks",
  "manualCalorieAdjustment",
  "proteinMultiplier",
  "bodyFatGoal"
]);
const BACKUP_ALWAYS_SKIP_KEYS = new Set([
  "uid",
  "userName",
  "birthDate",
  "gender",
  "language",
  "tutorialSeen",
  "tutorial_most_recent_version_seen",
  "lastLoginAt",
  "lastActivityAt"
]);
const BACKUP_CATEGORY_ORDER = [
  "profile",
  "nutritionGoals",
  "pantry",
  "mealTemplates",
  "supplements",
  "diary",
  "dayTypes",
  "water",
  "notes",
  "supplementLog",
  "bodyMetrics"
];

function _backupCategoryForKey3(key) {
  if (!key || key.startsWith("_") || BACKUP_ALWAYS_SKIP_KEYS.has(key) || key.indexOf("tutorialSeen") === 0) return null;
  if (BACKUP_IMPORTABLE_PROFILE_KEYS.has(key)) return "profile";
  if (key === "customGoals" || key === "goalHistory" || key === "waterGoal" || key === "waterCustomPreset") return "nutritionGoals";
  if (key === "pantry_v2" || key === "pantry") return "pantry";
  if (key === "mealTemplates") return "mealTemplates";
  if (key === "suppPantry") return "supplements";
  if (key === "trainingByDate") return "dayTypes";
  if (key === "weightHistory") return "bodyMetrics";
  if (/^log_v2_\d{4}-\d{2}-\d{2}$/.test(key)) return "diary";
  if (/^notes_\d{4}-\d{2}-\d{2}$/.test(key)) return "notes";
  if (/^waterIntake_\d{4}-\d{2}-\d{2}$/.test(key)) return "water";
  if (/^suppLog_\d{4}-\d{2}-\d{2}$/.test(key)) return "supplementLog";
  return null;
}

function _canonicalBackupKey3(key) {
  return key === "pantry" ? "pantry_v2" : key;
}

function _backupImportableEntries3(flat) {
  return Object.entries(flat || {}).reduce((entries, [key, value]) => {
    const category = _backupCategoryForKey3(key);
    if (!category || value === undefined || value === null) return entries;
    entries.push({key, targetKey: _canonicalBackupKey3(key), category, value});
    return entries;
  }, []);
}

function _backupParsedValue3(value) {
  return _parseStorageJson3(value);
}

function _backupItemCount3(key, value) {
  const parsed = _backupParsedValue3(value);
  if (/^(log_v2|notes|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(key)) return 1;
  if (Array.isArray(parsed)) return parsed.length;
  if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
  return parsed === undefined || parsed === null || parsed === "" ? 0 : 1;
}

function _backupNewItemCount3(key, incomingValue, currentValue) {
  const incoming = _backupParsedValue3(incomingValue);
  const current = _backupParsedValue3(currentValue);
  if (/^(log_v2|notes|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(key)) {
    return currentValue === undefined || currentValue === null ? 1 : 0;
  }
  if (Array.isArray(incoming)) {
    const currentIds = new Set((Array.isArray(current) ? current : []).map(_normalizedIdentity3));
    return incoming.filter(item => !currentIds.has(_normalizedIdentity3(item))).length;
  }
  if (incoming && typeof incoming === "object") {
    const currentObj = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    return Object.keys(incoming).filter(itemKey => currentObj[itemKey] === undefined).length;
  }
  return currentValue === undefined || currentValue === null || currentValue !== incomingValue ? 1 : 0;
}

function _mergeBackupValues3(targetKey, currentValue, incomingValue) {
  const incoming = _backupParsedValue3(incomingValue);
  const current = _backupParsedValue3(currentValue);
  if (/^(log_v2|notes|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(targetKey)) {
    return currentValue === undefined || currentValue === null ? incomingValue : currentValue;
  }
  if (Array.isArray(incoming)) {
    return _mergeArrayValues3([Array.isArray(current) ? current : [], incoming]);
  }
  if (incoming && typeof incoming === "object") {
    return _mergeObjectValues3([
      current && typeof current === "object" && !Array.isArray(current) ? current : {},
      incoming
    ]);
  }
  return currentValue === undefined || currentValue === null ? incomingValue : currentValue;
}

/**
 * Builds a complete account backup from every storage shape the app can read.
 *
 * storage.list() is intentionally app-facing: it hides internal fields and does
 * not enumerate legacy nutrition/{uid}_{key} documents. This function is
 * backup-facing, so it includes root profile fields, current data documents, and
 * legacy documents. Values stay in storage-string form so import can replay
 * them without changing numeric precision or object schemas.
 */
async function exportFullAccountBackup3() {
  if (!_getUid()) throw new Error("No authenticated user");

  const rootFields = await _loadRootFields3().catch(() => ({}));
  const dataKeys = await _listDataKeys3().catch(() => []);
  const legacyKeys = Array.from(await _listLegacyKeys3().catch(() => new Set()));

  const root = {};
  Object.entries(rootFields || {}).forEach(([key, value]) => {
    if (_backupCategoryForKey3(key) && value !== undefined && value !== null) root[key] = _storageValue2(value);
  });

  const data = {};
  for (let i = 0; i < dataKeys.length; i += 20) {
    await Promise.all(dataKeys.slice(i, i + 20).map(async key => {
      const doc = await _getDataDoc3(key).catch(() => null);
      if (_backupCategoryForKey3(key) && doc && doc.value !== undefined && doc.value !== null) data[key] = doc.value;
    }));
  }

  const legacy = {};
  for (let i = 0; i < legacyKeys.length; i += 20) {
    await Promise.all(legacyKeys.slice(i, i + 20).map(async key => {
      const doc = await _legacyGet2(key).catch(() => null);
      if (_backupCategoryForKey3(key) && doc && doc.value !== undefined && doc.value !== null) legacy[key] = doc.value;
    }));
  }

  return {
    schema: ACCOUNT_BACKUP_SCHEMA,
    version: ACCOUNT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    root,
    data,
    legacy,
    counts: {
      root: Object.keys(root).length,
      data: Object.keys(data).length,
      legacy: Object.keys(legacy).length
    }
  };
}

function _normalizeBackupPayload3(rawBackup) {
  const backup = rawBackup || {};

  if (backup.schema === ACCOUNT_BACKUP_SCHEMA && backup.version >= 3) {
    return {
      ...(backup.legacy || {}),
      ...(backup.root || {}),
      ...(backup.data || {})
    };
  }

  if (backup.data && typeof backup.data === "object" && !Array.isArray(backup.data)) {
    return {...backup.data};
  }

  if (typeof backup === "object" && !Array.isArray(backup)) {
    return {...backup};
  }

  return {};
}

/**
 * Validates a full-account backup before any write is attempted.
 *
 * The importer accepts both the current account-backup schema and older flat
 * JSON exports. This validation intentionally stays conservative: it rejects
 * empty/non-object files and impossible schema versions, but still allows old
 * backups that can be normalized into storage keys.
 */
function validateFullAccountBackup3(rawBackup) {
  const backup = rawBackup || {};
  const errors = [];

  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    return {
      ok: false,
      errors: ["Backup file must be a JSON object."],
      counts: {root: 0, data: 0, legacy: 0, importable: 0}
    };
  }

  if (backup.schema && backup.schema !== ACCOUNT_BACKUP_SCHEMA) {
    errors.push("Unsupported backup schema: " + backup.schema);
  }

  if (backup.schema === ACCOUNT_BACKUP_SCHEMA) {
    const version = Number(backup.version || 0);
    if (!Number.isFinite(version) || version < 1 || version > ACCOUNT_BACKUP_VERSION) {
      errors.push("Unsupported backup version: " + backup.version);
    }
  }

  const flat = _normalizeBackupPayload3(backup);
  const importableEntries = _backupImportableEntries3(flat);
  if (!importableEntries.length) {
    errors.push("Backup has no importable account data.");
  }

  const counts = {
    root: backup.root && typeof backup.root === "object" && !Array.isArray(backup.root) ? Object.keys(backup.root).length : 0,
    data: backup.data && typeof backup.data === "object" && !Array.isArray(backup.data) ? Object.keys(backup.data).length : 0,
    legacy: backup.legacy && typeof backup.legacy === "object" && !Array.isArray(backup.legacy) ? Object.keys(backup.legacy).length : 0,
    importable: importableEntries.length
  };

  return {
    ok: errors.length === 0,
    errors,
    counts
  };
}

function _shouldSkipBackupImportKey3(key) {
  // Migration/cache metadata belongs to the previous account state. The target
  // account receives fresh migration flags after user data is restored.
  return !_backupCategoryForKey3(key);
}

/**
 * Builds a read-only import preview for complete-account backups.
 *
 * Input: parsed JSON backup from the user.
 * Output: validation status, import counts, and examples of keys that would
 * overwrite existing data. This function never writes to Firestore; it is used
 * by the UI as a dry-run before the user confirms the import.
 */
async function previewFullAccountBackupImport3(rawBackup) {
  if (!_getUid()) throw new Error("No authenticated user");

  const validation = validateFullAccountBackup3(rawBackup);
  const flat = _normalizeBackupPayload3(rawBackup);
  const entries = _backupImportableEntries3(flat);
  const grouped = {};
  BACKUP_CATEGORY_ORDER.forEach(category => {
    grouped[category] = {
      id: category,
      keys: [],
      total: 0,
      newItems: 0,
      existingItems: 0,
      existingKeys: 0,
      newKeys: 0
    };
  });

  for (let i = 0; i < entries.length; i += 20) {
    const batch = entries.slice(i, i + 20);
    const rows = await Promise.all(batch.map(async entry => {
      const current = await fbGet3(entry.targetKey).catch(() => null);
      const currentValue = current && current.value !== undefined && current.value !== null ? current.value : null;
      const total = _backupItemCount3(entry.key, entry.value);
      const newItems = _backupNewItemCount3(entry.targetKey, entry.value, currentValue);
      return {
        ...entry,
        exists: currentValue !== null,
        total,
        newItems,
        existingItems: Math.max(0, total - newItems)
      };
    }));

    rows.forEach(row => {
      const bucket = grouped[row.category];
      if (!bucket) return;
      bucket.keys.push(row.targetKey);
      bucket.total += row.total;
      bucket.newItems += row.newItems;
      bucket.existingItems += row.existingItems;
      if (row.exists) bucket.existingKeys += 1;
      else bucket.newKeys += 1;
    });
  }

  const categories = BACKUP_CATEGORY_ORDER
    .map(category => grouped[category])
    .filter(category => category && category.keys.length);

  return {
    ok: validation.ok,
    errors: validation.errors,
    counts: validation.counts,
    importable: entries.length,
    skipped: Object.keys(flat).length - entries.length,
    conflicts: categories.reduce((sum, category) => sum + category.existingKeys, 0),
    newKeys: categories.reduce((sum, category) => sum + category.newKeys, 0),
    categories,
    exportedAt: rawBackup && rawBackup.exportedAt ? String(rawBackup.exportedAt) : null,
    schema: rawBackup && rawBackup.schema ? String(rawBackup.schema) : null,
    version: rawBackup && rawBackup.version !== undefined ? rawBackup.version : null
  };
}

/**
 * Restores any supported full-backup shape into the current account.
 *
 * Legacy keys are imported through fbSet3(), not recreated as legacy docs. That
 * means a backup from an old account is restored directly into the current
 * nutrition/{uid} + nutrition/{uid}/data/{key} structure.
 */
async function importFullAccountBackup3(rawBackup, options) {
  if (!_getUid()) throw new Error("No authenticated user");

  const validation = validateFullAccountBackup3(rawBackup);
  if (!validation.ok) {
    throw new Error("Invalid backup: " + validation.errors.join(" "));
  }

  const flat = _normalizeBackupPayload3(rawBackup);
  const entries = _backupImportableEntries3(flat);
  const selected = options && options.categories && typeof options.categories === "object"
    ? options.categories
    : {};
  const selectedCategories = Object.keys(selected).filter(category => selected[category]);
  if (!selectedCategories.length) {
    throw new Error("Choose at least one backup category to import.");
  }
  selectedCategories.forEach(category => {
    if (selected[category] !== "append" && selected[category] !== "replace") {
      throw new Error("Choose append or replace for every selected backup category.");
    }
  });
  const selectedEntries = entries.filter(entry => selected[entry.category]);
  let imported = 0;
  let skipped = Object.keys(flat).length - entries.length;

  for (let i = 0; i < selectedEntries.length; i += 15) {
    await Promise.all(selectedEntries.slice(i, i + 15).map(async entry => {
      const strategy = selected[entry.category];
      if (strategy === "replace") {
        await fbSet3(entry.targetKey, entry.value);
        imported++;
        return;
      }

      const current = await fbGet3(entry.targetKey).catch(() => null);
      const hasCurrent = !!(current && current.value !== undefined && current.value !== null);
      if (/^(log_v2|notes|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(entry.targetKey) && hasCurrent) {
        skipped++;
        return;
      }
      const merged = _mergeBackupValues3(entry.targetKey, hasCurrent ? current.value : null, entry.value);
      await fbSet3(entry.targetKey, merged);
      imported++;
    }));
  }

  await _patchRootFields3({
    _schemaVersion: 4,
    _storageSchemaVerified: true,
    _storageSchemaVerifiedAt: new Date().toISOString(),
    _legacyCleanupDone: true
  }, ["_legacyCleanupErrorAt"]);

  return {
    imported,
    skipped
  };
}

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

