// Firebase auth and Firestore persistence adapter.
// Public functions are assigned to window/storage because the app is loaded as
// plain browser scripts. Keep persistence concerns here so app.js can focus on UI,
// calculations, and user flows.
// ── Firebase config ──────────────────────────────────────────
const FB_PROJECT = "nutrition-tracker-780b3";
const FB_KEY     = "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE";
const FB_BASE    = "https://firestore.googleapis.com/v1/projects/" + FB_PROJECT + "/databases/(default)/documents/nutrition";
const AUTH_BASE  = "https://identitytoolkit.googleapis.com/v1/accounts";
const TOKEN_BASE = "https://securetoken.googleapis.com/v1/token";
const REPORT_SERVER_URL = "http://192.168.1.82:8000";

// ── Auth state ───────────────────────────────────────────────
let _idToken      = null;
let _uid          = localStorage.getItem("fb_uid") || null;
let _refreshToken = localStorage.getItem("fb_refresh") || null;
let _tokenExpiry  = 0;

window._saveSession = function _saveSession(d) {
  _idToken      = d.idToken || d.id_token;
  _refreshToken = d.refreshToken || d.refresh_token;
  _uid          = d.localId || d.user_id || _uid;
  _resetFirestoreCaches();
  _tokenExpiry  = Date.now() + (+( d.expiresIn || d.expires_in) - 60) * 1000;
  localStorage.setItem("fb_refresh", _refreshToken);
  if (_uid) localStorage.setItem("fb_uid", _uid);
}

async function fbSignIn(email, password) {
  const r = await fetch(AUTH_BASE + ":signInWithPassword?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Login falhou");
  _saveSession(d);
  localStorage.setItem('fb_email', email);
  return d;
}

async function fbSignUp(email, password) {
  const r = await fetch(AUTH_BASE + ":signUp?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Registro falhou");
  _saveSession(d); return d;
}

async function fbUpdateProfile(displayName) {
  const token = await fbToken();
  await fetch(AUTH_BASE + ":update?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({idToken: token, displayName, returnSecureToken: false})
  });
}

async function fbSendVerificationEmail() {
  const token = await fbToken();
  await fetch(AUTH_BASE + ":sendOobCode?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({requestType: "VERIFY_EMAIL", idToken: token})
  });
}

async function fbCheckEmailVerified() {
  const token = await fbToken();
  const r = await fetch(AUTH_BASE + ":lookup?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({idToken: token})
  });
  const d = await r.json();
  return d?.users?.[0]?.emailVerified === true;
}

async function fbRefreshToken() {
  if (!_refreshToken) throw new Error("Sem sessão");
  const r = await fetch(TOKEN_BASE + "?key=" + FB_KEY, {
    method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(_refreshToken)
  });
  const d = await r.json();
  if (!r.ok) { _refreshToken = null; localStorage.removeItem("fb_refresh"); localStorage.removeItem("fb_uid"); throw new Error("Sessão expirada"); }
  _saveSession(d);
}

async function fbToken() {
  if (_idToken && Date.now() < _tokenExpiry) return _idToken;
  await fbRefreshToken();
  return _idToken;
}

function fbSignOut() {
  _idToken = _refreshToken = _uid = null;
  _tokenExpiry = 0;
  _resetFirestoreCaches();
  localStorage.removeItem("fb_refresh");
  localStorage.removeItem("fb_uid");
}

function fbIsLoggedIn() { return !!_refreshToken; }

// ── Key namespacing (each user gets their own data) ───────────
// All keys are prefixed with the user's UID internally.
// The app uses plain keys like "pantry_v2" and never se??es the prefix.
// Legacy uid_field helpers removed from active persistence. Kept data is read by the migration layer below.

