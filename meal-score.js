(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealScore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ALGORITHM_VERSION = "meal-score-v1.1";
  const DEFAULT_WINDOW_HOURS = 3;
  const DEFAULT_CONFIG = [
    { key: "protein", type: "maximize", weight: 30, required: true },
    { key: "kcal", type: "budget", weight: 25, required: true, decay: 2, underBudget: "adequacy" },
    { key: "fiber", type: "maximize", weight: 18 },
    { key: "salt", type: "budget", weight: 12, decay: 4.5, underBudget: "full" }
  ];

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function hoursUntilLocalMidnight(now) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    const midnight = new Date(current);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, (midnight.getTime() - current.getTime()) / 3600000);
  }

  function timeShare(hoursLeft, windowHours) {
    const hours = Math.max(0.25, finiteNumber(hoursLeft) ?? 0.25);
    const window = Math.max(0.25, finiteNumber(windowHours) ?? DEFAULT_WINDOW_HOURS);
    return Math.min(1, window / hours);
  }

  function nutrientTotal(entries, key, options) {
    const list = Array.isArray(entries) ? entries : [];
    const settings = options || {};
    let total = 0;
    let knownCount = 0;
    for (const entry of list) {
      const value = finiteNumber(entry && entry[key]);
      if (value !== null) {
        total += value;
        knownCount += 1;
      }
    }
    const complete = knownCount === list.length;
    const known = settings.allowPartial
      ? (settings.allowEmpty || knownCount > 0)
      : complete && (settings.allowEmpty || list.length > 0);
    return {
      known,
      total: known ? total : null,
      knownCount,
      totalCount: list.length,
      complete
    };
  }

  function maximizeScore(amount, quota) {
    if (quota <= 0) return 1;
    return Math.max(0, Math.min(1, amount / quota));
  }

  function budgetScore(amount, quota, decay, underBudget) {
    if (quota <= 0) return amount > 0 ? 0 : 1;
    const ratio = Math.max(0, amount / quota);
    if (ratio <= 1) {
      return underBudget === "adequacy" ? 0.6 + 0.4 * ratio : 1;
    }
    return Math.exp(-Math.max(0, decay || 0) * (ratio - 1));
  }

  function calculateMealScore(input) {
    const options = input || {};
    const candidateEntries = Array.isArray(options.candidateEntries) ? options.candidateEntries : [];
    const consumedEntries = Array.isArray(options.consumedEntries) ? options.consumedEntries : [];
    const goals = options.goals || {};
    const config = Array.isArray(options.config) && options.config.length ? options.config : DEFAULT_CONFIG;
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const hoursLeft = finiteNumber(options.hoursLeft) ?? hoursUntilLocalMidnight(now);
    const windowHours = finiteNumber(options.windowHours) ?? DEFAULT_WINDOW_HOURS;
    const share = timeShare(hoursLeft, windowHours);
    const components = {};
    const missing = [];
    const requiredMissing = [];
    let weightedScore = 0;
    let availableWeight = 0;
    const totalConfiguredWeight = config.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);

    for (const item of config) {
      const target = finiteNumber(goals[item.key]);
      // Historical entries can be incomplete, so they contribute every known
      // value without invalidating the assessment. The candidate meal remains
      // strict for required nutrients, while optional nutrients are evaluated
      // whenever at least one item provides the value.
      const consumed = nutrientTotal(consumedEntries, item.key, {
        allowPartial: true,
        allowEmpty: true
      });
      const candidate = nutrientTotal(candidateEntries, item.key, {
        allowPartial: !item.required,
        allowEmpty: false
      });
      const validTarget = target !== null && target > 0;
      const available = validTarget && consumed.known && candidate.known;
      if (!available) {
        missing.push(item.key);
        if (item.required) requiredMissing.push(item.key);
        components[item.key] = {
          key: item.key,
          available: false,
          required: !!item.required,
          weight: item.weight,
          target,
          candidateKnownCount: candidate.knownCount,
          candidateItemCount: candidate.totalCount,
          consumedKnownCount: consumed.knownCount,
          consumedItemCount: consumed.totalCount
        };
        continue;
      }

      const remainingBefore = Math.max(target - consumed.total, 0);
      const quota = remainingBefore * share;
      const amount = Math.max(0, candidate.total);
      const ratio = quota > 0 ? amount / quota : amount > 0 ? Infinity : 0;
      const componentScore = item.type === "maximize"
        ? maximizeScore(amount, quota)
        : budgetScore(amount, quota, item.decay, item.underBudget);
      const weight = Math.max(0, Number(item.weight) || 0);

      components[item.key] = {
        key: item.key,
        type: item.type,
        available: true,
        required: !!item.required,
        weight,
        target,
        consumedBefore: consumed.total,
        mealAmount: amount,
        consumedAfter: consumed.total + amount,
        remainingBefore,
        remainingAfter: Math.max(target - consumed.total - amount, 0),
        quota,
        ratio,
        candidateKnownCount: candidate.knownCount,
        candidateItemCount: candidate.totalCount,
        candidateComplete: candidate.complete,
        consumedKnownCount: consumed.knownCount,
        consumedItemCount: consumed.totalCount,
        consumedComplete: consumed.complete,
        score: Math.max(0, Math.min(1, componentScore))
      };
      weightedScore += weight * components[item.key].score;
      availableWeight += weight;
    }

    const valid = requiredMissing.length === 0 && availableWeight > 0;
    const score = valid ? 5 * weightedScore / availableWeight : null;
    return {
      algorithmVersion: ALGORITHM_VERSION,
      valid,
      score,
      coverage: totalConfiguredWeight ? availableWeight / totalConfiguredWeight : 0,
      availableWeight,
      totalConfiguredWeight,
      components,
      missing,
      requiredMissing,
      hoursLeft,
      windowHours,
      timeShare: share,
      evaluatedAt: now.toISOString()
    };
  }

  return {
    ALGORITHM_VERSION,
    DEFAULT_WINDOW_HOURS,
    DEFAULT_CONFIG,
    hoursUntilLocalMidnight,
    timeShare,
    maximizeScore,
    budgetScore,
    calculateMealScore
  };
});
