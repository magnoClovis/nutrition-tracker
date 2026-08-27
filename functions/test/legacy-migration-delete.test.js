"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  executeLegacyDeletion,
  groupOperationsBySource,
} = require("../src/legacy-migration-delete.js");
const {
  DELETE_CONFIRMATION,
  parseArguments,
  parseManagedExportUri,
  verifyManagedExport,
} = require("../scripts/c23-legacy-delete.js");

function createMemoryAdapter({sources, root = {}, data = {}, beforeCommit} = {}) {
  const uid = "account-uid";
  const legacy = new Map(Object.entries(sources));
  const canonicalRoot = {...root};
  const canonicalData = new Map(Object.entries(data));
  let transactionCalls = 0;
  const adapter = {
    legacy,
    get transactionCalls() { return transactionCalls; },
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
      return legacy.has(operation.sourceKey) ?
        {exists: true, data: {value: legacy.get(operation.sourceKey)}} :
        {exists: false, data: null};
    },
    async readTarget(operation) {
      if (operation.location === "root") {
        return {exists: true, value: canonicalRoot[operation.target]};
      }
      return canonicalData.has(operation.target) ?
        {exists: true, value: canonicalData.get(operation.target)} :
        {exists: false, value: undefined};
    },
    async writeTargetTransaction() {
      throw new Error("copy must not run during deletion");
    },
    async deleteVerifiedSourcesTransaction(groups) {
      transactionCalls++;
      if (beforeCommit) await beforeCommit({canonicalData, canonicalRoot, legacy});
      for (const group of groups) {
        assert.equal(legacy.get(group.operations[0].sourceKey), group.sourceValue);
        for (const operation of group.operations) {
          const actual = operation.location === "root" ?
            canonicalRoot[operation.target] : canonicalData.get(operation.target);
          if (JSON.stringify(actual) !== JSON.stringify(operation.desiredValue)) {
            const error = new Error("transaction-destination-changed");
            error.code = "transaction-destination-changed";
            throw error;
          }
        }
      }
      for (const group of groups) legacy.delete(group.operations[0].sourceKey);
    },
  };
  return adapter;
}

test("deletes every verified source atomically and proves the final count is zero", async () => {
  const adapter = createMemoryAdapter({
    sources: {userName: "Ada", waterGoal: "2500"},
    root: {userName: "Ada"},
    data: {waterGoal: "2500"},
  });
  const result = await executeLegacyDeletion({
    adapter,
    expectedLegacyDocuments: 2,
  });
  assert.deepEqual(result, {
    mode: "verified-atomic-delete",
    verifiedLegacyDocuments: 2,
    deletedLegacyDocuments: 2,
    remainingLegacyDocuments: 0,
    canonicalAccounts: 1,
  });
  assert.equal(adapter.transactionCalls, 1);
  assert.equal(adapter.legacy.size, 0);
});

test("never starts deletion when a destination is missing or the count changes", async () => {
  const missing = createMemoryAdapter({sources: {userName: "Ada"}});
  await assert.rejects(
    executeLegacyDeletion({adapter: missing, expectedLegacyDocuments: 1}),
    error => error.code === "destination-verification-failed",
  );
  assert.equal(missing.transactionCalls, 0);
  assert.equal(missing.legacy.size, 1);

  const changedCount = createMemoryAdapter({
    sources: {userName: "Ada"},
    root: {userName: "Ada"},
  });
  await assert.rejects(
    executeLegacyDeletion({adapter: changedCount, expectedLegacyDocuments: 54}),
    error => error.code === "legacy-document-count-changed",
  );
  assert.equal(changedCount.transactionCalls, 0);
});

test("a destination changed at commit time aborts the whole deletion", async () => {
  const adapter = createMemoryAdapter({
    sources: {userName: "Ada", waterGoal: "2500"},
    root: {userName: "Ada"},
    data: {waterGoal: "2500"},
    beforeCommit({canonicalData}) {
      canonicalData.set("waterGoal", "1800");
    },
  });
  await assert.rejects(
    executeLegacyDeletion({adapter, expectedLegacyDocuments: 2}),
    error => error.code === "transaction-destination-changed",
  );
  assert.equal(adapter.transactionCalls, 1);
  assert.equal(adapter.legacy.size, 2);
});

test("groups every destination produced by one composite legacy source", () => {
  const groups = groupOperationsBySource([
    {sourceId: "uid_userGoal", sourceValue: "value", target: "goalType"},
    {sourceId: "uid_userGoal", sourceValue: "value", target: "goalKg"},
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].operations.length, 2);
});

test("CLI requires project, export and exact destructive confirmations", () => {
  assert.throws(() => parseArguments([]), /exact-project-confirmation-required/);
  const argumentsList = [
    "--project", "nutrition-tracker-780b3",
    "--confirm-project", "nutrition-tracker-780b3",
    "--expected-legacy-documents", "54",
    "--confirmed-export-uri",
    "gs://trofia-firestore-exports-128834310181/c23-export",
    "--confirm-delete", DELETE_CONFIRMATION,
    "--firebase-cli-session",
  ];
  assert.deepEqual(parseArguments(argumentsList), {
    pageSize: 200,
    projectId: "nutrition-tracker-780b3",
    confirmProject: "nutrition-tracker-780b3",
    expectedLegacyDocuments: 54,
    confirmedExportUri:
      "gs://trofia-firestore-exports-128834310181/c23-export",
    confirmDelete: DELETE_CONFIRMATION,
    firebaseCliSession: true,
  });
  assert.throws(
    () => parseArguments(argumentsList.slice(0, -3)),
    /exact-delete-confirmation-required/,
  );
  assert.deepEqual(parseManagedExportUri("gs://safe-bucket/export"), {
    bucket: "safe-bucket",
    prefix: "export",
  });
});

test("managed export verification requires the overall manifest", async () => {
  const storage = files => ({
    bucket(name) {
      assert.equal(name, "safe-bucket");
      return {async getFiles(options) {
        assert.equal(options.prefix, "export/");
        return [files.map(file => ({name: file}))];
      }};
    },
  });
  await assert.rejects(
    verifyManagedExport(storage(["export/data"]), "gs://safe-bucket/export"),
    error => error.code === "managed-export-manifest-not-found",
  );
  const result = await verifyManagedExport(
    storage(["export/export.overall_export_metadata", "export/data"]),
    "gs://safe-bucket/export",
  );
  assert.equal(result.objectCount, 2);
});
