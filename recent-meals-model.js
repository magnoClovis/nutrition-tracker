/**
 * Pure aggregation of already resolved diary logs into recent-meal cards.
 *
 * The UMD module exposes a dependency-free `createRecentMealsModel` factory.
 * Callers supply daily logs in their existing newest-to-oldest order and the
 * fixed persisted PT meal keys. The output is a plain list for the Add screen.
 * Storage reads, JSON parsing, React setters, request ordering, and the known
 * absence of `normalizeMealKeys` remain in the NutritionTracker loader.
 *
 * @module RecentMealsModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RecentMealsModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the recent-meal aggregation API.
   *
   * @returns {Object} Pure recent-meal aggregation helpers.
   */
  function createRecentMealsModel() {
    /**
     * Aggregates available daily logs into the existing newest-first recent-meal list.
     *
     * @param {Object} snapshot Explicit aggregation input.
     * @param {Array<{date: string, log: Object}>} snapshot.dailyLogs Available logs in loader order.
     * @param {Array<string>} snapshot.mealKeys Fixed persisted PT meal keys in display order.
     * @param {number} [snapshot.limit=30] Maximum number of cards returned.
     * @returns {Array<{date: string, meal: string, entries: Array<Object>, protein: number, kcal: number}>} Recent meal cards.
     */
    function aggregateRecentMeals({ dailyLogs, mealKeys, limit = 30 }) {
      const results = [];
      dailyLogs.forEach(({ date, log }) => {
        mealKeys.forEach(meal => {
          const entries = log[meal] || [];
          if (!entries.length) return;
          const protein = entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0);
          const kcal = entries.reduce((sum, entry) => sum + (entry.kcal ?? 0), 0);
          results.push({
            date,
            meal,
            entries,
            protein: Math.round(protein),
            kcal: Math.round(kcal)
          });
        });
      });
      return results.slice(0, limit);
    }

    return { aggregateRecentMeals };
  }

  return { createRecentMealsModel };
});
