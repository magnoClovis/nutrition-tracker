/**
 * Managed Trofia AI completion client.
 *
 * The UMD module exposes a `createAIClient` factory. The host injects the
 * Firebase ID-token getter and fetch implementation; callers continue using
 * the stable `callAI(prompt, maxTokens)` contract.
 *
 * @module AIClient
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AIClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const COMPLETION_ENDPOINT =
    "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/completion";
  const FOOD_ESTIMATE_ENDPOINT =
    "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/food-estimate";
  const DISH_ESTIMATE_ENDPOINT =
    "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/dish-estimate";

  /**
   * Neutral error for expected managed-AI HTTP and response failures.
   */
  class AIClientError extends Error {
    constructor(code, retryAfterSeconds, scope) {
      super(code);
      this.name = "AIClientError";
      this.code = code;
      this.retryAfterSeconds = retryAfterSeconds;
      this.scope = scope;
    }
  }

  function responseErrorCode(status) {
    if (status === 401) return "authentication-error";
    if (status === 429) return "rate-limited";
    if (status >= 500) return "service-unavailable";
    return "api-error";
  }

  /**
   * Creates the managed AI client with environmental dependencies supplied by
   * the host.
   *
   * @param {Object} dependencies Injected HTTP and authentication dependencies.
   * @param {function(string,Object): Promise<Response>} dependencies.fetchRequest Fetch-compatible request function.
   * @param {function(): Promise<string|null|undefined>} dependencies.getIdToken Returns a current Firebase ID token.
   * @returns {{callAI: function(string,number=): Promise<string>}} Configured completion API.
   */
  function createAIClient({ fetchRequest, getIdToken }) {
    if (typeof fetchRequest !== "function" || typeof getIdToken !== "function") {
      throw new TypeError("AIClient requires fetchRequest and getIdToken functions");
    }

    async function postAuthenticated(endpoint, body) {
      const token = await getIdToken();
      if (typeof token !== "string" || token.length === 0) {
        throw new AIClientError("authentication-error");
      }

      let response;
      try {
        response = await fetchRequest(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(body)
        });
      } catch (_) {
        throw new AIClientError("service-unavailable");
      }

      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new AIClientError("invalid-response");
      }

      if (!response.ok) {
        const retryAfter = Number(response.headers?.get?.("Retry-After"));
        const scope = ["user", "global", "daily"].includes(data?.error?.scope)
          ? data.error.scope
          : undefined;
        throw new AIClientError(
          responseErrorCode(response.status),
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          response.status === 429 ? scope : undefined
        );
      }
      return data;
    }

    async function callAI(prompt, maxTokens) {
      const data = await postAuthenticated(COMPLETION_ENDPOINT, {
        prompt,
        maxTokens: maxTokens || 800
      });
      if (!data || typeof data.text !== "string") throw new AIClientError("invalid-response");
      return data.text;
    }

    async function requestFoodEstimate({ foodName, unit, language }) {
      const data = await postAuthenticated(FOOD_ESTIMATE_ENDPOINT, { foodName, unit, language });
      if (!data || !data.estimate || typeof data.estimate !== "object" || Array.isArray(data.estimate)) {
        throw new AIClientError("invalid-response");
      }
      return data.estimate;
    }

    async function requestDishEstimate({ description, language }) {
      const data = await postAuthenticated(DISH_ESTIMATE_ENDPOINT, { description, language });
      if (!data || !data.estimate || typeof data.estimate !== "object" || Array.isArray(data.estimate)) {
        throw new AIClientError("invalid-response");
      }
      return data.estimate;
    }

    return { callAI, requestFoodEstimate, requestDishEstimate };
  }

  return {
    COMPLETION_ENDPOINT,
    FOOD_ESTIMATE_ENDPOINT,
    DISH_ESTIMATE_ENDPOINT,
    createAIClient,
    AIClientError
  };
});
