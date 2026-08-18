"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DELETION_STAGES,
  DeletionSagaError,
  executeDeletionSaga,
  validateJob,
} = require("../src/account-deletion-engine.js");

const REQUEST_ID = "request_0123456789abcdef";
const UID = "test-user";

function createPorts(overrides = {}) {
  const calls = [];
  const checkpoints = [];
  const failures = [];
  const ports = {
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
    async deleteAuthUser() {
      calls.push("deleteAuthUser");
    },
    async sealWriteLock() {
      calls.push("sealWriteLock");
    },
    async saveCheckpoint(job) {
      calls.push(`saveCheckpoint:${job.stage}`);
      checkpoints.push(job);
    },
    async removeCompletedJob() {
      calls.push("removeCompletedJob");
    },
    async recordFailure(failure) {
      calls.push("recordFailure");
      failures.push(failure);
    },
    ...overrides,
  };

  return {calls, checkpoints, failures, ports};
}

function jobAt(stage) {
  return {uid: UID, requestId: REQUEST_ID, stage};
}

test("runs the fail-closed saga in its required order", async () => {
  const {calls, checkpoints, failures, ports} = createPorts();

  const result = await executeDeletionSaga(
    jobAt(DELETION_STAGES.REQUESTED),
    ports,
  );

  assert.deepEqual(result, {
    status: "completed",
    uid: UID,
    requestId: REQUEST_ID,
  });
  assert.deepEqual(calls, [
    "acquireWriteLock",
    "saveCheckpoint:locked",
    "deleteFirestoreData",
    "saveCheckpoint:data_deleted",
    "verifyFirestoreEmpty",
    "saveCheckpoint:data_verified",
    "deleteAuthUser",
    "saveCheckpoint:auth_deleted",
    "sealWriteLock",
    "saveCheckpoint:lock_sealed",
    "removeCompletedJob",
  ]);
  assert.deepEqual(
    checkpoints.map(({stage}) => stage),
    ["locked", "data_deleted", "data_verified", "auth_deleted", "lock_sealed"],
  );
  assert.deepEqual(failures, []);
});

test("resumes monotonically from every persisted checkpoint", async () => {
  const expectedFirstCall = new Map([
    [DELETION_STAGES.REQUESTED, "acquireWriteLock"],
    [DELETION_STAGES.LOCKED, "deleteFirestoreData"],
    [DELETION_STAGES.DATA_DELETED, "verifyFirestoreEmpty"],
    [DELETION_STAGES.DATA_VERIFIED, "deleteAuthUser"],
    [DELETION_STAGES.AUTH_DELETED, "sealWriteLock"],
    [DELETION_STAGES.LOCK_SEALED, "removeCompletedJob"],
  ]);

  for (const [stage, firstCall] of expectedFirstCall) {
    const {calls, ports} = createPorts();
    const result = await executeDeletionSaga(jobAt(stage), ports);
    assert.equal(result.status, "completed");
    assert.equal(calls[0], firstCall, `resume from ${stage}`);
  }
});

test("never deletes Auth when Firestore verification reports remaining data", async () => {
  const {calls, failures, ports} = createPorts({
    async verifyFirestoreEmpty() {
      calls.push("verifyFirestoreEmpty");
      return false;
    },
  });

  await assert.rejects(
    executeDeletionSaga(jobAt(DELETION_STAGES.DATA_DELETED), ports),
    (error) =>
      error instanceof DeletionSagaError &&
      error.code === "firestore-data-remains" &&
      error.stage === DELETION_STAGES.DATA_DELETED,
  );
  assert.equal(calls.includes("deleteAuthUser"), false);
  assert.deepEqual(failures, [
    {
      uid: UID,
      requestId: REQUEST_ID,
      stage: DELETION_STAGES.DATA_DELETED,
      code: "firestore-data-remains",
    },
  ]);
});

test("never deletes Auth when Firestore verification cannot list data", async () => {
  const {calls, failures, ports} = createPorts({
    async verifyFirestoreEmpty() {
      calls.push("verifyFirestoreEmpty");
      throw new Error("permission denied with private details");
    },
  });

  await assert.rejects(
    executeDeletionSaga(jobAt(DELETION_STAGES.DATA_DELETED), ports),
    {code: "firestore-verification-failed"},
  );
  assert.equal(calls.includes("deleteAuthUser"), false);
  assert.deepEqual(Object.keys(failures[0]).sort(), [
    "code",
    "requestId",
    "stage",
    "uid",
  ]);
  assert.equal(JSON.stringify(failures).includes("private details"), false);
});

