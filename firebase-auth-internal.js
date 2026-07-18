/**
 * Internal Firebase Authentication and session-state adapter.
 *
 * This module owns the ID token, refresh token, and token-expiry state used by
 * `firebase-storage.js`. The facade remains the sole public contract and injects
 * Firebase endpoints, fetch, localStorage, and the current Firestore cache reset.
 *
 * TEMPORARY COUPLING: persistence still reads `_uid` directly in the facade.
 * Until persistence is extracted in sub-slice 3, `getCurrentUid` and
 * `setCurrentUid` bridge that facade-owned value. The bridge must be removed
 * when persistence starts consuming an authentication-owned UID getter.
 *
 * `resetStorageCaches` is called by every successful session save (including
 * sign-in, sign-up, token refresh, and external `_saveSession` calls) and by
 * sign-out. It is intentionally not called when token refresh fails.
 *
 * @module FirebaseAuthInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseAuthInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the internal Firebase Authentication/session implementation.
   *
   * @param {Object} dependencies Injected environment and temporary facade bridge.
   * @param {string} dependencies.apiKey Firebase Web API key from `firebase-config-internal.js`.
   * @param {string} dependencies.authBase Firebase Identity Toolkit accounts endpoint.
   * @param {string} dependencies.tokenBase Firebase Secure Token endpoint.
   * @param {Function} dependencies.fetchRequest Fetch-compatible HTTP function.
   * @param {Storage} dependencies.localStorage Browser storage for session persistence.
   * @param {Function} dependencies.resetStorageCaches Current inline Firestore cache reset callback.
   * @param {Function} dependencies.getCurrentUid Temporary getter for the facade-owned `_uid` value.
   * @param {Function} dependencies.setCurrentUid Temporary setter for the facade-owned `_uid` value.
   * @returns {{fbSignIn: Function, fbSignUp: Function, fbUpdateProfile: Function, fbSendVerificationEmail: Function, fbSendPasswordResetEmail: Function, fbCheckEmailVerified: Function, fbRefreshToken: Function, fbToken: Function, fbSignOut: Function, fbIsLoggedIn: Function, fbHeaders: Function, _saveSession: Function}} Authentication and session operations consumed by the public facade.
   */
  function createFirebaseAuth({
    apiKey,
    authBase,
    tokenBase,
    fetchRequest,
    localStorage,
    resetStorageCaches,
    getCurrentUid,
    setCurrentUid
  }) {
    let _idToken = null;
    let _refreshToken = localStorage.getItem("fb_refresh") || null;
    let _tokenExpiry = 0;

    /**
     * Stores a Firebase session response using the existing camel/snake-case fallbacks.
     *
     * @param {Object} d Firebase Authentication or Secure Token response.
     * @returns {void}
     */
    function _saveSession(d) {
      _idToken = d.idToken || d.id_token;
      _refreshToken = d.refreshToken || d.refresh_token;
      setCurrentUid(d.localId || d.user_id || getCurrentUid());
      resetStorageCaches();
      _tokenExpiry = Date.now() + (+(d.expiresIn || d.expires_in) - 60) * 1000;
      localStorage.setItem("fb_refresh", _refreshToken);
      if (getCurrentUid()) localStorage.setItem("fb_uid", getCurrentUid());
    }

    /**
     * Signs in with an email and password and saves the returned session.
     *
     * @param {string} email Account email.
     * @param {string} password Account password.
     * @returns {Promise<Object>} Firebase sign-in response.
     */
    async function fbSignIn(email, password) {
      const r = await fetchRequest(authBase + ":signInWithPassword?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, returnSecureToken: true})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || "Login falhou");
      _saveSession(d);
      localStorage.setItem("fb_email", email);
      return d;
    }

    /**
     * Creates an account and saves the returned session.
     *
     * @param {string} email Account email.
     * @param {string} password Account password.
     * @returns {Promise<Object>} Firebase sign-up response.
     */
    async function fbSignUp(email, password) {
      const r = await fetchRequest(authBase + ":signUp?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, returnSecureToken: true})
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || "Registro falhou");
      _saveSession(d); return d;
    }

    /**
     * Updates the authenticated user's display name.
     *
     * @param {string} displayName New display name.
     * @returns {Promise<Object>} Firebase profile update response.
     */
    async function fbUpdateProfile(displayName) {
      const token = await fbToken();
      const r = await fetchRequest(authBase + ":update?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({idToken: token, displayName, returnSecureToken: false})
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || "Profile update failed");
      return d;
    }

    /**
     * Requests Firebase's email-verification message for the current user.
     *
     * @returns {Promise<Object>} Firebase out-of-band request response.
     */
    async function fbSendVerificationEmail() {
      const token = await fbToken();
      const r = await fetchRequest(authBase + ":sendOobCode?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({requestType: "VERIFY_EMAIL", idToken: token})
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || "Verification email failed");
      return d;
    }

    /**
     * Requests Firebase's native password-reset email.
     *
     * @param {string} email Account email, trimmed before sending.
     * @returns {Promise<Object>} Firebase out-of-band request response.
     */
    async function fbSendPasswordResetEmail(email) {
      const r = await fetchRequest(authBase + ":sendOobCode?key=" + apiKey, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: String(email || "").trim()
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || "Password reset failed");
      return d;
    }

    /**
     * Checks whether the current Firebase account email is verified.
     *
     * @returns {Promise<boolean>} True only when Firebase reports `emailVerified === true`.
     */
    async function fbCheckEmailVerified() {
      const token = await fbToken();
      const r = await fetchRequest(authBase + ":lookup?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({idToken: token})
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || "Email verification check failed");
      if (!Array.isArray(d.users) || !d.users[0]) throw new Error("Account lookup returned no user");
      return d?.users?.[0]?.emailVerified === true;
    }

    /**
     * Refreshes and saves the current Firebase token.
     *
     * @returns {Promise<void>} Resolves after the refreshed session is saved.
     */
    async function fbRefreshToken() {
      if (!_refreshToken) throw new Error("Sem sessão");
      const r = await fetchRequest(tokenBase + "?key=" + apiKey, {
        method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(_refreshToken)
      });
      const d = await r.json();
      if (!r.ok) { _refreshToken = null; localStorage.removeItem("fb_refresh"); localStorage.removeItem("fb_uid"); throw new Error("Sessão expirada"); }
      _saveSession(d);
    }

    /**
     * Returns the cached ID token or refreshes it when expired.
     *
     * @returns {Promise<string|null>} Current Firebase ID token.
     */
    async function fbToken() {
      if (_idToken && Date.now() < _tokenExpiry) return _idToken;
      await fbRefreshToken();
      return _idToken;
    }

    /**
     * Clears the current in-memory and persisted Firebase session.
     *
     * @returns {void}
     */
    function fbSignOut() {
      _idToken = _refreshToken = null;
      setCurrentUid(null);
      _tokenExpiry = 0;
      resetStorageCaches();
      localStorage.removeItem("fb_refresh");
      localStorage.removeItem("fb_uid");
      localStorage.removeItem("fb_email");
    }

    /**
     * Reports whether a persisted refresh token exists, without validating it.
     *
     * @returns {boolean} True when a refresh token is present.
     */
    function fbIsLoggedIn() { return !!_refreshToken; }

    /**
     * Builds authenticated Firestore headers using the current token.
     *
     * @returns {Promise<Object<string, string>>} JSON and Bearer authorization headers.
     */
    async function fbHeaders() {
      const token = await fbToken();
      return {"Content-Type": "application/json", "Authorization": "Bearer " + token};
    }

    return {
      fbSignIn,
      fbSignUp,
      fbUpdateProfile,
      fbSendVerificationEmail,
      fbSendPasswordResetEmail,
      fbCheckEmailVerified,
      fbRefreshToken,
      fbToken,
      fbSignOut,
      fbIsLoggedIn,
      fbHeaders,
      _saveSession
    };
  }

  return { createFirebaseAuth };
});
