/**
 * Presentational release-notice modal for the app's localized update summary.
 *
 * The UMD module exposes a `createReleaseNotice` factory. The host application
 * injects its already-loaded React instance and `normalizeLanguage` from
 * `i18n.js`. The exported component accepts `lang` and `onStartTutorial` props
 * and returns a React element without accessing storage, Firebase, or the DOM.
 *
 * @module ReleaseNotice
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReleaseNotice = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the release-notice component with React and language normalization supplied by the host.
   *
   * @param {Object} dependencies Injected presentation dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host application.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @returns {Object} API containing the localized release-notice component.
   */
  function createReleaseNotice({ React, normalizeLanguage }) {
    if (!React || typeof React.createElement !== "function" || typeof normalizeLanguage !== "function") {
      throw new TypeError("ReleaseNotice requires React and normalizeLanguage");
    }

    /**
     * Renders the localized release summary and tutorial action.
     *
     * @param {Object} props Release-notice props.
     * @param {string} props.lang Active app language.
     * @param {function(): void} props.onStartTutorial Callback invoked by the tutorial button.
     * @returns {Object} React element for the release-notice modal.
     */
    function ReleaseNoticeModal({ lang, onStartTutorial }) {
      const normalizedLang = normalizeLanguage(lang);
      const textByLang = {
        pt: {
          title: "Bem-vindo \u00e0 vers\u00e3o 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "O Di\u00e1rio Nutricional agora tamb\u00e9m est\u00e1 dispon\u00edvel em espanhol e ganhou novas ferramentas para ajudar nas suas decis\u00f5es: voc\u00ea pode avaliar uma refei\u00e7\u00e3o antes de registr\u00e1-la, acompanhar melhor sua semana e suas m\u00e9tricas corporais e enviar feedback diretamente pelas Configura\u00e7\u00f5es. Preparamos um guia r\u00e1pido com as principais novidades.",
          btn: "Ver novidades"
        },
        en: {
          title: "Welcome to version 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "Nutrition Tracker is now also available in Spanish and includes new tools to support your daily decisions: you can evaluate a meal before logging it, follow your weekly and body metrics more clearly, and send feedback directly from Settings. We prepared a quick tour of the main updates.",
          btn: "See what's new"
        },
        es: {
          title: "\u00a1Bienvenido a la versi\u00f3n 0.8.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "Diario Nutricional ya est\u00e1 disponible en espa\u00f1ol e incluye nuevas herramientas para ayudarte en tus decisiones diarias: puedes evaluar una comida antes de registrarla, seguir con m\u00e1s claridad tu semana y tus m\u00e9tricas corporales y enviar comentarios directamente desde Configuraci\u00f3n. Preparamos una gu\u00eda r\u00e1pida con las principales novedades.",
          btn: "Ver novedades"
        }
      };
      const text = textByLang[normalizedLang] || textByLang.pt;
      return React.createElement("div", {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          background: "rgba(0,0,0,0.48)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
          backdropFilter: "blur(3px)"
        }
      }, React.createElement("div", {
        style: {
          width: "min(560px, 100%)",
          background: "var(--surface,#fffdf8)",
          border: "1px solid var(--border2,#d0ccc4)",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }
      }, React.createElement("div", {
        style: {
          fontSize: 18,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "var(--text2,#252220)",
          marginBottom: 12,
          fontWeight: 700
        }
      }, text.title), React.createElement("div", {
        style: {
          color: "var(--text3,#5f5a54)",
          lineHeight: 1.55,
          fontSize: 14,
          marginBottom: 18
        }
      }, text.body), React.createElement("button", {
        onClick: onStartTutorial,
        style: {
          width: "100%",
          border: "1px solid var(--btn-ok-border,#9ac99f)",
          background: "var(--btn-ok,#e9f6ea)",
          color: "var(--btn-ok-text,#236b2e)",
          borderRadius: 8,
          padding: "12px 14px",
          textTransform: "uppercase",
          letterSpacing: 1.3,
          fontFamily: "inherit",
          cursor: "pointer"
        }
      }, text.btn)));
    }

    return { ReleaseNoticeModal };
  }

  return { createReleaseNotice };
});
