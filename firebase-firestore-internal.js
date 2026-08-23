/**
 * Canonical Firestore persistence core for Trofia.
 *
 * Profile fields live in `nutrition/{uid}` and application records live in
 * `nutrition/{uid}/data/{key}`. Legacy top-level documents and browser-local
 * promotion are intentionally absent after the C23 administrative cutover.
 *
 * @module FirebaseFirestoreInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseFirestoreInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createFirebaseFirestore({firestoreBase, getUid, getAuthHeaders, fetchRequest}) {
    const PROFILE_FIELD_KEYS = new Set([
      "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg", "goalWeeks",
      "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
      "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
      "_storageSchemaVerified", "_storageSchemaVerifiedAt", "_legacyCleanupDone",
      "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
      "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
    ]);

    let rootDocCache = null;
    let rootDocLoaded = false;
    let dataKeyCache = null;

    function resetStorageCaches() {
      rootDocCache = null;
      rootDocLoaded = false;
      dataKeyCache = null;
    }

    function userDocUrl() { return firestoreBase + "/" + encodeURIComponent(getUid()); }
    function dataDocUrl(key) { return userDocUrl() + "/data/" + encodeURIComponent(key); }
    function fieldPath(key) {
      return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
        ? key
        : "`" + String(key).replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
    }
    function decodeFirestoreValue(value) {
      if (!value) return undefined;
      if ("stringValue" in value) return value.stringValue;
      if ("integerValue" in value) return Number(value.integerValue);
      if ("doubleValue" in value) return Number(value.doubleValue);
      if ("booleanValue" in value) return !!value.booleanValue;
      if ("nullValue" in value) return null;
      if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
      if ("mapValue" in value) {
        const decoded = {};
        Object.entries(value.mapValue.fields || {}).forEach(([key, item]) => {
          decoded[key] = decodeFirestoreValue(item);
        });
        return decoded;
      }
      return undefined;
    }
    function encodeFirestoreValue(value) {
      if (value === null || value === undefined) return {nullValue: null};
      if (typeof value === "boolean") return {booleanValue: value};
      if (typeof value === "number" && Number.isFinite(value)) {
        return Number.isInteger(value) ? {integerValue: String(value)} : {doubleValue: value};
      }
      if (Array.isArray(value)) return {arrayValue: {values: value.map(encodeFirestoreValue)}};
      if (typeof value === "object") {
        const fields = {};
        Object.entries(value).forEach(([key, item]) => { fields[key] = encodeFirestoreValue(item); });
        return {mapValue: {fields}};
      }
      return {stringValue: String(value)};
    }
    function storageValue(value) { return typeof value === "string" ? value : JSON.stringify(value); }
    function parseStorageJson(value) {
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") return value;
      const text = value.trim();
      if (!text) return null;
      try { return JSON.parse(text); } catch (_) { return value; }
    }
    function isProfileKey(key) { return PROFILE_FIELD_KEYS.has(key); }
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

    async function fetchRootFields() {
      if (!getUid()) return {};
      const response = await fetchRequest(userDocUrl(), {headers: await getAuthHeaders()});
      if (!response.ok) {
        console.warn("Firestore root read failed", {uid: getUid(), status: response.status});
        return {};
      }
      const document = await response.json();
      const fields = {};
      Object.entries(document.fields || {}).forEach(([key, value]) => {
        fields[key] = decodeFirestoreValue(value);
      });
      return fields;
    }
    async function loadRootFields() {
      if (!rootDocLoaded) {
        rootDocCache = await fetchRootFields().catch(() => ({}));
        rootDocLoaded = true;
      }
      return rootDocCache || {};
    }
    async function patchRootFields(fields, deleteKeys) {
      if (!getUid()) return;
      const setFields = fields || {};
      const deletes = deleteKeys || [];
      const params = new URLSearchParams();
      [...Object.keys(setFields), ...deletes].forEach(key => params.append("updateMask.fieldPaths", fieldPath(key)));
      const bodyFields = {};
      Object.entries(setFields).forEach(([key, value]) => { bodyFields[key] = encodeFirestoreValue(value); });
      const response = await fetchRequest(userDocUrl() + (params.toString() ? "?" + params.toString() : ""), {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({fields: bodyFields})
      });
      if (!response.ok) throw new Error("Firestore write failed");
      rootDocCache = {...(rootDocCache || {}), ...setFields};
      deletes.forEach(key => { if (rootDocCache) delete rootDocCache[key]; });
      rootDocLoaded = true;
    }

    function isCriticalStorageKey(key) {
      return ["pantry_v2", "suppPantry", "weightHistory", "goalHistory", "mealTemplates", "customGoals", "trainingByDate"].includes(key);
    }
    async function getDataDoc(key) {
      try {
        const response = await fetchRequest(dataDocUrl(key), {headers: await getAuthHeaders()});
        if (!response.ok) {
          if (response.status !== 404 && isCriticalStorageKey(key)) {
            console.warn("Firestore data read failed", {uid: getUid(), key, status: response.status});
          }
          return null;
        }
        const document = await response.json();
        const value = decodeFirestoreValue(document?.fields?.value);
        return value !== undefined && value !== null ? {value: storageValue(value)} : null;
      } catch (error) {
        if (isCriticalStorageKey(key)) {
          console.warn("Firestore data read failed", {uid: getUid(), key, error: error?.message || String(error)});
        }
        return null;
      }
    }
    async function setDataDoc(key, value) {
      const response = await fetchRequest(dataDocUrl(key), {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({fields: {value: encodeFirestoreValue(typeof value === "string" ? value : JSON.stringify(value))}})
      });
      if (!response.ok) throw new Error("Firestore data write failed");
      if (dataKeyCache) dataKeyCache.add(key);
    }
    async function deleteDataDoc(key) {
      const response = await fetchRequest(dataDocUrl(key), {method: "DELETE", headers: await getAuthHeaders()});
      if (!response.ok && response.status !== 404) throw new Error("Firestore data delete failed");
      if (dataKeyCache) dataKeyCache.delete(key);
    }
    async function listDataKeys() {
      if (dataKeyCache) return Array.from(dataKeyCache);
      const keys = new Set();
      let pageToken = "";
      do {
        const url = userDocUrl() + "/data?pageSize=1000" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
        const response = await fetchRequest(url, {headers: await getAuthHeaders()});
        if (!response.ok) break;
        const page = await response.json();
        (page.documents || []).forEach(document => {
          keys.add(decodeURIComponent((document.name || "").split("/").pop() || ""));
        });
        pageToken = page.nextPageToken || "";
      } while (pageToken);
      dataKeyCache = keys;
      return Array.from(keys);
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
      const rootFields = await loadRootFields().catch(() => ({}));
      const rootKeys = Object.keys(rootFields).filter(key => !key.startsWith("_") && rootFields[key] !== undefined && rootFields[key] !== null);
      const dataKeys = await listDataKeys().catch(() => []);
      const keys = Array.from(new Set([...rootKeys, ...dataKeys]));
      return {keys: prefix ? keys.filter(key => key.indexOf(prefix) === 0) : keys};
    }

    return {
      resetStorageCaches,
      fbGet3,
      fbSet3,
      fbDel3,
      fbList3,
      support: {
        getUid,
        userDocUrl,
        decodeFirestoreValue,
        encodeFirestoreValue,
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
      }
    };
  }

  return {createFirebaseFirestore};
});
