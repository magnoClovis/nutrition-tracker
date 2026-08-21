/**
 * Fail-closed client for the administrative account-deletion callable.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AccountDeletionClient = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const REQUEST_ID_KEY = "trofia_account_deletion_request_id";
  const PRESERVED_LOCAL_KEYS = Object.freeze([
    "appLang",
    "appDarkMode",
    "appThemeDefaultDarkV1"
  ]);

  class AccountDeletionClientError extends Error {
    constructor(code, options = {}) {
      super(code, options);
      this.name = "AccountDeletionClientError";
      this.code = code;
    }
  }

  function validRequestId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value);
  }

  function createRequestId(randomUUID) {
    const value = randomUUID().replace(/[^A-Za-z0-9_-]/g, "_");
    if (!validRequestId(value)) {
      throw new AccountDeletionClientError("request-id-generation-failed");
    }
    return value;
  }

  function clearLocalAccountData({localStorage, sessionStorage}) {
    if (!localStorage || typeof localStorage.clear !== "function" ||
        !sessionStorage || typeof sessionStorage.clear !== "function") {
      throw new AccountDeletionClientError("local-cleanup-unavailable");
    }
    const preserved = PRESERVED_LOCAL_KEYS.map(key => [key, localStorage.getItem(key)]);
    localStorage.clear();
    preserved.forEach(([key, value]) => {
      if (value !== null) localStorage.setItem(key, value);
    });
    sessionStorage.clear();
  }

  function createAccountDeletionClient({
    fetchRequest,
    getIdToken,
    getAppCheckToken,
    sessionStorage,
    randomUUID,
    functionUrl
  } = {}) {
    if (
      typeof fetchRequest !== "function" ||
      typeof getIdToken !== "function" ||
      typeof getAppCheckToken !== "function" ||
      !sessionStorage || typeof sessionStorage.getItem !== "function" ||
      typeof sessionStorage.setItem !== "function" ||
      typeof randomUUID !== "function" ||
      typeof functionUrl !== "string" || !/^https:\/\//.test(functionUrl)
    ) {
      throw new TypeError("AccountDeletionClient requires authenticated callable services");
    }

    function requestId() {
      const stored = sessionStorage.getItem(REQUEST_ID_KEY);
      if (validRequestId(stored)) return stored;
      const generated = createRequestId(randomUUID);
      sessionStorage.setItem(REQUEST_ID_KEY, generated);
      return generated;
    }

    async function requestDeletion() {
      const currentRequestId = requestId();
      let idToken;
      let appCheckToken;
      try {
        [idToken, appCheckToken] = await Promise.all([
          getIdToken(),
          getAppCheckToken()
        ]);
      } catch (error) {
        throw new AccountDeletionClientError(
          error?.code || "deletion-attestation-failed",
          {cause: error}
        );
      }
      if (!idToken || !appCheckToken) {
        throw new AccountDeletionClientError("deletion-attestation-failed");
      }

      let response;
      try {
        response = await fetchRequest(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + idToken,
            "X-Firebase-AppCheck": appCheckToken
          },
          body: JSON.stringify({data: {requestId: currentRequestId}})
        });
      } catch (error) {
        throw new AccountDeletionClientError("deletion-request-network-failed", {cause: error});
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const providerCode = String(payload?.error?.status || "").toLowerCase();
        const code = providerCode === "unauthenticated"
          ? "deletion-session-invalid"
          : providerCode === "failed_precondition"
            ? "deletion-precondition-failed"
            : "deletion-request-rejected";
        throw new AccountDeletionClientError(code);
      }
      const result = payload?.result;
      if (
        !result || result.status !== "accepted" ||
        !validRequestId(result.requestId)
      ) {
        throw new AccountDeletionClientError("deletion-response-invalid");
      }
      return Object.freeze({status: "accepted", requestId: result.requestId});
    }

    return Object.freeze({requestDeletion});
  }

  return {
    REQUEST_ID_KEY,
    PRESERVED_LOCAL_KEYS,
    AccountDeletionClientError,
    clearLocalAccountData,
    createAccountDeletionClient
  };
});
