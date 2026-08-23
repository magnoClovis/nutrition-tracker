"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createAdminCopyAdapter,
  executeLegacyCopy,
  mergeStructured,
  normalizeProfileValue,
} = require("../src/legacy-migration-copy.js");
const {parseArguments, usage} = require("../scripts/c23-legacy-copy.js");

function createMemoryAdapter({uid = "account-uid", sources, root = {}, data = {}}) {
  const legacy = new Map(Object.entries(sources));
  const canonicalRoot = {...root};
  const canonicalData = new Map(Object.entries(data));
  const writes = [];
  return {
    writes,
    legacy,
    canonicalRoot,
    canonicalData,
    async listAuthUsersPage() {
      return {items: [{uid}], complete: true, nextCursor: null};
    },
    async listNutritionDocumentsPage() {
      return {
        items: [
          {id: uid, data: {...canonicalRoot}},
          ...[...legacy].map(([key, value]) => ({
            id: `${uid}_${key}`,
            data: {value},
          })),
        ],
        complete: true,
        nextCursor: null,
      };
    },
    async getDataDocument(readUid, key) {
      assert.equal(readUid, uid);
      return canonicalData.has(key) ?
        {exists: true, data: {value: canonicalData.get(key)}} :
        {exists: false, data: null};
    },
    async readSource(operation) {
      return legacy.has(operation.sourceKey) ? {
        exists: true,
        data: {value: legacy.get(operation.sourceKey)},
      } : {exists: false, data: null};
    },
    async readTarget(operation) {
      if (operation.location === "root") {
        return {
          exists: true,
          value: canonicalRoot[operation.target],
        };
      }
      return canonicalData.has(operation.target) ?
        {exists: true, value: canonicalData.get(operation.target)} :
        {exists: false, value: undefined};
    },
    async writeTargetTransaction(operation) {
      assert.equal(legacy.get(operation.sourceKey), operation.sourceValue);
      writes.push(operation.target);
      if (operation.location === "root") {
        canonicalRoot[operation.target] = operation.desiredValue;
      } else {
        canonicalData.set(operation.target, operation.desiredValue);
      }
    },
  };
}

test("copies missing targets, merges identified arrays and verifies every source", async () => {
  const pantryLegacy = JSON.stringify([
    {id: "shared", name: "Legacy", calories: 10},
    {id: "legacy-only", name: "Only legacy", calories: 20},
  ]);
  const pantryCanonical = JSON.stringify([
    {id: "shared", name: "Canonical", calories: 30},
    {id: "canonical-only", name: "Only canonical", calories: 40},
  ]);
  const adapter = createMemoryAdapter({
    sources: {userName: "Ada", pantry: pantryLegacy},
    data: {pantry_v2: pantryCanonical},
  });

  const result = await executeLegacyCopy({
    adapter,
    expectedLegacyDocuments: 2,
  });

  assert.deepEqual(result, {
    mode: "copy-and-verify",
    legacyDocuments: 2,
    targetOperations: 2,
    writtenTargets: 2,
    identicalTargets: 0,
    verifiedLegacyDocuments: 2,
    legacyDocumentsDeleted: 0,
  });
  assert.equal(adapter.canonicalRoot.userName, "Ada");
  assert.deepEqual(JSON.parse(adapter.canonicalData.get("pantry_v2")), [
    {id: "shared", name: "Canonical", calories: 30},
    {id: "canonical-only", name: "Only canonical", calories: 40},
    {id: "legacy-only", name: "Only legacy", calories: 20},
  ]);
  assert.equal(adapter.legacy.size, 2);
  assert.deepEqual(adapter.writes.sort(), ["pantry_v2", "userName"]);
});

test("stops before every write on unresolved or changed state", async () => {
  const conflict = createMemoryAdapter({
    sources: {userName: "Legacy"},
    root: {userName: "Canonical"},
  });
  await assert.rejects(
    executeLegacyCopy({adapter: conflict, expectedLegacyDocuments: 1}),
    error => error.code === "dry-run-not-ready-for-copy",
  );
  assert.deepEqual(conflict.writes, []);

  const changed = createMemoryAdapter({sources: {userName: "Ada"}});
  const originalReadTarget = changed.readTarget;
  let calls = 0;
  changed.readTarget = async operation => {
    calls++;
    if (calls === 1) return {exists: true, value: "changed-after-plan"};
    return originalReadTarget(operation);
  };
  await assert.rejects(
    executeLegacyCopy({adapter: changed, expectedLegacyDocuments: 1}),
    error => error.code === "preflight-state-changed",
  );
  assert.deepEqual(changed.writes, []);
});

test("structured merge requires stable array identities and keeps canonical overlap", () => {
  assert.throws(
    () => mergeStructured([{calories: 1}], [{calories: 2}]),
    error => error.code === "array-item-without-stable-identity",
  );
  assert.deepEqual(
    mergeStructured({legacyOnly: 1, nested: {a: 1, shared: "legacy"}}, {
      canonicalOnly: 2,
      nested: {b: 2, shared: "canonical"},
    }),
    {
      legacyOnly: 1,
      canonicalOnly: 2,
      nested: {a: 1, b: 2, shared: "canonical"},
    },
  );
});

test("normalizes historical profile aliases before canonical storage", () => {
  assert.equal(normalizeProfileValue("gender", "Feminino"), "female");
  assert.equal(normalizeProfileValue("activityLevel", "moderado"), "moderate");
  assert.equal(normalizeProfileValue("goalType", "lose_weight"), "loss");
  assert.equal(normalizeProfileValue("height", "172"), 172);
});

test("copy CLI requires exact project and expected document confirmations", () => {
  assert.throws(() => parseArguments([]), /exact-project-confirmation-required/);
  assert.throws(
    () => parseArguments([
      "--project", "production-project",
      "--confirm-project", "other-project",
      "--expected-legacy-documents", "54",
    ]),
    /exact-project-confirmation-required/,
  );
  assert.throws(
    () => parseArguments([
      "--project", "production-project",
      "--confirm-project", "production-project",
    ]),
    /expected-legacy-count-required/,
  );
  assert.deepEqual(parseArguments([
    "--project", "nutrition-tracker-780b3",
    "--confirm-project", "nutrition-tracker-780b3",
    "--expected-legacy-documents", "54",
    "--firebase-cli-session",
  ]), {
    pageSize: 200,
    projectId: "nutrition-tracker-780b3",
    confirmProject: "nutrition-tracker-780b3",
    expectedLegacyDocuments: 54,
    firebaseCliSession: true,
  });
  assert.match(usage(), /without modifying or deleting legacy documents/);
  assert.match(usage(), /fail-closed preflight/);
});

test("Admin copy adapter exposes reads and transactional set but no deletion API", () => {
  const adapter = createAdminCopyAdapter({
    auth: {async listUsers() {}},
    firestore: {
      collection() {},
      async runTransaction() {},
    },
    documentIdField: "__name__",
  });
  assert.deepEqual(Object.keys(adapter).sort(), [
    "getDataDocument",
    "listAuthUsersPage",
    "listNutritionDocumentsPage",
    "readSource",
    "readTarget",
    "writeTargetTransaction",
  ]);
  assert.equal(adapter.delete, undefined);
  assert.equal(Object.isFrozen(adapter), true);
});
