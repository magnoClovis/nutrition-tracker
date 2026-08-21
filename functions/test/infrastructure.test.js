"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const functionsRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(functionsRoot, "..");
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "firebase.json"), "utf8"),
);
const firebaseProjects = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, ".firebaserc"), "utf8"),
);
const firestoreIndexes = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "firestore.indexes.json"), "utf8"),
);
const functionsPackage = JSON.parse(
  fs.readFileSync(path.join(functionsRoot, "package.json"), "utf8"),
);
const runtimeConfig = require("../src/config.js");

test("pins the C22 backend to Node 22 in Madrid", () => {
  assert.equal(functionsPackage.engines.node, "22");
  assert.equal(firebaseConfig.functions.length, 1);
  assert.equal(firebaseConfig.functions[0].runtime, "nodejs22");
  assert.equal(firebaseConfig.functions[0].source, "functions");
  assert.equal(runtimeConfig.REGION, "europe-southwest1");
});

test("keeps production deployment and emulator identities explicit", () => {
  assert.equal(
    firebaseProjects.projects.production,
    runtimeConfig.PRODUCTION_PROJECT_ID,
  );
  assert.equal(
    firebaseProjects.projects.emulator,
    runtimeConfig.EMULATOR_PROJECT_ID,
  );
  assert.equal(firebaseProjects.projects.default, undefined);
  assert.match(runtimeConfig.EMULATOR_PROJECT_ID, /^demo-/);
});

test("configures isolated Auth, Firestore and Functions emulators", () => {
  assert.deepEqual(firebaseConfig.firestore, {
    rules: "firestore.rules",
    indexes: "firestore.indexes.json",
  });
  assert.equal(firebaseConfig.emulators.auth.port, 9099);
  assert.equal(firebaseConfig.emulators.firestore.port, 8080);
  assert.equal(firebaseConfig.emulators.functions.port, 5001);
  assert.equal(firebaseConfig.emulators.hub.port, 4400);
  assert.equal(firebaseConfig.emulators.ui.enabled, false);
  assert.equal(firebaseConfig.emulators.singleProjectMode, true);
});

test("exposes only the reviewed task and reconciliation handlers", () => {
  const exportedFunctions = require("../src/index.js");
  assert.deepEqual(Object.keys(exportedFunctions).sort(), [
    "processAccountDeletionTask",
    "reconcileAccountDeletionJobs",
  ]);

  const taskEndpoint = exportedFunctions.processAccountDeletionTask.__endpoint;
  assert.deepEqual(taskEndpoint.region, [runtimeConfig.REGION]);
  assert.deepEqual(
    taskEndpoint.taskQueueTrigger.retryConfig,
    runtimeConfig.DELETION_TASK_OPTIONS.retryConfig,
  );
  assert.deepEqual(
    taskEndpoint.taskQueueTrigger.rateLimits,
    runtimeConfig.DELETION_TASK_OPTIONS.rateLimits,
  );

  const scheduleEndpoint =
    exportedFunctions.reconcileAccountDeletionJobs.__endpoint;
  assert.deepEqual(scheduleEndpoint.region, [runtimeConfig.REGION]);
  assert.equal(scheduleEndpoint.scheduleTrigger.schedule, "every 60 minutes");
  assert.equal(scheduleEndpoint.scheduleTrigger.timeZone, "Etc/UTC");
});

test("enables seven-day job expiry through a Firestore TTL field", () => {
  assert.deepEqual(firestoreIndexes.indexes, []);
  assert.deepEqual(firestoreIndexes.fieldOverrides, [
    {
      collectionGroup: runtimeConfig.ACCOUNT_DELETION_JOBS_COLLECTION,
      fieldPath: "expiresAt",
      ttl: true,
      indexes: [],
    },
  ]);
});
