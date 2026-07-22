/**
 * Pure startup-hydration guard for autosaved storage values.
 *
 * TEMPORAL-PROTOCOL WARNING: this small predicate is only one part of the
 * hydration/autosave protocol. Its behavior depends on the host marking keys
 * before parsing loaded records, the 12-second load fallback, and the 800/1500
 * ms autosave debounces. It prevents some default empty values from being
 * persisted; it does not prove that hydration finished, merge remote data, or
 * protect non-empty defaults such as `waterGoal = 2500`.
 *
 * The UMD module exposes `canPersistHydratedKey` directly. The caller supplies
 * the current hydrated-key Set explicitly, so this module owns no React state,
 * refs, storage access, timers, or lifecycle behavior.
 *
 * @module HydrationGuard
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HydrationGuard = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Decides whether the current value may be persisted under the existing hydration rules.
   *
   * @param {string} key Persisted storage key.
   * @param {*} value Current value considered for autosave.
   * @param {Set<string>} hydratedKeysSet Keys observed during hydration or persisted successfully.
   * @returns {boolean} Whether the value passes the existing startup guard.
   */
  function canPersistHydratedKey(key, value, hydratedKeysSet) {
    if (hydratedKeysSet.has(key)) return true;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return typeof value === "string" ? value.length > 0 : value !== null && value !== undefined;
  }

  return { canPersistHydratedKey };
});
