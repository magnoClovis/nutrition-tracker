/**
 * Granular persistence coordinator for high-concurrency daily records.
 *
 * The controller supplies complete UI snapshots. This module computes the
 * minimal document mutations, serializes writes per kind/date, migrates the
 * legacy aggregate once before the first mutation, and never writes aggregate
 * daily keys itself.
 *
 * @module DailyEntryPersistence
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DailyEntryPersistence = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VALID_KINDS = new Set(["meal", "water", "supplement"]);

  function normalizedRows(kind, snapshot) {
    if (!VALID_KINDS.has(kind)) throw new TypeError("Unsupported daily entry kind");
    const rows = [];
    if (kind === "meal") {
      const log = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
        ? snapshot
        : {};
      Object.entries(log).forEach(([mealKey, entries]) => {
        if (!Array.isArray(entries)) throw new TypeError("Meal snapshot entries must be arrays");
        entries.forEach(entry => rows.push({mealKey, entry}));
      });
    } else {
      if (!Array.isArray(snapshot)) throw new TypeError("Daily entry snapshot must be an array");
      snapshot.forEach(entry => rows.push({entry}));
    }

    const byId = new Map();
    rows.forEach(row => {
      const id = String(row.entry?.id || "").trim();
      if (!id || id.includes("/") || byId.has(id)) {
        throw new TypeError("Daily entry snapshots require unique stable IDs");
      }
      byId.set(id, {
        entry: {...row.entry, id},
        ...(kind === "meal" ? {mealKey: String(row.mealKey || "").trim()} : {})
      });
    });
    return byId;
  }

  function sameRow(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  /** Builds deterministic set/delete operations without replacing a day. */
  function diffDailyEntrySnapshots(kind, date, previous, next) {
    const before = normalizedRows(kind, previous);
    const after = normalizedRows(kind, next);
    const operations = [];
    before.forEach((_row, entryId) => {
      if (!after.has(entryId)) operations.push({type: "delete", kind, date, entryId});
    });
    after.forEach((row, entryId) => {
      if (before.has(entryId) && sameRow(before.get(entryId), row)) return;
      operations.push({
        type: "set",
        kind,
        date,
        entry: row.entry,
        ...(kind === "meal" ? {mealKey: row.mealKey} : {})
      });
    });
    return operations;
  }

  function supportsGranularDailyPersistence(storage) {
    return !!storage &&
      typeof storage.migrateDailyEntries === "function" &&
      typeof storage.applyDailyEntryBatch === "function";
  }

  function createDailyEntryPersistence({storage}) {
    const granular = supportsGranularDailyPersistence(storage);
    const baselines = new Map();
    const queues = new Map();
    const migrated = new Set();
    const keyFor = (kind, date) => `${kind}:${date}`;

    function seed(kind, date, snapshot) {
      normalizedRows(kind, snapshot);
      baselines.set(keyFor(kind, date), snapshot);
    }

    function persist(kind, date, snapshot) {
      if (!granular) return Promise.resolve(false);
      const key = keyFor(kind, date);
      normalizedRows(kind, snapshot);
      const run = async () => {
        if (!migrated.has(key)) {
          await storage.migrateDailyEntries(kind, date);
          migrated.add(key);
        }
        const previous = baselines.has(key)
          ? baselines.get(key)
          : (kind === "meal" ? {} : []);
        const operations = diffDailyEntrySnapshots(kind, date, previous, snapshot);
        if (operations.length) await storage.applyDailyEntryBatch(operations);
        baselines.set(key, snapshot);
        return true;
      };
      const pending = (queues.get(key) || Promise.resolve()).catch(() => {}).then(run);
      const tracked = pending.finally(() => {
        if (queues.get(key) === tracked) queues.delete(key);
      });
      queues.set(key, tracked);
      return pending;
    }

    return Object.freeze({
      granular,
      seed,
      persist,
      reset() {
        baselines.clear();
        queues.clear();
        migrated.clear();
      }
    });
  }

  return {
    createDailyEntryPersistence,
    diffDailyEntrySnapshots,
    supportsGranularDailyPersistence
  };
});