test("treats an already missing Auth user as an idempotent success", async () => {
  const {calls, failures, ports} = createPorts({
    async deleteAuthUser() {
      calls.push("deleteAuthUser");
      const error = new Error("already deleted");
      error.code = "auth/user-not-found";
      throw error;
    },
  });

  const result = await executeDeletionSaga(
    jobAt(DELETION_STAGES.DATA_VERIFIED),
    ports,
  );

  assert.equal(result.status, "completed");
  assert.equal(calls.includes("sealWriteLock"), true);
  assert.deepEqual(failures, []);
});

test("stops on an unexpected Auth failure and keeps a sanitized retry record", async () => {
  const {calls, failures, ports} = createPorts({
    async deleteAuthUser() {
      calls.push("deleteAuthUser");
      const error = new Error("sensitive provider response");
      error.code = "auth/internal-error";
      throw error;
    },
  });

  await assert.rejects(
    executeDeletionSaga(jobAt(DELETION_STAGES.DATA_VERIFIED), ports),
    {code: "auth-delete-failed"},
  );
  assert.equal(calls.includes("sealWriteLock"), false);
  assert.deepEqual(failures[0], {
    uid: UID,
    requestId: REQUEST_ID,
    stage: DELETION_STAGES.DATA_VERIFIED,
    code: "auth-delete-failed",
  });
  assert.equal(JSON.stringify(failures).includes("provider response"), false);
});

test("does not advance when persisting a checkpoint fails", async () => {
  const {calls, failures, ports} = createPorts({
    async saveCheckpoint(job) {
      calls.push(`saveCheckpoint:${job.stage}`);
      throw new Error("write unavailable");
    },
  });

  await assert.rejects(
    executeDeletionSaga(jobAt(DELETION_STAGES.REQUESTED), ports),
    {code: "checkpoint-failed", stage: DELETION_STAGES.LOCKED},
  );
  assert.deepEqual(calls, [
    "acquireWriteLock",
    "saveCheckpoint:locked",
    "recordFailure",
  ]);
  assert.equal(failures[0].code, "checkpoint-failed");
});

test("halts at every failed side effect without entering the next stage", async () => {
  const cases = [
    {
      stage: DELETION_STAGES.REQUESTED,
      port: "acquireWriteLock",
      code: "write-lock-failed",
      forbidden: "deleteFirestoreData",
    },
    {
      stage: DELETION_STAGES.LOCKED,
      port: "deleteFirestoreData",
      code: "firestore-delete-failed",
      forbidden: "verifyFirestoreEmpty",
    },
    {
      stage: DELETION_STAGES.AUTH_DELETED,
      port: "sealWriteLock",
      code: "write-lock-seal-failed",
      forbidden: "removeCompletedJob",
    },
  ];

  for (const {stage, port, code, forbidden} of cases) {
    const context = createPorts();
    context.ports[port] = async () => {
      context.calls.push(port);
      throw new Error("private transient detail");
    };

    await assert.rejects(executeDeletionSaga(jobAt(stage), context.ports), {
      code,
      stage,
    });
    assert.equal(context.calls.includes(forbidden), false, `${port} must halt`);
    assert.equal(JSON.stringify(context.failures).includes("private transient"), false);
  }
});

test("retries final job removal without repeating destructive operations", async () => {
  const {calls, failures, ports} = createPorts({
    async removeCompletedJob() {
      calls.push("removeCompletedJob");
      throw new Error("temporary outage");
    },
  });

  await assert.rejects(
    executeDeletionSaga(jobAt(DELETION_STAGES.LOCK_SEALED), ports),
    {code: "job-finalization-failed"},
  );
  assert.deepEqual(calls, ["removeCompletedJob", "recordFailure"]);
  assert.equal(failures[0].stage, DELETION_STAGES.LOCK_SEALED);
});

test("rejects corrupt jobs before any side effect", async () => {
  const {calls, ports} = createPorts();

  await assert.rejects(
    executeDeletionSaga(jobAt("completed-ish"), ports),
    {code: "invalid-stage", stage: "validation"},
  );
  assert.deepEqual(calls, []);
});

test("validates identifiers without rewriting historical Firebase UIDs", () => {
  const job = validateJob({
    uid: "firebase uid with spaces/and-symbols@example.com",
    requestId: REQUEST_ID,
    stage: DELETION_STAGES.REQUESTED,
  });
  assert.equal(job.uid, "firebase uid with spaces/and-symbols@example.com");

  assert.throws(
    () => validateJob({...job, uid: ""}),
    {code: "invalid-uid"},
  );
  assert.throws(
    () => validateJob({...job, requestId: "short"}),
    {code: "invalid-request-id"},
  );
});
