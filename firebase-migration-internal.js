/**
 * !!! CRITICAL DATA-LOSS RISK — INTENTIONALLY PRESERVED !!!
 *
 * Internal legacy-schema migration service for Trofia.
 *
 * Historical migration keys cover only today plus the previous 119 local
 * calendar days, converted to UTC with `toISOString()`. The separate legacy
 * cleanup later lists and deletes EVERY remaining `nutrition/{uid}_{key}`
 * document, including documents outside that 120-day window that were never
 * promoted. Old diary, notes, water, or supplement records can therefore be
 * permanently deleted. This extraction MUST preserve that behavior; do not
 * treat this warning as authorization to fix it without the dedicated data-loss
 * investigation and migration plan.
 *
 * Two related hazards are also intentionally preserved: failed/partial
 * pagination can look like an empty legacy collection, and
 * `_storageSchemaVerified` prevents a later full retry even when an earlier run
 * observed incomplete data. Cleanup has no transaction or rollback.
 *
 * This module owns the five identity/richness/merge helpers shared by migration
 * and account backup. `firebase-storage.js` injects three of those helpers into
 * `firebase-backup-internal.js`; the backup module remains unchanged.
 * `firebase-storage.js` remains the sole public facade for migration globals.
 *
 * @module FirebaseMigrationInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseMigrationInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the internal legacy-schema migration implementation.
   *
   * @param {Object} dependencies Explicit authentication, network, and persistence dependencies.
   * @param {string} dependencies.firestoreBase Base REST URL for the nutrition collection.
   * @param {Function} dependencies.getUid Authentication-owned UID getter.
   * @param {Function} dependencies.getAuthHeaders Async authenticated-header provider.
   * @param {Function} dependencies.fetchRequest Fetch-compatible HTTP function.
   * @param {Object} dependencies.firestoreSupport Narrow support port from FirebaseFirestoreInternal.
   * @returns {{migrateLegacyNutritionDocsV2: Function, migrateStorageToFirestoreV3: Function, cleanupLegacyNutritionDocsV3: Function, mergeHelpers: Object, support: Object}} Migration operations, shared merge helpers, and testable internal support.
   */
  function createFirebaseMigration({
    firestoreBase,
    getUid,
    getAuthHeaders,
    fetchRequest,
    firestoreSupport
  }) {
    const {
      stripLegacyUid2: _stripLegacyUid2,
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
    } = firestoreSupport;

    /**
     * Copies top-level v2 legacy documents into the root user document.
     *
     * @param {Object} [options] Migration options; `onlyIfMissing` defaults to true.
     * @returns {Promise<{migrated: number, skipped: number, error?: string}>} v2 migration counts and optional swallowed error.
     */
    async function migrateLegacyNutritionDocs(options) {
      const uid = getUid();
      if (!uid) return {migrated: 0, skipped: 0};
      const onlyIfMissing = !options || options.onlyIfMissing !== false;
      try {
        const headers = await getAuthHeaders();
        const [listRes, currentFields] = await Promise.all([
          fetchRequest(firestoreBase + "?pageSize=1000", {headers}),
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

    /**
     * Builds the fixed migration allowlist plus four keys for each of 120 dates.
     *
     * @returns {string[]} Deduplicated base and historical storage keys.
     */
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

    /**
     * Produces the stable identity used when merging stored array items.
     *
     * @param {*} item Candidate array item.
     * @returns {string|undefined} Date-, ID-, name-, or JSON-based identity.
     */
    function _normalizedIdentity3(item) {
      if (!item || typeof item !== "object") return JSON.stringify(item);
      if (item.date) return "date:" + item.date;
      if (item.id) return "id:" + item.id;
      if (item.name) return "name:" + String(item.name).trim().toLowerCase();
      return JSON.stringify(item);
    }

    /**
     * Scores stored data recursively to choose the richer migration candidate.
     *
     * @param {*} value Candidate value.
     * @returns {number} Recursive richness score.
     */
    function _richnessScore3(value) {
      if (value === null || value === undefined) return 0;
      if (Array.isArray(value)) return value.length * 10 + value.reduce((s, item) => s + _richnessScore3(item), 0);
      if (typeof value === "object") return Object.keys(value).length + Object.values(value).reduce((s, item) => s + _richnessScore3(item), 0);
      return String(value).trim() ? 1 : 0;
    }

    /**
     * Merges arrays by normalized identity and may reorder by date or Portuguese name.
     *
     * @param {Array<Array<*>>} values Candidate arrays in migration priority order.
     * @returns {Array<*>} Merged and potentially reordered items.
     */
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

    /**
     * Merges object fields using the existing shallow richness heuristic.
     *
     * @param {Array<Object>} values Candidate objects in migration priority order.
     * @returns {Object} Richness-selected shallow merge.
     */
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

    /**
     * Parses and merges storage records across data, root, local, and legacy shapes.
     *
     * @param {Array<{value: *}|null>} candidates Storage records in current priority order.
     * @returns {string|null} Storage-compatible merged value or null when all candidates are empty.
     */
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
     * Normalizes the authenticated account across data, root, local, and legacy storage.
     *
     * @param {Object} [options] Migration options; cleanup defaults to true.
     * @returns {Promise<{migrated: number, cleaned: number, cleanupFailures?: number, skipped: number}>} Migration and cleanup counts.
     */
    async function migrateStorageToFirestoreV3(options) {
      if (!getUid()) return {migrated: 0, cleaned: 0, skipped: 0};
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
     * Deletes every listed top-level legacy document for the authenticated UID.
     *
     * WARNING: this does not verify promotion and therefore deletes records that
     * fall outside `_knownMigrationKeys3()`'s 120-day historical window.
     *
     * @returns {Promise<{cleaned: number, failed: number, skipped: number}>} Destructive cleanup counts.
     */
    async function cleanupLegacyNutritionDocsV3() {
      if (!getUid()) return {cleaned: 0, failed: 0, skipped: 1};
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

    return {
      migrateLegacyNutritionDocsV2: migrateLegacyNutritionDocs,
      migrateStorageToFirestoreV3,
      cleanupLegacyNutritionDocsV3,
      mergeHelpers: {
        normalizedIdentity3: _normalizedIdentity3,
        richnessScore3: _richnessScore3,
        mergeArrayValues3: _mergeArrayValues3,
        mergeObjectValues3: _mergeObjectValues3,
        mergeStoredValues3: _mergeStoredValues3
      },
      support: {
        knownMigrationKeys3: _knownMigrationKeys3,
        legacyAliasesForKey3: _legacyAliasesForKey3,
        extractProfileFromLegacyUserGoal3: _extractProfileFromLegacyUserGoal3
      }
    };
  }

  return { createFirebaseMigration };
});
