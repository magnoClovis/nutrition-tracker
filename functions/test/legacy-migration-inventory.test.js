"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LegacyInventoryError,
  buildLegacyMigrationInventory,
  classifyLegacyKey,
  classifyTargetConflict,
  collectCompletePages,
  createAdminReadAdapter,
  extractLegacyIdentity,
} = require("../src/legacy-migration-inventory.js");

function pageReader(pages) {
  let index = 0;
  return async () => pages[index++];
}

test("collects every page and rejects incomplete or cyclic pagination", async () => {
  const complete = await collectCompletePages(pageReader([
    {items: [1, 2], complete: false, nextCursor: "page-2"},
    {items: [3], complete: true, nextCursor: null},
  ]), {pageSize: 2});
  assert.deepEqual(complete, [1, 2, 3]);

  await assert.rejects(
    collectCompletePages(pageReader([
      {items: [], complete: false, nextCursor: "page-2"},
    ])),
    error => error instanceof LegacyInventoryError &&
      error.code === "incomplete-pagination",
  );

  await assert.rejects(
    collectCompletePages(pageReader([
      {items: [1], complete: false, nextCursor: "repeat"},
      {items: [2], complete: false, nextCursor: "repeat"},
    ])),
    error => error instanceof LegacyInventoryError &&
      error.code === "pagination-cycle",
  );
});

test("classifies fixed, alias, composite and unlimited historical keys", () => {
  assert.deepEqual(classifyLegacyKey("userBirth"), {
    known: true,
    category: "alias-root",
    location: "root",
    targets: ["birthDate"],
  });
  assert.deepEqual(classifyLegacyKey("pantry"), {
    known: true,
    category: "alias-data",
    location: "data",
    targets: ["pantry_v2"],
  });
  assert.deepEqual(classifyLegacyKey("userGoal"), {
    known: true,
    category: "composite-profile",
    location: "root",
    targets: ["goalType", "goalKg", "goalWeeks"],
  });
  assert.equal(classifyLegacyKey("log_v2_2000-01-01").known, true);
  assert.equal(classifyLegacyKey("notes_2024-02-29").known, true);
  assert.equal(classifyLegacyKey("notes_2023-02-29").known, false);
  assert.equal(classifyLegacyKey("unrecognized").known, false);
});

test("uses the longest authenticated UID prefix without confusing canonical roots", () => {
  const uids = new Set(["user", "user_with_suffix"]);
  assert.deepEqual(
    extractLegacyIdentity("user_with_suffix", uids),
    {kind: "canonical", uid: "user_with_suffix"},
  );
  assert.deepEqual(
    extractLegacyIdentity("user_with_suffix_pantry", uids),
    {kind: "legacy", uid: "user_with_suffix", key: "pantry"},
  );
  assert.deepEqual(
    extractLegacyIdentity("deleted-user_pantry", uids),
    {kind: "unclassified"},
  );
});

test("classifies target equality and every conservative conflict category", () => {
  assert.equal(classifyTargetConflict("[]", undefined), "target-missing");
  assert.equal(classifyTargetConflict(undefined, undefined), "invalid-legacy-value");
  assert.equal(
    classifyTargetConflict('{"b":2,"a":1}', '{"a":1,"b":2}'),
    "identical",
  );
  assert.equal(classifyTargetConflict("[1]", "[2]"), "merge-required");
  assert.equal(classifyTargetConflict('{"a":1}', '{"a":2}'), "merge-required");
  assert.equal(classifyTargetConflict("old", "new"), "scalar-conflict");
  assert.equal(classifyTargetConflict("[]", "value"), "type-conflict");
});

test("builds a sanitized read-only inventory across Auth and Firestore pages", async () => {
  const uid = "sensitive-user-id";
  const secretValue = "private nutrition value";
  const authPages = [
    {items: [{uid}], complete: false, nextCursor: "auth-2"},
    {items: [{uid: "second-user"}], complete: true, nextCursor: null},
  ];
  const nutritionPages = [
    {
      items: [
        {id: uid, data: {userName: "Current name", goalType: "lose"}},
        {id: `${uid}_userName`, data: {value: "Current name"}},
      ],
      complete: false,
      nextCursor: "nutrition-2",
    },
    {
      items: [
        {id: `${uid}_pantry`, data: {value: secretValue}},
        {
          id: `${uid}_userGoal`,
          data: {value: JSON.stringify({goalType: "lose", goalKg: 5})},
        },
      ],
      complete: true,
      nextCursor: null,
    },
  ];
  const calls = [];
  const reader = {
    async listAuthUsersPage() {
      calls.push("auth-read");
      return authPages.shift();
    },
    async listNutritionDocumentsPage() {
      calls.push("nutrition-read");
      return nutritionPages.shift();
    },
    async getDataDocument(readUid, key) {
      calls.push(`data-read:${key}`);
      assert.equal(readUid, uid);
      assert.equal(key, "pantry_v2");
      return {exists: true, data: {value: "[]"}};
    },
    async write() {
      throw new Error("write must never be called");
    },
  };

  const report = await buildLegacyMigrationInventory({reader, pageSize: 2});
  assert.equal(report.mode, "dry-run");
  assert.equal(report.readOnly, true);
  assert.equal(report.complete, true);
  assert.equal(report.readyForCopy, false);
  assert.deepEqual(report.counts, {
    authUsers: 2,
    nutritionDocuments: 4,
    canonicalAccounts: 1,
    legacyDocuments: 3,
    accountsWithLegacy: 1,
    unclassifiedDocuments: 0,
    unknownKeys: 0,
    targetReads: 1,
    blockingConflicts: 1,
  });
  assert.deepEqual(report.byKeyCategory, {
    profile: 1,
    "alias-data": 1,
    "composite-profile": 1,
  });
  assert.deepEqual(report.byConflict, {
    identical: 2,
    "type-conflict": 1,
    "target-missing": 1,
  });
  assert.equal(calls.includes("write"), false);

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(uid), false);
  assert.equal(serialized.includes(secretValue), false);
});

