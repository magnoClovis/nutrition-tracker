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
  assert.deepEqual(firebaseConfig.firestore, {rules: "firestore.rules"});
  assert.equal(firebaseConfig.emulators.auth.port, 9099);
  assert.equal(firebaseConfig.emulators.firestore.port, 8080);
  assert.equal(firebaseConfig.emulators.functions.port, 5001);
  assert.equal(firebaseConfig.emulators.hub.port, 4400);
  assert.equal(firebaseConfig.emulators.ui.enabled, false);
  assert.equal(firebaseConfig.emulators.singleProjectMode, true);
});

test("does not expose a callable or task handler before the destructive slice", () => {
  const exportedFunctions = require("../src/index.js");
  assert.deepEqual(exportedFunctions, {});
});
