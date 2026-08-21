"use strict";

const {DELETION_STAGES} = require("./account-deletion-engine.js");
const {JOB_STATUS} = require("./account-deletion-jobs.js");
const {
  ACCOUNT_DELETION_JOBS_COLLECTION,
} = require("./config.js");
const {
  LOCK_COLLECTION,
  LOCK_STATES,
} = require("./firestore-account-deletion.js");

class AccountDeletionRequestError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "AccountDeletionRequestError";
    this.code = code;
  }
}

function validateRequestIdentity(identity) {
  if (
    !identity ||
    typeof identity.uid !== "string" ||
    identity.uid.length < 1 ||
    identity.uid.length > 128 ||
    typeof identity.requestId !== "string" ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(identity.requestId)
  ) {
    throw new AccountDeletionRequestError("invalid-deletion-request");
  }
  return Object.freeze({uid: identity.uid, requestId: identity.requestId});
}

function createAccountDeletionRequestService({
  firestore,
  enqueueTask,
  now = () => new Date(),
} = {}) {
  if (
    typeof firestore?.collection !== "function" ||
    typeof firestore?.runTransaction !== "function"
  ) {
    throw new AccountDeletionRequestError("invalid-request-firestore-client");
  }
  if (typeof enqueueTask !== "function") {
    throw new AccountDeletionRequestError("invalid-request-task-enqueuer");
  }

  const jobs = firestore.collection(ACCOUNT_DELETION_JOBS_COLLECTION);
  const locks = firestore.collection(LOCK_COLLECTION);

  async function persistRequest(identity) {
    const requestedJob = jobs.doc(identity.requestId);
    const lock = locks.doc(identity.uid);

    return firestore.runTransaction(async (transaction) => {
      const lockSnapshot = await transaction.get(lock);
      if (lockSnapshot.exists) {
        const storedLock = lockSnapshot.data() || {};
        if (
          typeof storedLock.requestId !== "string" ||
          !Object.values(LOCK_STATES).includes(storedLock.state)
        ) {
          throw new AccountDeletionRequestError("deletion-lock-corrupt");
        }
        return Object.freeze({
          uid: identity.uid,
          requestId: storedLock.requestId,
          created: false,
        });
      }

      const jobSnapshot = await transaction.get(requestedJob);
      if (jobSnapshot.exists) {
        const storedJob = jobSnapshot.data() || {};
        if (storedJob.uid !== identity.uid) {
          throw new AccountDeletionRequestError("deletion-request-conflict");
        }
        throw new AccountDeletionRequestError("deletion-job-without-lock");
      }

      const timestamp = now();
      transaction.create(requestedJob, {
        uid: identity.uid,
        requestId: identity.requestId,
        stage: DELETION_STAGES.REQUESTED,
        status: JOB_STATUS.QUEUED,
        attemptCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAttemptAt: null,
        reconcileAfter: timestamp,
        failureCode: null,
        failureStage: null,
        failedAt: null,
        expiresAt: null,
      });
      transaction.create(lock, {
        requestId: identity.requestId,
        state: LOCK_STATES.ACTIVE,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return Object.freeze({...identity, created: true});
    });
  }

  async function request(rawIdentity) {
    const identity = validateRequestIdentity(rawIdentity);
    const persisted = await persistRequest(identity);
    try {
      await enqueueTask({
        uid: persisted.uid,
        requestId: persisted.requestId,
      });
    } catch (_) {
      // The durable job remains reconcilable. The hourly reconciler will retry
      // dispatch without requiring the signed-in client to remain available.
    }
    return Object.freeze({
      status: "accepted",
      requestId: persisted.requestId,
    });
  }

  return Object.freeze({request});
}

module.exports = {
  AccountDeletionRequestError,
  createAccountDeletionRequestService,
  validateRequestIdentity,
};
