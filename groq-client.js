/**
 * Groq chat-completions HTTP client.
 *
 * The UMD module exposes a `createGroqClient` factory. The host injects a
 * fetch-compatible request function and a getter that reads the current Groq
 * API key at action time. Prompts enter as strings and successful calls return
 * the first assistant-message content, or an empty string when it is absent.
 * Expected client/API failures use neutral error codes so the React host keeps
 * responsibility for localized messages.
 *
 * KNOWN BEHAVIOR DELIBERATELY PRESERVED: requests have no timeout, retry,
 * cancellation, or concurrency ordering. Response JSON is parsed before the
 * HTTP status is checked, so invalid JSON propagates its original parsing error
 * even for a non-success HTTP response.
 *
 * @module GroqClient
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GroqClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CHAT_COMPLETIONS_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

  /**
   * Neutral error for expected Groq client and HTTP failure categories.
   *
   * @param {"missing-api-key"|"api-error"} code Stable error category translated by the host.
   * @param {string|undefined} [providerMessage] Optional message returned by the Groq API.
   * @returns {GroqClientError} Error carrying the neutral code and provider message.
   */
  class GroqClientError extends Error {
    constructor(code, providerMessage) {
      super(code);
      this.name = "GroqClientError";
      this.code = code;
      this.providerMessage = providerMessage;
    }
  }

  /**
   * Creates the Groq client with environmental dependencies supplied by the host.
   *
   * @param {Object} dependencies Injected HTTP and credential dependencies.
   * @param {function(string,Object): Promise<Object>} dependencies.fetchRequest Fetch-compatible request function.
   * @param {function(): string|null|undefined} dependencies.getApiKey Reads the current `groq_key` value for every call.
   * @returns {{callAI: function(string,number=): Promise<string>}} Configured Groq completion API.
   */
  function createGroqClient({ fetchRequest, getApiKey }) {
    if (typeof fetchRequest !== "function" || typeof getApiKey !== "function") {
      throw new TypeError("GroqClient requires fetchRequest and getApiKey functions");
    }

    /**
     * Requests one deterministic chat completion from the production Groq model.
     *
     * @param {string} prompt User-message content sent to the model.
     * @param {number} [maxTokens] Maximum output tokens; falsy values preserve the existing 800-token fallback.
     * @returns {Promise<string>} First assistant-message content, or an empty string when absent.
     */
    async function callAI(prompt, maxTokens) {
      const key = getApiKey() || "";
      if (!key) throw new GroqClientError("missing-api-key");

      const response = await fetchRequest(CHAT_COMPLETIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens || 800,
          temperature: 0
        })
      });
      const data = await response.json();
      if (!response.ok) throw new GroqClientError("api-error", data.error?.message);
      return data.choices?.[0]?.message?.content || "";
    }

    return { callAI };
  }

  return { createGroqClient, GroqClientError };
});
