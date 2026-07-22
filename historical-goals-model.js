/**
 * Pure historical-goal resolution for one requested diary date.
 *
 * The UMD module exposes a `createHistoricalGoalsModel` factory. The host
 * injects `computeGoals` from goal-calculator.js and `getWeightForDate` from
 * body-metrics-model.js. One explicit snapshot is resolved into the raw goal,
 * custom-overridden goal, effective frozen goal, and selected weight record.
 * This module never reads or writes React state, storage, or `goalHistory`.
 *
 * CRITICAL PRESERVED HOST BUG: the React persistence effect currently computes
 * `calculatedGoals` from `viewDate` but always writes that snapshot under
 * `goalHistory[TODAY]`. This module does not cause or correct that bug; it only
 * returns values for the date requested by its caller. Any future change to the
 * host effect must investigate that key mismatch together with two related
 * preserved behaviors: historical calculations omit `referenceDate` and use
 * the user's current age, while normal daily snapshots and manually refreshed
 * past-day snapshots have different shapes.
 *
 * Known behavior intentionally preserved: numeric zero custom goals do not
 * override because selection uses `||`; TODAY ignores a frozen goal; the goal
 * profile deliberately omits `referenceDate`; and frozen objects are overlaid
 * without schema normalization.
 *
 * @module HistoricalGoalsModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HistoricalGoalsModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the historical-goal resolver with domain dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {function(number, boolean, Object): Object} dependencies.computeGoals Calculates current-rule nutritional goals.
   * @param {function(Array<Object>, string): (Object|null)} dependencies.getWeightForDate Selects the latest applicable measurement.
   * @returns {Object} Historical-goal resolver API.
   */
  function createHistoricalGoalsModel({ computeGoals, getWeightForDate }) {
    if (typeof computeGoals !== "function" || typeof getWeightForDate !== "function") {
      throw new TypeError("HistoricalGoalsModel requires computeGoals and getWeightForDate functions");
    }

    /**
     * Resolves raw, customized, and frozen goals for one date without persistence.
     *
     * @param {Object} snapshot Explicit historical-goal input.
     * @param {string} snapshot.date Requested stored date.
     * @param {string} snapshot.today Current stored date.
     * @param {boolean} snapshot.dayIsTraining Explicit training/rest state resolved by the host.
     * @param {Array<Object>} snapshot.weightHistory Weight measurements.
     * @param {number|string|null} snapshot.currentWeight Current fallback weight.
     * @param {number|string|null} snapshot.currentHeight Current fallback height.
     * @param {Object} snapshot.profileData Profile birth date and gender.
     * @param {Object} snapshot.nutritionPrefs Current nutrition preferences.
     * @param {Object} snapshot.customGoals Current custom nutrient overrides.
     * @param {Object|null|undefined} snapshot.frozenGoal Previously persisted snapshot for the requested date.
     * @returns {{rawGoal: Object, computedGoal: Object, effectiveGoal: Object, weightEntry: (Object|null)}} Resolved goal stages and selected measurement.
     */
    function resolveHistoricalGoals({
      date,
      today,
      dayIsTraining,
      weightHistory,
      currentWeight,
      currentHeight,
      profileData,
      nutritionPrefs,
      customGoals,
      frozenGoal
    }) {
      const weightEntry = getWeightForDate(weightHistory, date);
      const rawGoal = computeGoals(weightEntry?.weight || currentWeight, dayIsTraining, {
        height: weightEntry?.height || currentHeight,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        prefs: nutritionPrefs
      });
      const computedGoal = {
        ...rawGoal,
        protein: customGoals.protein || rawGoal.protein,
        kcal: customGoals.kcal || rawGoal.kcal,
        carbs: customGoals.carbs || rawGoal.carbs,
        fat: customGoals.fat || rawGoal.fat,
        fiber: customGoals.fiber || rawGoal.fiber,
        salt: customGoals.salt || rawGoal.salt
      };
      const effectiveGoal = date !== today && frozenGoal
        ? {...computedGoal, ...frozenGoal}
        : computedGoal;

      return { rawGoal, computedGoal, effectiveGoal, weightEntry };
    }

    return { resolveHistoricalGoals };
  }

  return { createHistoricalGoalsModel };
});
