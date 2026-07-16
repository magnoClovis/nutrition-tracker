(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DiaryTicker = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createDiaryTicker({ localeForLang, pickLang }) {
    if (typeof localeForLang !== "function" || typeof pickLang !== "function") {
      throw new TypeError("DiaryTicker requires localeForLang and pickLang functions");
    }

    function getGreetingPeriod(hour = new Date().getHours()) {
      if (hour >= 6 && hour < 12) return "morning";
      if (hour >= 12 && hour < 19) return "afternoon";
      return "night";
    }

    function getGreetingEmoji(period) {
      if (period === "morning") return "☀️";
      if (period === "afternoon") return "🌤️";
      return "🌙";
    }

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
     * Group "gain" rewards reaching or exceeding the goal; group "limit" warns
     * only after the configured ceiling is exceeded.
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
