"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LOCK_STATES,
  FirestoreDeletionError,
  createFirestoreAccountDeletionOperations,
} = require("../src/firestore-account-deletion.js");

const JOB = Object.freeze({
  uid: "user-1",
  requestId: "request_0123456789abcdef",
});

function createSnapshot(value) {
  return {
    exists: value !== undefined,
    data: () => value,
  };
}

function createFakeFirestore() {
  const locks = new Map();
  const nutrition = new Map();
  const calls = [];
  let transactionQueue = Promise.resolve();

  function lockRef(uid) {
    return {kind: "lock", id: uid, path: `accountDeletionLocks/${uid}`};
  }

  function nutritionRef(uid) {
    return {
      kind: "nutrition",
      id: uid,
      path: `nutrition/${uid}`,
      async get() {
        return createSnapshot(nutrition.get(uid)?.root);
      },
      async listCollections() {
        const record = nutrition.get(uid);
        if (!record?.children?.length) return [];
        return [{
          limit() {
            return {
              async get() {
                return {empty: record.children.length === 0};
              },
            };
          },
        }];
      },
    };
  }

  const firestore = {
    collection(name) {
      return {
        doc(uid) {
          if (name === "accountDeletionLocks") return lockRef(uid);
          if (name === "nutrition") return nutritionRef(uid);
          throw new Error("unexpected collection");
        },
      };
    },
    async recursiveDelete(reference) {
      calls.push(`recursiveDelete:${reference.path}`);
      nutrition.delete(reference.id);
    },
    runTransaction(callback) {
      const operation = transactionQueue.then(async () => {
        const pending = [];
        const transaction = {
          async get(reference) {
            return createSnapshot(locks.get(reference.id));
          },
          create(reference, value) {
            pending.push(() => {
              if (locks.has(reference.id)) {
                throw new Error("already exists");
              }
              locks.set(reference.id, value);
            });
          },
          update(reference, patch) {
            pending.push(() => {
              locks.set(reference.id, {...locks.get(reference.id), ...patch});
            });
          },
        };
        await callback(transaction);
        pending.forEach(commit => commit());
      });
      transactionQueue = operation.catch(() => {});
      return operation;
    },
  };

  return {calls, firestore, locks, nutrition};
}

test("acquires one idempotent lock under concurrent retries", async () => {
  const fixture = createFakeFirestore();
  const instant = new Date("2026-08-21T10:00:00.000Z");
  const operations = createFirestoreAccountDeletionOperations({
    firestore: fixture.firestore,
    now: () => instant,
  });

  await Promise.all([
    operations.acquireWriteLock(JOB),
    operations.acquireWriteLock(JOB),
  ]);

  assert.deepEqual(fixture.locks.get(JOB.uid), {
    requestId: JOB.requestId,
    state: LOCK_STATES.ACTIVE,
    createdAt: instant,
    updatedAt: instant,
  });
});

test("rejects a competing deletion request without replacing its lock", async () => {
  const fixture = createFakeFirestore();
  const operations = createFirestoreAccountDeletionOperations({
    firestore: fixture.firestore,
  });
  await operations.acquireWriteLock(JOB);

  await assert.rejects(
    operations.acquireWriteLock({...JOB, requestId: "request_competing_123456"}),
    error => error instanceof FirestoreDeletionError &&
      error.code === "deletion-lock-conflict",
  );
  assert.equal(fixture.locks.get(JOB.uid).requestId, JOB.requestId);
});

test("recursively deletes the user tree and verifies root plus children", async () => {
  const fixture = createFakeFirestore();
  fixture.nutrition.set(JOB.uid, {
    children: [{key: "orphaned-descendant"}],
  });
  const operations = createFirestoreAccountDeletionOperations({
    firestore: fixture.firestore,
  });

  assert.equal(await operations.verifyFirestoreEmpty(JOB), false);

  fixture.nutrition.set(JOB.uid, {
    root: {profile: true},
    children: [{key: "day"}, {key: "nested-entry"}],
  });

  assert.equal(await operations.verifyFirestoreEmpty(JOB), false);
  await operations.deleteFirestoreData(JOB);
  assert.equal(await operations.verifyFirestoreEmpty(JOB), true);
  assert.deepEqual(fixture.calls, ["recursiveDelete:nutrition/user-1"]);
});

test("seals only the matching lock and treats a repeated seal as success", async () => {
  const fixture = createFakeFirestore();
  const sealedAt = new Date("2026-08-21T11:00:00.000Z");
  const operations = createFirestoreAccountDeletionOperations({
    firestore: fixture.firestore,
    now: () => sealedAt,
  });
  await operations.acquireWriteLock(JOB);
  await operations.sealWriteLock(JOB);
  await operations.sealWriteLock(JOB);

  assert.deepEqual(fixture.locks.get(JOB.uid), {
    requestId: JOB.requestId,
    state: LOCK_STATES.SEALED,
    createdAt: sealedAt,
    updatedAt: sealedAt,
    sealedAt,
  });
});

test("fails closed for missing, corrupt, or foreign locks", async () => {
  const fixture = createFakeFirestore();
  const operations = createFirestoreAccountDeletionOperations({
    firestore: fixture.firestore,
  });

  await assert.rejects(operations.sealWriteLock(JOB), {
    code: "deletion-lock-missing",
  });

  fixture.locks.set(JOB.uid, {requestId: JOB.requestId, state: "unknown"});
  await assert.rejects(operations.acquireWriteLock(JOB), {
    code: "deletion-lock-corrupt",
  });

  fixture.locks.set(JOB.uid, {
    requestId: "request_competing_123456",
    state: LOCK_STATES.ACTIVE,
  });
  await assert.rejects(operations.sealWriteLock(JOB), {
    code: "deletion-lock-conflict",
  });
});
