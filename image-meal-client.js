/**
 * Authenticated client for the Trofia image-meal Worker endpoint.
 *
 * @module ImageMealClient
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageMealClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const IMAGE_MEAL_ENDPOINT =
    "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/image-meal";
  const LANGUAGES = new Set(["pt", "en", "es"]);
  const RATE_LIMIT_SCOPES = new Set(["image-user", "user", "global", "daily"]);

  class ImageMealClientError extends Error {
    constructor(code, retryAfterSeconds, scope, cause) {
      super(code);
      this.name = "ImageMealClientError";
      this.code = code;
      this.retryAfterSeconds = retryAfterSeconds;
      this.scope = scope;
      if (cause !== undefined) this.cause = cause;
    }
  }

  function errorCodeForStatus(status) {
    if (status === 400 || status === 413 || status === 415) return "invalid-photo";
    if (status === 401) return "session-expired";
    if (status === 429) return "quota-reached";
    if (status >= 500) return "service-unavailable";
    return "service-unavailable";
  }

  function createImageMealClient({ fetchRequest, getIdToken }) {
    if (typeof fetchRequest !== "function" || typeof getIdToken !== "function") {
      throw new TypeError("ImageMealClient requires fetchRequest and getIdToken functions");
    }

    async function analyzeImageMeal({ image, language, signal }) {
      if (!image || image.mimeType !== "image/jpeg" || typeof image.data !== "string" ||
          image.data.length === 0 || !LANGUAGES.has(language)) {
        throw new ImageMealClientError("invalid-photo");
      }
      const token = await getIdToken();
      if (typeof token !== "string" || token.length === 0) {
        throw new ImageMealClientError("session-expired");
      }

      let response;
      try {
        response = await fetchRequest(IMAGE_MEAL_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({ image, language }),
          signal
        });
      } catch (error) {
        if (error && error.name === "AbortError") throw error;
        throw new ImageMealClientError("service-unavailable", undefined, undefined, error);
      }

      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new ImageMealClientError("invalid-response");
      }

      if (!response.ok) {
        const retryAfter = Number(response.headers?.get?.("Retry-After"));
        const scope = RATE_LIMIT_SCOPES.has(data?.error?.scope)
          ? data.error.scope
          : undefined;
        throw new ImageMealClientError(
          errorCodeForStatus(response.status),
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          response.status === 429 ? scope : undefined
        );
      }
      if (!data || !data.estimate || typeof data.estimate !== "object" ||
          Array.isArray(data.estimate)) {
        throw new ImageMealClientError("invalid-response");
      }
      return data.estimate;
    }

    return { analyzeImageMeal };
  }

  return { IMAGE_MEAL_ENDPOINT, ImageMealClientError, createImageMealClient };
});
