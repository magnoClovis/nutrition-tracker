"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildFirestoreSchemaInventory,
  classifyDataKey,
  createAdminSchemaReadAdapter,
  parseCanonicalPath,
  valueType,
} = require("../src/firestore-schema-inventory.js");
const {sanitizedError} = require("../scripts/c14-schema-inventory.js");

function paged(items) {
  return async ({cursor, pageSize}) => {
    const start = cursor === null ? 0 : Number(cursor);
    const page = items.slice(start, start + pageSize);
    const next = start + page.length;
    return {items: page, complete: next >= items.length, nextCursor: String(next)};
  };
}

function fixture(overrides = {}) {
  const groups = {
    data: [
      {path: "nutrition/user-1/data/pantry_v2", data: {value: "[]"}},
      {path: "nutrition/user-1/data/log_v2_2026-09-01", data: {value: "{}"}},
    ],
    meals: [{path: "nutrition/user-1/days/2026-09-01/meals/meal-1", data: {
      schemaVersion: 1, id: "meal-1", date: "2026-09-01", mealKey: "lunch",
      entry: {id: "meal-1", name: "Rice", kcal: 120}, updatedAt: new Date(),
    }}],
    water: [], supplements: [], migrations: [],
    ...(overrides.groups || {}),
  };
  return {
    listAuthUsersPage: paged(overrides.users || [{uid: "user-1"}]),
    listNutritionRootsPage: paged(overrides.roots || [{
      path: "nutrition/user-1",
      data: {birthDate: "1997-12-04", tutorialSeen: true, _dailyDates: ["2026-09-01"]},
    }]),
    listCollectionGroupPage: (group, options) => paged(groups[group])(options),
  };
}

test("schema inventory is paginated, read-only, sanitized, and reports observed types", async () => {
  const report = await buildFirestoreSchemaInventory({reader: fixture(), pageSize: 1});
  assert.equal(report.complete, true);
  assert.equal(report.readOnly, true);
  assert.equal(report.sanitized, true);
  assert.deepEqual(report.counts, {
    authUsers: 1, nutritionRoots: 1, canonicalRoots: 1, missingRoots: 0,
    data: 2, meals: 1, water: 0, supplements: 0, migrations: 0,
  });
  assert.equal(report.observed.rootFields["birthDate:string"], 1);
  assert.equal(report.observed.dataKeyCategories["log_v2_<civil-date>"], 1);
  assert.equal(report.observed.entryFields.meals["kcal:number"], 1);
  assert.deepEqual(report.blockers.unknownDataKeyFingerprints, []);
  assert.equal(JSON.stringify(report).includes("user-1"), false);
  assert.equal(JSON.stringify(report).includes("Rice"), false);
});

test("schema inventory fails closed on unknown fields, keys, or orphaned paths", async () => {
  const report = await buildFirestoreSchemaInventory({
    reader: fixture({
      roots: [
        {path: "nutrition/user-1", data: {unexpectedPersonalField: "x"}},
        {path: "nutrition/orphan", data: {orphanField: "ignored"}},
      ],
      groups: {data: [
        {path: "nutrition/user-1/data/private-key", data: {value: []}},
        {path: "nutrition/orphan/data/orphan-key", data: {value: "ignored"}},
      ]},
    }),
    pageSize: 2,
  });
  assert.equal(report.complete, false);
  assert.equal(report.blockers.orphanRoots, 1);
  assert.equal(report.blockers.orphanNestedDocuments, 1);
  assert.equal(report.blockers.invalidDataEnvelopes, 1);
  assert.equal(report.blockers.unknownRootFieldFingerprints.length, 1);
  assert.equal(report.blockers.unknownDataKeyFingerprints.length, 1);
  assert.equal(JSON.stringify(report).includes("unexpectedPersonalField"), false);
  assert.equal(JSON.stringify(report).includes("private-key"), false);
});

test("canonical classifiers reject invalid dates and unexpected path depths", () => {
  assert.equal(classifyDataKey("waterGoal"), "waterGoal");
  assert.equal(classifyDataKey("notes_2024-02-29"), "notes_<civil-date>");
  assert.equal(classifyDataKey("notes_2023-02-29"), null);
  assert.deepEqual(
    parseCanonicalPath("nutrition/u/days/2026-09-01/water/w", "water"),
    {uid: "u", date: "2026-09-01", id: "w"},
  );
  assert.equal(parseCanonicalPath("nutrition/u/data/key/nested", "data"), null);
  assert.equal(valueType({toDate() {}}), "timestamp");
});

test("invalid or looping adapters fail instead of returning a partial inventory", async () => {
  const reader = fixture();
  reader.listNutritionRootsPage = async () => ({
    items: [{path: "nutrition/user-1", data: {}}],
    complete: false,
    nextCursor: null,
  });
  await assert.rejects(
    buildFirestoreSchemaInventory({reader}),
    error => error?.code === "incomplete-pagination",
  );
});

test("CLI reduces Firebase failures to non-sensitive categories", () => {
  assert.equal(sanitizedError({code: 9, message: "sensitive path"}), "firebase-code-9");
  assert.equal(sanitizedError({code: "auth/insufficient-permission"}), "auth-insufficient-permission");
  assert.equal(sanitizedError({message: "permission-denied"}), "permission-denied");
  assert.equal(sanitizedError({message: "could expose a value"}), "admin-read-failure");
});

test("Admin adapter exposes only paginated reads and returns path cursors", async () => {
  const queries = [];
  function queryFor(path) {
    const query = {
      orderBy() { return query; },
      limit(value) { queries.push([path, "limit", value]); return query; },
      startAfter(value) { queries.push([path, "cursor", value]); return query; },
      async get() {
        return {docs: [{ref: {path: `${path}/doc-1`}, data: () => ({value: "safe"})}]};
      },
    };
    return query;
  }
  const adapter = createAdminSchemaReadAdapter({
    auth: {async listUsers() { return {users: [{uid: "u"}]}; }},
    firestore: {
      collection: name => queryFor(name),
      collectionGroup: name => queryFor(`group/${name}`),
    },
    documentIdField: {},
  });
  const roots = await adapter.listNutritionRootsPage({cursor: null, pageSize: 1});
  const data = await adapter.listCollectionGroupPage("data", {cursor: "previous/path", pageSize: 1});
  assert.equal(roots.nextCursor, "nutrition/doc-1");
  assert.equal(data.nextCursor, "group/data/doc-1");
  assert.deepEqual(queries.at(-1), ["group/data", "cursor", "previous/path"]);
  assert.equal("set" in adapter, false);
  assert.throws(
    () => adapter.listCollectionGroupPage("unknown", {cursor: null, pageSize: 1}),
    error => error?.code === "invalid-collection-group",
  );
});
