/**
 * Internal full-account backup and restoration service for Trofia.
 *
 * This module exports, validates, previews, and imports real user data while
 * `firebase-storage.js` remains the only public facade. Firestore access is
 * injected through narrow callbacks; the module never reads browser globals or
 * publishes the public backup functions itself.
 *
 * TEMPORARY SHARED CONTRACT: migration still owns the production merge and
 * identity helpers in `firebase-storage.js`. The facade injects exactly
 * `normalizedIdentity`, `mergeArrayValues`, and `mergeObjectValues` here so the
 * two workflows share behavior without duplicating or moving migration logic.
 *
 * Known behavior is intentionally preserved: failed export reads become absent
 * data, preview read errors look like new data, flat legacy backups remain
 * accepted, imports have no transaction/rollback, existing daily records are
 * kept by append, and meal keys are not normalized during import.
 *
 * @module FirebaseBackupInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseBackupInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the internal full-account backup implementation.
   *
   * @param {Object} dependencies Explicit persistence and merge dependencies.
   * @param {Function} dependencies.getUid Authentication-owned UID getter.
   * @param {Function} dependencies.fbGet3 Active-v3 storage reader.
   * @param {Function} dependencies.fbSet3 Active-v3 storage writer.
   * @param {Function} dependencies.clearLocalFallback Removes stale browser fallback after a confirmed write.
   * @param {Function} dependencies.storageValue2 Storage-compatible serializer.
   * @param {Function} dependencies.parseStorageJson3 Storage-compatible parser.
   * @param {Function} dependencies.loadRootFields3 Root-document reader.
   * @param {Function} dependencies.listDataKeys3 Active data-key lister.
   * @param {Function} dependencies.listLegacyKeys3 Legacy data-key lister.
   * @param {Function} dependencies.getDataDoc3 Active data-document reader.
   * @param {Function} dependencies.legacyGet2 Legacy data-document reader.
   * @param {Function} dependencies.patchRootFields3 Root schema-marker writer.
   * @param {Function} dependencies.normalizedIdentity Temporary facade-owned identity callback.
   * @param {Function} dependencies.mergeArrayValues Temporary facade-owned array merge callback.
   * @param {Function} dependencies.mergeObjectValues Temporary facade-owned object merge callback.
   * @returns {{exportFullAccountBackup3: Function, validateFullAccountBackup3: Function, previewFullAccountBackupImport3: Function, importFullAccountBackup3: Function}} Backup operations consumed by the public facade.
   */
  function createFirebaseBackup({
    getUid,
    fbGet3,
    fbSet3,
    clearLocalFallback,
    storageValue2,
    parseStorageJson3,
    loadRootFields3,
    listDataKeys3,
    listLegacyKeys3,
    getDataDoc3,
    legacyGet2,
    patchRootFields3,
    normalizedIdentity,
    mergeArrayValues,
    mergeObjectValues
  }) {
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
      return parseStorageJson3(value);
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
        const currentIds = new Set((Array.isArray(current) ? current : []).map(normalizedIdentity));
        return incoming.filter(item => !currentIds.has(normalizedIdentity(item))).length;
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
        return mergeArrayValues([Array.isArray(current) ? current : [], incoming]);
      }
      if (incoming && typeof incoming === "object") {
        return mergeObjectValues([
          current && typeof current === "object" && !Array.isArray(current) ? current : {},
          incoming
        ]);
      }
      return currentValue === undefined || currentValue === null ? incomingValue : currentValue;
    }

    /**
     * Builds a complete account backup from every supported storage shape.
     *
     * @returns {Promise<Object>} Versioned backup with root, data, legacy, and count sections.
     */
    async function exportFullAccountBackup3() {
      if (!getUid()) throw new Error("No authenticated user");

      const rootFields = await loadRootFields3().catch(() => ({}));
      const dataKeys = await listDataKeys3().catch(() => []);
      const legacyKeys = Array.from(await listLegacyKeys3().catch(() => new Set()));

      const root = {};
      Object.entries(rootFields || {}).forEach(([key, value]) => {
        if (_backupCategoryForKey3(key) && value !== undefined && value !== null) root[key] = storageValue2(value);
      });

      const data = {};
      for (let i = 0; i < dataKeys.length; i += 20) {
        await Promise.all(dataKeys.slice(i, i + 20).map(async key => {
          const doc = await getDataDoc3(key).catch(() => null);
          if (_backupCategoryForKey3(key) && doc && doc.value !== undefined && doc.value !== null) data[key] = doc.value;
        }));
      }

      const legacy = {};
      for (let i = 0; i < legacyKeys.length; i += 20) {
        await Promise.all(legacyKeys.slice(i, i + 20).map(async key => {
          const doc = await legacyGet2(key).catch(() => null);
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
     * Validates current and legacy-flat account backup payloads without writing.
     *
     * @param {Object} rawBackup Parsed backup supplied by the user.
     * @returns {{ok: boolean, errors: string[], counts: Object}} Validation result and storage-shape counts.
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
     * Builds a read-only categorized preview of a supported backup.
     *
     * @param {Object} rawBackup Parsed backup supplied by the user.
     * @returns {Promise<Object>} Validation, conflict, new-item, and category counts.
     */
    async function previewFullAccountBackupImport3(rawBackup) {
      if (!getUid()) throw new Error("No authenticated user");

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
     * Restores selected backup categories using append or replace semantics.
     *
     * @param {Object} rawBackup Parsed current or legacy-flat backup.
     * @param {Object} options Import options containing category strategies.
     * @returns {Promise<{imported: number, skipped: number}>} Completed write and skip counts.
     */
    async function importFullAccountBackup3(rawBackup, options) {
      if (!getUid()) throw new Error("No authenticated user");

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
            clearLocalFallback(entry.targetKey);
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
          clearLocalFallback(entry.targetKey);
          imported++;
        }));
      }

      await patchRootFields3({
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

    return {
      exportFullAccountBackup3,
      validateFullAccountBackup3,
      previewFullAccountBackupImport3,
      importFullAccountBackup3
    };
  }

  return { createFirebaseBackup };
});
