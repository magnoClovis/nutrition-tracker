/**
 * Compatibility adapter for Firebase Authentication's modular JS SDK.
 *
 * This adapter deliberately ignores the historical REST refresh-token keys.
 * When it becomes the active facade at the C28 cutover, Firebase SDK
 * persistence is the only session authority and existing users sign in once.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseAuthSdk = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function createFirebaseAuthSdk({
    auth,
    sdk,
    localStorage,
    resetStorageCaches,
    userLifecycle = null,
  } = {}) {
    const required = [
      "setPersistence", "signInWithEmailAndPassword", "createUserWithEmailAndPassword",
      "updateProfile", "sendEmailVerification", "sendPasswordResetEmail", "reload", "signOut",
      "emailCredential", "reauthenticateWithCredential", "updatePassword",
    ];
    if (!auth || !sdk || required.some(name => typeof sdk[name] !== "function") ||
        !localStorage || typeof resetStorageCaches !== "function" ||
        (userLifecycle && ["synchronizeUser", "clearForSignOut", "flushBeforeAccountDeletion", "sealAccountDeletion"]
          .some(name => typeof userLifecycle[name] !== "function"))) {
      throw new TypeError("FirebaseAuthSdk requires Auth, modular SDK operations, storage, and cache reset");
    }

    let initialization = null;
    let knownUid = null;

    function normalizeAuthError(error) {
      const code = String(error?.code || "");
      const compatibilityCodes = {
        "auth/email-already-in-use": "EMAIL_EXISTS",
        "auth/invalid-credential": "INVALID_LOGIN_CREDENTIALS",
        "auth/invalid-email": "INVALID_EMAIL",
        "auth/too-many-requests": "TOO_MANY_ATTEMPTS_TRY_LATER",
        "auth/user-disabled": "USER_DISABLED",
        "auth/user-not-found": "EMAIL_NOT_FOUND",
        "auth/weak-password": "WEAK_PASSWORD",
        "auth/wrong-password": "INVALID_LOGIN_CREDENTIALS",
      };
      const message = compatibilityCodes[code];
      if (!message) return error;
      const normalized = new Error(message, {cause: error});
      normalized.code = code;
      return normalized;
    }

    function clearLegacySessionKeys() {
      localStorage.removeItem("fb_refresh");
      localStorage.removeItem("fb_uid");
    }

    function initialize() {
      if (initialization) return initialization;
      initialization = Promise.resolve()
        .then(() => sdk.setPersistence(auth, sdk.browserLocalPersistence))
        .then(async () => {
          if (typeof auth.authStateReady === "function") await auth.authStateReady();
          knownUid = auth.currentUser?.uid || null;
          if (userLifecycle) await userLifecycle.synchronizeUser(knownUid);
          clearLegacySessionKeys();
          return auth.currentUser;
        })
        .catch(error => {
          initialization = null;
          throw error;
        });
      return initialization;
    }

    async function synchronizeSession(operation) {
      await initialize();
      const previousUid = auth.currentUser?.uid || knownUid;
      const result = await operation();
      const nextUid = auth.currentUser?.uid || result?.user?.uid || null;
      if (previousUid !== nextUid) {
        if (userLifecycle) await userLifecycle.synchronizeUser(nextUid);
        else resetStorageCaches();
      }
      knownUid = nextUid;
      clearLegacySessionKeys();
      return result;
    }

    async function fbSignIn(email, password) {
      const normalizedEmail = String(email || "").trim();
      let result;
      try {
        result = await synchronizeSession(() =>
          sdk.signInWithEmailAndPassword(auth, normalizedEmail, password));
      } catch (error) {
        throw normalizeAuthError(error);
      }
      localStorage.setItem("fb_email", normalizedEmail);
      return result;
    }

    async function fbSignUp(email, password) {
      const normalizedEmail = String(email || "").trim();
      let result;
      try {
        result = await synchronizeSession(() =>
          sdk.createUserWithEmailAndPassword(auth, normalizedEmail, password));
      } catch (error) {
        throw normalizeAuthError(error);
      }
      localStorage.setItem("fb_email", normalizedEmail);
      return result;
    }

    async function requireUser() {
      await initialize();
      if (!auth.currentUser) throw new Error("Sem sessão");
      return auth.currentUser;
    }

    async function fbUpdateProfile(displayName) {
      const user = await requireUser();
      await sdk.updateProfile(user, { displayName });
      return user;
    }

    async function fbSendVerificationEmail() {
      return sdk.sendEmailVerification(await requireUser());
    }

    async function fbSendPasswordResetEmail(email) {
      return sdk.sendPasswordResetEmail(auth, String(email || "").trim());
    }

    async function fbCheckEmailVerified({reload = true} = {}) {
      const user = await requireUser();
      if (reload) await sdk.reload(user);
      return auth.currentUser?.emailVerified === true;
    }

    async function fbReauthenticate(password) {
      const currentUser = await requireUser();
      if (!currentUser.email) throw new Error("Conta sem e-mail");
      try {
        return await sdk.reauthenticateWithCredential(
          currentUser,
          sdk.emailCredential(currentUser.email, password),
        );
      } catch (error) {
        throw normalizeAuthError(error);
      }
    }

    async function fbUpdatePassword(password) {
      return sdk.updatePassword(await requireUser(), password);
    }

    async function fbRefreshToken() {
      return (await requireUser()).getIdToken(true);
    }

    async function fbToken() {
      return (await requireUser()).getIdToken(false);
    }

    async function fbSignOut() {
      await initialize();
      const signingOutUid = auth.currentUser?.uid || knownUid;
      if (userLifecycle) await userLifecycle.clearForSignOut(signingOutUid);
      await sdk.signOut(auth);
      knownUid = null;
      if (!userLifecycle) resetStorageCaches();
      clearLegacySessionKeys();
      localStorage.removeItem("fb_email");
    }

    function fbIsLoggedIn() {
      return Boolean(auth.currentUser);
    }

    function getUid() {
      return auth.currentUser?.uid || null;
    }

    async function flushBeforeAccountDeletion() {
      await initialize();
      if (userLifecycle) await userLifecycle.flushBeforeAccountDeletion();
    }

    async function sealAccountDeletion() {
      const currentUser = await requireUser();
      if (userLifecycle) await userLifecycle.sealAccountDeletion(currentUser.uid);
    }

    async function finalizeAccountDeletion() {
      const currentUser = await requireUser();
      if (userLifecycle) await userLifecycle.sealAccountDeletion(currentUser.uid);
      await sdk.signOut(auth);
      knownUid = null;
      if (!userLifecycle) resetStorageCaches();
      clearLegacySessionKeys();
      localStorage.removeItem("fb_email");
    }

    return Object.freeze({
      initialize,
      fbSignIn,
      fbSignUp,
      fbUpdateProfile,
      fbSendVerificationEmail,
      fbSendPasswordResetEmail,
      fbCheckEmailVerified,
      fbReauthenticate,
      fbUpdatePassword,
      fbRefreshToken,
      fbToken,
      fbSignOut,
      fbIsLoggedIn,
      getUid,
      flushBeforeAccountDeletion,
      sealAccountDeletion,
      finalizeAccountDeletion,
    });
  }

  return { createFirebaseAuthSdk };
});
