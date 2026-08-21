"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {DELETION_STAGES} = require("../src/account-deletion-engine.js");
const {JOB_STATUS} = require("../src/account-deletion-jobs.js");
const {
  AccountDeletionRequestError,
  createAccountDeletionRequestService,
} = require("../src/account-deletion-request.js");
const {LOCK_STATES} = require("../src/firestore-account-deletion.js");

const IDENTITY = Object.freeze({
  uid: "request-user",
  requestId: "request_client_0123456789",
});

function snapshot(value) {
  return {exists: value !== undefined, data: () => value};
}

function createFixture({enqueueError} = {}) {
  const documents = new Map();
  const enqueued = [];
  let transactionQueue = Promise.resolve();
  const firestore = {
    collection(collection) {
      return {
        doc(id) {
          return {path: `${collection}/${id}`};
        },
      };
    },
    runTransaction(callback) {
      const operation = transactionQueue.then(async () => {
        const pending = [];
        const transaction = {
          async get(reference) {
            return snapshot(documents.get(reference.path));
          },
          create(reference, value) {
            pending.push(() => {
              if (documents.has(reference.path)) throw new Error("exists");
              documents.set(reference.path, value);
            });
          },
        };
        const result = await callback(transaction);
        pending.forEach(commit => commit());
        return result;
      });
      transactionQueue = operation.catch(() => {});
      return operation;
    },
  };
  const service = createAccountDeletionRequestService({
    firestore,
    now: () => new Date("2026-08-21T12:00:00.000Z"),
    async enqueueTask(data) {
      enqueued.push(data);
      if (enqueueError) throw enqueueError;
    },
  });
  return {documents, enqueued, service};
}

test("atomically persists the queued job and active lock before dispatch", async () => {
  const fixture = createFixture();
  const result = await fixture.service.request(IDENTITY);

  assert.deepEqual(result, {
    status: "accepted",
    requestId: IDENTITY.requestId,
  });
  assert.deepEqual(fixture.enqueued, [IDENTITY]);
  assert.deepEqual(
    fixture.documents.get(`accountDeletionLocks/${IDENTITY.uid}`),
    {
      requestId: IDENTITY.requestId,
      state: LOCK_STATES.ACTIVE,
      createdAt: new Date("2026-08-21T12:00:00.000Z"),
      updatedAt: new Date("2026-08-21T12:00:00.000Z"),
    },
  );
  assert.deepEqual(
    fixture.documents.get(`accountDeletionJobs/${IDENTITY.requestId}`),
    {
      uid: IDENTITY.uid,
      requestId: IDENTITY.requestId,
      stage: DELETION_STAGES.REQUESTED,
      status: JOB_STATUS.QUEUED,
      attemptCount: 0,
      createdAt: new Date("2026-08-21T12:00:00.000Z"),
      updatedAt: new Date("2026-08-21T12:00:00.000Z"),
      lastAttemptAt: null,
      reconcileAfter: new Date("2026-08-21T12:00:00.000Z"),
      failureCode: null,
      failureStage: null,
      failedAt: null,
      expiresAt: null,
    },
  );
});

test("returns the original request for idempotent and competing client retries", async () => {
  const fixture = createFixture();
  await fixture.service.request(IDENTITY);
  const same = await fixture.service.request(IDENTITY);
  const competing = await fixture.service.request({
    uid: IDENTITY.uid,
    requestId: "request_client_competing_01",
  });

  assert.equal(same.requestId, IDENTITY.requestId);
  assert.equal(competing.requestId, IDENTITY.requestId);
  assert.equal(fixture.documents.size, 2);
  assert.equal(fixture.enqueued.length, 3);
});

test("keeps an accepted durable job reconcilable when initial dispatch fails", async () => {
  const fixture = createFixture({enqueueError: new Error("tasks unavailable")});
  const result = await fixture.service.request(IDENTITY);

  assert.equal(result.status, "accepted");
  assert.equal(
    fixture.documents.get(`accountDeletionJobs/${IDENTITY.requestId}`).status,
    JOB_STATUS.QUEUED,
  );
});

test("rejects malformed identities before writing or dispatching", async () => {
  const fixture = createFixture();
  await assert.rejects(
    fixture.service.request({uid: IDENTITY.uid, requestId: "short"}),
    error => error instanceof AccountDeletionRequestError &&
      error.code === "invalid-deletion-request",
  );
  assert.equal(fixture.documents.size, 0);
  assert.equal(fixture.enqueued.length, 0);
});

const RUN_EMULATOR_TESTS = /^[^:]+:\d+$/.test(
  process.env.FIRESTORE_EMULATOR_HOST || "",
);

test("concurrent emulator requests commit exactly one durable lock and job", {
  skip: !RUN_EMULATOR_TESTS,
}, async () => {
  const {getApps, initializeApp} = require("firebase-admin/app");
  const {getFirestore} = require("firebase-admin/firestore");
  const app = getApps()[0] || initializeApp({projectId: "demo-trofia-c22"});
  const firestore = getFirestore(app);
  const enqueued = [];
  const service = createAccountDeletionRequestService({
    firestore,
    async enqueueTask(data) { enqueued.push(data); },
  });
  const identity = {
    uid: "request-emulator-user",
    requestId: "request_emulator_0123456",
  };

  const results = await Promise.all([
    service.request(identity),
    service.request(identity),
  ]);
  assert.equal(results.every(result => result.status === "accepted"), true);
  assert.equal(enqueued.length, 2);
  const lock = await firestore.doc(`accountDeletionLocks/${identity.uid}`).get();
  const job = await firestore.doc(`accountDeletionJobs/${identity.requestId}`).get();
  assert.equal(lock.data().requestId, identity.requestId);
  assert.equal(job.data().uid, identity.uid);
  assert.equal(job.data().attemptCount, 0);
});
