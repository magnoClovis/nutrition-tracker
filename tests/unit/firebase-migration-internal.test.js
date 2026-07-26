const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../firebase-migration-internal.js"))],
  ["ESM", () => import("../../src/firebase/firebase-migration-internal.js")]
];

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseStorageJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { return value; }
}

function storageValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function normalizeProfile(key, value) {
  const parsed = parseStorageJson(value);
  if (key === "goalType") {
    if (["lose", "loss", "lose_weight", "weight_loss"].includes(String(parsed))) return "loss";
    if (["gain", "gain_weight", "weight_gain"].includes(String(parsed))) return "gain";
    if (["maintain", "maintenance", "keep"].includes(String(parsed))) return "maintenance";
  }
  if (key === "gender") {
    if (["masculino", "male", "m"].includes(String(parsed).toLowerCase())) return "male";
    if (["feminino", "female", "f"].includes(String(parsed).toLowerCase())) return "female";
  }
  return parsed;
}

function loadMigration(createFirebaseMigration, {
  uid = "user-1",
  root = {},
  data = {},
  legacy = {},
  local = {},
  v2Documents = [],
  failures = {},
  legacyListOverride
} = {}) {
  const rootFields = {...root};
  const dataDocs = new Map(Object.entries(data));
  const legacyDocs = new Map(Object.entries(legacy));
  const rootPatches = [];
  const dataWrites = [];
  const dataDeletes = [];
  const legacyDeletes = [];
  const v2Patches = [];
  const counters = {listData: 0, listLegacy: 0};

  const profileKeys = new Set([
    "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg", "goalWeeks",
    "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal", "userName", "tutorialSeen",
    "language", "lastLoginAt", "lastActivityAt", "tutorial_most_recent_version_seen",
    "tutorialSeen_main", "tutorialSeen_diario", "tutorialSeen_adicionar",
    "tutorialSeen_despensa", "tutorialSeen_semana", "tutorialSeen_metricas"
  ]);

  const firestoreSupport = {
    stripLegacyUid2(key) {
      const prefix = uid + "_";
      return key.startsWith(prefix) ? key.slice(prefix.length) : key;
    },
    decodeFsValue2(value) {
      if (!value) return undefined;
      if ("stringValue" in value) return value.stringValue;
      if ("integerValue" in value) return Number(value.integerValue);
      return undefined;
    },
    storageValue2: storageValue,
    async fetchUserDocFields2() { return {...rootFields}; },
    async patchUserFields2(fields, deleteKeys) {
      v2Patches.push({fields, deleteKeys});
      Object.assign(rootFields, fields || {});
      (deleteKeys || []).forEach(key => delete rootFields[key]);
    },
    mergeUserDocCache2() {},
    async legacyGet2(key) {
      if (failures.legacyRead === key) throw new Error("legacy read failed");
      return legacyDocs.has(key) ? {value: legacyDocs.get(key)} : null;
    },
    localFallbackGet3(key) {
      return Object.prototype.hasOwnProperty.call(local, key) ? {value: local[key]} : null;
    },
    isEmptyStoredValue3(value) {
      if (value === null || value === undefined) return true;
      return ["", "[]", "{}", "null"].includes(String(value).trim());
    },
    async loadRootFields3() { return rootFields; },
    async patchRootFields3(fields, deleteKeys) {
      if (failures.rootPatch) throw new Error("root patch failed");
      rootPatches.push({fields, deleteKeys});
      Object.assign(rootFields, fields || {});
      (deleteKeys || []).forEach(key => delete rootFields[key]);
    },
    async getDataDoc3(key) {
      return dataDocs.has(key) ? {value: dataDocs.get(key)} : null;
    },
    async setDataDoc3(key, value) {
      if (failures.dataWrite === key) throw new Error("data write failed");
      dataWrites.push({key, value});
      dataDocs.set(key, value);
    },
    async deleteDataDoc3(key) {
      if (failures.dataDelete === key) throw new Error("data delete failed");
      dataDeletes.push(key);
      dataDocs.delete(key);
    },
    async listDataKeys3() {
      counters.listData++;
      if (failures.dataList) throw new Error("data list failed");
      return Array.from(dataDocs.keys());
    },
    async listLegacyKeys3() {
      counters.listLegacy++;
      if (failures.legacyList) throw new Error("legacy list failed");
      if (legacyListOverride !== undefined) return new Set(legacyListOverride);
      return new Set(legacyDocs.keys());
    },
    parseStorageJson3: parseStorageJson,
    isProfileKey3: key => profileKeys.has(key),
    normalizeProfileValue3: normalizeProfile,
    async legacyDelete3(key) {
      if (failures.legacyDelete === key) throw new Error("legacy delete failed");
      legacyDeletes.push(key);
      legacyDocs.delete(key);
    }
  };

  const service = createFirebaseMigration({
    firestoreBase: "https://firestore.example.test/nutrition",
    getUid: () => uid,
    getAuthHeaders: async () => ({Authorization: "Bearer token"}),
    fetchRequest: async () => ({
      ok: !failures.v2List,
      async json() { return {documents: v2Documents}; }
    }),
    firestoreSupport
  });

  return {
    service,
    rootFields,
    dataDocs,
    legacyDocs,
    rootPatches,
    dataWrites,
    dataDeletes,
    legacyDeletes,
    v2Patches,
    counters
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createFirebaseMigration } = await load();
      return callback(options => loadMigration(createFirebaseMigration, options));
    });
  });
}

