/**
 * Meal suitability scoring for the remaining nutritional budget of a day.
 *
 * The UMD module has no injected dependencies and uses only JavaScript built-ins
 * such as `Date`, `Math`, and `Number`. It accepts plain meal-entry arrays,
 * nutritional goals, optional scoring configuration, and time inputs, and
 * returns plain objects containing the score, coverage, and component details.
 *
 * @module MealScore
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealScore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ALGORITHM_VERSION = "meal-score-v2";
  const HISTORICAL_ALGORITHM_VERSIONS = Object.freeze(["meal-score-v1.1"]);
  const DEFAULT_WINDOW_HOURS = 3;
  const DEFAULT_CONFIG = [
    { key: "kcal", type: "target", weight: 25, required: true, underPower: 0.75, overDecay: 3.5 },
    { key: "protein", type: "maximize", weight: 25, required: true, curvePower: 0.7 },
    { key: "fiber", type: "maximize", weight: 16, curvePower: 0.8 },
    { key: "salt", type: "limit", weight: 12, overDecay: 5 },
    { key: "carbs", type: "target", weight: 12, underPower: 0.8, overDecay: 2.5 },
    { key: "fat", type: "target", weight: 10, underPower: 0.8, overDecay: 3 }
  ];

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  /**
   * Calculates the fractional hours remaining until local midnight.
   *
   * @param {Date|string|number} [now=Date.now()] Date or date-like value to evaluate.
   * @returns {number} Non-negative number of hours until local midnight.
   */
  function hoursUntilLocalMidnight(now) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    const midnight = new Date(current);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, (midnight.getTime() - current.getTime()) / 3600000);
  }

  /**
   * Converts the remaining time and scoring window into a bounded quota share.
   *
   * @param {number|string} hoursLeft Hours remaining in the day.
   * @param {number|string} windowHours Size of the scoring window in hours.
   * @returns {number} Quota share between zero and one.
   */
  function timeShare(hoursLeft, windowHours) {
    const hours = Math.max(0.25, finiteNumber(hoursLeft) ?? 0.25);
    const window = Math.max(0.25, finiteNumber(windowHours) ?? DEFAULT_WINDOW_HOURS);
    return Math.min(1, window / hours);
  }

  /**
   * Calculates clock hours remaining in the civil day represented by a meal.
   * An ISO-like string retains its own wall-clock time instead of being
   * converted to the timezone of a device that later re-evaluates the meal.
   */
  function hoursUntilCivilMidnight(value) {
    if (typeof value === "string") {
      const match = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/.exec(value);
      if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        const second = Number(match[3] || 0);
        if (hour < 24 && minute < 60 && second < 60) {
          return Math.max(0, 24 - hour - minute / 60 - second / 3600);
        }
      }
    }
    return hoursUntilLocalMidnight(value);
  }

  /**
   * Smoothly allocates more of the remaining daily target to later meals.
   * The floor prevents an early meal from receiving an unrealistically tiny
   * reference; the original linear timeShare remains exported for MealGA.
   */
  function contextualTimeShare(hoursLeft, windowHours) {
    const hours = Math.max(0.25, finiteNumber(hoursLeft) ?? 0.25);
    const window = Math.max(0.25, finiteNumber(windowHours) ?? DEFAULT_WINDOW_HOURS);
    if (hours <= window) return 1;
    return Math.max(0.15, Math.min(1, Math.pow(window / hours, 0.75)));
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
      missingCount: list.length - knownCount,
      totalCount: list.length,
      complete
    };
  }

  /**
   * Scores a nutrient whose desired behavior is to reach or exceed its quota.
   *
   * @param {number} amount Nutrient amount supplied by the candidate meal.
   * @param {number} quota Nutrient quota assigned to the candidate meal.
   * @returns {number} Component score between zero and one.
   */
  function maximizeScore(amount, quota, curvePower) {
    if (quota <= 0) return 1;
    const ratio = Math.max(0, amount / quota);
    return Math.max(0, Math.min(1, Math.pow(ratio, finiteNumber(curvePower) ?? 1)));
  }

  function targetScore(amount, quota, underPower, overDecay) {
    if (quota <= 0) return amount > 0 ? 0 : 1;
    const ratio = Math.max(0, amount / quota);
    if (ratio <= 1) return Math.pow(ratio, finiteNumber(underPower) ?? 1);
    const excess = ratio - 1;
    return Math.exp(-(finiteNumber(overDecay) ?? 3) * excess * excess);
  }

  function limitScore(amount, quota, overDecay) {
    if (quota <= 0) return amount > 0 ? 0 : 1;
    const ratio = Math.max(0, amount / quota);
    if (ratio <= 1) return 1;
    const excess = ratio - 1;
    return Math.exp(-(finiteNumber(overDecay) ?? 4) * excess * excess);
  }

  /**
   * Scores a nutrient that should remain within a quota.
   *
   * @param {number} amount Nutrient amount supplied by the candidate meal.
   * @param {number} quota Nutrient quota assigned to the candidate meal.
   * @param {number} decay Exponential penalty applied above the quota.
   * @param {string} underBudget Scoring mode used while the amount is within budget.
   * @returns {number} Component score between zero and one.
   */
  function budgetScore(amount, quota, decay, underBudget) {
    if (quota <= 0) return amount > 0 ? 0 : 1;
    const ratio = Math.max(0, amount / quota);
    if (ratio <= 1) {
      return underBudget === "adequacy" ? 0.6 + 0.4 * ratio : 1;
    }
    return Math.exp(-Math.max(0, decay || 0) * (ratio - 1));
  }

  /**
   * Calculates the weighted nutritional score for a candidate meal.
   *
   * @param {Object} [input={}] Scoring input.
   * @param {Array<Object>} [input.candidateEntries=[]] Entries in the candidate meal.
   * @param {Array<Object>} [input.consumedEntries=[]] Entries already consumed that day.
   * @param {Object} [input.goals={}] Daily nutrient targets keyed by nutrient name.
   * @param {Array<Object>} [input.config] Optional scoring component configuration.
   * @param {Date|string|number} [input.mealOccurredAt] Real civil occurrence time of the meal.
   * @param {Date|string|number} [input.evaluatedAt] Time at which the score was evaluated.
   * @param {Date|string|number} [input.now] Backward-compatible fallback for both time inputs.
   * @param {number|string} [input.hoursLeft] Explicit remaining hours override.
   * @param {number|string} [input.windowHours] Explicit scoring-window override.
   * @returns {Object} Score result with validity, coverage, components, missing fields, and timing details.
   */
  function calculateMealScore(input) {
    const options = input || {};
    const candidateEntries = Array.isArray(options.candidateEntries) ? options.candidateEntries : [];
    const consumedEntries = Array.isArray(options.consumedEntries) ? options.consumedEntries : [];
    const goals = options.goals || {};
    const config = Array.isArray(options.config) && options.config.length ? options.config : DEFAULT_CONFIG;
    const occurrenceInput = options.mealOccurredAt ?? options.now ?? new Date();
    const evaluationInput = options.evaluatedAt ?? options.now ?? occurrenceInput;
    const hoursLeft = finiteNumber(options.hoursLeft) ?? hoursUntilCivilMidnight(occurrenceInput);
    const windowHours = finiteNumber(options.windowHours) ?? DEFAULT_WINDOW_HOURS;
    const share = contextualTimeShare(hoursLeft, windowHours);
    const components = {};
    const missing = [];
    const excluded = [];
    const requiredMissing = [];
    const provisionalReasons = [];
    let weightedScore = 0;
    let availableWeight = 0;
    let applicableWeight = 0;
    const totalConfiguredWeight = config.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);

    for (const item of config) {
      const target = finiteNumber(goals[item.key]);
      const consumed = nutrientTotal(consumedEntries, item.key, {
        allowPartial: false,
        allowEmpty: true
      });
      const candidate = nutrientTotal(candidateEntries, item.key, {
        allowPartial: false,
        allowEmpty: false
      });
      const validTarget = target !== null && target > 0;
      const weight = Math.max(0, Number(item.weight) || 0);
      if (!validTarget && !item.required) {
        excluded.push(item.key);
        components[item.key] = {
          key: item.key,
          available: false,
          applicable: false,
          required: false,
          weight,
          target
        };
        continue;
      }
      applicableWeight += weight;
      const available = validTarget && consumed.known && candidate.known;
      if (!available) {
        missing.push(item.key);
        if (item.required) requiredMissing.push(item.key);
        if (!item.required && validTarget) {
          if (!candidate.complete) provisionalReasons.push({
            nutrient: item.key,
            scope: "candidate",
            missingItemCount: candidate.missingCount,
            totalItemCount: candidate.totalCount
          });
          if (!consumed.complete) provisionalReasons.push({
            nutrient: item.key,
            scope: "consumed",
            missingItemCount: consumed.missingCount,
            totalItemCount: consumed.totalCount
          });
        }
        components[item.key] = {
          key: item.key,
          available: false,
          applicable: true,
          required: !!item.required,
          weight,
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
        ? maximizeScore(amount, quota, item.curvePower)
        : item.type === "limit"
          ? limitScore(amount, quota, item.overDecay)
          : targetScore(amount, quota, item.underPower, item.overDecay);

      components[item.key] = {
        key: item.key,
        type: item.type,
        available: true,
        applicable: true,
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
    const coverage = applicableWeight ? availableWeight / applicableWeight : 0;
    const confidenceLevel = !valid ? "unavailable" : coverage >= 0.9 ? "high" : coverage >= 0.7 ? "medium" : "low";
    const serializeDateLike = value => {
      if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? String(value) : null;
    };
    return {
      algorithmVersion: ALGORITHM_VERSION,
      valid,
      score,
      coverage,
      confidence: confidenceLevel,
      provisional: valid && provisionalReasons.length > 0,
      provisionalReasons,
      availableWeight,
      applicableWeight,
      totalConfiguredWeight,
      components,
      missing,
      excluded,
      requiredMissing,
      hoursLeft,
      windowHours,
      timeShare: share,
      mealOccurredAt: serializeDateLike(occurrenceInput),
      evaluatedAt: serializeDateLike(evaluationInput)
    };
  }

  function cloneSnapshotValue(value) {
    if (Array.isArray(value)) return value.map(cloneSnapshotValue);
    if (!value || typeof value !== "object") return value;
    const copy = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      copy[key] = cloneSnapshotValue(nestedValue);
    }
    return copy;
  }

  /**
   * Builds the immutable-at-rest representation persisted with every entry in
   * a newly assessed meal. Keeping this projection next to the algorithm stops
   * host controllers from silently drifting as result fields evolve.
   */
  function buildMealScoreSnapshot(result) {
    if (!result || result.algorithmVersion !== ALGORITHM_VERSION || result.valid !== true ||
        !Number.isFinite(result.score) || result.score < 0 || result.score > 5) {
      throw new TypeError("A valid current-version meal score is required");
    }
    return cloneSnapshotValue({
      algorithmVersion: result.algorithmVersion,
      score: result.score,
      coverage: result.coverage,
      confidence: result.confidence,
      provisional: result.provisional,
      provisionalReasons: result.provisionalReasons,
      applicableWeight: result.applicableWeight,
      mealOccurredAt: result.mealOccurredAt,
      evaluatedAt: result.evaluatedAt,
      hoursLeft: result.hoursLeft,
      windowHours: result.windowHours,
      components: result.components
    });
  }

  /**
   * Reads a stored score without recalculating or upgrading it. Historical
   * v1.1 snapshots keep their original shape and score; compatibility metadata
   * is returned separately so calibrations are never mixed accidentally.
   */
  function inspectMealScoreSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
    const algorithmVersion = snapshot.algorithmVersion;
    const supported = algorithmVersion === ALGORITHM_VERSION ||
      HISTORICAL_ALGORITHM_VERSIONS.includes(algorithmVersion);
    if (!supported || !Number.isFinite(snapshot.score) || snapshot.score < 0 || snapshot.score > 5) return null;
    return {
      algorithmVersion,
      compatibility: algorithmVersion === ALGORITHM_VERSION ? "current" : "historical",
      comparableWithCurrent: algorithmVersion === ALGORITHM_VERSION,
      snapshot: cloneSnapshotValue(snapshot)
    };
  }

  function areMealScoreSnapshotsComparable(first, second) {
    const left = inspectMealScoreSnapshot(first);
    const right = inspectMealScoreSnapshot(second);
    return !!left && !!right && left.algorithmVersion === right.algorithmVersion;
  }

  function snapshotValuesEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) || Array.isArray(right)) {
      return Array.isArray(left) && Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => snapshotValuesEqual(value, right[index]));
    }
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] &&
        snapshotValuesEqual(left[key], right[key]));
  }

  function normalizedMealEvaluationId(value) {
    if (typeof value !== "string") return null;
    const id = value.trim();
    return id ? id : null;
  }

  /**
   * Returns only complete, internally consistent evaluation groups. A group is
   * hidden when any participating entry lacks a supported snapshot or carries
   * a different snapshot, so callers can render historical data fail-closed.
   */
  function collectValidMealEvaluationGroups(entries) {
    const groups = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
      const evaluationId = normalizedMealEvaluationId(entry?.mealEvaluationId);
      if (!evaluationId) continue;
      if (!groups.has(evaluationId)) groups.set(evaluationId, []);
      groups.get(evaluationId).push(entry);
    }

    const validGroups = [];
    for (const [evaluationId, groupEntries] of groups) {
      const inspections = groupEntries.map(entry => inspectMealScoreSnapshot(entry?.mealScoreSnapshot));
      const first = inspections[0];
      const valid = !!first && inspections.every(inspection => inspection &&
        inspection.algorithmVersion === first.algorithmVersion &&
        snapshotValuesEqual(inspection.snapshot, first.snapshot));
      if (!valid) continue;
      validGroups.push({
        evaluationId,
        entryIds: groupEntries.map(entry => entry.id),
        algorithmVersion: first.algorithmVersion,
        compatibility: first.compatibility,
        comparableWithCurrent: first.comparableWithCurrent,
        snapshot: cloneSnapshotValue(first.snapshot)
      });
    }
    return validGroups;
  }

  /**
   * Removes persisted evaluation metadata without mutating the source entry.
   * This is also the required contract for a duplicated diary entry.
   */
  function stripMealEvaluationMetadata(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const copy = { ...entry };
    delete copy.mealEvaluationId;
    delete copy.mealScoreSnapshot;
    return copy;
  }

  /**
   * Invalidates the whole accepted evaluation containing one edited or removed
   * entry. Even malformed groups are stripped conservatively; unrelated groups
   * and unreviewed entries retain their original object identity.
   */
  function invalidateMealEvaluationForEntry(entries, entryId) {
    const list = Array.isArray(entries) ? entries : [];
    const target = list.find(entry => entry?.id === entryId);
    if (!target) return list.slice();
    const evaluationId = normalizedMealEvaluationId(target.mealEvaluationId);
    return list.map(entry => {
      const belongsToGroup = evaluationId
        ? normalizedMealEvaluationId(entry?.mealEvaluationId) === evaluationId
        : entry?.id === entryId;
      return belongsToGroup ? stripMealEvaluationMetadata(entry) : entry;
    });
  }

  return {
    ALGORITHM_VERSION,
    HISTORICAL_ALGORITHM_VERSIONS,
    DEFAULT_WINDOW_HOURS,
    DEFAULT_CONFIG,
    hoursUntilLocalMidnight,
    hoursUntilCivilMidnight,
    timeShare,
    contextualTimeShare,
    maximizeScore,
    budgetScore,
    targetScore,
    limitScore,
    calculateMealScore,
    buildMealScoreSnapshot,
    inspectMealScoreSnapshot,
    areMealScoreSnapshotsComparable,
    collectValidMealEvaluationGroups,
    stripMealEvaluationMetadata,
    invalidateMealEvaluationForEntry
  };
});
