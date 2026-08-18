"use strict";

const DELETION_STAGES = Object.freeze({
  REQUESTED: "requested",
  LOCKED: "locked",
  DATA_DELETED: "data_deleted",
  DATA_VERIFIED: "data_verified",
  AUTH_DELETED: "auth_deleted",
  LOCK_SEALED: "lock_sealed",
});

const ORDERED_STAGES = Object.freeze(Object.values(DELETION_STAGES));
const AUTH_USER_NOT_FOUND_CODES = new Set([
  "auth/user-not-found",
  "USER_NOT_FOUND",
]);

class DeletionSagaError extends Error {
  constructor(code, stage, options = {}) {
    super(code, options);
    this.name = "DeletionSagaError";
    this.code = code;
    this.stage = stage;
  }
}

function validateJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new DeletionSagaError("invalid-job", "validation");
  }

  if (
    typeof job.uid !== "string" ||
    job.uid.length < 1 ||
    job.uid.length > 128
  ) {
    throw new DeletionSagaError("invalid-uid", "validation");
  }

  if (
    typeof job.requestId !== "string" ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(job.requestId)
  ) {
    throw new DeletionSagaError("invalid-request-id", "validation");
  }

  if (!ORDERED_STAGES.includes(job.stage)) {
    throw new DeletionSagaError("invalid-stage", "validation");
  }

  return Object.freeze({
    uid: job.uid,
    requestId: job.requestId,
    stage: job.stage,
  });
}

function validatePorts(ports) {
  const requiredPorts = [
    "acquireWriteLock",
    "deleteFirestoreData",
    "verifyFirestoreEmpty",
    "deleteAuthUser",
    "sealWriteLock",
    "saveCheckpoint",
    "removeCompletedJob",
    "recordFailure",
  ];

  for (const portName of requiredPorts) {
    if (typeof ports?.[portName] !== "function") {
      throw new DeletionSagaError("invalid-ports", "validation");
    }
  }
}

function isAuthUserNotFound(error) {
  return AUTH_USER_NOT_FOUND_CODES.has(error?.code);
}

async function saveCheckpoint(ports, job, stage) {
  try {
    await ports.saveCheckpoint({...job, stage});
  } catch (error) {
    throw new DeletionSagaError("checkpoint-failed", stage, {cause: error});
  }
}

async function runStep({job, ports, operation, nextStage, errorCode}) {
  try {
    await operation();
  } catch (error) {
    throw new DeletionSagaError(errorCode, job.stage, {cause: error});
  }

  await saveCheckpoint(ports, job, nextStage);
  return {...job, stage: nextStage};
}

async function executeDeletionSaga(rawJob, ports) {
  const initialJob = validateJob(rawJob);
  validatePorts(ports);

  let job = initialJob;

  try {
    if (job.stage === DELETION_STAGES.REQUESTED) {
      job = await runStep({
        job,
        ports,
        operation: () => ports.acquireWriteLock(job),
        nextStage: DELETION_STAGES.LOCKED,
        errorCode: "write-lock-failed",
      });
    }

    if (job.stage === DELETION_STAGES.LOCKED) {
      job = await runStep({
        job,
        ports,
        operation: () => ports.deleteFirestoreData(job),
        nextStage: DELETION_STAGES.DATA_DELETED,
        errorCode: "firestore-delete-failed",
      });
    }

    if (job.stage === DELETION_STAGES.DATA_DELETED) {
      let isEmpty;
      try {
        isEmpty = await ports.verifyFirestoreEmpty(job);
      } catch (error) {
        throw new DeletionSagaError("firestore-verification-failed", job.stage, {
          cause: error,
        });
      }

      if (isEmpty !== true) {
        throw new DeletionSagaError("firestore-data-remains", job.stage);
      }

      await saveCheckpoint(ports, job, DELETION_STAGES.DATA_VERIFIED);
      job = {...job, stage: DELETION_STAGES.DATA_VERIFIED};
    }

    if (job.stage === DELETION_STAGES.DATA_VERIFIED) {
      try {
        await ports.deleteAuthUser(job);
      } catch (error) {
        if (!isAuthUserNotFound(error)) {
          throw new DeletionSagaError("auth-delete-failed", job.stage, {
            cause: error,
          });
        }
      }

      await saveCheckpoint(ports, job, DELETION_STAGES.AUTH_DELETED);
      job = {...job, stage: DELETION_STAGES.AUTH_DELETED};
    }

    if (job.stage === DELETION_STAGES.AUTH_DELETED) {
      job = await runStep({
        job,
        ports,
        operation: () => ports.sealWriteLock(job),
        nextStage: DELETION_STAGES.LOCK_SEALED,
        errorCode: "write-lock-seal-failed",
      });
    }

    if (job.stage === DELETION_STAGES.LOCK_SEALED) {
      try {
        await ports.removeCompletedJob(job);
      } catch (error) {
        throw new DeletionSagaError("job-finalization-failed", job.stage, {
          cause: error,
        });
      }
    }

    return Object.freeze({
      status: "completed",
      uid: job.uid,
      requestId: job.requestId,
    });
  } catch (error) {
    const sagaError =
      error instanceof DeletionSagaError
        ? error
        : new DeletionSagaError("unknown-deletion-failure", job.stage, {
            cause: error,
          });

    try {
      await ports.recordFailure({
        uid: job.uid,
        requestId: job.requestId,
        stage: sagaError.stage,
        code: sagaError.code,
      });
    } catch (recordError) {
      throw new DeletionSagaError("failure-recording-failed", sagaError.stage, {
        cause: recordError,
      });
    }

    throw sagaError;
  }
}

module.exports = {
  DELETION_STAGES,
  DeletionSagaError,
  executeDeletionSaga,
  isAuthUserNotFound,
  validateJob,
};
