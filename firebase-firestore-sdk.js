/**
 * Canonical Firestore SDK persistence adapter for Trofia.
 *
 * Profile fields live in `nutrition/{uid}` and application records live in
 * `nutrition/{uid}/data/{key}`. Firebase operations are injected so this module
 * remains independently testable and the public storage contract stays stable.
 *
 * @module FirebaseFirestoreSdk
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseFirestoreSdk = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const PROFILE_FIELD_KEYS = new Set([
    "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg", "goalWeeks",
    "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
    "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
    "_storageSchemaVerified", "_storageSchemaVerifiedAt", "_legacyCleanupDone",
    "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
    "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
  ]);
  const CRITICAL_STORAGE_KEYS = new Set([
    "pantry_v2", "suppPantry", "weightHistory", "goalHistory", "mealTemplates",
    "customGoals", "trainingByDate"
  ]);
  const DATA_VALUE_CACHE_TTL_MS = 60 * 1000;
  const DATA_MISSING_CACHE_TTL_MS = 10 * 1000;

  function storageValue(value) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function parseStorageJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return value; }
  }

  function isProfileKey(key) {
    return PROFILE_FIELD_KEYS.has(key);
  }

  function normalizeProfileValue(key, value) {
    const parsed = parseStorageJson(value);
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

  function storageRecord(key, value) {
    const parsed = isProfileKey(key) ? normalizeProfileValue(key, value) : parseStorageJson(value);
    return parsed !== undefined && parsed !== null ? {value: storageValue(parsed)} : null;
  }

  function createFirebaseFirestoreSdk({firestore, getUid, sdk, now = Date.now}) {
    const required = ["doc", "collection", "getDoc", "setDoc", "deleteDoc", "getDocs", "deleteField"];
    if (!firestore || typeof getUid !== "function" || !sdk ||
        required.some(name => typeof sdk[name] !== "function") || typeof now !== "function") {
      throw new TypeError("FirebaseFirestoreSdk requires Firestore, UID, and modular SDK operations");
    }

    let rootDocCache = null;
    let rootDocLoaded = false;
    let rootDocLoadPromise = null;
    const rootFieldVersion = new Map();
    let dataKeyCache = null;
    const dataValueCache = new Map();
    const dataValuePending = new Map();
    const dataValueVersion = new Map();
    let storageCacheGeneration = 0;

    function resetStorageCaches() {
      storageCacheGeneration++;
      rootDocCache = null;
      rootDocLoaded = false;
      rootDocLoadPromise = null;
      rootFieldVersion.clear();
      dataKeyCache = null;
      dataValueCache.clear();
      dataValuePending.clear();
      dataValueVersion.clear();
    }

    function userDocRef() {
      return sdk.doc(firestore, "nutrition", String(getUid()));
    }

    function dataCollectionRef() {
      return sdk.collection(firestore, "nutrition", String(getUid()), "data");
    }

    function dataDocRef(key) {
      return sdk.doc(firestore, "nutrition", String(getUid()), "data", String(key));
    }

    async function fetchRootFields() {
      if (!getUid()) return {};
      try {
        const snapshot = await sdk.getDoc(userDocRef());
        return snapshot.exists() ? {...(snapshot.data() || {})} : {};
      } catch (error) {
        console.warn("Firestore root read failed", {
          uid: getUid(),
          code: error?.code || "unknown"
        });
        return {};
      }
    }

    async function loadRootFields() {
      if (rootDocLoaded) return rootDocCache || {};
      if (!rootDocLoadPromise) {
        const loadGeneration = storageCacheGeneration;
        const loadFieldVersions = new Map(rootFieldVersion);
        let loadPromise;
        loadPromise = fetchRootFields()
          .then(fields => {
            if (loadGeneration !== storageCacheGeneration) return rootDocCache || {};
            const mergedFields = {...fields};
            rootFieldVersion.forEach((version, key) => {
              if (version === (loadFieldVersions.get(key) || 0)) return;
              if (rootDocCache && Object.prototype.hasOwnProperty.call(rootDocCache, key)) {
                mergedFields[key] = rootDocCache[key];
              } else {
                delete mergedFields[key];
              }
            });
            rootDocCache = mergedFields;
            rootDocLoaded = true;
            return mergedFields;
          })
          .finally(() => {
            if (rootDocLoadPromise === loadPromise) rootDocLoadPromise = null;
          });
        rootDocLoadPromise = loadPromise;
      }
      return rootDocLoadPromise;
    }

    async function patchRootFields(fields, deleteKeys) {
      if (!getUid()) return;
      const setFields = fields || {};
      const deletes = deleteKeys || [];
      const patch = {...setFields};
      deletes.forEach(key => { patch[key] = sdk.deleteField(); });
      try {
        await sdk.setDoc(userDocRef(), patch, {merge: true});
      } catch (error) {
        throw new Error("Firestore write failed", {cause: error});
      }
      rootDocCache = {...(rootDocCache || {}), ...setFields};
      Object.keys(setFields).forEach(key => {
        rootFieldVersion.set(key, (rootFieldVersion.get(key) || 0) + 1);
      });
      deletes.forEach(key => {
        rootFieldVersion.set(key, (rootFieldVersion.get(key) || 0) + 1);
        if (rootDocCache) delete rootDocCache[key];
      });
      rootDocLoaded = true;
    }

    async function fetchDataDoc(key) {
      try {
        const snapshot = await sdk.getDoc(dataDocRef(key));
        if (!snapshot.exists()) return null;
        const value = snapshot.data()?.value;
        return value !== undefined && value !== null ? {value: storageValue(value)} : null;
      } catch (error) {
        if (CRITICAL_STORAGE_KEYS.has(key)) {
          console.warn("Firestore data read failed", {
            uid: getUid(),
            key,
            code: error?.code || "unknown"
          });
        }
        return null;
      }
    }

    async function getDataDoc(key) {
      const cached = dataValueCache.get(key);
      if (cached && cached.expiresAt > now()) return cached.record;
      if (dataValuePending.has(key)) return dataValuePending.get(key);

      const readGeneration = storageCacheGeneration;
      const readVersion = dataValueVersion.get(key) || 0;
      let readPromise;
      readPromise = fetchDataDoc(key)
        .then(record => {
          if (readGeneration !== storageCacheGeneration ||
              readVersion !== (dataValueVersion.get(key) || 0)) {
            return dataValueCache.get(key)?.record || null;
          }
          dataValueCache.set(key, {
            record,
            expiresAt: now() + (record ? DATA_VALUE_CACHE_TTL_MS : DATA_MISSING_CACHE_TTL_MS)
          });
          return record;
        })
        .finally(() => {
          if (dataValuePending.get(key) === readPromise) dataValuePending.delete(key);
        });
      dataValuePending.set(key, readPromise);
      return readPromise;
    }

    async function setDataDoc(key, value) {
      const stored = typeof value === "string" ? value : JSON.stringify(value);
      try {
        await sdk.setDoc(dataDocRef(key), {value: stored});
      } catch (error) {
        throw new Error("Firestore data write failed", {cause: error});
      }
      if (dataKeyCache) dataKeyCache.add(key);
      dataValueVersion.set(key, (dataValueVersion.get(key) || 0) + 1);
      dataValueCache.set(key, {
        record: {value: stored},
        expiresAt: now() + DATA_VALUE_CACHE_TTL_MS
      });
    }

    async function deleteDataDoc(key) {
      try {
        await sdk.deleteDoc(dataDocRef(key));
      } catch (error) {
        throw new Error("Firestore data delete failed", {cause: error});
      }
      if (dataKeyCache) dataKeyCache.delete(key);
      dataValueVersion.set(key, (dataValueVersion.get(key) || 0) + 1);
      dataValueCache.set(key, {
        record: null,
        expiresAt: now() + DATA_MISSING_CACHE_TTL_MS
      });
    }

    async function listDataKeys() {
      if (dataKeyCache) return Array.from(dataKeyCache);
      try {
        const snapshot = await sdk.getDocs(dataCollectionRef());
        const keys = new Set();
        snapshot.forEach(document => keys.add(document.id));
        dataKeyCache = keys;
        return Array.from(keys);
      } catch (error) {
        console.warn("Firestore data list failed", {
          uid: getUid(),
          code: error?.code || "unknown"
        });
        return [];
      }
    }

    async function fbGet3(key) {
      if (!getUid()) return null;
      if (isProfileKey(key)) {
        const fields = await loadRootFields();
        if (fields[key] === undefined || fields[key] === null) return null;
        const normalized = normalizeProfileValue(key, fields[key]);
        if (normalized !== fields[key]) patchRootFields({[key]: normalized}, []).catch(() => {});
        return storageRecord(key, normalized);
      }
      return getDataDoc(key);
    }

    async function fbSet3(key, value) {
      if (!getUid()) return;
      const stored = typeof value === "string" ? value : JSON.stringify(value);
      if (isProfileKey(key)) await patchRootFields({[key]: normalizeProfileValue(key, stored)}, []);
      else await setDataDoc(key, stored);
    }

    async function fbDel3(key) {
      if (!getUid()) return;
      if (isProfileKey(key)) await patchRootFields({}, [key]);
      else await deleteDataDoc(key);
    }

    async function fbList3(prefix) {
      if (!getUid()) return {keys: []};
      const rootFields = await loadRootFields();
      const rootKeys = Object.keys(rootFields).filter(key =>
        !key.startsWith("_") && rootFields[key] !== undefined && rootFields[key] !== null);
      const dataKeys = await listDataKeys();
      const keys = Array.from(new Set([...rootKeys, ...dataKeys]));
      return {keys: prefix ? keys.filter(key => key.indexOf(prefix) === 0) : keys};
    }

    return Object.freeze({
      resetStorageCaches,
      fbGet3,
      fbSet3,
      fbDel3,
      fbList3,
      support: Object.freeze({
        getUid,
        userDocRef,
        dataDocRef,
        storageValue,
        loadRootFields,
        patchRootFields,
        getDataDoc,
        setDataDoc,
        deleteDataDoc,
        listDataKeys,
        parseStorageJson,
        isProfileKey,
        normalizeProfileValue
      })
    });
  }

  return {createFirebaseFirestoreSdk};
});
