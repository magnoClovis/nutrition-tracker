(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DateUtils = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createDateUtils({ normalizeLanguage, pickLang, localeForLang }) {
    if (
      typeof normalizeLanguage !== "function" ||
      typeof pickLang !== "function" ||
      typeof localeForLang !== "function"
    ) {
      throw new TypeError("DateUtils requires normalizeLanguage, pickLang, and localeForLang functions");
    }

    function rnd(value) {
      const n = Number(value) || 0;
      return Math.round(n * 10) / 10;
    }

    function quickQtys(unit) {
      if (unit === "ml") return [100, 150, 200, 250, 300, 500];
      if (unit === "un") return [1, 2, 3, 4];
      return [50, 100, 150, 200, 250, 300];
    }

    function divisor(unit) {
      return unit === "un" ? 1 : 100;
    }

    function portionLabel(unit, lang) {
      const currentLang = normalizeLanguage(lang);
      return unit === "un"
        ? pickLang(currentLang, "por 1 unidade", "per unit", "por unidad")
        : pickLang(currentLang, "por 100" + unit, "per 100" + unit, "por 100" + unit);
    }

    function formatDateDMY(date) {
      if (!date || typeof date !== "string") return "—";
      const [year, month, day] = date.split("-");
      return year && month && day ? `${day}-${month}-${year}` : date;
    }

    function formatDateDM(date) {
      if (!date || typeof date !== "string") return "—";
      const [year, month, day] = date.split("-");
      return year && month && day ? `${day}-${month}` : date;
    }

    function capitalizeFirst(text) {
      return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    function formatHeaderDate(date, lang) {
      if (!date || typeof date !== "string") return "—";
      const locale = localeForLang(lang);
      const d = new Date(date + "T12:00:00");
      const formatted = d.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
      return capitalizeFirst(formatted);
    }

    function addDays(date, n) {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() + n);
      return d.toISOString().split("T")[0];
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
      addDays
    };
  }

  return { createDateUtils };
});
