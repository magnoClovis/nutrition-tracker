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

  /**
   * Neutral error for expected managed-AI HTTP and response failures.
   */
  class AIClientError extends Error {
    constructor(code, retryAfterSeconds) {
      super(code);
      this.name = "AIClientError";
      this.code = code;
      this.retryAfterSeconds = retryAfterSeconds;
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

    async function callAI(prompt, maxTokens) {
      const token = await getIdToken();
      if (typeof token !== "string" || token.length === 0) {
        throw new AIClientError("authentication-error");
      }

      const response = await fetchRequest(COMPLETION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          prompt,
          maxTokens: maxTokens || 800
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new AIClientError("invalid-response");
      }

      if (!response.ok) {
        const retryAfter = Number(response.headers?.get?.("Retry-After"));
        throw new AIClientError(
          responseErrorCode(response.status),
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined
        );
      }
      if (!data || typeof data.text !== "string") {
        throw new AIClientError("invalid-response");
      }
      return data.text;
    }

    return { callAI };
  }

  return { createAIClient, AIClientError };
});
