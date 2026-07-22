/**
 * Pure residual nutrition models used by the NutritionTracker controller.
 *
 * The UMD module exposes a `createDailyNutritionModel` factory. The host injects
 * `rnd` from date-utils.js plus `getGoalAdjustment` and
 * `getProteinMultiplier` from goal-calculator.js. Inputs are explicit diary,
 * goal, preference, weight, and day-type snapshots; outputs are plain totals,
 * status codes, warning flags, and reached-goal descriptors. This module never
 * reads React state, storage, the DOM, localStorage, or the clock.
 *
 * Important preserved behavior: numeric zero does not override calculated
 * custom goals because the existing `custom || calculated` rule is retained;
 * water falls back to 2500 ml without a usable weight; goal-toast persistence,
 * ordering, sound, timers, and localization remain the controller's concern.
 *
 * @module DailyNutritionModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DailyNutritionModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the residual daily-nutrition model with explicit domain helpers.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {function(number, number=): number} dependencies.rnd Existing decimal-rounding helper from date-utils.js.
   * @param {function(Object): number} dependencies.getGoalAdjustment Existing adjustment resolver from goal-calculator.js.
   * @param {function(Object): number} dependencies.getProteinMultiplier Existing protein-multiplier resolver from goal-calculator.js.
   * @returns {Object} Pure daily totals, goal, status, and toast helpers.
   */
  function createDailyNutritionModel({ rnd, getGoalAdjustment, getProteinMultiplier }) {
    if (
      typeof rnd !== "function" ||
      typeof getGoalAdjustment !== "function" ||
      typeof getProteinMultiplier !== "function"
    ) {
      throw new TypeError("DailyNutritionModel requires rnd, getGoalAdjustment, and getProteinMultiplier functions");
    }

    /**
     * Builds rounded nutrition totals for storage, backup, and report payloads.
     *
     * @param {Object<string, Array<Object>>} log Diary entries grouped by persisted meal key.
     * @returns {{protein: number, kcal: number, carbs: number, fat: number, fiber: number, salt: number}} Rounded day totals.
     */
    function buildDayTotals(log) {
      const entries = Object.values(log).flat();
      return {
        protein: rnd(entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0)),
        kcal: rnd(entries.reduce((sum, entry) => sum + (entry.kcal ?? 0), 0)),
        carbs: rnd(entries.reduce((sum, entry) => sum + (entry.carbs ?? 0), 0)),
        fat: rnd(entries.reduce((sum, entry) => sum + (entry.fat ?? 0), 0)),
        fiber: rnd(entries.reduce((sum, entry) => sum + (entry.fiber ?? 0), 0)),
        salt: rnd(entries.reduce((sum, entry) => sum + (entry.salt ?? 0), 0))
      };
    }

    /**
     * Builds the unrounded totals used by the live diary dashboard.
     *
     * @param {Object<string, Array<Object>>} log Diary entries grouped by persisted meal key.
     * @param {string} kcalFieldLabel Active-language kcal field label; the existing `100` suffix removal is preserved.
     * @returns {{protein: number, kcal: number, carbs: number, fat: number, fiber: number, salt: number, sugars: number, satfat: number}} Live dashboard totals.
     */
    function buildActiveLogTotals(log, kcalFieldLabel) {
      const entries = Object.values(log).flat();
      const total = key => {
        const normalizedKey = key.replace("100", "");
        return entries.reduce((sum, entry) => sum + (entry[normalizedKey] ?? 0), 0);
      };
      return {
        protein: total("protein"),
        kcal: total(kcalFieldLabel),
        carbs: total("carbs"),
        fat: total("fat"),
        fiber: total("fiber"),
        salt: total("salt"),
        sugars: total("sugars"),
        satfat: total("satfat")
      };
    }

    /**
     * Derives the live goal presentation values and warning decisions.
     *
     * @param {Object} snapshot Explicit daily goal snapshot.
     * @param {Object} snapshot.baseGoals Goals already calculated by goal-calculator.js.
     * @param {Object} snapshot.customGoals User overrides; numeric zero intentionally does not override.
     * @param {Object} snapshot.nutritionPrefs Goal type, amount, weeks, and manual preferences.
     * @param {?number} snapshot.viewWeight Weight applicable to the viewed date.
     * @param {boolean} snapshot.isTraining Whether the viewed date is a training day.
     * @returns {Object} Calculated goals, adjustment metadata, warning level, and ordered guardrail codes.
     */
    function buildDailyGoalModel({ baseGoals, customGoals, nutritionPrefs, viewWeight, isTraining }) {
      const baseWaterGoal = viewWeight ? Math.round(viewWeight * (isTraining ? 40 : 35) / 50) * 50 : 2500;
      const fallbackAdjustment = getGoalAdjustment(nutritionPrefs);
      const calorieBase = baseGoals.baseCalories || (baseGoals.kcal - fallbackAdjustment);
      const calorieAdjustment = baseGoals.adjustment ?? fallbackAdjustment;
      const proteinMultiplier = baseGoals.proteinMultiplier || getProteinMultiplier(nutritionPrefs);
      const adjustmentPct = calorieBase ? Math.round(Math.abs(calorieAdjustment) / calorieBase * 100) : 0;
      const aggressiveAdjustment = adjustmentPct >= 25;
      const calculatedGoals = {
        protein: customGoals.protein || baseGoals.protein,
        kcal: customGoals.kcal || baseGoals.kcal,
        carbs: customGoals.carbs || baseGoals.carbs,
        fat: customGoals.fat || baseGoals.fat,
        fiber: customGoals.fiber || baseGoals.fiber,
        salt: customGoals.salt || baseGoals.salt,
        water: customGoals.water || baseWaterGoal
      };
      const extremeAdjustment = Math.abs(calorieAdjustment) >= 750 || adjustmentPct >= 35 || calculatedGoals.kcal < 1200;
      const weeklyGoalRate = Number(nutritionPrefs.goalKg) && Number(nutritionPrefs.goalWeeks)
        ? Number(nutritionPrefs.goalKg) / Number(nutritionPrefs.goalWeeks)
        : 0;
      const healthGuardrailCodes = [
        calculatedGoals.kcal < 1200 && "low-calories",
        Math.abs(calorieAdjustment) >= 750 && "large-adjustment",
        adjustmentPct >= 35 && "large-adjustment-percent",
        nutritionPrefs.goalType === "loss" && weeklyGoalRate > 1 && "fast-loss",
        nutritionPrefs.goalType === "gain" && weeklyGoalRate > 0.5 && "fast-gain"
      ].filter(Boolean);

      return {
        baseWaterGoal,
        calorieBase,
        calorieAdjustment,
        proteinMultiplier,
        adjustmentPct,
        aggressiveAdjustment,
        extremeAdjustment,
        adjustmentWarningLevel: extremeAdjustment ? "extreme" : aggressiveAdjustment ? "high" : null,
        weeklyGoalRate,
        healthGuardrailCodes,
        calculatedGoals
      };
    }

    /**
     * Classifies the live diary summary without owning localized presentation text.
     *
     * @param {Object} snapshot Explicit diary-progress snapshot.
     * @param {number} snapshot.entryCount Number of logged food entries.
     * @param {number} snapshot.proteinPercent Protein progress percentage.
     * @param {number} snapshot.kcalPercent Calorie progress percentage.
     * @returns {"empty"|"calories-high"|"protein-lagging"|"on-target"|"in-progress"} Existing diary-status branch code.
     */
    function classifyDiaryStatus({ entryCount, proteinPercent, kcalPercent }) {
      if (!entryCount) return "empty";
      if (kcalPercent > 115) return "calories-high";
      if (proteinPercent < 60 && kcalPercent > 60) return "protein-lagging";
      if (proteinPercent >= 100 && kcalPercent <= 115) return "on-target";
      return "in-progress";
    }

    /**
     * Selects goal metrics that have reached their target in existing display order.
     *
     * @param {Object} snapshot Explicit goal-toast snapshot.
     * @param {Object} snapshot.tot Live diary totals.
     * @param {Object} snapshot.goals Effective daily goals.
     * @param {boolean} snapshot.isToday Whether the viewed date is today.
     * @param {number} snapshot.totalWater Current-day water total.
     * @returns {Array<{key: string, value: number, target: number, unit: string, tone: string}>} Reached metrics; persistence and queueing remain with the host.
     */
    function getReachedGoalMetrics({ tot, goals, isToday, totalWater }) {
      const metrics = [
        {key: "protein", value: tot.protein, target: goals.protein, unit: "g", tone: "success"},
        {key: "kcal", value: tot.kcal, target: goals.kcal, unit: "kcal", tone: "success"},
        {key: "carbs", value: tot.carbs, target: goals.carbs, unit: "g", tone: "success"},
        {key: "fat", value: tot.fat, target: goals.fat, unit: "g", tone: "success"},
        {key: "fiber", value: tot.fiber, target: goals.fiber, unit: "g", tone: "success"},
        {key: "salt", value: tot.salt, target: goals.salt, unit: "g", tone: "warning"}
      ];
      if (isToday) metrics.push({key: "water", value: totalWater, target: goals.water, unit: "ml", tone: "success"});
      return metrics.filter(metric => metric.target && metric.value >= metric.target);
    }

    return {
      buildDayTotals,
      buildActiveLogTotals,
      buildDailyGoalModel,
      classifyDiaryStatus,
      getReachedGoalMetrics
    };
  }

  return { createDailyNutritionModel };
});
