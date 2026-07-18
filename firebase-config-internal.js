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

  /**
   * Resolves the fixed Firebase endpoints and optional HTTPS report server.
   *
   * @returns {{FB_PROJECT: string, FB_KEY: string, FB_BASE: string, AUTH_BASE: string, TOKEN_BASE: string, REPORT_SERVER_URL: string, REPORTS_ENABLED: boolean}} Existing Firebase and report configuration values.
   */
  function createFirebaseConfig() {
    const FB_PROJECT = "nutrition-tracker-780b3";
    const FB_KEY = "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE";
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
