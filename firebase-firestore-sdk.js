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

  function createFirebaseFirestoreSdk({
    firestore,
    getUid,
    sdk,
    now = Date.now,
    assertWritesAllowed = () => {},
  }) {
    const required = ["doc", "collection", "getDoc", "setDoc", "deleteDoc", "getDocs", "deleteField"];
    if (!firestore || typeof getUid !== "function" || !sdk ||
        required.some(name => typeof sdk[name] !== "function") || typeof now !== "function" ||
        typeof assertWritesAllowed !== "function") {
      throw new TypeError("FirebaseFirestoreSdk requires Firestore, UID, and modular SDK operations");
    }

    let rootDocCache = null;
    let rootDocLoaded = false;
    let rootDocLoadPromise = null;
    const rootFieldVersion = new Map();
    let dataKeyCache = null;
    const dataValueCache = new Map();
    const dataValuePending = new Map();
    const dataCacheFirstPending = new Map();
    const dataValueVersion = new Map();
    const dataSubscriptions = new Map();
    const rootSubscriptions = new Set();
    let stopRootSubscription = null;
    let storageCacheGeneration = 0;

    function currentFirestore() {
      return typeof firestore === "function" ? firestore() : firestore;
    }

    function resetStorageCaches() {
      storageCacheGeneration++;
      try { stopRootSubscription?.(); } catch (_) {}
      stopRootSubscription = null;
      rootSubscriptions.clear();
      dataSubscriptions.forEach(entry => {
        entry.resolveReady?.(null);
        try { entry.unsubscribe?.(); } catch (_) {}
      });
      dataSubscriptions.clear();
      rootDocCache = null;
      rootDocLoaded = false;
      rootDocLoadPromise = null;
      rootFieldVersion.clear();
      dataKeyCache = null;
      dataValueCache.clear();
      dataValuePending.clear();
      dataCacheFirstPending.clear();
      dataValueVersion.clear();
    }

    function snapshotRecord(snapshot) {
      if (!snapshot?.exists?.()) return null;
      const value = snapshot.data()?.value;
      return value !== undefined && value !== null ? {value: storageValue(value)} : null;
    }

    function subscriptionMetadata(snapshot) {
      return Object.freeze({
        fromCache: snapshot?.metadata?.fromCache === true,
        hasPendingWrites: snapshot?.metadata?.hasPendingWrites === true,
      });
    }

    function userDocRef() {
      return sdk.doc(currentFirestore(), "nutrition", String(getUid()));
    }

    function dataCollectionRef() {
      return sdk.collection(currentFirestore(), "nutrition", String(getUid()), "data");
    }

    function dataDocRef(key) {
      return sdk.doc(currentFirestore(), "nutrition", String(getUid()), "data", String(key));
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
      assertWritesAllowed();
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

    async function getDataDocCacheFirst(key) {
      const cached = dataValueCache.get(key);
      if (cached && cached.expiresAt > now()) return cached.record;
      const subscription = dataSubscriptions.get(key);
      if (subscription) {
        if (subscription.latest !== undefined) return subscription.latest;
        const subscribedRecord = await subscription.ready;
        if (subscribedRecord !== undefined) return subscribedRecord;
      }
      if (dataCacheFirstPending.has(key)) return dataCacheFirstPending.get(key);
      const readGeneration = storageCacheGeneration;
      const readVersion = dataValueVersion.get(key) || 0;
      let readPromise;
      readPromise = (async () => {
        if (typeof sdk.getDocFromCache === "function") {
          try {
            const snapshot = await sdk.getDocFromCache(dataDocRef(key));
            const record = snapshotRecord(snapshot);
            if (readGeneration !== storageCacheGeneration ||
                readVersion !== (dataValueVersion.get(key) || 0)) {
              return dataValueCache.get(key)?.record || null;
            }
            dataValueCache.set(key, {
              record,
              expiresAt: now() + (record ? DATA_VALUE_CACHE_TTL_MS : DATA_MISSING_CACHE_TTL_MS),
            });
            return record;
          } catch (_) {}
        }
        return getDataDoc(key);
      })().finally(() => {
        if (dataCacheFirstPending.get(key) === readPromise) dataCacheFirstPending.delete(key);
      });
      dataCacheFirstPending.set(key, readPromise);
      return readPromise;
    }

    function subscribeRootField(key, onValue, onError) {
      const observer = {key, onValue, onError, initialized: false, latest: null};
      rootSubscriptions.add(observer);
      if (!stopRootSubscription) {
        stopRootSubscription = sdk.onSnapshot(
          userDocRef(),
          {includeMetadataChanges: true},
          snapshot => {
            rootDocCache = snapshot.exists() ? {...(snapshot.data() || {})} : {};
            rootDocLoaded = true;
            const metadata = subscriptionMetadata(snapshot);
            rootSubscriptions.forEach(item => {
              const value = rootDocCache[item.key];
              const record = value === undefined || value === null
                ? null
                : storageRecord(item.key, normalizeProfileValue(item.key, value));
              const serialized = JSON.stringify(record);
              if (item.initialized && item.latest === serialized) return;
              item.initialized = true;
              item.latest = serialized;
              item.onValue(record, metadata);
            });
          },
          error => rootSubscriptions.forEach(item => item.onError?.(error)),
        );
      } else if (rootDocLoaded) {
        const value = rootDocCache?.[key];
        const record = value === undefined || value === null
          ? null
          : storageRecord(key, normalizeProfileValue(key, value));
        observer.initialized = true;
        observer.latest = JSON.stringify(record);
        onValue(record, Object.freeze({fromCache: true, hasPendingWrites: false}));
      }
      return () => {
        rootSubscriptions.delete(observer);
        if (rootSubscriptions.size === 0 && stopRootSubscription) {
          try { stopRootSubscription(); } catch (_) {}
          stopRootSubscription = null;
        }
      };
    }

    function subscribeDataKey(key, onValue, onError) {
      let entry = dataSubscriptions.get(key);
      if (!entry) {
        let resolveReady;
        const ready = new Promise(resolve => { resolveReady = resolve; });
        entry = {
          observers: new Set(),
          unsubscribe: null,
          latest: undefined,
          metadata: null,
          ready,
          resolveReady,
        };
        dataSubscriptions.set(key, entry);
        entry.unsubscribe = sdk.onSnapshot(
          dataDocRef(key),
          {includeMetadataChanges: true},
          snapshot => {
            const record = snapshotRecord(snapshot);
            const metadata = subscriptionMetadata(snapshot);
            const changed = entry.latest === undefined || JSON.stringify(entry.latest) !== JSON.stringify(record);
            entry.latest = record;
            entry.metadata = metadata;
            entry.resolveReady(record);
            dataValueVersion.set(key, (dataValueVersion.get(key) || 0) + 1);
            dataValueCache.set(key, {
              record,
              expiresAt: now() + (record ? DATA_VALUE_CACHE_TTL_MS : DATA_MISSING_CACHE_TTL_MS),
            });
            if (changed) entry.observers.forEach(observer => observer.onValue(record, metadata));
          },
          error => {
            entry.resolveReady(undefined);
            entry.observers.forEach(observer => observer.onError?.(error));
          },
        );
      }
      const observer = {onValue, onError};
      entry.observers.add(observer);
      if (entry.latest !== undefined) onValue(entry.latest, entry.metadata);
      return () => {
        entry.observers.delete(observer);
        if (entry.observers.size === 0) {
          entry.resolveReady(null);
          try { entry.unsubscribe?.(); } catch (_) {}
          dataSubscriptions.delete(key);
        }
      };
    }

    async function setDataDoc(key, value) {
      assertWritesAllowed();
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
      assertWritesAllowed();
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

    async function fbGetMany3(keys) {
      if (!getUid()) return {};
      const uniqueKeys = Array.from(new Set((keys || []).map(String)));
      const entries = await Promise.all(uniqueKeys.map(async key => {
        if (isProfileKey(key)) return [key, await fbGet3(key)];
        return [key, await getDataDocCacheFirst(key)];
      }));
      return Object.fromEntries(entries);
    }

    function fbSubscribeMany3(keys, onValue, onError) {
      if (typeof sdk.onSnapshot !== "function" || typeof onValue !== "function") {
        throw new TypeError("Firestore subscriptions require onSnapshot and a listener");
      }
      const uniqueKeys = Array.from(new Set((keys || []).map(String)));
      const records = {};
      const ready = new Set();
      const metadataByKey = {};
      const emit = (key, record, metadata) => {
        records[key] = record;
        metadataByKey[key] = metadata;
        ready.add(key);
        onValue(Object.freeze({
          records: Object.freeze({...records}),
          complete: ready.size === uniqueKeys.length,
          changedKey: key,
          fromCache: Object.values(metadataByKey).every(item => item?.fromCache === true),
          hasPendingWrites: Object.values(metadataByKey).some(item => item?.hasPendingWrites === true),
        }));
      };
      const unsubscribers = uniqueKeys.map(key => {
        const subscribe = isProfileKey(key) ? subscribeRootField : subscribeDataKey;
        return subscribe(key, (record, metadata) => emit(key, record, metadata), onError);
      });
      if (uniqueKeys.length === 0) {
        onValue(Object.freeze({records: Object.freeze({}), complete: true, changedKey: null,
          fromCache: true, hasPendingWrites: false}));
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsubscribers.forEach(unsubscribe => unsubscribe());
      };
    }

    return Object.freeze({
      resetStorageCaches,
      fbGet3,
      fbSet3,
      fbDel3,
      fbList3,
      fbGetMany3,
      fbSubscribeMany3,
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
