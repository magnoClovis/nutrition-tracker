"use strict";

const {DELETION_STAGES} = require("./account-deletion-engine.js");
const {
  ACCOUNT_DELETION_JOBS_COLLECTION,
  DELETION_MAX_ATTEMPTS,
  FAILED_JOB_RETENTION_MS,
  RECONCILIATION_LEASE_MS,
  RECONCILIATION_RETRY_MS,
  RECONCILIATION_STALE_MS,
} = require("./config.js");

const JOB_STATUS = Object.freeze({
  QUEUED: "queued",
  PROCESSING: "processing",
  RETRYING: "retrying",
  FAILED_PERMANENT: "failed_permanent",
});

const ORDERED_STAGES = Object.freeze(Object.values(DELETION_STAGES));

class AccountDeletionJobError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "AccountDeletionJobError";
    this.code = code;
  }
}

function isValidIdentifier(value, maximumLength = 128) {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximumLength;
}

function validateIdentity(value) {
  if (
    !value ||
    !isValidIdentifier(value.uid) ||
    !isValidIdentifier(value.requestId) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(value.requestId)
  ) {
    throw new AccountDeletionJobError("invalid-deletion-job-identity");
  }
}

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  return null;
}

function addMilliseconds(date, milliseconds) {
  return new Date(date.getTime() + milliseconds);
}

function stageIndex(stage) {
  return ORDERED_STAGES.indexOf(stage);
}

function validateStoredJob(data, identity) {
  if (
    !data ||
    data.uid !== identity.uid ||
    data.requestId !== identity.requestId ||
    stageIndex(data.stage) < 0
  ) {
    throw new AccountDeletionJobError("deletion-job-conflict");
  }
  return data;
}

