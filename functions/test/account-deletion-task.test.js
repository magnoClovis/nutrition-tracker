"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {DELETION_STAGES} = require("../src/account-deletion-engine.js");
const {JOB_STATUS} = require("../src/account-deletion-jobs.js");
const {
  AccountDeletionTaskError,
  createAccountDeletionReconciler,
  createAccountDeletionTaskProcessor,
} = require("../src/account-deletion-task.js");

const UID = "task-user";
const REQUEST_ID = "request_task_0123456789";
const REQUEST = Object.freeze({data: {uid: UID, requestId: REQUEST_ID}});
const STAGE_ORDER = Object.values(DELETION_STAGES);

function createMemoryJobRepository({maxAttempts = 5} = {}) {
  let job = null;
  const failures = [];

  return {
    get job() {
      return job;
    },
    failures,
    async beginAttempt(identity) {
      if (!job) {
        job = {
          ...identity,
          stage: DELETION_STAGES.REQUESTED,
          status: JOB_STATUS.PROCESSING,
          attemptCount: 1,
        };
      } else if (job.status === JOB_STATUS.FAILED_PERMANENT) {
        return {...job, terminal: true};
      } else {
        job = {
          ...job,
          status: JOB_STATUS.PROCESSING,
          attemptCount: job.attemptCount + 1,
        };
      }
      return {...job};
    },
    async saveCheckpoint(checkpoint) {
      if (!job) return {status: "already-completed"};
      if (STAGE_ORDER.indexOf(checkpoint.stage) > STAGE_ORDER.indexOf(job.stage)) {
        job = {...job, stage: checkpoint.stage};
      }
      return {status: "advanced"};
    },
    async removeCompletedJob() {
      job = null;
      return {status: "removed"};
    },
    async recordFailure(failure) {
      failures.push(failure);
      if (!job) return {status: "already-completed"};
      if (job.attemptCount >= maxAttempts) {
        job = {...job, status: JOB_STATUS.FAILED_PERMANENT};
        return {status: JOB_STATUS.FAILED_PERMANENT};
      }
      job = {...job, status: JOB_STATUS.RETRYING};
      return {status: JOB_STATUS.RETRYING};
    },
  };
}

function createOperations(overrides = () => ({})) {
  const calls = [];
  const operations = {
    async acquireWriteLock() {
      calls.push("acquireWriteLock");
    },
    async deleteFirestoreData() {
      calls.push("deleteFirestoreData");
    },
    async verifyFirestoreEmpty() {
      calls.push("verifyFirestoreEmpty");
      return true;
    },
    async sealWriteLock() {
      calls.push("sealWriteLock");
    },
    ...overrides(calls),
  };
  return {calls, operations};
}

test("resumes from the persisted checkpoint after a transient stage failure", async () => {
  const repository = createMemoryJobRepository();
  const {calls, operations} = createOperations(() => ({}));
  let authAttempts = 0;
  const processor = createAccountDeletionTaskProcessor({
    jobRepository: repository,
    deletionOperations: operations,
    async deleteAuthUser() {
      calls.push("deleteAuthUser");
      authAttempts += 1;
      if (authAttempts === 1) throw new Error("temporary auth outage");
    },
  });

  await assert.rejects(processor.process(REQUEST), {
    code: "auth-delete-failed",
  });
  assert.equal(repository.job.stage, DELETION_STAGES.DATA_VERIFIED);

  const result = await processor.process(REQUEST);
  assert.equal(result.status, "completed");
  assert.equal(calls.filter((call) => call === "deleteFirestoreData").length, 1);
  assert.equal(calls.filter((call) => call === "deleteAuthUser").length, 2);
  assert.equal(repository.job, null);
});

test("acks the final failed attempt and retains a permanent sanitized job", async () => {
  const repository = createMemoryJobRepository({maxAttempts: 5});
  const {operations} = createOperations((calls) => ({
    async deleteFirestoreData() {
      calls.push("deleteFirestoreData");
      throw new Error("private provider detail");
    },
  }));
  const processor = createAccountDeletionTaskProcessor({
    jobRepository: repository,
    deletionOperations: operations,
    async deleteAuthUser() {},
  });

  for (let attempt = 1; attempt < 5; attempt += 1) {
    await assert.rejects(processor.process(REQUEST), {
      code: "firestore-delete-failed",
    });
  }
  const finalResult = await processor.process(REQUEST);

  assert.deepEqual(finalResult, {status: JOB_STATUS.FAILED_PERMANENT});
  assert.equal(repository.job.status, JOB_STATUS.FAILED_PERMANENT);
  assert.equal(repository.job.attemptCount, 5);
  assert.equal(JSON.stringify(repository.failures).includes("provider detail"), false);
});