contractTest("publishes migration operations and all five shared merge helpers", loadMigration => {
  const {service} = loadMigration();
  assert.equal(typeof service.migrateLegacyNutritionDocsV2, "function");
  assert.equal(typeof service.migrateStorageToFirestoreV3, "function");
  assert.equal(typeof service.cleanupLegacyNutritionDocsV3, "function");
  assert.deepEqual(Object.keys(service.mergeHelpers), [
    "normalizedIdentity3",
    "richnessScore3",
    "mergeArrayValues3",
    "mergeObjectValues3",
    "mergeStoredValues3"
  ]);
});

contractTest("generates exactly four historical keys for each of 120 calculated dates", loadMigration => {
  const {service} = loadMigration();
  const keys = service.support.knownMigrationKeys3();
  const historical = keys.filter(key => /^(log_v2|notes|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(key));
  assert.equal(historical.length, 480);
  assert.equal(new Set(historical.map(key => key.slice(key.lastIndexOf("_") + 1))).size, 120);
  for (const prefix of ["log_v2_", "notes_", "waterIntake_", "suppLog_"]) {
    assert.equal(historical.filter(key => key.startsWith(prefix)).length, 120);
  }
});

contractTest("preserves richness selection, later tie wins, and array reordering", loadMigration => {
  const {service} = loadMigration();
  const helpers = service.mergeHelpers;
  assert.equal(helpers.richnessScore3([{id: "one"}]), 12);

  const dates = helpers.mergeArrayValues3([
    [{date: "2026-07-02", value: 1}, {date: "2026-07-01", value: 1}],
    [{date: "2026-07-02", value: 1, richer: true}]
  ]);
  assert.deepEqual(plain(dates.map(item => item.date)), ["2026-07-01", "2026-07-02"]);
  assert.equal(dates[1].richer, true);

  const names = helpers.mergeArrayValues3([[{name: "Zebra"}, {name: "Arroz"}]]);
  assert.deepEqual(plain(names.map(item => item.name)), ["Arroz", "Zebra"]);

  assert.deepEqual(plain(helpers.mergeObjectValues3([{field: "first"}, {field: "second"}])), {field: "second"});
  assert.equal(
    helpers.mergeStoredValues3([{value: "small"}, {value: "larger"}]),
    "small"
  );
});

contractTest("preserves the active v2 migration into root fields and swallowed result contract", async loadMigration => {
  const fixture = loadMigration({
    root: {language: "pt"},
    v2Documents: [
      {name: "projects/test/documents/nutrition/user-1_language", fields: {value: {stringValue: "en"}}},
      {name: "projects/test/documents/nutrition/user-1_pantry", fields: {value: {stringValue: "[]"}}},
      {name: "projects/test/documents/nutrition/other_pantry", fields: {value: {stringValue: "ignored"}}}
    ]
  });
  assert.deepEqual(plain(await fixture.service.migrateLegacyNutritionDocsV2()), {migrated: 1, skipped: 1});
  assert.deepEqual(plain(fixture.v2Patches[0].fields), {pantry: "[]"});
});

contractTest("migrates legacy aliases and userGoal into the active v3 structure", async loadMigration => {
  const fixture = loadMigration({
    data: {pantry_v2: "[]"},
    legacy: {
      pantry: '[{"id":"legacy-food","name":"Rice"}]',
      userGoal: '{"type":"lose_weight","kg":70,"weeks":8}'
    }
  });
  const result = await fixture.service.migrateStorageToFirestoreV3({cleanup: true});
  assert.equal(result.skipped, 0);
  assert.equal(result.cleanupFailures, 0);
  assert.match(fixture.dataDocs.get("pantry_v2"), /legacy-food/);
  assert.equal(fixture.rootFields.goalType, "loss");
  assert.equal(fixture.rootFields.goalKg, "70");
  assert.equal(fixture.rootFields.goalWeeks, "8");
  assert.equal(fixture.rootFields._storageSchemaVerified, true);
  assert.deepEqual(fixture.legacyDeletes.sort(), ["pantry", "userGoal"]);
});

contractTest("preserves verified-schema early return without listing or retrying migration", async loadMigration => {
  const fixture = loadMigration({root: {_storageSchemaVerified: true}, legacy: {pantry: "[]"}});
  assert.deepEqual(
    plain(await fixture.service.migrateStorageToFirestoreV3({cleanup: true})),
    {migrated: 0, cleaned: 0, skipped: 1}
  );
  assert.equal(fixture.counters.listData, 0);
  assert.equal(fixture.counters.listLegacy, 0);
  assert.equal(fixture.legacyDocs.has("pantry"), true);
});

contractTest("documents the preserved data-loss risk by deleting an unpromoted record older than 120 days", async loadMigration => {
  const oldKey = "log_v2_2000-01-01";
  const fixture = loadMigration({legacy: {[oldKey]: '{"meals":{"Almoço":[]}}'}});
  assert.equal(fixture.service.support.knownMigrationKeys3().includes(oldKey), false);

  assert.deepEqual(
    plain(await fixture.service.cleanupLegacyNutritionDocsV3()),
    {cleaned: 1, failed: 0, skipped: 0}
  );
  assert.deepEqual(fixture.legacyDeletes, [oldKey]);
  assert.equal(fixture.legacyDocs.has(oldKey), false);
  assert.equal(fixture.rootFields._legacyCleanupDone, true);
});

contractTest("preserves a masked empty legacy listing as completed cleanup", async loadMigration => {
  const fixture = loadMigration({
    legacy: {"log_v2_2000-01-01": "old"},
    legacyListOverride: []
  });
  assert.deepEqual(
    plain(await fixture.service.cleanupLegacyNutritionDocsV3()),
    {cleaned: 0, failed: 0, skipped: 0}
  );
  assert.equal(fixture.legacyDocs.size, 1);
  assert.equal(fixture.rootFields._legacyCleanupDone, true);
});

contractTest("preserves completed earlier writes when a later migration write fails", async loadMigration => {
  const fixture = loadMigration({
    legacy: {
      pantry_v2: '[{"id":"food"}]',
      suppPantry: '[{"id":"supplement"}]'
    },
    failures: {dataWrite: "suppPantry"}
  });
  await assert.rejects(fixture.service.migrateStorageToFirestoreV3({cleanup: true}), /data write failed/);
  assert.equal(fixture.dataDocs.has("pantry_v2"), true);
  assert.equal(fixture.dataDocs.has("suppPantry"), false);
  assert.equal(fixture.rootFields._storageSchemaVerified, undefined);
});