// ── Firestore helpers (authenticated + namespaced) ────────────
async function fbHeaders() {
  const token = await fbToken();
  return {"Content-Type": "application/json", "Authorization": "Bearer " + token};
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

function _legacyKey2(k) { return _uid ? _uid + "_" + k : k; }
function _stripLegacyUid2(k) { return (_uid && k.startsWith(_uid + "_")) ? k.slice(_uid.length + 1) : k; }
function _userDocUrl2() { return FB_BASE + "/" + encodeURIComponent(_uid); }
function _legacyDocUrl2(k) { return FB_BASE + "/" + encodeURIComponent(_legacyKey2(k)); }
function _fieldPath2(k) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : "`" + String(k).replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
}
function _decodeFsValue2(v) {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return !!v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(_decodeFsValue2);
  if ("mapValue" in v) {
    const out = {};
    Object.entries(v.mapValue.fields || {}).forEach(([k, val]) => out[k] = _decodeFsValue2(val));
    return out;
  }
  return undefined;
}
function _encodeFsValue2(v) {
  if (v === null || v === undefined) return {nullValue: null};
  if (typeof v === "boolean") return {booleanValue: v};
  if (typeof v === "number" && Number.isFinite(v)) return Number.isInteger(v) ? {integerValue: String(v)} : {doubleValue: v};
  if (Array.isArray(v)) return {arrayValue: {values: v.map(_encodeFsValue2)}};
  if (typeof v === "object") {
    const fields = {};
    Object.entries(v).forEach(([k, val]) => fields[k] = _encodeFsValue2(val));
    return {mapValue: {fields}};
  }
  return {stringValue: String(v)};
}
function _storageValue2(v) { return typeof v === "string" ? v : JSON.stringify(v); }
let _userDocCache = null;
let _userDocLoaded = false;
let _migrationPromise = null;

/**
 * Clears every Firestore cache used by the persistence adapter.
 * This is called whenever auth state changes so profile fields and data
 * subcollection keys are always loaded for the currently authenticated user.
 */
function _resetFirestoreCaches() {
  _userDocCache = null;
  _userDocLoaded = false;
  _migrationPromise = null;
  if (typeof _rootDocCache3 !== "undefined") _rootDocCache3 = null;
  if (typeof _rootDocLoaded3 !== "undefined") _rootDocLoaded3 = false;
  if (typeof _dataKeyCache3 !== "undefined") _dataKeyCache3 = null;
  if (typeof _migrationPromise3 !== "undefined") _migrationPromise3 = null;
}

async function _fetchUserDocFields2() {
  if (!_uid) return {};
  const r = await fetch(_userDocUrl2(), {headers: await fbHeaders()});
  if (!r.ok) return {};
  const d = await r.json();
  const out = {};
  Object.entries(d.fields || {}).forEach(([k, v]) => out[k] = _decodeFsValue2(v));
  return out;
}

async function _patchUserFields2(fields, deleteKeys) {
  if (!_uid) return;
  const setFields = fields || {};
  const deletes = deleteKeys || [];
  const params = new URLSearchParams();
  [...Object.keys(setFields), ...deletes].forEach(k => params.append("updateMask.fieldPaths", _fieldPath2(k)));
  const bodyFields = {};
  Object.entries(setFields).forEach(([k, v]) => bodyFields[k] = _encodeFsValue2(v));
  const r = await fetch(_userDocUrl2() + (params.toString() ? "?" + params.toString() : ""), {
    method: "PATCH",
    headers: await fbHeaders(),
    body: JSON.stringify({fields: bodyFields})
  });
  if (!r.ok) throw new Error("Firestore write failed");
  _userDocCache = {...(_userDocCache || {}), ...setFields};
  deletes.forEach(k => { if (_userDocCache) delete _userDocCache[k]; });
  _userDocLoaded = true;
}

async function _legacyGet2(k) {
  try {
    const r = await fetch(_legacyDocUrl2(k), {headers: await fbHeaders()});
    if (!r.ok) return null;
    const d = await r.json();
    const v = _decodeFsValue2(d?.fields?.value);
    return v !== undefined && v !== null ? {value: _storageValue2(v)} : null;
  } catch(e) { return null; }
}

/**
 * Last-resort local fallback used during schema transitions.
 * Older app versions sometimes kept a browser-local copy using either the
 * plain key or the uid-prefixed key. When found, the caller promotes it back to
 * Firestore so the next load uses the normal cloud path again.
 */
function _localFallbackGet3(k) {
  try {
    const candidates = _uid ? [_legacyKey2(k), k] : [k];
    for (const key of candidates) {
      const value = localStorage.getItem(key);
      if (value !== null && value !== undefined && value !== "undefined") {
        return {value};
      }
    }
  } catch (_) {}
  return null;
}

