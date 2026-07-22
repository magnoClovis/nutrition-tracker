/**
 * Pure calendar-grid, navigation, diary-marker, and monthly-summary helpers.
 *
 * The UMD module exposes a `createCalendarModel` factory and has no injected
 * dependencies. Inputs are stored month/date strings, diary logs, nutritional
 * targets, or marker maps; outputs are new arrays, strings, or summary objects.
 *
 * Known behavior intentionally preserved: month calculations use local `Date`
 * instances fixed at noon, malformed inputs are not validated, and this module
 * does not own historical-goal selection. In particular, the host application's
 * known historical-goal leak into `goalHistory[TODAY]` remains outside this
 * module and is not corrected by this extraction.
 *
 * @module CalendarModel
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CalendarModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the pure calendar-model API.
   *
   * @returns {Object} Calendar-grid, navigation, marker, and summary helpers.
   */
  function createCalendarModel() {
    /**
     * Builds Sunday-first calendar cells for a stored month.
     *
     * @param {string} monthKey Month in `YYYY-MM` format.
     * @returns {Array<string|null>} Padded calendar cells in complete weeks.
     */
    function monthDays(monthKey) {
      const [year, month] = monthKey.split("-").map(Number);
      const first = new Date(year, month - 1, 1, 12);
      const startOffset = first.getDay();
      const lastDay = new Date(year, month, 0, 12).getDate();
      const cells = Array.from({length: startOffset}, () => null);
      for (let day = 1; day <= lastDay; day++) {
        cells.push(`${monthKey}-${String(day).padStart(2, "0")}`);
      }
      while (cells.length % 7 !== 0) cells.push(null);
      return cells;
    }

    /**
     * Shifts a stored month by a signed number of months.
     *
     * @param {string} monthKey Month in `YYYY-MM` format.
     * @param {number} delta Signed month offset.
     * @returns {string} Shifted month in `YYYY-MM` format.
     */
    function shiftMonth(monthKey, delta) {
      const [year, month] = monthKey.split("-").map(Number);
      const d = new Date(year, month - 1 + delta, 1, 12);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    /**
     * Summarizes one diary log for calendar marker rendering.
     *
     * @param {Object<string, Array<Object>>} logForDay Diary entries grouped by meal.
     * @param {{protein: number, kcal: number}} targetGoals Nutritional targets selected by the host.
     * @returns {{hasData: boolean, proteinMet: boolean, kcalGood: boolean, kcalOver: boolean, protein: number, kcal: number}} Calendar marker data.
     */
    function calendarMarkerFor(logForDay, targetGoals) {
      const entries = Object.values(logForDay || {}).flat();
      const protein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
      const kcal = entries.reduce((s, e) => s + (e.kcal ?? 0), 0);
      return {
        hasData: entries.length > 0,
        proteinMet: entries.length > 0 && protein >= targetGoals.protein,
        kcalGood: entries.length > 0 && kcal >= targetGoals.kcal * 0.85 && kcal <= targetGoals.kcal * 1.15,
        kcalOver: entries.length > 0 && kcal > targetGoals.kcal * 1.15,
        protein: Math.round(protein),
        kcal: Math.round(kcal)
      };
    }

    /**
     * Aggregates the markers of one calendar month.
     *
     * @param {Object<string, Object>|Array<Object>} markersByDate Marker map or array for one month.
     * @returns {{registered: number, proteinDays: number, kcalOverDays: number, avgKcalMonth: number, avgProteinMonth: number}} Monthly calendar statistics.
     */
    function calendarMonthStats(markersByDate) {
      const markers = Object.values(markersByDate || {}).filter(m => m && m.hasData);
      const registered = markers.length;
      const proteinDays = markers.filter(m => m.proteinMet).length;
      const kcalOverDays = markers.filter(m => m.kcalOver).length;
      const avgKcalMonth = registered ? Math.round(markers.reduce((s, m) => s + (m.kcal || 0), 0) / registered) : 0;
      const avgProteinMonth = registered ? Math.round(markers.reduce((s, m) => s + (m.protein || 0), 0) / registered) : 0;
      return {registered, proteinDays, kcalOverDays, avgKcalMonth, avgProteinMonth};
    }

    return { monthDays, shiftMonth, calendarMarkerFor, calendarMonthStats };
  }

  return { createCalendarModel };
});
