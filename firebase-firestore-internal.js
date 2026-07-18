/**
 * Internal Firestore persistence core for the Nutrition Tracker.
 *
 * This module implements the application's most widely used data contract:
 * root-profile fields, active `data/{key}` documents, legacy documents, local
 * fallback reads, codecs, caches, and both v2/v3 CRUD behavior. The v2-named
 * infrastructure is active and shared by v3; it must not be treated as dead or
 * disposable legacy code.
 *
 * Schema migration, account deletion, backup orchestration, and public globals
 * remain in `firebase-storage.js`. They consume the narrow `support` port rather
 * than duplicating persistence primitives. `firebase-storage.js` remains the
 * sole public facade for `fbGet`/`fbSet`/`fbDel`/`fbList` and `window.storage`.
 *
 * Known behavior is intentionally preserved: migration starts in the background
 * on the first v3 get, read failures often become absence, fallback promotion is
 * fire-and-forget, and root underscore fields are hidden by list while data
 * subcollection underscore keys remain visible.
 *
 * @module FirebaseFirestoreInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseFirestoreInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the internal Firestore persistence implementation.
   *
   * @param {Object} dependencies Explicit persistence and facade dependencies.
   * @param {string} dependencies.firestoreBase Base REST URL for the nutrition collection.
   * @param {Function} dependencies.getUid Authentication-owned current UID getter.
   * @param {Function} dependencies.getAuthHeaders Async authenticated-header provider.
   * @param {Function} dependencies.fetchRequest Fetch-compatible HTTP function.
   * @param {Storage} dependencies.localStorage Browser-local fallback storage.
   * @param {Function} dependencies.runLegacyMigration Existing facade v2 migration callback.
   * @param {Function} dependencies.runStorageMigration Existing facade v3 migration callback.
   * @returns {Object} v2/v3 CRUD, cache reset, and a narrow support port for facade-only workflows.
   */
  function createFirebaseFirestore({
    firestoreBase,
    getUid,
    getAuthHeaders,
    fetchRequest,
    localStorage,
    runLegacyMigration,
    runStorageMigration
  }) {
    const PROFILE_FIELD_KEYS = new Set([
      "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg", "goalWeeks",
      "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
      "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
      "_storageSchemaVerified", "_storageSchemaVerifiedAt", "_legacyCleanupDone",
      "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
      "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
    ]);

    let _userDocCache = null;
    let _userDocLoaded = false;
    let _migrationPromise = null;
    let _rootDocCache3 = null;
    let _rootDocLoaded3 = false;
    let _dataKeyCache3 = null;
    let _migrationPromise3 = null;

    /** Resets every root, data-key, and migration cache after auth changes. @returns {void} */
    function resetStorageCaches() {
      _userDocCache = null;
      _userDocLoaded = false;
      _migrationPromise = null;
      _rootDocCache3 = null;
      _rootDocLoaded3 = false;
      _dataKeyCache3 = null;
      _migrationPromise3 = null;
    }

    function _legacyKey2(k) { const uid = getUid(); return uid ? uid + "_" + k : k; }
    function _stripLegacyUid2(k) { const uid = getUid(); return (uid && k.startsWith(uid + "_")) ? k.slice(uid.length + 1) : k; }
    function _userDocUrl2() { return firestoreBase + "/" + encodeURIComponent(getUid()); }
    function _legacyDocUrl2(k) { return firestoreBase + "/" + encodeURIComponent(_legacyKey2(k)); }
    function _dataDocUrl3(k) { return _userDocUrl2() + "/data/" + encodeURIComponent(k); }
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

    async function _fetchUserDocFields2() {
      if (!getUid()) return {};
      const r = await fetchRequest(_userDocUrl2(), {headers: await getAuthHeaders()});
      if (!r.ok) return {};
      const d = await r.json();
      const out = {};
      Object.entries(d.fields || {}).forEach(([k, v]) => out[k] = _decodeFsValue2(v));
      return out;
    }

    async function _patchUserFields2(fields, deleteKeys) {
      if (!getUid()) return;
      const setFields = fields || {};
      const deletes = deleteKeys || [];
      const params = new URLSearchParams();
      [...Object.keys(setFields), ...deletes].forEach(k => params.append("updateMask.fieldPaths", _fieldPath2(k)));
      const bodyFields = {};
      Object.entries(setFields).forEach(([k, v]) => bodyFields[k] = _encodeFsValue2(v));
      const r = await fetchRequest(_userDocUrl2() + (params.toString() ? "?" + params.toString() : ""), {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({fields: bodyFields})
      });
      if (!r.ok) throw new Error("Firestore write failed");
      _userDocCache = {...(_userDocCache || {}), ...setFields};
      deletes.forEach(k => { if (_userDocCache) delete _userDocCache[k]; });
      _userDocLoaded = true;
    }

    async function _legacyGet2(k) {
      try {
        const r = await fetchRequest(_legacyDocUrl2(k), {headers: await getAuthHeaders()});
        if (!r.ok) return null;
        const d = await r.json();
        const v = _decodeFsValue2(d?.fields?.value);
        return v !== undefined && v !== null ? {value: _storageValue2(v)} : null;
      } catch (e) { return null; }
    }

    function _localFallbackGet3(k) {
      try {
        const uid = getUid();
        const candidates = uid ? [_legacyKey2(k), k] : [k];
        for (const key of candidates) {
          const value = localStorage.getItem(key);
          if (value !== null && value !== undefined && value !== "undefined") return {value};
        }
      } catch (_) {}
      return null;
    }

    function _isCriticalStorageKey3(k) {
      return ["pantry_v2", "suppPantry", "weightHistory", "goalHistory", "mealTemplates", "customGoals", "trainingByDate"].includes(k);
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
    function _parseStorageJson3(value) {
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") return value;
      const text = value.trim();
      if (!text) return null;
      try { return JSON.parse(text); } catch (_) { return value; }
    }
    function _isProfileKey3(k) { return PROFILE_FIELD_KEYS.has(k); }
    function _normalizeProfileValue3(key, value) {
      let parsed = _parseStorageJson3(value);
      if (parsed === null || parsed === undefined) return parsed;
      if (key === "goalType") {
        const text = String(parsed);
        if (["lose", "loss", "lose_weight", "weight_loss"].includes(text)) return "loss";
        if (["gain", "gain_weight", "weight_gain"].includes(text)) return "gain";
        if (["maintain", "maintenance", "keep"].includes(text)) return "maintenance";
        return text;
      }
      if (key === "gender") {
        const text = String(parsed).toLowerCase();
        if (["masculino", "male", "m"].includes(text)) return "male";
        if (["feminino", "female", "f"].includes(text)) return "female";
        return text;
      }
      if (key === "activityLevel") {
        const text = String(parsed);
        const aliases = {
          sedentario: "sedentary", sedentary: "sedentary", light: "light", leve: "light",
          moderate: "moderate", moderado: "moderate", very: "very", muito: "very",
          extreme: "extreme", extremo: "extreme"
        };
        return aliases[text] || text;
      }
      return parsed;
    }
    function _storageRecord3(key, value) {
      const normalized = _isProfileKey3(key) ? _normalizeProfileValue3(key, value) : _parseStorageJson3(value);
      return normalized !== undefined && normalized !== null ? {value: _storageValue2(normalized)} : null;
    }

    async function _loadUserDoc2() {
      if (!getUid()) return {};
      if (!_userDocLoaded) {
        _userDocCache = await _fetchUserDocFields2().catch(() => ({}));
        _userDocLoaded = true;
      }
      if (!_migrationPromise) {
        _migrationPromise = runLegacyMigration({onlyIfMissing: true});
        await _migrationPromise;
      }
      return _userDocCache || {};
    }
    async function fbGetV2(k) {
      const fields = await _loadUserDoc2();
      if (fields[k] !== undefined && fields[k] !== null) return {value: _storageValue2(fields[k])};
      const legacy = await _legacyGet2(k);
      if (legacy) fbSetV2(k, legacy.value).catch(() => {});
      return legacy;
    }
    async function fbSetV2(k, v) {
      try { await _patchUserFields2({[k]: typeof v === "string" ? v : JSON.stringify(v)}, []); } catch (e) {}
    }
    async function fbDelV2(k) {
      try { await _patchUserFields2({}, [k]); } catch (e) {}
    }
    async function fbListV2(p) {
      try {
        const fields = await _loadUserDoc2();
        const newKeys = Object.keys(fields).filter(k => fields[k] !== undefined && fields[k] !== null);
        const r = await fetchRequest(firestoreBase + "?pageSize=1000", {headers: await getAuthHeaders()});
        if (!r.ok) return {keys: p ? newKeys.filter(k => k.indexOf(p) === 0) : newKeys};
        const d = await r.json();
        const uid = getUid();
        const prefix = uid ? uid + "_" : "";
        const legacyKeys = (d.documents || [])
          .map(doc => decodeURIComponent(doc.name.split("/").pop()))
          .filter(k => !getUid() || k.startsWith(prefix))
          .map(k => _stripLegacyUid2(k));
        const keys = Array.from(new Set([...newKeys, ...legacyKeys]));
        return {keys: p ? keys.filter(k => k.indexOf(p) === 0) : keys};
      } catch (e) { return {keys: []}; }
    }

    async function _fetchRootFields3() {
      if (!getUid()) return {};
      const r = await fetchRequest(_userDocUrl2(), {headers: await getAuthHeaders()});
      if (!r.ok) {
        console.warn("Firestore root read failed", {uid: getUid(), status: r.status});
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
        const r = await fetchRequest(_dataDocUrl3(k), {headers: await getAuthHeaders()});
        if (!r.ok) {
          if (r.status !== 404 && _isCriticalStorageKey3(k)) console.warn("Firestore data read failed", {uid: getUid(), key: k, status: r.status});
          return null;
        }
        const d = await r.json();
        const value = _decodeFsValue2(d?.fields?.value);
        return value !== undefined && value !== null ? {value: _storageValue2(value)} : null;
      } catch (error) {
        if (_isCriticalStorageKey3(k)) console.warn("Firestore data read failed", {uid: getUid(), key: k, error: error?.message || String(error)});
        return null;
      }
    }
    async function _setDataDoc3(k, v) {
      const r = await fetchRequest(_dataDocUrl3(k), {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({fields: {value: _encodeFsValue2(typeof v === "string" ? v : JSON.stringify(v))}})
      });
      if (!r.ok) throw new Error("Firestore data write failed");
      if (_dataKeyCache3) _dataKeyCache3.add(k);
    }
    async function _deleteDataDoc3(k) {
      const r = await fetchRequest(_dataDocUrl3(k), {method: "DELETE", headers: await getAuthHeaders()});
      if (!r.ok && r.status !== 404) throw new Error("Firestore data delete failed");
      if (_dataKeyCache3) _dataKeyCache3.delete(k);
    }
    async function _listDataKeys3() {
      if (_dataKeyCache3) return Array.from(_dataKeyCache3);
      const keys = new Set();
      let pageToken = "";
      do {
        const url = _userDocUrl2() + "/data?pageSize=1000" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
        const r = await fetchRequest(url, {headers: await getAuthHeaders()});
        if (!r.ok) break;
        const d = await r.json();
        (d.documents || []).forEach(doc => keys.add(decodeURIComponent((doc.name || "").split("/").pop() || "")));
        pageToken = d.nextPageToken || "";
      } while (pageToken);
      _dataKeyCache3 = keys;
      return Array.from(keys);
    }
    async function _listLegacyKeys3() {
      if (!getUid()) return new Set();
      const keys = new Set();
      let pageToken = "";
      do {
        const url = firestoreBase + "?pageSize=1000" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
        const r = await fetchRequest(url, {headers: await getAuthHeaders()});
        if (!r.ok) break;
        const d = await r.json();
        (d.documents || [])
          .map(doc => decodeURIComponent(doc.name.split("/").pop()))
          .filter(id => id.startsWith(getUid() + "_"))
          .map(id => id.slice(getUid().length + 1))
          .forEach(key => keys.add(key));
        pageToken = d.nextPageToken || "";
      } while (pageToken);
      return keys;
    }
    async function _legacyDelete3(k) {
      const r = await fetchRequest(_legacyDocUrl2(k), {method: "DELETE", headers: await getAuthHeaders()});
      if (!r.ok && r.status !== 404) throw new Error("Legacy delete failed");
    }
    async function _ensureStorageMigration3() {
      if (!_migrationPromise3) _migrationPromise3 = runStorageMigration({cleanup: true}).catch(error => ({error: error?.message || String(error)}));
      await _migrationPromise3;
    }
    async function fbGet3(k) {
      if (!getUid()) return null;
      if (!_migrationPromise3) _ensureStorageMigration3();
      if (_isProfileKey3(k)) {
        const fields = await _loadRootFields3();
        if (fields[k] !== undefined && fields[k] !== null) {
          const normalized = _normalizeProfileValue3(k, fields[k]);
          if (normalized !== fields[k]) _patchRootFields3({[k]: normalized}, []).catch(() => {});
          return _storageRecord3(k, normalized);
        }
        const misplacedData = await _getDataDoc3(k).catch(() => null);
        if (misplacedData) {
          const normalized = _normalizeProfileValue3(k, misplacedData.value);
          _patchRootFields3({[k]: normalized}, []).catch(() => {});
          return _storageRecord3(k, normalized);
        }
      } else {
        const data = await _getDataDoc3(k).catch(() => null);
        const fields = await _loadRootFields3();
        const root = fields[k] !== undefined && fields[k] !== null ? {value: _storageValue2(fields[k])} : null;
        const legacy = await _legacyGet2(k).catch(() => null);
        const local = _localFallbackGet3(k);
        const best = _isCriticalStorageKey3(k) ? _bestStorageCandidate3([data, root, legacy, local]) : data || root || legacy || local;
        if (best) {
          if (!_isEmptyStoredValue3(best.value)) _setDataDoc3(k, best.value).catch(() => {});
          return best;
        }
        return null;
      }
      const legacy = await _legacyGet2(k).catch(() => null);
      if (legacy && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(legacy.value))) fbSet3(k, legacy.value).catch(() => {});
      if (legacy && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(legacy.value))) return _storageRecord3(k, legacy.value);
      const local = _localFallbackGet3(k);
      if (local && !(_isCriticalStorageKey3(k) && _isEmptyStoredValue3(local.value))) {
        fbSet3(k, local.value).catch(() => {});
        return _storageRecord3(k, local.value);
      }
      return local ? _storageRecord3(k, local.value) : null;
    }
    async function fbSet3(k, v) {
      if (!getUid()) return;
      const value = typeof v === "string" ? v : JSON.stringify(v);
      if (_isProfileKey3(k)) await _patchRootFields3({[k]: _normalizeProfileValue3(k, value)}, []);
      else await _setDataDoc3(k, value);
    }
    async function fbDel3(k) {
      if (!getUid()) return;
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

    function _mergeUserDocCache2(currentFields, updates) {
      _userDocCache = {...currentFields, ...updates, ...(_userDocCache || {})};
      _userDocLoaded = true;
    }
    function _setStorageMigrationPromiseForTesting(promise) { _migrationPromise3 = promise; }

    return {
      resetStorageCaches,
      fbGetV2,
      fbSetV2,
      fbDelV2,
      fbListV2,
      fbGet3,
      fbSet3,
      fbDel3,
      fbList3,
      support: {
        getUid,
        legacyKey2: _legacyKey2,
        stripLegacyUid2: _stripLegacyUid2,
        userDocUrl2: _userDocUrl2,
        legacyDocUrl2: _legacyDocUrl2,
        decodeFsValue2: _decodeFsValue2,
        encodeFsValue2: _encodeFsValue2,
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
        legacyDelete3: _legacyDelete3,
        setStorageMigrationPromiseForTesting: _setStorageMigrationPromiseForTesting
      }
    };
  }

  return { createFirebaseFirestore };
});
