/**
 * !!! DESTRUCTIVE AND IRREVERSIBLE ACCOUNT-DATA OPERATION !!!
 *
 * Internal Firestore account-data deletion service for the Nutrition Tracker.
 * `firebase-storage.js` remains the sole public facade and publishes this
 * module's operation as `window.deleteCurrentUserFirestoreData`.
 *
 * This service deletes Firestore documents only. It does NOT delete the
 * Firebase Authentication account; `privacy-panel.js` performs that separate
 * operation afterwards, while the authenticated UID and token still exist.
 *
 * Known behavior is intentionally preserved: failed child listings look empty,
 * partial child failures do not prevent root deletion, no rollback exists, a
 * root-network failure happens before cache reset, cache reset precedes the
 * aggregate partial-failure error, and deletion is not coordinated with an
 * already-running migration or legacy cleanup operation.
 *
 * @module FirebaseAccountDataInternal
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseAccountDataInternal = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the internal destructive Firestore account-data service.
   *
   * @param {Object} dependencies Explicit authentication, environment, and Firestore dependencies.
   * @param {Function} dependencies.getUid Authentication-owned UID getter.
   * @param {Function} dependencies.getAuthHeaders Authenticated Firebase header getter.
   * @param {Function} dependencies.resetStorageCaches Firestore cache-reset callback.
   * @param {Function} dependencies.fetchRequest Fetch-compatible HTTP function.
   * @param {Object} dependencies.firestorePort Narrow Firestore deletion port.
   * @param {Function} dependencies.firestorePort.listDataKeys3 Active data-key lister.
   * @param {Function} dependencies.firestorePort.listLegacyKeys3 Legacy document-key lister.
   * @param {Function} dependencies.firestorePort.deleteDataDoc3 Active data-document deleter.
   * @param {Function} dependencies.firestorePort.legacyDelete3 Legacy document deleter.
   * @param {Function} dependencies.firestorePort.getUserDocumentUrl Current root-document URL getter.
   * @returns {{deleteCurrentUserFirestoreData3: Function}} Destructive operation consumed by the public facade.
   */
  function createFirebaseAccountData({
    getUid,
    getAuthHeaders,
    resetStorageCaches,
    fetchRequest,
    firestorePort
  }) {
    const {
      listDataKeys3,
      listLegacyKeys3,
      deleteDataDoc3,
      legacyDelete3,
      getUserDocumentUrl
    } = firestorePort;

    /**
     * Deletes the authenticated user's current, legacy, and root Firestore documents.
     *
     * This operation deliberately preserves 20-item `Promise.allSettled` batches,
     * masked listing failures, root deletion after child failures, lack of
     * rollback, and cache-reset/error ordering from the public facade.
     *
     * @returns {Promise<{deleted: number, failed: number}>} Successful and failed deletion counts when no failure remains.
     * @throws {Error} When no user is authenticated, the root request fails, or any HTTP deletion is counted as failed.
     */
    async function deleteCurrentUserFirestoreData3() {
      if (!getUid()) throw new Error("No authenticated user");

      const dataKeys = await listDataKeys3().catch(() => []);
      const legacyKeys = Array.from(await listLegacyKeys3().catch(() => new Set()));
      let deleted = 0;
      let failed = 0;

      for (let i = 0; i < dataKeys.length; i += 20) {
        const results = await Promise.allSettled(dataKeys.slice(i, i + 20).map(key => deleteDataDoc3(key)));
        deleted += results.filter(result => result.status === "fulfilled").length;
        failed += results.filter(result => result.status === "rejected").length;
      }

      for (let i = 0; i < legacyKeys.length; i += 20) {
        const results = await Promise.allSettled(legacyKeys.slice(i, i + 20).map(key => legacyDelete3(key)));
        deleted += results.filter(result => result.status === "fulfilled").length;
        failed += results.filter(result => result.status === "rejected").length;
      }

      const rootDelete = await fetchRequest(getUserDocumentUrl(), {
        method: "DELETE",
        headers: await getAuthHeaders()
      });
      if (rootDelete.ok || rootDelete.status === 404) {
        deleted++;
      } else {
        failed++;
      }

      resetStorageCaches();

      if (failed) throw new Error("Some account data could not be deleted");
      return {deleted, failed};
    }

    return {deleteCurrentUserFirestoreData3};
  }

  return {createFirebaseAccountData};
});