test("fails closed and only emits fingerprints for unknown and unowned documents", async () => {
  const uid = "known-user";
  const reader = {
    async listAuthUsersPage() {
      return {items: [{uid}], complete: true, nextCursor: null};
    },
    async listNutritionDocumentsPage() {
      return {
        items: [
          {id: `${uid}_private_custom_key`, data: {value: "secret"}},
          {id: "deleted-user_private_key", data: {value: "other secret"}},
        ],
        complete: true,
        nextCursor: null,
      };
    },
    async getDataDocument() {
      throw new Error("unknown keys must not read targets");
    },
  };

  const report = await buildLegacyMigrationInventory({reader});
  assert.equal(report.complete, false);
  assert.equal(report.readyForCopy, false);
  assert.equal(report.counts.unknownKeys, 1);
  assert.equal(report.counts.unclassifiedDocuments, 1);
  assert.match(report.blockers.unknownKeyFingerprints[0], /^[a-f0-9]{12}$/);
  assert.match(
    report.blockers.unclassifiedDocumentFingerprints[0],
    /^[a-f0-9]{12}$/,
  );
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("private_custom_key"), false);
  assert.equal(serialized.includes("deleted-user"), false);
  assert.equal(serialized.includes("secret"), false);
});

test("rejects malformed pages and malformed authenticated users", async () => {
  await assert.rejects(
    buildLegacyMigrationInventory({
      reader: {
        async listAuthUsersPage() {
          return {items: [{}], complete: true, nextCursor: null};
        },
        async listNutritionDocumentsPage() {
          return {items: [], complete: true, nextCursor: null};
        },
        async getDataDocument() {
          return {exists: false};
        },
      },
    }),
    error => error.code === "invalid-auth-user",
  );
});

test("Admin adapter exposes only paginated reads and never a mutation method", async () => {
  const queryCalls = [];
  const documentReads = [];
  const query = {
    select(...fields) {
      queryCalls.push(["select", ...fields]);
      return this;
    },
    orderBy(field) {
      queryCalls.push(["orderBy", field]);
      return this;
    },
    limit(size) {
      queryCalls.push(["limit", size]);
      return this;
    },
    startAfter(cursor) {
      queryCalls.push(["startAfter", cursor]);
      return this;
    },
    async get() {
      return {
        docs: [
          {id: "uid_pantry", data: () => ({value: "[]"})},
        ],
      };
    },
    doc(uid) {
      return {
        collection(name) {
          return {
            doc(key) {
              return {
                async get() {
                  documentReads.push([uid, name, key]);
                  return {exists: true, data: () => ({value: "[]"})};
                },
              };
            },
          };
        },
      };
    },
  };
  const auth = {
    async listUsers(size, cursor) {
      assert.equal(size, 10);
      assert.equal(cursor, "auth-cursor");
      return {users: [{uid: "uid"}], pageToken: "next-auth"};
    },
  };
  const firestore = {
    collection(name) {
      assert.equal(name, "nutrition");
      return query;
    },
  };
  const adapter = createAdminReadAdapter({
    auth,
    firestore,
    documentIdField: "__name__",
  });

  assert.deepEqual(Object.keys(adapter).sort(), [
    "getDataDocument",
    "listAuthUsersPage",
    "listNutritionDocumentsPage",
  ]);
  assert.equal(Object.isFrozen(adapter), true);
  assert.deepEqual(
    await adapter.listAuthUsersPage({cursor: "auth-cursor", pageSize: 10}),
    {
      items: [{uid: "uid"}],
      complete: false,
      nextCursor: "next-auth",
    },
  );
  assert.deepEqual(
    await adapter.listNutritionDocumentsPage({cursor: "uid", pageSize: 10}),
    {
      items: [{id: "uid_pantry", data: {value: "[]"}}],
      complete: true,
      nextCursor: "uid_pantry",
    },
  );
  assert.deepEqual(await adapter.getDataDocument("uid", "pantry_v2"), {
    exists: true,
    data: {value: "[]"},
  });
  assert.deepEqual(queryCalls, [
    [
      "select",
      "value",
      "activityLevel",
      "birthDate",
      "bodyFatGoal",
      "gender",
      "goalKg",
      "goalType",
      "goalWeeks",
      "height",
      "language",
      "lastActivityAt",
      "lastLoginAt",
      "manualCalorieAdjustment",
      "proteinMultiplier",
      "tutorial_most_recent_version_seen",
      "tutorialSeen",
      "tutorialSeen_adicionar",
      "tutorialSeen_despensa",
      "tutorialSeen_diario",
      "tutorialSeen_main",
      "tutorialSeen_metricas",
      "tutorialSeen_semana",
      "userName",
    ],
    ["orderBy", "__name__"],
    ["limit", 10],
    ["startAfter", "uid"],
  ]);
  assert.deepEqual(documentReads, [["uid", "data", "pantry_v2"]]);
});
