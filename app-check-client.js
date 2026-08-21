/**
 * Firebase App Check adapter for the Capacitor runtime.
 *
 * Android uses the native Play Integrity provider. The web path intentionally
 * fails closed until the production web app is registered with an approved
 * reCAPTCHA Enterprise provider.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AppCheckClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  class AppCheckClientError extends Error {
    constructor(code, options = {}) {
      super(code, options);
      this.name = "AppCheckClientError";
      this.code = code;
    }
  }

  function createAppCheckClient({getPlugin, isNativePlatform} = {}) {
    if (typeof getPlugin !== "function" || typeof isNativePlatform !== "function") {
      throw new TypeError("AppCheckClient requires plugin and platform adapters");
    }
    let initialization = null;

    function initialize() {
      if (!isNativePlatform()) {
        return Promise.reject(new AppCheckClientError("app-check-web-not-configured"));
      }
      if (initialization) return initialization;
      initialization = Promise.resolve().then(async () => {
        const plugin = getPlugin();
        if (!plugin || typeof plugin.initialize !== "function") {
          throw new AppCheckClientError("app-check-plugin-unavailable");
        }
        await plugin.initialize({isTokenAutoRefreshEnabled: true});
      }).catch(error => {
        initialization = null;
        if (error instanceof AppCheckClientError) throw error;
        throw new AppCheckClientError("app-check-initialization-failed", {cause: error});
      });
      return initialization;
    }

    async function getToken() {
      await initialize();
      const plugin = getPlugin();
      if (!plugin || typeof plugin.getToken !== "function") {
        throw new AppCheckClientError("app-check-plugin-unavailable");
      }
      try {
        const result = await plugin.getToken({forceRefresh: false});
        if (!result || typeof result.token !== "string" || !result.token.trim()) {
          throw new AppCheckClientError("app-check-token-invalid");
        }
        return result.token;
      } catch (error) {
        if (error instanceof AppCheckClientError) throw error;
        throw new AppCheckClientError("app-check-token-unavailable", {cause: error});
      }
    }

    return Object.freeze({initialize, getToken});
  }

  return {AppCheckClientError, createAppCheckClient};
});
