/**
 * Firebase App Check adapter shared by Capacitor and the web runtime.
 *
 * Both platforms ultimately expose the token through the modular Firebase SDK.
 * Android initializes Play Integrity natively and bridges its token through a
 * CustomProvider; web uses reCAPTCHA Enterprise.
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

  function normalizeNativeAppCheckToken(result, now = Date.now()) {
    if (!result || typeof result.token !== "string" || !result.token.trim() ||
        !Number.isFinite(result.expireTimeMillis) || result.expireTimeMillis <= now) {
      throw new AppCheckClientError("app-check-token-invalid");
    }
    return {token: result.token, expireTimeMillis: result.expireTimeMillis};
  }

  function isDummyAppCheckToken(token) {
    const text = String(token || "").trim();
    if (!text || text.includes(".")) return false;
    try {
      const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - normalized.length % 4) % 4);
      const decoded = typeof atob === "function"
        ? atob(normalized + padding)
        : typeof Buffer !== "undefined"
          ? Buffer.from(normalized + padding, "base64").toString("utf8")
          : "";
      const payload = JSON.parse(decoded);
      return !!payload && typeof payload === "object" && typeof payload.error === "string";
    } catch (_) {
      return false;
    }
  }

  function createAppCheckClient({
    getPlugin,
    isNativePlatform,
    initializeWeb,
    initializeNativeBridge,
    getWebToken,
    getSdkToken,
  } = {}) {
    const usesSharedSdk = typeof getSdkToken === "function";
    if (typeof isNativePlatform !== "function" ||
        (!usesSharedSdk && typeof getPlugin !== "function")) {
      throw new TypeError("AppCheckClient requires platform and Firebase SDK adapters");
    }
    let initialization = null;

    function initialize() {
      if (initialization) return initialization;
      initialization = Promise.resolve().then(async () => {
        if (isNativePlatform()) {
          if (usesSharedSdk) {
            if (typeof initializeNativeBridge !== "function") {
              throw new AppCheckClientError("app-check-plugin-unavailable");
            }
            await initializeNativeBridge();
          } else {
            const plugin = getPlugin();
            if (!plugin || typeof plugin.initialize !== "function") {
              throw new AppCheckClientError("app-check-plugin-unavailable");
            }
            await plugin.initialize({isTokenAutoRefreshEnabled: true});
          }
        } else {
          if (typeof initializeWeb !== "function" ||
              (!usesSharedSdk && typeof getWebToken !== "function")) {
            throw new AppCheckClientError("app-check-web-not-configured");
          }
          await initializeWeb();
        }
      }).catch(error => {
        initialization = null;
        if (error instanceof AppCheckClientError) throw error;
        throw new AppCheckClientError("app-check-initialization-failed", {cause: error});
      });
      return initialization;
    }

    async function getToken() {
      await initialize();
      try {
        const result = usesSharedSdk
          ? await getSdkToken()
          : isNativePlatform()
            ? await (() => {
              const plugin = getPlugin();
              if (!plugin || typeof plugin.getToken !== "function") {
                throw new AppCheckClientError("app-check-plugin-unavailable");
              }
              return plugin.getToken({forceRefresh: false});
            })()
            : {token: await getWebToken()};
        if (!result || result.error || result.internalError ||
            typeof result.token !== "string" || !result.token.trim() ||
            (usesSharedSdk && (isDummyAppCheckToken(result.token) ||
              result.token.split(".").length !== 3))) {
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

  return {
    AppCheckClientError,
    createAppCheckClient,
    isDummyAppCheckToken,
    normalizeNativeAppCheckToken
  };
});
