"use strict";

const {
  DELETION_STAGES,
  DeletionSagaError,
  executeDeletionSaga,
  validateJob,
} = require("./account-deletion-engine.js");
const {JOB_STATUS} = require("./account-deletion-jobs.js");

const TASK_ALREADY_EXISTS_CODES = new Set([
  "functions/task-already-exists",
  "functions/task-already-exists-error",
]);

class AccountDeletionTaskError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "AccountDeletionTaskError";
    this.code = code;
  }
}

function validateTaskIdentity(data) {
  const validated = validateJob({
    uid: data?.uid,
    requestId: data?.requestId,
    stage: DELETION_STAGES.REQUESTED,
  });
  return {uid: validated.uid, requestId: validated.requestId};
}

function isTaskAlreadyExists(error) {
  return TASK_ALREADY_EXISTS_CODES.has(error?.code) ||
    /task[-_ ]already[-_ ]exists/i.test(String(error?.code || ""));
}

function createAccountDeletionTaskProcessor({
  jobRepository,
  deletionOperations,
  deleteAuthUser,
} = {}) {
  const requiredRepositoryMethods = [
    "beginAttempt",
    "recordFailure",
    "removeCompletedJob",
    "saveCheckpoint",
  ];
  for (const method of requiredRepositoryMethods) {
    if (typeof jobRepository?.[method] !== "function") {
      throw new AccountDeletionTaskError("invalid-task-job-repository");
    }
  }
  for (const method of [
    "acquireWriteLock",
    "deleteFirestoreData",
    "sealWriteLock",
    "verifyFirestoreEmpty",
  ]) {
    if (typeof deletionOperations?.[method] !== "function") {
      throw new AccountDeletionTaskError("invalid-task-deletion-operations");
    }
  }
  if (typeof deleteAuthUser !== "function") {
    throw new AccountDeletionTaskError("invalid-task-auth-operation");
  }

  async function process(request) {
    let identity;
    try {
      identity = validateTaskIdentity(request?.data);
    } catch (error) {
      throw new AccountDeletionTaskError("invalid-task-payload", {cause: error});
    }

    const job = await jobRepository.beginAttempt(identity);
    if (job.terminal === true || job.status === JOB_STATUS.FAILED_PERMANENT) {
      return Object.freeze({status: JOB_STATUS.FAILED_PERMANENT});
    }

    let failureDisposition = null;
    const ports = {
      ...deletionOperations,
      deleteAuthUser: () => deleteAuthUser(job),
      saveCheckpoint: (checkpoint) => jobRepository.saveCheckpoint(checkpoint),
      removeCompletedJob: (completed) =>
        jobRepository.removeCompletedJob(completed),
      async recordFailure(failure) {
        failureDisposition = await jobRepository.recordFailure(failure);
      },
    };

    try {
      return await executeDeletionSaga(job, ports);
    } catch (error) {
      if (
        failureDisposition?.status === JOB_STATUS.FAILED_PERMANENT ||
        failureDisposition?.status === "already-completed"
      ) {
        return Object.freeze({status: failureDisposition.status});
      }

      const code = error instanceof DeletionSagaError
        ? error.code
        : "deletion-task-failed";
      throw new AccountDeletionTaskError(code, {cause: error});
    }
  }

  return Object.freeze({process});
}

function createAccountDeletionReconciler({
  jobRepository,
  enqueueTask,
  batchSize = 100,
} = {}) {
  for (const method of [
    "claimForReconciliation",
    "ensurePermanentRetention",
    "listPermanentFailures",
    "listReconcilableJobs",
    "markRequeued",
    "releaseReconciliation",
  ]) {
    if (typeof jobRepository?.[method] !== "function") {
      throw new AccountDeletionTaskError("invalid-reconciler-job-repository");
    }
  }
  if (typeof enqueueTask !== "function") {
    throw new AccountDeletionTaskError("invalid-reconciler-task-enqueuer");
  }

  async function reconcile() {
    const summary = {
      inspected: 0,
      requeued: 0,
      permanent: 0,
      retentionRepaired: 0,
      enqueueFailed: 0,
    };

    const candidates = await jobRepository.listReconcilableJobs(batchSize);
    summary.inspected += candidates.length;
    for (const candidate of candidates) {
      const claim = await jobRepository.claimForReconciliation(candidate);
      if (!claim) continue;
      if (claim.action === "failed_permanent") {
        summary.permanent += 1;
        continue;
      }

      try {
        await enqueueTask({uid: claim.uid, requestId: claim.requestId});
        await jobRepository.markRequeued(claim);
        summary.requeued += 1;
      } catch (error) {
        if (isTaskAlreadyExists(error)) {
          await jobRepository.markRequeued(claim);
          summary.requeued += 1;
          continue;
        }
        await jobRepository.releaseReconciliation(claim);
        summary.enqueueFailed += 1;
      }
    }

    const permanentFailures = await jobRepository.listPermanentFailures(batchSize);
    summary.inspected += permanentFailures.length;
    for (const failure of permanentFailures) {
      if (await jobRepository.ensurePermanentRetention(failure)) {
        summary.retentionRepaired += 1;
      }
    }

    return Object.freeze(summary);
  }

  return Object.freeze({reconcile});
}

module.exports = {
  TASK_ALREADY_EXISTS_CODES,
  AccountDeletionTaskError,
  createAccountDeletionReconciler,
  createAccountDeletionTaskProcessor,
  isTaskAlreadyExists,
  validateTaskIdentity,
};
