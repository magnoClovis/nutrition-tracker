/**
 * Persistent Firestore lifecycle for account-scoped Trofia data.
 *
 * The lifecycle owns the SDK instance so account transitions can terminate it
 * and remove IndexedDB before another user is allowed to write. A shared
 * localStorage marker blocks writes synchronously in every tab while cleanup is
 * pending, including after an accepted C22 account-deletion lock.
 *
 * @module FirebaseFirestoreLifecycle
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseFirestoreLifecycle = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CACHE_SIZE_BYTES = 100 * 1024 * 1024;
  const CACHE_OWNER_KEY = "trofia_firestore_cache_owner_uid";
  const WRITE_BLOCK_KEY = "trofia_firestore_write_block";
  const TRUSTED_DEVICE_KEY = "trofia_firestore_trusted_device";
  const CHANNEL_NAME = "trofia-firestore-lifecycle";

  class FirestoreLifecycleError extends Error {
    constructor(code, options = {}) {
      super(code, options);
      this.name = "FirestoreLifecycleError";
      this.code = code;
    }
  }

  function normalizedUid(value) {
    const uid = String(value || "").trim();
    return uid || null;
  }

  function parseWriteBlock(value) {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      const uid = normalizedUid(parsed?.uid);
      return uid ? {uid, reason: String(parsed.reason || "account-transition")} : null;
    } catch (_) {
      return null;
    }
  }

  function createFirebaseFirestoreLifecycle({
    app,
    sdk,
    localStorage,
    getUid,
    resetStorageCaches,
    BroadcastChannelCtor,
    settleTabs = () => new Promise(resolve => setTimeout(resolve, 50)),
    isNativePlatform = () => false,
  } = {}) {
    const required = [
      "initializeFirestore", "memoryLocalCache", "persistentLocalCache", "persistentMultipleTabManager",
      "disableNetwork", "terminate", "clearIndexedDbPersistence", "waitForPendingWrites",
    ];
    if (!app || !sdk || required.some(name => typeof sdk[name] !== "function") ||
        !localStorage || typeof localStorage.getItem !== "function" ||
        typeof localStorage.setItem !== "function" || typeof localStorage.removeItem !== "function" ||
        typeof getUid !== "function" || typeof resetStorageCaches !== "function" ||
        typeof settleTabs !== "function" || typeof isNativePlatform !== "function") {
      throw new TypeError("FirebaseFirestoreLifecycle requires app, SDK lifecycle operations, storage, UID, and cache reset");
    }

    let firestore = null;
    let transitionInProgress = false;
    let transitionQueue = Promise.resolve();
    let channel = null;

    function cacheOwner() {
      return normalizedUid(localStorage.getItem(CACHE_OWNER_KEY));
    }

    function writeBlock() {
      return parseWriteBlock(localStorage.getItem(WRITE_BLOCK_KEY));
    }

    function setWriteBlock(uid, reason) {
      const normalized = normalizedUid(uid);
      if (!normalized) return;
      const current = writeBlock();
      if (current?.uid === normalized && current.reason === "account-deletion" && reason !== "account-deletion") {
        return;
      }
      localStorage.setItem(WRITE_BLOCK_KEY, JSON.stringify({uid: normalized, reason}));
    }

    function clearWriteBlock(uid) {
      const blocked = writeBlock();
      if (!blocked || blocked.uid === normalizedUid(uid)) localStorage.removeItem(WRITE_BLOCK_KEY);
    }

    function assertWritesAllowed() {
      const uid = normalizedUid(getUid());
      const blocked = writeBlock();
      if (transitionInProgress || (uid && blocked?.uid === uid)) {
        throw new FirestoreLifecycleError("firestore-writes-blocked");
      }
    }

    function persistentCacheEnabled() {
      return isNativePlatform() || localStorage.getItem(TRUSTED_DEVICE_KEY) === "true";
    }

    function getFirestore() {
      if (!firestore) {
        const localCache = persistentCacheEnabled()
          ? sdk.persistentLocalCache({
              cacheSizeBytes: CACHE_SIZE_BYTES,
              tabManager: sdk.persistentMultipleTabManager(),
            })
          : sdk.memoryLocalCache();
        firestore = sdk.initializeFirestore(app, {
          localCache,
        });
      }
      return firestore;
    }

    async function destroyPersistentCache() {
      const current = firestore;
      transitionInProgress = true;
      resetStorageCaches();
      try {
        if (current) {
          await sdk.disableNetwork(current);
          await sdk.terminate(current);
          firestore = null;
          await sdk.clearIndexedDbPersistence(current);
        } else {
          const temporary = getFirestore();
          await sdk.terminate(temporary);
          firestore = null;
          await sdk.clearIndexedDbPersistence(temporary);
        }
        localStorage.removeItem(CACHE_OWNER_KEY);
      } catch (error) {
        throw new FirestoreLifecycleError("firestore-cache-cleanup-failed", {cause: error});
      } finally {
        transitionInProgress = false;
      }
    }

    function enqueueTransition(operation) {
      const next = transitionQueue.then(operation, operation);
      transitionQueue = next.catch(() => {});
      return next;
    }

    function publish(message) {
      try { channel?.postMessage(message); } catch (_) {}
    }

    async function synchronizeUser(nextUid) {
      const normalizedNext = normalizedUid(nextUid);
      return enqueueTransition(async () => {
        const previous = cacheOwner();
        const blocked = writeBlock();
        if (blocked?.reason === "account-deletion" && blocked.uid === normalizedNext) {
          throw new FirestoreLifecycleError("firestore-deletion-user-blocked");
        }
        const cleanupUid = previous && previous !== normalizedNext
          ? previous
          : blocked && blocked.reason !== "account-deletion"
            ? blocked.uid
            : blocked && blocked.uid !== normalizedNext
              ? blocked.uid
              : null;
        if (cleanupUid) {
          transitionInProgress = true;
          setWriteBlock(cleanupUid, "account-change");
          publish({type: "purge", uid: cleanupUid, reason: "account-change"});
          await settleTabs();
          await destroyPersistentCache();
          clearWriteBlock(cleanupUid);
        }
        if (normalizedNext) localStorage.setItem(CACHE_OWNER_KEY, normalizedNext);
        else localStorage.removeItem(CACHE_OWNER_KEY);
        resetStorageCaches();
      });
    }

    async function flushBeforeAccountDeletion() {
      assertWritesAllowed();
      if (firestore) await sdk.waitForPendingWrites(firestore);
    }

    async function sealAccountDeletion(uid = getUid()) {
      const normalized = normalizedUid(uid);
      if (!normalized) throw new FirestoreLifecycleError("firestore-deletion-user-missing");
      setWriteBlock(normalized, "account-deletion");
      transitionInProgress = true;
      publish({type: "purge", uid: normalized, reason: "account-deletion"});
      return enqueueTransition(async () => {
        await settleTabs();
        await destroyPersistentCache();
        // Deliberately retain the block until Auth has completed sign-out. If
        // cleanup in another tab fails, that tab remains fail-closed as well.
      });
    }

    async function clearForSignOut(uid = getUid()) {
      const normalized = normalizedUid(uid) || cacheOwner();
      if (normalized) {
        transitionInProgress = true;
        setWriteBlock(normalized, "sign-out");
        publish({type: "purge", uid: normalized, reason: "sign-out"});
      }
      return enqueueTransition(async () => {
        await settleTabs();
        await destroyPersistentCache();
        if (normalized && writeBlock()?.reason !== "account-deletion") clearWriteBlock(normalized);
      });
    }

    async function handleRemotePurge(message) {
      const uid = normalizedUid(message?.uid);
      if (!uid || message?.type !== "purge") return;
      setWriteBlock(uid, String(message.reason || "account-transition"));
      try {
        await enqueueTransition(destroyPersistentCache);
      } catch (_) {
        // Fail closed. The initiating tab reports the cleanup failure.
      }
    }

    async function setTrustedDevice(trusted) {
      const enabled = trusted === true;
      if (isNativePlatform()) return true;
      if (persistentCacheEnabled() === enabled) return enabled;
      const uid = normalizedUid(getUid()) || cacheOwner();
      if (uid) setWriteBlock(uid, "cache-policy-change");
      transitionInProgress = true;
      publish({type: "purge", uid, reason: "cache-policy-change"});
      return enqueueTransition(async () => {
        await settleTabs();
        await destroyPersistentCache();
        if (enabled) localStorage.setItem(TRUSTED_DEVICE_KEY, "true");
        else localStorage.removeItem(TRUSTED_DEVICE_KEY);
        if (uid) {
          localStorage.setItem(CACHE_OWNER_KEY, uid);
          clearWriteBlock(uid);
        }
        return enabled;
      });
    }

    if (typeof BroadcastChannelCtor === "function") {
      channel = new BroadcastChannelCtor(CHANNEL_NAME);
      channel.addEventListener?.("message", event => { handleRemotePurge(event?.data); });
    }

    function close() {
      try { channel?.close(); } catch (_) {}
      channel = null;
    }

    return Object.freeze({
      getFirestore,
      assertWritesAllowed,
      synchronizeUser,
      flushBeforeAccountDeletion,
      sealAccountDeletion,
      clearForSignOut,
      setTrustedDevice,
      close,
      support: Object.freeze({cacheOwner, writeBlock, destroyPersistentCache}),
    });
  }

  return {
    CACHE_SIZE_BYTES,
    CACHE_OWNER_KEY,
    WRITE_BLOCK_KEY,
    TRUSTED_DEVICE_KEY,
    CHANNEL_NAME,
    FirestoreLifecycleError,
    createFirebaseFirestoreLifecycle,
  };
});
