/**
 * Asynchronous, setter-free loaders for diary history, weekly summaries, meal
 * analysis, and monthly calendar markers.
 *
 * The UMD module exposes a `createHistoryLoaders` factory. The host injects the
 * public storage facade, the monolith's persisted-meal normalizer, pure APIs
 * from week-aggregator.js, historical-goals-model.js, and calendar-model.js,
 * plus a fresh-Date factory and warning callback. Every exported loader returns
 * data through a Promise and never calls React setters.
 *
 * KNOWN RACES INTENTIONALLY PRESERVED: rapid historical-date changes have no
 * sequence token and an older response may overwrite a newer date; that stale
 * note may subsequently autosave under the newer `viewDate`; weekly and meal
 * loaders have no cancellation and may commit out of order; the host effect
 * omits `profileData`, `currentWeight`, and `currentHeight`; and monthly
 * calendar cleanup only blocks final setters while all requests continue.
 * Invalid historical/weekly/meal JSON keeps rejecting its loader, while invalid
 * calendar JSON is warned and represented exactly like a missing or empty day.
 *
 * Timing is part of the contract: historical log and note reads are parallel;
 * weekly and 30-day reads are sequential; monthly reads are parallel; and a
 * fresh local Date is created inside every weekly/30-day iteration before
 * `toISOString()`. No timeout, request cancellation, or stale-result check is
 * introduced here.
 *
 * @module HistoryLoaders
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HistoryLoaders = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates setter-free history loaders from stable environmental and domain dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {{get: function(string): Promise<Object|null>}} dependencies.storage Public persisted-data facade.
   * @param {function(Object): Object} dependencies.normalizeMealKeys Maps historical diary keys to persisted PT keys.
   * @param {function(Object): Array<Object>} dependencies.aggregateWeekRows Builds weekly chart rows.
   * @param {function(Object): Object} dependencies.aggregateMealAverages Builds per-meal averages.
   * @param {function(string): Array<string|null>} dependencies.monthDays Builds one Sunday-first month grid.
   * @param {function(Object, Object): Object} dependencies.calendarMarkerFor Builds one calendar marker.
   * @param {function(Object): Object} dependencies.resolveHistoricalGoals Resolves effective goals for one date.
   * @param {function(): Date} dependencies.createDate Returns a fresh current Date for each loader iteration.
   * @param {function(...*): void} dependencies.warn Reports invalid calendar JSON without rejecting the month.
   * @returns {Object} Four asynchronous data loaders with no setter side effects.
   */
  function createHistoryLoaders({
    storage,
    normalizeMealKeys,
    aggregateWeekRows,
    aggregateMealAverages,
    monthDays,
    calendarMarkerFor,
    resolveHistoricalGoals,
    createDate,
    warn
  }) {
    if (
      !storage || typeof storage.get !== "function" ||
      typeof normalizeMealKeys !== "function" ||
      typeof aggregateWeekRows !== "function" ||
      typeof aggregateMealAverages !== "function" ||
      typeof monthDays !== "function" ||
      typeof calendarMarkerFor !== "function" ||
      typeof resolveHistoricalGoals !== "function" ||
      typeof createDate !== "function" ||
      typeof warn !== "function"
    ) {
      throw new TypeError("HistoryLoaders requires storage and all history-loader dependency functions");
    }

    /**
     * Reads one historical diary log and note in parallel, or returns a neutral TODAY result.
     *
     * @param {Object} input Loader input.
     * @param {string} input.date Requested stored date.
     * @param {string} input.today Current stored date.
     * @returns {Promise<{isHistorical: boolean, historyLog?: Object, historyNote?: *}>} Resolved historical values without setters.
     */
    async function loadHistoricalDate({ date, today }) {
      if (date === today) return { isHistorical: false };
      const [logRecord, noteRecord] = await Promise.all([
        storage.get("log_v2_" + date).catch(() => null),
        storage.get("notes_" + date).catch(() => null)
      ]);
      return {
        isHistorical: true,
        historyLog: logRecord ? normalizeMealKeys(JSON.parse(logRecord.value)) : {},
        historyNote: noteRecord ? noteRecord.value || "" : ""
      };
    }

    /**
     * Reads seven completed days plus today sequentially and returns aggregated week rows.
     *
     * @param {Object} input Loader input.
     * @param {string} input.today Current stored date.
     * @param {Object} input.todayLog Current in-memory diary log.
     * @param {Object<string, boolean>} input.trainingByDate Explicit training/rest choices.
     * @param {Object} input.goalContext Historical-goal snapshot captured by the host.
     * @returns {Promise<Array<Object>>} Eight weekly rows from the injected pure aggregator.
     */
    async function loadWeekRows({ today, todayLog, trainingByDate, goalContext }) {
      const dayDescriptors = [];
      const logsByDate = {};
      for (let i = 7; i >= 0; i--) {
        const dateObject = createDate();
        dateObject.setDate(dateObject.getDate() - i);
        const date = dateObject.toISOString().split("T")[0];
        let dayLog = date === today ? todayLog : {};
        if (date !== today) {
          const record = await storage.get("log_v2_" + date).catch(() => null);
          if (record) dayLog = normalizeMealKeys(JSON.parse(record.value));
        }
        dayDescriptors.push({ date, day: dateObject.getDate() });
        logsByDate[date] = dayLog;
      }
      return aggregateWeekRows({
        dayDescriptors,
        logsByDate,
        today,
        trainingByDate,
        goalContext
      });
    }

    /**
     * Reads the prior 30 days sequentially and returns unnormalized per-meal averages.
     *
     * @param {Object} input Loader input.
     * @param {Array<string>} input.mealKeys Fixed persisted PT meal keys.
     * @returns {Promise<Object>} Per-meal averages from the injected pure aggregator.
     */
    async function loadMealAnalysisData({ mealKeys }) {
      const dailyLogs = [];
      for (let i = 1; i <= 30; i++) {
        const dateObject = createDate();
        dateObject.setDate(dateObject.getDate() - i);
        const date = dateObject.toISOString().split("T")[0];
        const record = await storage.get("log_v2_" + date).catch(() => null);
        if (!record) continue;
        dailyLogs.push(JSON.parse(record.value));
      }
      return aggregateMealAverages({ dailyLogs, mealKeys });
    }

    /**
     * Reads all non-future month days in parallel and returns marker data keyed by date.
     *
     * @param {Object} input Loader input.
     * @param {string} input.calendarMonth Requested `YYYY-MM` month.
     * @param {string} input.today Current stored date.
     * @param {Object} input.todayLog Current in-memory diary log.
     * @param {Object<string, boolean>} input.trainingByDate Explicit training/rest choices.
     * @param {Object} input.goalContext Historical-goal snapshot captured by the host.
     * @returns {Promise<Object<string, Object>>} Calendar markers without React state updates.
     */
    async function loadCalendarMonthData({
      calendarMonth,
      today,
      todayLog,
      trainingByDate,
      goalContext
    }) {
      const nextData = {};
      const dates = monthDays(calendarMonth).filter(Boolean).filter(date => date <= today);
      await Promise.all(dates.map(async date => {
        let dayLog = date === today ? todayLog : {};
        if (date !== today) {
          const record = await storage.get("log_v2_" + date).catch(() => null);
          if (record?.value) {
            try {
              const parsed = typeof record.value === "string" ? JSON.parse(record.value) : record.value;
              dayLog = normalizeMealKeys(parsed || {});
            } catch (error) {
              warn("Registro diário inválido no calendário:", date, error);
            }
          }
        }
        const dayIsTraining = trainingByDate[date] ?? true;
        const goal = resolveHistoricalGoals({
          date,
          today,
          dayIsTraining,
          weightHistory: goalContext.weightHistory,
          currentWeight: goalContext.currentWeight,
          currentHeight: goalContext.currentHeight,
          profileData: goalContext.profileData,
          nutritionPrefs: goalContext.nutritionPrefs,
          customGoals: goalContext.customGoals,
          frozenGoal: goalContext.goalHistory[date]
        }).effectiveGoal;
        nextData[date] = calendarMarkerFor(dayLog, goal);
      }));
      return nextData;
    }

    return {
      loadHistoricalDate,
      loadWeekRows,
      loadMealAnalysisData,
      loadCalendarMonthData
    };
  }

  return { createHistoryLoaders };
});
