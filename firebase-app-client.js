/**
 * Lazy shared Firebase app factory.
 *
 * The SDK functions are injected so the singleton and configuration contract
 * can be verified without contacting Firebase or depending on browser globals.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseAppClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createFirebaseAppClient({
    getApps,
    initializeApp,
    getConfig,
    getAppId,
    appName = "trofia-shared",
  } = {}) {
    if (typeof getApps !== "function" || typeof initializeApp !== "function" ||
        typeof getConfig !== "function" || typeof getAppId !== "function") {
      throw new TypeError("FirebaseAppClient requires Firebase SDK and configuration adapters");
    }

    let sharedApp = null;

    function getApp() {
      if (sharedApp) return sharedApp;
      const appId = String(getAppId() || "").trim();
      if (!appId) {
        const error = new Error("firebase-web-app-not-configured");
        error.code = "firebase-web-app-not-configured";
        throw error;
      }
      const { FB_KEY: apiKey, FB_PROJECT: projectId } = getConfig();
      const existing = getApps().find(app => app?.name === appName);
      sharedApp = existing || initializeApp({
        apiKey,
        appId,
        authDomain: `${projectId}.firebaseapp.com`,
        projectId,
      }, appName);
      return sharedApp;
    }

    return Object.freeze({ getApp });
  }

  return { createFirebaseAppClient };
});
