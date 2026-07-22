/**
 * Pure weight-history, BMR, weekly-progress, and body-composition model.
 *
 * The UMD module exposes a `createBodyMetricsModel` factory. The host injects
 * `computeGoals` from goal-calculator.js, `formatDateDM` from date-utils.js,
 * and `createMeasurementId` (production uses `Date.now().toString()`). Inputs
 * are explicit measurement/context snapshots; outputs are normalized records,
 * chart series, availability flags, and progress/body-composition summaries.
 *
 * Known behavior intentionally preserved: 7/14 and 6-item windows count
 * records rather than calendar days; zero is treated as absent by the existing
 * field-specific truthiness rules; dates sort lexically; rates subtract local
 * noon `Date` values and divide by 86,400,000, so DST can yield fractional day
 * spans. Normalization deliberately retains its existing ID generation and is
 * repeated for each render-derived consumer instead of being optimized here.
 *
 * @module BodyMetricsModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BodyMetricsModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the body-metrics API with host dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {function(number, boolean, Object): Object} dependencies.computeGoals Calculates dated nutritional goals and BMR.
   * @param {function(string): string} dependencies.formatDateDM Formats stored dates for chart labels.
   * @param {function(): string} dependencies.createMeasurementId Creates a measurement ID; production injects `Date.now().toString()`.
   * @returns {Object} Weight-history and body-metrics model helpers.
   */
  function createBodyMetricsModel({ computeGoals, formatDateDM, createMeasurementId }) {
    if (
      typeof computeGoals !== "function" ||
      typeof formatDateDM !== "function" ||
      typeof createMeasurementId !== "function"
    ) {
      throw new TypeError("BodyMetricsModel requires computeGoals, formatDateDM, and createMeasurementId functions");
    }

    /**
     * Returns the latest measurement on or before a stored date.
     *
     * @param {Array<Object>} history Weight-history records.
     * @param {string} date Stored `YYYY-MM-DD` date.
     * @returns {Object|null} Latest applicable record or null.
     */
    function getWeightForDate(history, date) {
      return [...history].filter(e => e.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    }

    /**
     * Parses an optional numeric form value with the existing permissive rules.
     *
     * @param {*} value Optional form value.
     * @returns {number|null} Parsed finite number, including zero, or null.
     */
    function optionalNumber(value) {
      if (value === "" || value == null) return null;
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    /**
     * Inserts or updates one measurement while preserving one record per date.
     *
     * @param {Array<Object>} history Existing measurement records.
     * @param {Object} entry Measurement to insert or update.
     * @param {string} [previousDate] Previous date when moving an edited record.
     * @returns {Array<Object>} Ascending, date-deduplicated measurement records.
     */
    function upsertWeightEntry(history, entry, previousDate) {
      const byDate = new Map();

      history.forEach(item => {
        if (!previousDate || item.date !== previousDate) {
          byDate.set(item.date, item);
        }
      });

      const existingForDate = byDate.get(entry.date);
      byDate.set(entry.date, {
        ...existingForDate,
        ...entry,
        id: existingForDate?.id || entry.id || createMeasurementId()
      });

      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Deduplicates and sorts a weight history through the existing upsert path.
     *
     * @param {Array<Object>|null|undefined} history Measurement records.
     * @returns {Array<Object>} Normalized measurement records.
     */
    function normalizeWeightHistory(history) {
      return [...(history || [])].reduce((acc, item) => upsertWeightEntry(acc, item), []);
    }

    /**
     * Calculates the dated BMR stored with one measurement.
     *
     * @param {Object|null|undefined} entry Measurement record.
     * @param {Object} context Explicit host context.
     * @param {Object} context.profileData Profile birth date, gender, and height.
     * @param {number|string|null} context.currentHeight Current fallback height.
     * @param {Object} context.nutritionPrefs Current nutrition preferences.
     * @param {string} context.today Current stored date.
     * @returns {number|null} Calculated BMR or null under the existing truthiness rules.
     */
    function calculateBmrForMeasurement(entry, { profileData, currentHeight, nutritionPrefs, today }) {
      if (!entry || !Number(entry.weight)) return null;
      const goal = computeGoals(Number(entry.weight), true, {
        height: Number(entry.height || profileData.height || currentHeight),
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        prefs: nutritionPrefs,
        referenceDate: entry.date || today
      });
      return Number(goal.bmr) || null;
    }

    /**
     * Builds all render-derived weight, weekly-progress, and composition models.
     *
     * @param {Object} snapshot Explicit render snapshot.
     * @param {Array<Object>} snapshot.weekData Loaded weekly diary summaries.
     * @param {Array<Object>} snapshot.weightHistory Raw measurement history.
     * @param {number|string|null} snapshot.currentWeight Current applicable weight.
     * @param {number|string|null} snapshot.currentHeight Current applicable height.
     * @param {Object} snapshot.profileData Profile birth date, gender, and height.
     * @param {Object} snapshot.nutritionPrefs Current nutrition preferences.
     * @param {number|string|null} snapshot.calorieAdjustment Current daily calorie adjustment.
     * @param {string} snapshot.today Current stored date.
     * @returns {Object} Weekly progress, trends, composition, chart series, and field availability.
     */
    function buildBodyMetricsModel({
      weekData,
      weightHistory,
      currentWeight,
      currentHeight,
      profileData,
      nutritionPrefs,
      calorieAdjustment,
      today
    }) {
      const measurementContext = { profileData, currentHeight, nutritionPrefs, today };
      const normalizedWeightEntries = normalizeWeightHistory(weightHistory);
      const fieldAvailability = {
        bmi: normalizedWeightEntries.some(e => Number(e.weight) > 0 && Number(e.height) > 0),
        bodyFatPct: normalizedWeightEntries.some(e => Number(e.bodyFatPct) > 0),
        muscleMassKg: normalizedWeightEntries.some(e => Number(e.muscleMassKg) > 0),
        waistCm: normalizedWeightEntries.some(e => Number(e.waistCm) > 0)
      };
      const weightChartData = normalizedWeightEntries.map(e => ({
        date: formatDateDM(e.date),
        weight: e.weight
      }));
      const currentBmr = computeGoals(currentWeight, true, {
        height: currentHeight,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        prefs: nutritionPrefs,
        referenceDate: today
      }).bmr || null;
      const bmrChartData = normalizeWeightHistory(weightHistory).map(entry => ({
        date: formatDateDM(entry.date),
        bmr: Number(entry.bmr) || calculateBmrForMeasurement(entry, measurementContext)
      })).filter(entry => Number(entry.bmr) > 0);

      const daysWithData = weekData.filter(d => d.hasData);
      const avgProtein = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length) : 0;
      const avgKcal = daysWithData.length ? Math.round(daysWithData.reduce((s, d) => s + d.kcal, 0) / daysWithData.length) : 0;
      const daysMetProtein = daysWithData.filter(d => d.metProtein).length;
      const completedWeekDays = weekData.filter(d => d.hasData && !d.isToday);
      const calorieBankDays = weekData.filter(d => !d.isToday).slice(-7).filter(d => d.hasData);
      const calorieBankTarget = calorieBankDays.reduce((sum, day) => sum + (Number(day.kcalGoal) || 0), 0);
      const calorieBankConsumed = calorieBankDays.reduce((sum, day) => sum + (Number(day.kcal) || 0), 0);
      const calorieBankBalance = Math.round(calorieBankTarget - calorieBankConsumed);
      const deficit = completedWeekDays.reduce((s, d) => s + Math.max(0, (d.baseCalories || d.kcalGoal || 0) - d.kcal), 0);
      const surplus = completedWeekDays.reduce((s, d) => s + Math.max(0, d.kcal - (d.baseCalories || d.kcalGoal || 0)), 0);
      const plannedDaily = Math.abs(calorieAdjustment || 0);
      const plannedWeek = plannedDaily * 7;
      const relevant = nutritionPrefs.goalType === "gain" ? surplus : nutritionPrefs.goalType === "loss" ? deficit : Math.abs(surplus - deficit);
      const adherence = plannedWeek ? Math.round(Math.min(999, relevant / plannedWeek * 100)) : 0;
      const avgDaily = completedWeekDays.length ? Math.round((nutritionPrefs.goalType === "gain" ? surplus : deficit) / completedWeekDays.length) : 0;
      const weeklyProgress = {
        days: completedWeekDays.length,
        deficit: Math.round(deficit),
        surplus: Math.round(surplus),
        plannedWeek: Math.round(plannedWeek),
        avgDaily,
        adherence
      };

      const sortedWeights = [...weightHistory].filter(e => Number(e.weight) > 0).sort((a, b) => a.date.localeCompare(b.date));
      const avg = arr => arr.length ? arr.reduce((s, e) => s + Number(e.weight || 0), 0) / arr.length : null;
      const avg7 = avg(sortedWeights.slice(-7));
      const avg14 = avg(sortedWeights.slice(-14));
      const recent = sortedWeights.slice(-14);
      let weeklyRate = 0;
      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const days = Math.max(1, (new Date(last.date + "T12:00:00") - new Date(first.date + "T12:00:00")) / 86400000);
        weeklyRate = (Number(last.weight) - Number(first.weight)) / days * 7;
      }
      const goalKg = Number(nutritionPrefs.goalKg || 0);
      const directionOk = nutritionPrefs.goalType === "loss" ? weeklyRate < -0.05 : nutritionPrefs.goalType === "gain" ? weeklyRate > 0.05 : false;
      const weightTrend = {
        avg7,
        avg14,
        weeklyRate,
        weeksRemaining: directionOk && goalKg > 0 ? goalKg / Math.abs(weeklyRate) : null,
        hasEnough: recent.length >= 2
      };

      const sortedComposition = [...weightHistory].filter(e => Number(e.weight) > 0).sort((a, b) => a.date.localeCompare(b.date));
      const measured = sortedComposition.filter(e => Number(e.bodyFatPct) > 0 || Number(e.waistCm) > 0 || Number(e.muscleMassKg) > 0);
      const latest = [...measured].reverse()[0] || null;
      const currentFatPct = latest && Number(latest.bodyFatPct) > 0 ? Number(latest.bodyFatPct) : null;
      const currentWeightForBody = latest?.weight || currentWeight || null;
      const fatKg = currentFatPct && currentWeightForBody ? currentWeightForBody * currentFatPct / 100 : null;
      const leanMassKg = fatKg && currentWeightForBody ? currentWeightForBody - fatKg : null;
      const targetPct = Number(nutritionPrefs.bodyFatGoal || 0);
      const weightTarget = leanMassKg && targetPct > 0 && targetPct < 60 ? leanMassKg / (1 - targetPct / 100) : null;
      const fatToLose = weightTarget && currentWeightForBody ? Math.max(0, currentWeightForBody - weightTarget) : null;
      const fatEntries = sortedComposition.filter(e => Number(e.bodyFatPct) > 0 && Number(e.weight) > 0).map(e => ({
        ...e,
        fatKg: Number(e.weight) * Number(e.bodyFatPct) / 100
      }));
      const recentFat = fatEntries.slice(-6);
      let fatWeeklyRate = 0;
      if (recentFat.length >= 3) {
        const first = recentFat[0];
        const last = recentFat[recentFat.length - 1];
        const days = Math.max(1, (new Date(last.date + "T12:00:00") - new Date(first.date + "T12:00:00")) / 86400000);
        fatWeeklyRate = (last.fatKg - first.fatKg) / days * 7;
      }
      const fatWeeksRemaining = fatToLose && fatWeeklyRate < -0.03 ? fatToLose / Math.abs(fatWeeklyRate) : null;
      const fatChartData = fatEntries.map(e => ({
        date: e.date,
        label: formatDateDM(e.date),
        bodyFatPct: Number(e.bodyFatPct),
        fatKg: Math.round(e.fatKg * 10) / 10
      }));
      const bodyComposition = {
        latest,
        measured,
        fatEntries,
        fatChartData,
        currentFatPct,
        fatKg,
        leanMassKg,
        targetPct,
        weightTarget,
        fatToLose,
        fatWeeklyRate,
        weeksRemaining: fatWeeksRemaining,
        hasEnoughFatTrend: recentFat.length >= 3
      };

      const optionalSeries = {};
      ["bodyFatPct", "muscleMassKg", "waistCm"].forEach(key => {
        optionalSeries[key] = normalizeWeightHistory(weightHistory)
          .filter(entry => Number(entry[key]) > 0)
          .map(entry => ({
            date: formatDateDM(entry.date),
            value: Number(entry[key])
          }));
      });

      return {
        normalizedWeightEntries,
        weeklyProgress,
        weeklyAverages: { daysWithData, avgProtein, avgKcal, daysMetProtein },
        calorieBank: {
          days: calorieBankDays,
          target: calorieBankTarget,
          consumed: calorieBankConsumed,
          balance: calorieBankBalance
        },
        weightTrend,
        bodyComposition,
        chartSeries: {
          weight: weightChartData,
          bmr: bmrChartData,
          bodyFat: fatChartData,
          ...optionalSeries
        },
        fieldAvailability,
        currentBmr,
        bodyFatGoalAutoKg: bodyComposition.fatToLose ? Math.round(bodyComposition.fatToLose * 10) / 10 : "",
        hasWeightHistory: normalizeWeightHistory(weightHistory).length > 0
      };
    }

    return {
      getWeightForDate,
      optionalNumber,
      upsertWeightEntry,
      normalizeWeightHistory,
      calculateBmrForMeasurement,
      buildBodyMetricsModel
    };
  }

  return { createBodyMetricsModel };
});