function createAccountDeletionJobRepository({
  firestore,
  now = () => new Date(),
  maxAttempts = DELETION_MAX_ATTEMPTS,
  failedRetentionMs = FAILED_JOB_RETENTION_MS,
  staleAfterMs = RECONCILIATION_STALE_MS,
  reconciliationLeaseMs = RECONCILIATION_LEASE_MS,
  reconciliationRetryMs = RECONCILIATION_RETRY_MS,
} = {}) {
  if (
    typeof firestore?.collection !== "function" ||
    typeof firestore?.runTransaction !== "function"
  ) {
    throw new AccountDeletionJobError("invalid-job-firestore-client");
  }

  const jobs = firestore.collection(ACCOUNT_DELETION_JOBS_COLLECTION);

  function jobReference(requestId) {
    return jobs.doc(requestId);
  }

  function permanentFailurePatch(timestamp, failure = {}) {
    return {
      status: JOB_STATUS.FAILED_PERMANENT,
      failureCode: failure.code || "retry-budget-exhausted",
      failureStage: failure.stage || DELETION_STAGES.REQUESTED,
      failedAt: timestamp,
      expiresAt: addMilliseconds(timestamp, failedRetentionMs),
      reconcileAfter: null,
      updatedAt: timestamp,
    };
  }

  async function beginAttempt(identity) {
    validateIdentity(identity);
    const reference = jobReference(identity.requestId);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const timestamp = now();

      if (!snapshot.exists) {
        const job = {
          uid: identity.uid,
          requestId: identity.requestId,
          stage: DELETION_STAGES.REQUESTED,
          status: JOB_STATUS.PROCESSING,
          attemptCount: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
          lastAttemptAt: timestamp,
          reconcileAfter: addMilliseconds(timestamp, staleAfterMs),
          failureCode: null,
          failureStage: null,
          failedAt: null,
          expiresAt: null,
        };
        transaction.create(reference, job);
        return {...job};
      }

      const stored = validateStoredJob(snapshot.data(), identity);
      if (stored.status === JOB_STATUS.FAILED_PERMANENT) {
        return {...stored, terminal: true};
      }

      const attemptCount = Math.max(0, Number(stored.attemptCount) || 0) + 1;
      const patch = {
        status: JOB_STATUS.PROCESSING,
        attemptCount,
        updatedAt: timestamp,
        lastAttemptAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, staleAfterMs),
        failureCode: null,
        failureStage: null,
        failedAt: null,
        expiresAt: null,
      };
      transaction.update(reference, patch);
      return {...stored, ...patch};
    });
  }

  async function saveCheckpoint(job) {
    validateIdentity(job);
    if (stageIndex(job.stage) < 0) {
      throw new AccountDeletionJobError("invalid-deletion-job-stage");
    }
    const reference = jobReference(job.requestId);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return {status: "already-completed"};

      const stored = validateStoredJob(snapshot.data(), job);
      if (stageIndex(job.stage) <= stageIndex(stored.stage)) {
        return {status: "unchanged", stage: stored.stage};
      }

      const timestamp = now();
      transaction.update(reference, {
        stage: job.stage,
        status: JOB_STATUS.PROCESSING,
        updatedAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, staleAfterMs),
      });
      return {status: "advanced", stage: job.stage};
    });
  }

  async function removeCompletedJob(job) {
    validateIdentity(job);
    const reference = jobReference(job.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return {status: "already-removed"};
      validateStoredJob(snapshot.data(), job);
      transaction.delete(reference);
      return {status: "removed"};
    });
  }

  async function recordFailure(failure) {
    validateIdentity(failure);
    const reference = jobReference(failure.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return {status: "already-completed"};

      const stored = validateStoredJob(snapshot.data(), failure);
      const timestamp = now();
      const attemptCount = Math.max(1, Number(stored.attemptCount) || 1);
      if (attemptCount >= maxAttempts) {
        transaction.update(reference, permanentFailurePatch(timestamp, failure));
        return {status: JOB_STATUS.FAILED_PERMANENT, attemptCount};
      }

      transaction.update(reference, {
        status: JOB_STATUS.RETRYING,
        failureCode: failure.code,
        failureStage: failure.stage,
        failedAt: timestamp,
        expiresAt: null,
        updatedAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, staleAfterMs),
      });
      return {status: JOB_STATUS.RETRYING, attemptCount};
    });
  }

  async function listReconcilableJobs(limit = 100) {
    const snapshot = await jobs
      .where("reconcileAfter", "<=", now())
      .limit(limit)
      .get();
    return snapshot.docs.map((document) => ({id: document.id, ...document.data()}));
  }

  async function listPermanentFailures(limit = 100) {
    const snapshot = await jobs
      .where("status", "==", JOB_STATUS.FAILED_PERMANENT)
      .limit(limit)
      .get();
    return snapshot.docs.map((document) => ({id: document.id, ...document.data()}));
  }

  async function claimForReconciliation(candidate) {
    validateIdentity(candidate);
    const reference = jobReference(candidate.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return null;

      const stored = validateStoredJob(snapshot.data(), candidate);
      if (stored.status === JOB_STATUS.FAILED_PERMANENT) return null;
      const timestamp = now();
      const reconcileAfter = asDate(stored.reconcileAfter);
      if (!reconcileAfter || reconcileAfter.getTime() > timestamp.getTime()) {
        return null;
      }

      const attemptCount = Math.max(0, Number(stored.attemptCount) || 0);
      if (attemptCount >= maxAttempts) {
        transaction.update(reference, permanentFailurePatch(timestamp, {
          code: stored.failureCode,
          stage: stored.failureStage || stored.stage,
        }));
        return {action: "failed_permanent"};
      }

      transaction.update(reference, {
        status: JOB_STATUS.QUEUED,
        updatedAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, reconciliationLeaseMs),
      });
      return {
        action: "enqueue",
        uid: stored.uid,
        requestId: stored.requestId,
      };
    });
  }

  async function markRequeued(identity) {
    validateIdentity(identity);
    const reference = jobReference(identity.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return {status: "already-completed"};
      const stored = validateStoredJob(snapshot.data(), identity);
      if (stored.status !== JOB_STATUS.QUEUED) {
        return {status: "already-dispatched"};
      }
      const timestamp = now();
      transaction.update(reference, {
        updatedAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, staleAfterMs),
      });
      return {status: "requeued"};
    });
  }

  async function releaseReconciliation(identity) {
    validateIdentity(identity);
    const reference = jobReference(identity.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return {status: "already-completed"};
      const stored = validateStoredJob(snapshot.data(), identity);
      if (stored.status !== JOB_STATUS.QUEUED) {
        return {status: "already-dispatched"};
      }
      const timestamp = now();
      transaction.update(reference, {
        status: JOB_STATUS.RETRYING,
        updatedAt: timestamp,
        reconcileAfter: addMilliseconds(timestamp, reconciliationRetryMs),
      });
      return {status: "released"};
    });
  }

  async function ensurePermanentRetention(candidate) {
    validateIdentity(candidate);
    const reference = jobReference(candidate.requestId);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return false;
      const stored = validateStoredJob(snapshot.data(), candidate);
      if (stored.status !== JOB_STATUS.FAILED_PERMANENT) return false;
      if (asDate(stored.expiresAt)) return false;

      const timestamp = now();
      const failedAt = asDate(stored.failedAt) || timestamp;
      transaction.update(reference, {
        expiresAt: addMilliseconds(failedAt, failedRetentionMs),
        updatedAt: timestamp,
      });
      return true;
    });
  }

  return Object.freeze({
    beginAttempt,
    claimForReconciliation,
    ensurePermanentRetention,
    listPermanentFailures,
    listReconcilableJobs,
    markRequeued,
    recordFailure,
    releaseReconciliation,
    removeCompletedJob,
    saveCheckpoint,
  });
}

module.exports = {
  JOB_STATUS,
  AccountDeletionJobError,
  createAccountDeletionJobRepository,
};
