/**
 * Stable identities and pure mutations for high-concurrency daily records.
 *
 * IDs are created once, before an offline write is queued, and survive retries.
 * Mutation helpers are deliberately storage-agnostic so the Firestore adapter
 * can replay the same operation without duplicating diary, water, or supplement
 * entries.
 *
 * @module DailyEntryModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DailyEntryModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function safeId(value) {
    const id = String(value || "").trim();
    return id && !id.includes("/") ? id : "";
  }

  function fallbackRandomPart(random) {
    return Math.floor(random() * Number.MAX_SAFE_INTEGER).toString(36).padStart(11, "0");
  }

  /** Creates a Firestore-safe ID that remains stable across retries. */
  function createIdempotentEntryId({
    cryptoObject = globalThis.crypto,
    now = Date.now,
    random = Math.random,
  } = {}) {
    const uuid = cryptoObject && typeof cryptoObject.randomUUID === "function"
      ? safeId(cryptoObject.randomUUID())
      : "";
    if (uuid) return uuid;
    return `entry_${Number(now()).toString(36)}_${fallbackRandomPart(random)}`;
  }

  /** Preserves an existing identity or assigns one exactly once. */
  function ensureEntryId(entry, options) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError("Daily entry must be an object");
    }
    const existingId = safeId(entry.id);
    return existingId
      ? (existingId === entry.id ? entry : {...entry, id: existingId})
      : {...entry, id: createIdempotentEntryId(options)};
  }

  function ensureEntryIds(entries, options) {
    return (entries || []).map(entry => ensureEntryId(entry, options));
  }

  function assertMutation(mutation) {
    if (!mutation || typeof mutation !== "object") {
      throw new TypeError("Daily entry mutation is required");
    }
    if (!["add", "update", "remove"].includes(mutation.type)) {
      throw new TypeError("Unsupported daily entry mutation");
    }
  }

  /**
   * Applies one idempotent mutation to an entry list.
   * Replaying an add with the same ID is a no-op; unrelated entries are kept.
   */
  function applyEntryListMutation(previous, mutation, options) {
    assertMutation(mutation);
    const current = Array.isArray(previous) ? previous : [];
    if (mutation.type === "add") {
      const additions = ensureEntryIds(mutation.entries || [], options);
      const knownIds = new Set(current.map(entry => safeId(entry?.id)).filter(Boolean));
      const unique = [];
      additions.forEach(entry => {
        if (knownIds.has(entry.id)) return;
        knownIds.add(entry.id);
        unique.push(entry);
      });
      return unique.length ? [...current, ...unique] : current;
    }

    const entryId = safeId(mutation.entryId);
    if (!entryId) throw new TypeError("Daily entry mutation requires entryId");
    if (mutation.type === "remove") {
      const next = current.filter(entry => safeId(entry?.id) !== entryId);
      return next.length === current.length ? current : next;
    }

    if (typeof mutation.update !== "function") {
      throw new TypeError("Update mutation requires an update function");
    }
    let changed = false;
    const next = current.map(entry => {
      if (safeId(entry?.id) !== entryId) return entry;
      const updated = ensureEntryId(mutation.update(entry), options);
      if (updated.id !== entryId) {
        throw new TypeError("Daily entry identity cannot change during update");
      }
      changed = true;
      return updated;
    });
    return changed ? next : current;
  }

  /** Applies a list mutation to one meal without replacing another meal. */
  function applyMealLogMutation(previous, meal, mutation, options) {
    const mealKey = String(meal || "").trim();
    if (!mealKey) throw new TypeError("Meal key is required");
    const current = previous && typeof previous === "object" ? previous : {};
    const entries = applyEntryListMutation(current[mealKey], mutation, options);
    return entries === current[mealKey] ? current : {...current, [mealKey]: entries};
  }

  return {
    createIdempotentEntryId,
    ensureEntryId,
    ensureEntryIds,
    applyEntryListMutation,
    applyMealLogMutation,
  };
});