function _isCriticalStorageKey3(k) {
  return [
    "pantry_v2",
    "suppPantry",
    "weightHistory",
    "goalHistory",
    "mealTemplates",
    "customGoals",
    "trainingByDate"
  ].includes(k);
}

function _isEmptyStoredValue3(value) {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text === "" || text === "[]" || text === "{}" || text === "null";
}

function _storedValueScore3(value) {
  if (_isEmptyStoredValue3(value)) return 0;
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
  } catch (_) {}
  return 1;
}

function _bestStorageCandidate3(candidates) {
  return candidates
    .filter(candidate => candidate && candidate.value !== undefined && candidate.value !== null)
    .sort((a, b) => _storedValueScore3(b.value) - _storedValueScore3(a.value))[0] || null;
}

async function migrateLegacyNutritionDocs(options) {
  if (!_uid) return {migrated: 0, skipped: 0};
  const onlyIfMissing = !options || options.onlyIfMissing !== false;
  try {
    const headers = await fbHeaders();
    const [listRes, currentFields] = await Promise.all([
      fetch(FB_BASE + "?pageSize=1000", {headers}),
      _fetchUserDocFields2().catch(() => ({}))
    ]);
    if (!listRes.ok) return {migrated: 0, skipped: 0};
    const data = await listRes.json();
    const prefix = _uid + "_";
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
    _userDocCache = {...currentFields, ...updates, ...(_userDocCache || {})};
    _userDocLoaded = true;
    return {migrated: keys.length, skipped};
  } catch(e) {
    return {migrated: 0, skipped: 0, error: e.message || String(e)};
  }
}
window.migrateLegacyNutritionDocs = migrateLegacyNutritionDocs;

async function _loadUserDoc2() {
  if (!_uid) return {};
  if (!_userDocLoaded) {
    _userDocCache = await _fetchUserDocFields2().catch(() => ({}));
    _userDocLoaded = true;
  }
  if (!_migrationPromise) {
    _migrationPromise = migrateLegacyNutritionDocs({onlyIfMissing: true});
    await _migrationPromise;
  }
  return _userDocCache || {};
}

async function fbGet(k) {
  const fields = await _loadUserDoc2();
  if (fields[k] !== undefined && fields[k] !== null) return {value: _storageValue2(fields[k])};
  const legacy = await _legacyGet2(k);
  if (legacy) fbSet(k, legacy.value).catch(() => {});
  return legacy;
}

async function fbSet(k, v) {
  try {
    await _patchUserFields2({[k]: typeof v === "string" ? v : JSON.stringify(v)}, []);
  } catch(e) {}
}

async function fbDel(k) {
  try {
    await _patchUserFields2({}, [k]);
  } catch(e) {}
}

async function fbList(p) {
  try {
    const fields = await _loadUserDoc2();
    const newKeys = Object.keys(fields).filter(k => fields[k] !== undefined && fields[k] !== null);
    const r = await fetch(FB_BASE + "?pageSize=1000", {headers: await fbHeaders()});
    if (!r.ok) return {keys: p ? newKeys.filter(k => k.indexOf(p) === 0) : newKeys};
    const d = await r.json();
    const prefix = _uid ? _uid + "_" : "";
    const legacyKeys = (d.documents||[])
      .map(doc => decodeURIComponent(doc.name.split("/").pop()))
      .filter(k => !_uid || k.startsWith(prefix))
      .map(k => _stripLegacyUid2(k));
    const keys = Array.from(new Set([...newKeys, ...legacyKeys]));
    return {keys: p ? keys.filter(k => k.indexOf(p) === 0) : keys};
  } catch(e) { return {keys:[]}; }
}

