"use strict";

const LOCK_COLLECTION = "accountDeletionLocks";
const NUTRITION_COLLECTION = "nutrition";

const LOCK_STATES = Object.freeze({
  ACTIVE: "active",
  SEALED: "sealed",
});

class FirestoreDeletionError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "FirestoreDeletionError";
    this.code = code;
  }
}

function documentExists(snapshot) {
  return snapshot?.exists === true;
}

function validateOperationJob(job) {
  if (
    !job ||
    typeof job.uid !== "string" ||
    job.uid.length < 1 ||
    typeof job.requestId !== "string" ||
    job.requestId.length < 1
  ) {
    throw new FirestoreDeletionError("invalid-firestore-deletion-job");
  }
}

function validateFirestore(firestore) {
  const requiredMethods = ["collection", "recursiveDelete", "runTransaction"];
  for (const method of requiredMethods) {
    if (typeof firestore?.[method] !== "function") {
      throw new FirestoreDeletionError("invalid-firestore-admin-client");
    }
  }
}

function createFirestoreAccountDeletionOperations({
  firestore,
  now = () => new Date(),
} = {}) {
  validateFirestore(firestore);

  function lockReference(uid) {
    return firestore.collection(LOCK_COLLECTION).doc(uid);
  }

  function nutritionReference(uid) {
    return firestore.collection(NUTRITION_COLLECTION).doc(uid);
  }

  async function acquireWriteLock(job) {
    validateOperationJob(job);
    const lockRef = lockReference(job.uid);

    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(lockRef);
      const timestamp = now();

      if (!documentExists(snapshot)) {
        transaction.create(lockRef, {
          requestId: job.requestId,
          state: LOCK_STATES.ACTIVE,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        return;
      }

      const lock = snapshot.data() || {};
      if (lock.requestId !== job.requestId) {
        throw new FirestoreDeletionError("deletion-lock-conflict");
      }
      if (!Object.values(LOCK_STATES).includes(lock.state)) {
        throw new FirestoreDeletionError("deletion-lock-corrupt");
      }
    });
  }

  async function deleteFirestoreData(job) {
    validateOperationJob(job);
    await firestore.recursiveDelete(nutritionReference(job.uid));
  }

  async function verifyFirestoreEmpty(job) {
    validateOperationJob(job);
    const userRef = nutritionReference(job.uid);
    const rootSnapshot = await userRef.get();
    if (documentExists(rootSnapshot)) return false;

    const childCollections = await userRef.listCollections();
    for (const collectionRef of childCollections) {
      const childSnapshot = await collectionRef.limit(1).get();
      if (!childSnapshot.empty) return false;
    }

    return true;
  }

  async function sealWriteLock(job) {
    validateOperationJob(job);
    const lockRef = lockReference(job.uid);

    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(lockRef);
      if (!documentExists(snapshot)) {
        throw new FirestoreDeletionError("deletion-lock-missing");
      }

      const lock = snapshot.data() || {};
      if (lock.requestId !== job.requestId) {
        throw new FirestoreDeletionError("deletion-lock-conflict");
      }
      if (!Object.values(LOCK_STATES).includes(lock.state)) {
        throw new FirestoreDeletionError("deletion-lock-corrupt");
      }
      if (lock.state === LOCK_STATES.SEALED) return;

      const timestamp = now();
      transaction.update(lockRef, {
        state: LOCK_STATES.SEALED,
        sealedAt: timestamp,
        updatedAt: timestamp,
      });
    });
  }

  return Object.freeze({
    acquireWriteLock,
    deleteFirestoreData,
    sealWriteLock,
    verifyFirestoreEmpty,
  });
}

module.exports = {
  LOCK_COLLECTION,
  LOCK_STATES,
  NUTRITION_COLLECTION,
  FirestoreDeletionError,
  createFirestoreAccountDeletionOperations,
};
