/**
 * Internal Firebase endpoint and advanced-report configuration resolver.
 *
 * This is the first internal module extracted from `firebase-storage.js`.
 * It has no application-module dependencies and reads only the browser's
 * `window.NUTRITION_TRACKER_CONFIG` plus the standard URL/console environment.
 * `firebase-storage.js` remains the sole public facade: callers must continue
 * using its existing lexical constants, `fb*` functions, and `window.storage`.
 *
 * @module FirebaseConfigInternal
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseConfigInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const PRODUCTION_PROJECT = "nutrition-tracker-780b3";
  const PRODUCTION_WEB_KEY = "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE";

  /**
   * Resolves the fixed Firebase endpoints and optional HTTPS report server.
   *
   * @returns {{FB_PROJECT: string, FB_KEY: string, FB_BASE: string, AUTH_BASE: string, TOKEN_BASE: string, REPORT_SERVER_URL: string, REPORTS_ENABLED: boolean}} Existing Firebase and report configuration values.
   */
  function createFirebaseConfig() {
    const runtimeConfig = root.NUTRITION_TRACKER_CONFIG;
    const builtTarget = typeof __TROFIA_DEPLOY_TARGET__ === "undefined"
      ? null : __TROFIA_DEPLOY_TARGET__;
    const target = builtTarget ?? runtimeConfig?.target ?? "production";
    if (target !== "production" && target !== "staging") {
      throw new Error("firebase-deployment-target-invalid");
    }
    if (builtTarget && runtimeConfig?.target && runtimeConfig.target !== builtTarget) {
      throw new Error("firebase-deployment-target-mismatch");
    }

    let FB_PROJECT;
    let FB_KEY;
    if (target === "staging") {
      const firebase = builtTarget === "staging"
        ? __TROFIA_FIREBASE_CONFIG__ : runtimeConfig?.firebase;
      if (firebase?.projectId !== "trofia-staging" ||
          typeof firebase.webApiKey !== "string" ||
          !firebase.webApiKey.trim() ||
          firebase.webApiKey === PRODUCTION_WEB_KEY) {
        throw new Error("firebase-staging-config-incomplete");
      }
      FB_PROJECT = firebase.projectId;
      FB_KEY = firebase.webApiKey.trim();
    } else {
      FB_PROJECT = PRODUCTION_PROJECT;
      FB_KEY = PRODUCTION_WEB_KEY;
    }
    const FB_BASE = "https://firestore.googleapis.com/v1/projects/" + FB_PROJECT + "/databases/(default)/documents/nutrition";
    const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts";
    const TOKEN_BASE = "https://securetoken.googleapis.com/v1/token";
    const REPORT_SERVER_URL = (() => {
      const configuredUrl = root.NUTRITION_TRACKER_CONFIG?.reportServerUrl;
      if (typeof configuredUrl !== "string" || !configuredUrl.trim()) return "";

      try {
        const parsedUrl = new root.URL(configuredUrl.trim());
        if (parsedUrl.protocol !== "https:") {
          root.console.warn("Advanced reports require an HTTPS server URL and remain disabled.");
          return "";
        }
        return parsedUrl.href.replace(/\/$/, "");
      } catch {
        root.console.warn("Advanced reports received an invalid server URL and remain disabled.");
        return "";
      }
    })();
    const REPORTS_ENABLED = Boolean(REPORT_SERVER_URL);

    return {
      FB_PROJECT,
      FB_KEY,
      FB_BASE,
      AUTH_BASE,
      TOKEN_BASE,
      REPORT_SERVER_URL,
      REPORTS_ENABLED
    };
  }

  return { createFirebaseConfig };
});
