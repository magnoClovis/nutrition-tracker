/**
 * Non-blocking visual-update notice shown once to existing accounts.
 *
 * The UMD module exposes a `createVisualUpdateNotice` factory. The host injects
 * React plus `normalizeLanguage` and `pickLang` from `i18n.js`. The component
 * only renders `lang` and `onDismiss`; the one-time storage gate remains in
 * `App` and is intentionally outside this presentational module.
 *
 * @module VisualUpdateNotice
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.VisualUpdateNoticeModule = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the visual-update notice with explicit presentation dependencies.
   *
   * @param {Object} dependencies Injected dependencies.
   * @param {Object} dependencies.React React runtime supplied by the host.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @param {function(string,string,string,string): string} dependencies.pickLang Language picker from `i18n.js`.
   * @returns {{VisualUpdateNotice: function(Object): Object}} Component API.
   */
  function createVisualUpdateNotice({ React, normalizeLanguage, pickLang }) {
    if (!React || typeof React.createElement !== "function"
      || typeof normalizeLanguage !== "function" || typeof pickLang !== "function") {
      throw new TypeError("VisualUpdateNotice requires React, normalizeLanguage, and pickLang");
    }

    /**
     * Renders the localized, dismissible visual-update toast.
     *
     * @param {Object} props Notice props.
     * @param {string} props.lang Active application language.
     * @param {function(): void} props.onDismiss Dismiss callback owned by `App`.
     * @returns {Object} React element for the status notice.
     */
    function VisualUpdateNotice({ lang, onDismiss }) {
      const normalizedLang = normalizeLanguage(lang);
      const message = pickLang(
        normalizedLang,
        "A interface do app mudou! Explore o novo visual.",
        "The app interface has changed! Explore the new look.",
        "\u00a1La interfaz de la app ha cambiado! Explora el nuevo dise\u00f1o."
      );
      const dismissLabel = pickLang(normalizedLang, "Dispensar aviso", "Dismiss notice", "Cerrar aviso");
      return React.createElement("div", {
        role: "status",
        style: {
          position: "fixed",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99998,
          width: "min(520px, calc(100% - 28px))",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "var(--surface,#fffdf8)",
          border: "1px solid var(--border2,#d0ccc4)",
          borderRadius: 12,
          boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
          color: "var(--text2,#252220)"
        }
      }, React.createElement("span", {
        style: { flex: 1, fontSize: 14, lineHeight: 1.4 }
      }, message), React.createElement("button", {
        type: "button",
        onClick: onDismiss,
        "aria-label": dismissLabel,
        title: dismissLabel,
        style: {
          border: "none",
          background: "transparent",
          color: "var(--muted,#6a6662)",
          fontSize: 20,
          lineHeight: 1,
          padding: 4,
          cursor: "pointer"
        }
      }, "\u00d7"));
    }

    return { VisualUpdateNotice };
  }

  return { createVisualUpdateNotice };
});
