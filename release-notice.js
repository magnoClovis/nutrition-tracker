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

  const CURRENT_RELEASE = Object.freeze({
    id: "0.10.0-beta",
    versionName: "0.10.0-beta",
    label: "Trofia v0.10.0 Beta",
    tutorialType: null
  });

  function hasSeenRelease(record, releaseId = CURRENT_RELEASE.id) {
    return !!record && record.value === releaseId;
  }

  function resolveReleaseTutorialType(audience, release = CURRENT_RELEASE) {
    if (audience === "new") return "main";
    if (audience === "existing") return release.tutorialType || null;
    return null;
  }

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
          title: "Bem-vindo \u00e0 vers\u00e3o 0.10.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "Seus dados agora funcionam melhor offline, sincronizam com mais seguran\u00e7a e podem ser exclu\u00eddos integralmente por um fluxo confi\u00e1vel.",
          btn: "Continuar"
        },
        en: {
          title: "Welcome to version 0.10.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "Your data now works better offline, syncs more safely, and can be fully deleted through a reliable account-deletion process.",
          btn: "Continue"
        },
        es: {
          title: "\u00a1Bienvenido a la versi\u00f3n 0.10.0 Beta! \ud83c\udf89\ud83e\udd73",
          body: "Tus datos ahora funcionan mejor sin conexi\u00f3n, se sincronizan con mayor seguridad y pueden eliminarse por completo mediante un proceso fiable.",
          btn: "Continuar"
        }
      };
      const text = textByLang[normalizedLang] || textByLang.pt;
      return React.createElement("div", {
        "data-release-notice": "true",
        "data-safe-area-dialog": "18",
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

  return {
    CURRENT_RELEASE,
    createReleaseNotice,
    hasSeenRelease,
    resolveReleaseTutorialType
  };
});
