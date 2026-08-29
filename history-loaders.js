/**
 * Asynchronous, setter-free loaders for diary history, weekly summaries, meal
 * analysis, and monthly calendar markers.
 *
 * The UMD module exposes a `createHistoryLoaders` factory. The host injects the
 * public storage facade, the monolith's persisted-meal normalizer, pure APIs
 * from week-aggregator.js, historical-goals-model.js, and calendar-model.js,
 * plus the shared civil-date shifter and warning callback. Every exported loader returns
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
 * Reads are grouped through the optional storage `getMany` port. The optional
 * `subscribeMany` port lets overlapping screens reuse the same Firestore
 * listeners and receive the cached snapshot before the controlled server
 * refresh. REST compatibility falls back to parallel `get` calls.
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
   * @param {function(string, number): string} dependencies.addCivilDays Shifts a civil date without timezone conversion.
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
    addCivilDays,
    warn
  }) {
    if (
      !storage || (typeof storage.get !== "function" && typeof storage.getMany !== "function") ||
      typeof normalizeMealKeys !== "function" ||
      typeof aggregateWeekRows !== "function" ||
      typeof aggregateMealAverages !== "function" ||
      typeof monthDays !== "function" ||
      typeof calendarMarkerFor !== "function" ||
      typeof resolveHistoricalGoals !== "function" ||
      typeof addCivilDays !== "function" ||
      typeof warn !== "function"
    ) {
      throw new TypeError("HistoryLoaders requires storage and all history-loader dependency functions");
    }

    async function readMany(keys) {
      const uniqueKeys = Array.from(new Set((keys || []).map(String)));
      const granularLogKeys = typeof storage.readDailyStateCompatible === "function"
        ? uniqueKeys.filter(key => /^log_v2_\d{4}-\d{2}-\d{2}$/.test(key))
        : [];
      const granularSet = new Set(granularLogKeys);
      const regularKeys = uniqueKeys.filter(key => !granularSet.has(key));
      let records = {};
      if (regularKeys.length && typeof storage.getMany === "function") {
        records = await storage.getMany(regularKeys);
      } else if (regularKeys.length) {
        records = Object.fromEntries(await Promise.all(regularKeys.map(async key => [
          key,
          await storage.get(key).catch(() => null)
        ])));
      }
      const granularRecords = await Promise.all(granularLogKeys.map(async key => {
        const date = key.slice("log_v2_".length);
        const dailyState = await storage.readDailyStateCompatible(date);
        return [key, {value: JSON.stringify(dailyState.log || {})}];
      }));
      return {...records, ...Object.fromEntries(granularRecords)};
    }

    function subscribeMany(keys, onValue, onError) {
      const uniqueKeys = Array.from(new Set((keys || []).map(String)));
      const hasGranularLogs = typeof storage.readDailyStateCompatible === "function" &&
        uniqueKeys.some(key => /^log_v2_\d{4}-\d{2}-\d{2}$/.test(key));
      if (typeof storage.subscribeMany === "function" && !hasGranularLogs) {
        return storage.subscribeMany(uniqueKeys, onValue, onError);
      }
      let active = true;
      readMany(uniqueKeys).then(records => {
        if (active) onValue({records, complete: true, fromCache: false, hasPendingWrites: false});
      }).catch(error => {
        if (active) onError?.(error);
      });
      return () => { active = false; };
    }

    function historicalDates(today, count, includeToday) {
      const dates = [];
      const start = includeToday ? 0 : 1;
      for (let i = start; i < start + count; i++) dates.push(addCivilDays(today, -i));
      return dates;
    }

    function parseLogRecord(record, normalize) {
      if (!record) return null;
      const parsed = typeof record.value === "string" ? JSON.parse(record.value) : record.value;
      return normalize ? normalizeMealKeys(parsed || {}) : parsed;
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
      const logKey = "log_v2_" + date;
      const noteKey = "notes_" + date;
      const records = await readMany([logKey, noteKey]);
      const logRecord = records[logKey];
      const noteRecord = records[noteKey];
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
      const dates = historicalDates(today, 8, true).reverse();
      const records = await readMany(dates.filter(date => date !== today).map(date => "log_v2_" + date));
      const dayDescriptors = [];
      const logsByDate = {};
      dates.forEach(date => {
        let dayLog = date === today ? todayLog : {};
        if (date !== today) {
          const record = records["log_v2_" + date];
          if (record) dayLog = normalizeMealKeys(JSON.parse(record.value));
        }
        dayDescriptors.push({ date, day: Number(date.slice(8, 10)) });
        logsByDate[date] = dayLog;
      });
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
     * @param {string} input.today Current local civil date.
     * @param {Array<string>} input.mealKeys Fixed persisted PT meal keys.
     * @returns {Promise<Object>} Per-meal averages from the injected pure aggregator.
     */
    async function loadMealAnalysisData({ today, mealKeys }) {
      const dates = historicalDates(today, 30, false);
      const records = await readMany(dates.map(date => "log_v2_" + date));
      const dailyLogs = [];
      dates.forEach(date => {
        const record = records["log_v2_" + date];
        if (!record) return;
        dailyLogs.push(JSON.parse(record.value));
      });
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
      const records = await readMany(dates.filter(date => date !== today).map(date => "log_v2_" + date));
      dates.forEach(date => {
        let dayLog = date === today ? todayLog : {};
        if (date !== today) {
          const record = records["log_v2_" + date];
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
      });
      return nextData;
    }

    async function loadRecentMealDays({today, todayLog, days = 15}) {
      const dates = historicalDates(today, days, true);
      const records = await readMany(dates.filter(date => date !== today).map(date => "log_v2_" + date));
      return dates.flatMap(date => {
        const parsed = date === today ? todayLog : parseLogRecord(records["log_v2_" + date], false);
        return parsed ? [{date, log: parsed}] : [];
      });
    }

    async function loadEatingPatternDays({today, days = 30}) {
      const dates = historicalDates(today, days, false);
      const records = await readMany(dates.map(date => "log_v2_" + date));
      return dates.flatMap(date => {
        const parsed = parseLogRecord(records["log_v2_" + date], false);
        return parsed ? [{date, log: parsed}] : [];
      });
    }

    async function loadLogDays({dates, today, todayLog, normalize = true}) {
      const historical = dates.filter(date => date !== today);
      const records = await readMany(historical.map(date => "log_v2_" + date));
      return dates.map(date => ({
        date,
        log: date === today
          ? todayLog
          : (parseLogRecord(records["log_v2_" + date], normalize) || {})
      }));
    }

    async function loadReportDays({dates, today, todayRecords}) {
      const prefixes = ["log_v2_", "notes_", "waterIntake_", "suppLog_"];
      const historical = dates.filter(date => date !== today);
      const records = await readMany(historical.flatMap(date => prefixes.map(prefix => prefix + date)));
      return dates.map(date => {
        if (date === today) return {date, ...(todayRecords || {})};
        return {
          date,
          log: parseLogRecord(records["log_v2_" + date], true) || {},
          note: records["notes_" + date]?.value || "",
          water: records["waterIntake_" + date]?.value || "[]",
          supplements: records["suppLog_" + date]?.value || "[]"
        };
      });
    }

    function subscribeHistoryWindow({dates, prefixes = ["log_v2_"], onValue, onError}) {
      const keys = dates.flatMap(date => prefixes.map(prefix => prefix + date));
      return subscribeMany(keys, onValue, onError);
    }

    return {
      loadHistoricalDate,
      loadWeekRows,
      loadMealAnalysisData,
      loadCalendarMonthData,
      loadRecentMealDays,
      loadEatingPatternDays,
      loadLogDays,
      loadReportDays,
      subscribeHistoryWindow,
      support: Object.freeze({readMany})
    };
  }

  return { createHistoryLoaders };
});
