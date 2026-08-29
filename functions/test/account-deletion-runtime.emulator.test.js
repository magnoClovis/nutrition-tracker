"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");

const {DELETION_STAGES} = require("../src/account-deletion-engine.js");
const {
  JOB_STATUS,
  createAccountDeletionJobRepository,
} = require("../src/account-deletion-jobs.js");
const {FAILED_JOB_RETENTION_MS} = require("../src/config.js");

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";
const RUN_EMULATOR_TESTS = /^[^:]+:\d+$/.test(EMULATOR_HOST) &&
  /^[^:]+:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || "");

test("task runtime deletes one account and safely accepts duplicate delivery", {
  skip: !RUN_EMULATOR_TESTS,
}, async () => {
  const runtime = require("../src/index.js");
  const auth = getAuth();
  const firestore = getFirestore();
  const uid = "runtime-deletion-user";
  const requestId = "request_runtime_123456789";

  await auth.createUser({uid, email: "runtime-delete@example.test"});
  await firestore.doc(`nutrition/${uid}`).set({profile: true});
  await firestore.doc(`nutrition/${uid}/data/today`).set({calories: 100});
  await firestore
    .doc(`nutrition/${uid}/data/today/details/deep`)
    .set({value: "nested"});
  await firestore.doc(`nutrition/${uid}_legacy`).set({pantry: true});

  const request = {
    data: {uid, requestId},
    retryCount: 0,
    executionCount: 0,
  };
  await Promise.all([
    runtime.processAccountDeletionTask.run(request),
    runtime.processAccountDeletionTask.run({...request, retryCount: 1}),
  ]);

  await assert.rejects(auth.getUser(uid), {code: "auth/user-not-found"});
  assert.equal((await firestore.doc(`nutrition/${uid}`).get()).exists, false);
  assert.equal(
    (await firestore.doc(`nutrition/${uid}/data/today/details/deep`).get()).exists,
    false,
  );
  assert.equal(
    (await firestore.doc(`nutrition/${uid}_legacy`).get()).exists,
    false,
  );
  assert.equal(
    (await firestore.doc(`accountDeletionJobs/${requestId}`).get()).exists,
    false,
  );
  const lock = (await firestore.doc(`accountDeletionLocks/${uid}`).get()).data();
  assert.equal(lock.state, "sealed");
  assert.equal(
    lock.expiresAt.toMillis() - lock.sealedAt.toMillis(),
    FAILED_JOB_RETENTION_MS,
  );

  await runtime.processAccountDeletionTask.run({...request, retryCount: 2});
  assert.equal(
    (await firestore.doc(`accountDeletionJobs/${requestId}`).get()).exists,
    false,
  );
});

test("fifth failed attempt becomes permanent with an exact seven-day TTL", {
  skip: !RUN_EMULATOR_TESTS,
}, async () => {
  require("../src/index.js");
  const firestore = getFirestore();
  const instant = new Date();
  const repository = createAccountDeletionJobRepository({
    firestore,
    now: () => instant,
  });
  const identity = {
    uid: "permanent-failure-user",
    requestId: "request_permanent_123456",
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await repository.beginAttempt(identity);
    await repository.saveCheckpoint({
      ...identity,
      stage: DELETION_STAGES.LOCKED,
    });
    await repository.recordFailure({
      ...identity,
      stage: DELETION_STAGES.LOCKED,
      code: "firestore-delete-failed",
    });
  }

  const snapshot = await firestore
    .doc(`accountDeletionJobs/${identity.requestId}`)
    .get();
  const job = snapshot.data();
  assert.equal(job.status, JOB_STATUS.FAILED_PERMANENT);
  assert.equal(job.attemptCount, 5);
  assert.equal(job.failureCode, "firestore-delete-failed");
  assert.equal(
    job.expiresAt.toMillis() - job.failedAt.toMillis(),
    FAILED_JOB_RETENTION_MS,
  );
  assert.equal(job.reconcileAfter, null);
});
