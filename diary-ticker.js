/**
 * Greeting-period and nutritional-ticker presentation helpers.
 *
 * The UMD module exposes a `createDiaryTicker` factory. The host application
 * injects `localeForLang` and `pickLang` from its language helpers. The returned
 * API accepts primitive greeting values or plain nutrient metric objects and
 * returns greeting metadata, localized strings, or ticker-slide objects.
 *
 * @module DiaryTicker
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DiaryTicker = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the diary-ticker API with language helpers supplied by the host.
   *
   * @param {Object} dependencies Injected language dependencies.
   * @param {function(string): string} dependencies.localeForLang Returns the Intl locale for an app language.
   * @param {function(string, string, string, string): string} dependencies.pickLang Selects PT, EN, or ES copy.
   * @returns {Object} Greeting and nutritional-ticker formatting helpers.
   */
  function createDiaryTicker({ localeForLang, pickLang }) {
    if (typeof localeForLang !== "function" || typeof pickLang !== "function") {
      throw new TypeError("DiaryTicker requires localeForLang and pickLang functions");
    }

    /**
     * Maps an hour of the day to the greeting period used by the diary header.
     *
     * @param {number} [hour=new Date().getHours()] Local hour in 24-hour format.
     * @returns {"morning"|"afternoon"|"night"} Greeting-period identifier.
     */
    function getGreetingPeriod(hour = new Date().getHours()) {
      if (hour >= 6 && hour < 12) return "morning";
      if (hour >= 12 && hour < 19) return "afternoon";
      return "night";
    }

    /**
     * Selects the emoji associated with a greeting period.
     *
     * @param {string} period Greeting-period identifier.
     * @returns {string} Emoji displayed in the diary header.
     */
    function getGreetingEmoji(period) {
      if (period === "morning") return "☀️";
      if (period === "afternoon") return "🌤️";
      return "🌙";
    }

    /**
     * Formats a nutrient amount using the locale and precision rules of the ticker.
     *
     * @param {number|string} value Nutrient amount to format.
     * @param {string} unit Nutrient unit, such as `g` or `kcal`.
     * @param {string} lang Active app language.
     * @returns {string} Localized amount followed by its unit.
     */
    function formatTickerAmount(value, unit, lang) {
      const numeric = Number(value) || 0;
      const decimals = unit === "g" && Math.abs(numeric) < 10 && numeric % 1 !== 0 ? 1 : 0;
      const formatted = new Intl.NumberFormat(localeForLang(lang), {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(numeric);
      return formatted + (unit === "kcal" ? " kcal" : unit);
    }

    /**
     * Converts one nutrient total and target into ticker copy and a semantic tone.
     *
     * @param {Object} metric Nutrient metric to present.
     * @param {string} metric.key Nutrient key used to select icon and grammar.
     * @param {string} metric.label Localized nutrient label.
     * @param {number|string} metric.value Consumed nutrient amount.
     * @param {number|string} metric.target Nutrient target or limit.
     * @param {string} metric.unit Nutrient unit.
     * @param {string} metric.group Goal behavior, normally `gain` or `limit`.
     * @param {string} metric.lang Active app language.
     * @returns {Object|null} Ticker slide with icon, text, and tone, or `null` when it should be omitted.
     */
    function buildNutrientTickerSlide({key, label, value, target, unit, group, lang}) {
      const consumed = Number(value) || 0;
      const goal = Number(target) || 0;
      if (!goal || consumed <= 0) return null;
      const difference = Math.abs(consumed - goal);
      const consumedText = formatTickerAmount(consumed, unit, lang);
      const differenceText = formatTickerAmount(difference, unit, lang);
      const lowerLabel = label.toLocaleLowerCase(localeForLang(lang));
      const exact = Math.abs(consumed - goal) < 0.001;
      const icons = {protein: "🥩", kcal: "⚡", carbs: "🌾", fat: "🫒", satfat: "🧈", fiber: "🌿", salt: "🧂", water: "💧"};
      let tone = "neutral";
      let message = "";

      if (consumed < goal) {
        message = pickLang(
          lang,
          "Faltam " + differenceText + " de " + lowerLabel + " para bater a meta.",
          differenceText + " of " + lowerLabel + " left to reach the goal.",
          "Faltan " + differenceText + " de " + lowerLabel + " para alcanzar la meta."
        );
      } else if (group === "gain") {
        tone = "success";
        message = exact
          ? pickLang(lang, "Meta de " + lowerLabel + " batida! " + consumedText + " consumidos.", "Goal reached for " + lowerLabel + "! " + consumedText + " consumed.", "¡Meta de " + lowerLabel + " alcanzada! " + consumedText + " consumidos.")
          : pickLang(lang, "Meta de " + lowerLabel + " superada! " + consumedText + " consumidos — " + differenceText + " além do objetivo.", "Goal exceeded for " + lowerLabel + "! " + consumedText + " consumed — " + differenceText + " above target.", "¡Meta de " + lowerLabel + " superada! " + consumedText + " consumidos — " + differenceText + " por encima del objetivo.");
      } else if (exact) {
        tone = "success";
        message = pickLang(lang, label + " na meta certinha hoje.", label + " exactly on target today.", label + " justo en la meta de hoy.");
      } else {
        tone = "alert";
        const verb = key === "satfat" || key === "salt" ? " passou" : " passaram";
        message = pickLang(lang, label + verb + " da meta em " + differenceText + ".", label + " exceeded the target by " + differenceText + ".", label + " superó la meta por " + differenceText + ".");
      }

      return {key, icon: icons[key] || "•", text: message, tone};
    }

    return {
      getGreetingPeriod,
      getGreetingEmoji,
      formatTickerAmount,
      buildNutrientTickerSlide
    };
  }

  return { createDiaryTicker };
});
