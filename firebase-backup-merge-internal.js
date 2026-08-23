/** Shared identity and merge semantics used by backup preview/import. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseBackupMergeInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function normalizedIdentity(item) {
    if (!item || typeof item !== "object") return JSON.stringify(item);
    if (item.date) return "date:" + item.date;
    if (item.id) return "id:" + item.id;
    if (item.name) return "name:" + String(item.name).trim().toLowerCase();
    return JSON.stringify(item);
  }
  function richnessScore(value) {
    if (value === null || value === undefined) return 0;
    if (Array.isArray(value)) return value.length * 10 + value.reduce((sum, item) => sum + richnessScore(item), 0);
    if (typeof value === "object") return Object.keys(value).length + Object.values(value).reduce((sum, item) => sum + richnessScore(item), 0);
    return String(value).trim() ? 1 : 0;
  }
  function mergeArrayValues(values) {
    const byKey = new Map();
    values.flat().forEach(item => {
      if (item === null || item === undefined) return;
      const identity = normalizedIdentity(item);
      const current = byKey.get(identity);
      if (!current || richnessScore(item) >= richnessScore(current)) byKey.set(identity, item);
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
  function mergeObjectValues(values) {
    const output = {};
    values.forEach(value => {
      Object.entries(value || {}).forEach(([key, nextValue]) => {
        const currentValue = output[key];
        if (currentValue && typeof currentValue === "object" && nextValue && typeof nextValue === "object" && !Array.isArray(currentValue) && !Array.isArray(nextValue)) {
          output[key] = richnessScore(nextValue) >= richnessScore(currentValue)
            ? {...currentValue, ...nextValue}
            : {...nextValue, ...currentValue};
        } else if (currentValue === undefined || richnessScore(nextValue) >= richnessScore(currentValue)) {
          output[key] = nextValue;
        }
      });
    });
    return output;
  }

  return {normalizedIdentity, richnessScore, mergeArrayValues, mergeObjectValues};
});
