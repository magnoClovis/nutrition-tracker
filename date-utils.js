/**
 * Numeric rounding, quantity, unit-label, and civil-date helpers.
 *
 * The UMD module exposes a `createDateUtils` factory. The host application
 * injects `normalizeLanguage`, `pickLang`, and `localeForLang` from its language
 * helpers. The returned API accepts primitive numbers, units, language codes,
 * and `YYYY-MM-DD` strings and returns numbers, labels, arrays, or date strings.
 *
 * @module DateUtils
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DateUtils = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const MILLISECONDS_PER_DAY = 86400000;

  function parseCivilDate(date) {
    const match = CIVIL_DATE_PATTERN.exec(String(date || ""));
    if (!match) throw new TypeError("Expected a civil date in YYYY-MM-DD format");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    if (
      normalized.getUTCFullYear() !== year ||
      normalized.getUTCMonth() !== month - 1 ||
      normalized.getUTCDate() !== day
    ) {
      throw new RangeError("Invalid civil date");
    }
    return { year, month, day };
  }

  function formatCivilFields(year, month, day) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function localToday(date = new Date()) {
    return formatCivilFields(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  function civilEpochMilliseconds(date) {
    const { year, month, day } = parseCivilDate(date);
    return Date.UTC(year, month - 1, day);
  }

  function addCivilDays(date, amount) {
    const days = Number(amount);
    if (!Number.isInteger(days)) throw new TypeError("Civil day offset must be an integer");
    const shifted = new Date(civilEpochMilliseconds(date) + days * MILLISECONDS_PER_DAY);
    return formatCivilFields(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }

  function differenceInCivilDays(start, end) {
    return (civilEpochMilliseconds(end) - civilEpochMilliseconds(start)) / MILLISECONDS_PER_DAY;
  }

  function lastCivilDayOfMonth(date) {
    const { year, month } = parseCivilDate(date);
    const last = new Date(Date.UTC(year, month, 0));
    return formatCivilFields(last.getUTCFullYear(), last.getUTCMonth() + 1, last.getUTCDate());
  }

  /**
   * Creates the date-and-unit API with language helpers supplied by the host.
   *
   * @param {Object} dependencies Injected language dependencies.
   * @param {function(string): string} dependencies.normalizeLanguage Normalizes an app language code.
   * @param {function(string, string, string, string): string} dependencies.pickLang Selects PT, EN, or ES copy.
   * @param {function(string): string} dependencies.localeForLang Returns the Intl locale for an app language.
   * @returns {Object} Numeric, quantity, unit-label, and calendar-date helpers.
   */
  function createDateUtils({ normalizeLanguage, pickLang, localeForLang }) {
    if (
      typeof normalizeLanguage !== "function" ||
      typeof pickLang !== "function" ||
      typeof localeForLang !== "function"
    ) {
      throw new TypeError("DateUtils requires normalizeLanguage, pickLang, and localeForLang functions");
    }

    /**
     * Rounds a numeric value to one decimal place using the existing coercion rules.
     *
     * @param {*} value Value to coerce and round.
     * @returns {number} Rounded numeric value.
     */
    function rnd(value) {
      const n = Number(value) || 0;
      return Math.round(n * 10) / 10;
    }

    /**
     * Returns the preset quick quantities for a food unit.
     *
     * @param {string} unit Food unit.
     * @returns {Array<number>} Preset quantities for the unit family.
     */
    function quickQtys(unit) {
      if (unit === "ml") return [100, 150, 200, 250, 300, 500];
      if (unit === "un") return [1, 2, 3, 4];
      return [50, 100, 150, 200, 250, 300];
    }

    /**
     * Returns the nutrient-scaling divisor for a food unit.
     *
     * @param {string} unit Food unit.
     * @returns {number} One for individual units, otherwise one hundred.
     */
    function divisor(unit) {
      return unit === "un" ? 1 : 100;
    }

    /**
     * Builds the localized nutrient-basis label for a food unit.
     *
     * @param {string} unit Food unit.
     * @param {string} lang Active app language.
     * @returns {string} Localized per-unit or per-100-unit label.
     */
    function portionLabel(unit, lang) {
      const currentLang = normalizeLanguage(lang);
      return unit === "un"
        ? pickLang(currentLang, "por 1 unidade", "per unit", "por unidad")
        : pickLang(currentLang, "por 100" + unit, "per 100" + unit, "por 100" + unit);
    }

    /**
     * Formats a stored date as day-month-year without timezone conversion.
     *
     * @param {string} date Stored `YYYY-MM-DD` date.
     * @returns {string} `DD-MM-YYYY`, the original malformed value, or an em dash when absent.
     */
    function formatDateDMY(date) {
      if (!date || typeof date !== "string") return "—";
      const [year, month, day] = date.split("-");
      return year && month && day ? `${day}-${month}-${year}` : date;
    }

    /**
     * Formats a stored date as day-month without timezone conversion.
     *
     * @param {string} date Stored `YYYY-MM-DD` date.
     * @returns {string} `DD-MM`, the original malformed value, or an em dash when absent.
     */
    function formatDateDM(date) {
      if (!date || typeof date !== "string") return "—";
      const [year, month, day] = date.split("-");
      return year && month && day ? `${day}-${month}` : date;
    }

    /**
     * Uppercases the first character of a string while preserving the remainder.
     *
     * @param {string} text Text to capitalize.
     * @returns {string} Capitalized text, or the original empty value.
     */
    function capitalizeFirst(text) {
      return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    /**
     * Formats a stored date as the localized long diary-header date.
     *
     * @param {string} date Stored `YYYY-MM-DD` date.
     * @param {string} lang Active app language.
     * @returns {string} Capitalized localized date, or an em dash when absent.
     */
    function formatHeaderDate(date, lang) {
      if (!date || typeof date !== "string") return "—";
      const locale = localeForLang(lang);
      const { year, month, day } = parseCivilDate(date);
      const d = new Date(Date.UTC(year, month - 1, day));
      const formatted = d.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC"
      });
      return capitalizeFirst(formatted);
    }

    /**
     * Adds calendar days to a stored date using the module's existing date conversion.
     *
     * @param {string} date Stored `YYYY-MM-DD` date.
     * @param {number} n Number of calendar days to add or subtract.
     * @returns {string} Resulting date in `YYYY-MM-DD` format.
     */
    function addDays(date, n) {
      return addCivilDays(date, n);
    }

    return {
      rnd,
      quickQtys,
      divisor,
      portionLabel,
      formatDateDMY,
      formatDateDM,
      formatHeaderDate,
      capitalizeFirst,
      localToday,
      addCivilDays,
      differenceInCivilDays,
      lastCivilDayOfMonth,
      addDays
    };
  }

  return {
    createDateUtils,
    localToday,
    addCivilDays,
    differenceInCivilDays,
    lastCivilDayOfMonth
  };
});