test("handles duplicate task delivery after completion without leaving a job", async () => {
  const repository = createMemoryJobRepository();
  const {calls, operations} = createOperations(() => ({}));
  let authDeletes = 0;
  const processor = createAccountDeletionTaskProcessor({
    jobRepository: repository,
    deletionOperations: operations,
    async deleteAuthUser() {
      authDeletes += 1;
      if (authDeletes > 1) {
        const error = new Error("already gone");
        error.code = "auth/user-not-found";
        throw error;
      }
    },
  });

  assert.equal((await processor.process(REQUEST)).status, "completed");
  assert.equal((await processor.process(REQUEST)).status, "completed");
  assert.equal(repository.job, null);
  assert.equal(calls.filter((call) => call === "deleteFirestoreData").length, 2);
  assert.equal(authDeletes, 2);
});

test("rejects malformed task payloads before creating a job", async () => {
  const repository = createMemoryJobRepository();
  const {operations} = createOperations(() => ({}));
  const processor = createAccountDeletionTaskProcessor({
    jobRepository: repository,
    deletionOperations: operations,
    async deleteAuthUser() {},
  });

  await assert.rejects(
    processor.process({data: {uid: UID, requestId: "short"}}),
    (error) => error instanceof AccountDeletionTaskError &&
      error.code === "invalid-task-payload",
  );
  assert.equal(repository.job, null);
});

test("reconciles a stale job once even when schedules overlap", async () => {
  const candidate = {uid: UID, requestId: REQUEST_ID};
  let claimed = false;
  const enqueued = [];
  const repository = {
    async listReconcilableJobs() {
      return [candidate];
    },
    async claimForReconciliation() {
      if (claimed) return null;
      claimed = true;
      return {action: "enqueue", ...candidate};
    },
    async markRequeued() {},
    async releaseReconciliation() {},
    async listPermanentFailures() {
      return [];
    },
    async ensurePermanentRetention() {
      return false;
    },
  };
  const reconciler = createAccountDeletionReconciler({
    jobRepository: repository,
    async enqueueTask(data) {
      enqueued.push(data);
    },
  });

  const [first, second] = await Promise.all([
    reconciler.reconcile(),
    reconciler.reconcile(),
  ]);
  assert.equal(first.requeued + second.requeued, 1);
  assert.deepEqual(enqueued, [candidate]);
});

test("repairs retention and treats an existing Cloud Task as requeued", async () => {
  const candidate = {uid: UID, requestId: REQUEST_ID};
  let marked = 0;
  const repository = {
    async listReconcilableJobs() {
      return [candidate];
    },
    async claimForReconciliation() {
      return {action: "enqueue", ...candidate};
    },
    async markRequeued() {
      marked += 1;
    },
    async releaseReconciliation() {
      assert.fail("an existing task must not release the reconciliation lease");
    },
    async listPermanentFailures() {
      return [candidate];
    },
    async ensurePermanentRetention() {
      return true;
    },
  };
  const reconciler = createAccountDeletionReconciler({
    jobRepository: repository,
    async enqueueTask() {
      const error = new Error("duplicate");
      error.code = "functions/task-already-exists";
      throw error;
    },
  });

  const summary = await reconciler.reconcile();
  assert.equal(summary.requeued, 1);
  assert.equal(summary.retentionRepaired, 1);
  assert.equal(marked, 1);
});

test("reconciliation closes an exhausted orphan without enqueuing it", async () => {
  const candidate = {uid: UID, requestId: REQUEST_ID};
  const repository = {
    async listReconcilableJobs() {
      return [candidate];
    },
    async claimForReconciliation() {
      return {action: "failed_permanent"};
    },
    async markRequeued() {
      assert.fail("an exhausted job must not be requeued");
    },
    async releaseReconciliation() {
      assert.fail("an exhausted job must not release a lease");
    },
    async listPermanentFailures() {
      return [];
    },
    async ensurePermanentRetention() {
      return false;
    },
  };
  const reconciler = createAccountDeletionReconciler({
    jobRepository: repository,
    async enqueueTask() {
      assert.fail("an exhausted job must not create another Cloud Task");
    },
  });

  const summary = await reconciler.reconcile();
  assert.equal(summary.permanent, 1);
  assert.equal(summary.requeued, 0);
});

test("reconciliation releases its lease after an enqueue outage", async () => {
  const candidate = {uid: UID, requestId: REQUEST_ID};
  let released = 0;
  const repository = {
    async listReconcilableJobs() {
      return [candidate];
    },
    async claimForReconciliation() {
      return {action: "enqueue", ...candidate};
    },
    async markRequeued() {
      assert.fail("a failed enqueue must not be marked requeued");
    },
    async releaseReconciliation() {
      released += 1;
    },
    async listPermanentFailures() {
      return [];
    },
    async ensurePermanentRetention() {
      return false;
    },
  };
  const reconciler = createAccountDeletionReconciler({
    jobRepository: repository,
    async enqueueTask() {
      throw new Error("temporary Cloud Tasks outage");
    },
  });

  const summary = await reconciler.reconcile();
  assert.equal(summary.enqueueFailed, 1);
  assert.equal(released, 1);
});