// Firestore v3 storage:
// - nutrition/{uid}: small profile/preferences fields.
// - nutrition/{uid}/data/{key}: app data that can grow over time.
// Legacy root fields and nutrition/{uid}_{key} docs remain readable as fallback.
const PROFILE_FIELD_KEYS = new Set([
  "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg", "goalWeeks",
  "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
  "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
  "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
  "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
]);
let _rootDocCache3 = null;
let _rootDocLoaded3 = false;
let _dataKeyCache3 = null;
let _migrationPromise3 = null;
function _dataDocUrl3(k) {
  return _userDocUrl2() + "/data/" + encodeURIComponent(k);
}
function _isProfileKey3(k) {
  return PROFILE_FIELD_KEYS.has(k);
}
async function _fetchRootFields3() {
  if (!_uid) return {};
  const r = await fetch(_userDocUrl2(), {headers: await fbHeaders()});
  if (!r.ok) {
    console.warn("Firestore root read failed", {uid: _uid, status: r.status});
    return {};
  }
  const d = await r.json();
  const out = {};
  Object.entries(d.fields || {}).forEach(([k, v]) => out[k] = _decodeFsValue2(v));
  return out;
}
async function _loadRootFields3() {
  if (!_rootDocLoaded3) {
    _rootDocCache3 = await _fetchRootFields3().catch(() => ({}));
    _rootDocLoaded3 = true;
  }
  return _rootDocCache3 || {};
}
async function _patchRootFields3(fields, deleteKeys) {
  await _patchUserFields2(fields, deleteKeys);
  _rootDocCache3 = {...(_rootDocCache3 || {}), ...(fields || {})};
  (deleteKeys || []).forEach(k => { if (_rootDocCache3) delete _rootDocCache3[k]; });
  _rootDocLoaded3 = true;
}
async function _getDataDoc3(k) {
  try {
    const r = await fetch(_dataDocUrl3(k), {headers: await fbHeaders()});
    if (!r.ok) {
      if (r.status !== 404 && _isCriticalStorageKey3(k)) {
        console.warn("Firestore data read failed", {uid: _uid, key: k, status: r.status});
      }
      return null;
    }
    const d = await r.json();
    const value = _decodeFsValue2(d?.fields?.value);
    return value !== undefined && value !== null ? {value: _storageValue2(value)} : null;
  } catch (error) {
    if (_isCriticalStorageKey3(k)) {
      console.warn("Firestore data read failed", {uid: _uid, key: k, error: error?.message || String(error)});
    }
    return null;
  }
}
async function _setDataDoc3(k, v) {
  const r = await fetch(_dataDocUrl3(k), {
    method: "PATCH",
    headers: await fbHeaders(),
    body: JSON.stringify({fields: {value: _encodeFsValue2(typeof v === "string" ? v : JSON.stringify(v))}})
  });
  if (!r.ok) throw new Error("Firestore data write failed");
  if (_dataKeyCache3) _dataKeyCache3.add(k);
}
async function _deleteDataDoc3(k) {
  const r = await fetch(_dataDocUrl3(k), {method: "DELETE", headers: await fbHeaders()});
  if (!r.ok && r.status !== 404) throw new Error("Firestore data delete failed");
  if (_dataKeyCache3) _dataKeyCache3.delete(k);
}
async function _listDataKeys3() {
  if (_dataKeyCache3) return Array.from(_dataKeyCache3);
  const keys = new Set();
  let pageToken = "";
  do {
    const url = _userDocUrl2() + "/data?pageSize=1000" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
    const r = await fetch(url, {headers: await fbHeaders()});
    if (!r.ok) break;
    const d = await r.json();
    (d.documents || []).forEach(doc => keys.add(decodeURIComponent((doc.name || "").split("/").pop() || "")));
    pageToken = d.nextPageToken || "";
  } while (pageToken);
  _dataKeyCache3 = keys;
  return Array.from(keys);
}
function _knownMigrationKeys3() {
  const base = [
    "pantry", "pantry_v2", "suppPantry", "waterGoal", "customGoals", "goalHistory",
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

function _parseStorageJson3(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return value; }
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

async function _legacyDelete3(k) {
  const r = await fetch(_legacyDocUrl2(k), {method: "DELETE", headers: await fbHeaders()});
  if (!r.ok && r.status !== 404) throw new Error("Legacy delete failed");
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
  if (userGoal.type && !out.goalType) out.goalType = userGoal.type;
  if (userGoal.goalType && !out.goalType) out.goalType = userGoal.goalType;
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
  if (!_uid) return {migrated: 0, cleaned: 0, skipped: 0};
  const cleanup = !options || options.cleanup !== false;
  const now = new Date().toISOString();
  const rootFields = await _loadRootFields3();

  if (Number(rootFields._schemaVersion || 0) >= 4 && rootFields._legacyCleanupAt) {
    return {migrated: 0, cleaned: 0, skipped: 1};
  }

  const dataKeys = new Set(await _listDataKeys3().catch(() => []));
  const rootDeletes = new Set();
  const dataDeletes = new Set();
  const legacyDeletes = new Set();
  const rootUpdates = {};
  let migrated = 0;
  let cleaned = 0;
  let cleanupFailures = 0;

  const finalKeys = _knownMigrationKeys3().filter(key => !["pantry", "userBirth", "userGender", "userActivity", "userGoal"].includes(key));
  const legacyUserGoal = await _legacyGet2("userGoal").catch(() => null);
  Object.assign(rootUpdates, _extractProfileFromLegacyUserGoal3(legacyUserGoal?.value));
  if (legacyUserGoal) legacyDeletes.add("userGoal");

  for (const key of finalKeys) {
    const aliases = _legacyAliasesForKey3(key);
    const data = dataKeys.has(key) ? await _getDataDoc3(key).catch(() => null) : null;
    const root = rootFields[key] !== undefined && rootFields[key] !== null ? {value: _storageValue2(rootFields[key])} : null;
    const legacyCandidates = [];
    for (const legacyKey of [key, ...aliases]) {
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
      const currentValue = root ? root.value : null;
      if (currentValue !== mergedValue) {
        rootUpdates[key] = mergedValue;
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
      _schemaMigratedAt: rootFields._schemaMigratedAt || now,
      _schemaNormalizedAt: now
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
window.migrateStorageToFirestoreV3 = migrateStorageToFirestoreV3;
window.migrateLegacyNutritionDocs = migrateStorageToFirestoreV3;
window.normalizeCurrentUserStorage = migrateStorageToFirestoreV3;
async function _ensureStorageMigration3() {
  if (!_migrationPromise3) _migrationPromise3 = migrateStorageToFirestoreV3({cleanup: true}).catch(error => ({error: error?.message || String(error)}));
  await _migrationPromise3;
}
async function fbGet3(k) {
  if (!_uid) return null;
  if (!_migrationPromise3) _ensureStorageMigration3();
  if (_isProfileKey3(k)) {
    const fields = await _loadRootFields3();
    if (fields[k] !== undefined && fields[k] !== null) return {value: _storageValue2(fields[k])};
    const misplacedData = await _getDataDoc3(k).catch(() => null);
    if (misplacedData) {
      _patchRootFields3({[k]: misplacedData.value}, []).catch(() => {});
      return misplacedData;
    }
  } else {
    const data = await _getDataDoc3(k).catch(() => null);
    const fields = await _loadRootFields3();
    const root = fields[k] !== undefined && fields[k] !== null ? {value: _storageValue2(fields[k])} : null;
    const legacy = await _legacyGet2(k).catch(() => null);
    const local = _localFallbackGet3(k);
    const best = _isCriticalStorageKey3(k)
      ? _bestStorageCandidate3([data, root, legacy, local])
      : data || root || legacy || local;

    if (best) {
      if (!_isEmptyStoredValue3(best.value)) _setDataDoc3(k, best.value).catch(() => {});
      return best;
    }
    return null;
  }
  const legacy = await _legacyGet2(k).catch(() => null);
  if (legacy && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(legacy.value))) {
    fbSet3(k, legacy.value).catch(() => {});
  }
  if (legacy && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(legacy.value))) return legacy;
  const local = _localFallbackGet3(k);
  if (local && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(local.value))) {
    fbSet3(k, local.value).catch(() => {});
    return local;
  }
  return local;
}
async function fbSet3(k, v) {
  if (!_uid) return;
  const value = typeof v === "string" ? v : JSON.stringify(v);
  if (_isProfileKey3(k)) await _patchRootFields3({[k]: value}, []);
  else await _setDataDoc3(k, value);
}
async function fbDel3(k) {
  if (!_uid) return;
  if (_isProfileKey3(k)) await _patchRootFields3({}, [k]);
  else await _deleteDataDoc3(k);
}
async function fbList3(p) {
  const rootFields = await _loadRootFields3().catch(() => ({}));
  const rootKeys = Object.keys(rootFields).filter(k => !k.startsWith("_") && rootFields[k] !== undefined && rootFields[k] !== null);
  const dataKeys = await _listDataKeys3().catch(() => []);
  const keys = Array.from(new Set([...rootKeys, ...dataKeys]));
  return {keys: p ? keys.filter(k => k.indexOf(p) === 0) : keys};
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
    uid: _uid,
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

