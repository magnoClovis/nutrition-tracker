const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../firebase-backup-internal.js"))],
  ["ESM", () => import("../../src/firebase/firebase-backup-internal.js")]
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

function richnessScore(value) {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.length * 10 + value.reduce((sum, item) => sum + richnessScore(item), 0);
  if (typeof value === "object") return Object.keys(value).length + Object.values(value).reduce((sum, item) => sum + richnessScore(item), 0);
  return String(value).trim() ? 1 : 0;
}

function normalizedIdentity(item) {
  if (!item || typeof item !== "object") return JSON.stringify(item);
  if (item.date) return "date:" + item.date;
  if (item.id) return "id:" + item.id;
  if (item.name) return "name:" + String(item.name).trim().toLowerCase();
  return JSON.stringify(item);
}

function mergeArrayValues(values) {
  const byKey = new Map();
  values.flat().forEach(item => {
    if (item === null || item === undefined) return;
    const identity = normalizedIdentity(item);
    const current = byKey.get(identity);
    if (!current || richnessScore(item) >= richnessScore(current)) byKey.set(identity, item);
  });
  return Array.from(byKey.values());
}

function mergeObjectValues(values) {
  const out = {};
  values.forEach(value => {
    Object.entries(value || {}).forEach(([key, nextValue]) => {
      const currentValue = out[key];
      if (currentValue && typeof currentValue === "object" && nextValue && typeof nextValue === "object" && !Array.isArray(currentValue) && !Array.isArray(nextValue)) {
        out[key] = richnessScore(nextValue) >= richnessScore(currentValue) ? {...currentValue, ...nextValue} : {...nextValue, ...currentValue};
      } else if (currentValue === undefined || richnessScore(nextValue) >= richnessScore(currentValue)) {
        out[key] = nextValue;
      }
    });
  });
  return out;
}

function loadBackup(createFirebaseBackup, {
  uid = "user-1",
  root = {},
  data = {},
  legacy = {},
  current = {},
  failures = {}
} = {}) {
  const stored = new Map(Object.entries(current));
  const writes = [];
  const patches = [];
  const clearedFallbacks = [];
  const service = createFirebaseBackup({
    getUid: () => uid,
    async fbGet3(key) {
      if (failures.currentRead === true || failures.currentRead === key) throw new Error("current read failed");
      return stored.has(key) ? {value: stored.get(key)} : null;
    },
    async fbSet3(key, value) {
      if (failures.write === true || failures.write === key) throw new Error("write failed");
      writes.push({key, value});
      stored.set(key, value);
    },
    clearLocalFallback(key) {
      clearedFallbacks.push(key);
    },
    storageValue2: value => typeof value === "string" ? value : JSON.stringify(value),
    parseStorageJson3: parseStorageJson,
    async loadRootFields3() {
      if (failures.root) throw new Error("root failed");
      return root;
    },
    async listDataKeys3() {
      if (failures.dataList) throw new Error("data list failed");
      return Object.keys(data);
    },
    async listLegacyKeys3() {
      if (failures.legacyList) throw new Error("legacy list failed");
      return new Set(Object.keys(legacy));
    },
    async getDataDoc3(key) {
      if (failures.dataRead === true || failures.dataRead === key) throw new Error("data read failed");
      return Object.prototype.hasOwnProperty.call(data, key) ? {value: data[key]} : null;
    },
    async legacyGet2(key) {
      if (failures.legacyRead === true || failures.legacyRead === key) throw new Error("legacy read failed");
      return Object.prototype.hasOwnProperty.call(legacy, key) ? {value: legacy[key]} : null;
    },
    async patchRootFields3(fields, deleteKeys) {
      if (failures.patch) throw new Error("patch failed");
      patches.push({fields, deleteKeys});
    },
    normalizedIdentity,
    mergeArrayValues,
    mergeObjectValues
  });

  return { service, stored, writes, patches, clearedFallbacks };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createFirebaseBackup } = await load();
      return callback(options => loadBackup(createFirebaseBackup, options));
    });
  });
}

contractTest("publishes the namespaced factory and four exact backup operations", loadBackup => {
  const { service } = loadBackup();
  assert.equal(typeof service.exportFullAccountBackup3, "function");
  assert.equal(service.exportFullAccountBackup3.length, 0);
  assert.equal(service.validateFullAccountBackup3.length, 1);
  assert.equal(service.previewFullAccountBackupImport3.length, 1);
  assert.equal(service.importFullAccountBackup3.length, 2);
});

contractTest("exports root, data, and legacy shapes while preserving silent omissions", async loadBackup => {
  const fixture = loadBackup({
    root: {activityLevel: "moderate", userName: "Private", _schemaVersion: 4},
    data: {pantry_v2: '[{"id":"food"}]', "notes_2026-07-18": "note"},
    legacy: {weightHistory: '[{"date":"2026-07-18","weight":70}]'},
    failures: {dataRead: "notes_2026-07-18"}
  });
  const backup = await fixture.service.exportFullAccountBackup3();
  assert.equal(backup.schema, "nutrition-tracker-account-backup");
  assert.equal(backup.version, 3);
  assert.deepEqual(plain(backup.root), {activityLevel: "moderate"});
  assert.deepEqual(plain(backup.data), {pantry_v2: '[{"id":"food"}]'});
  assert.deepEqual(plain(backup.legacy), {weightHistory: '[{"date":"2026-07-18","weight":70}]'});
  assert.deepEqual(plain(backup.counts), {root: 1, data: 1, legacy: 1});

  const failedLists = loadBackup({
    root: {height: 180},
    data: {pantry_v2: "[]"},
    legacy: {weightHistory: "[]"},
    failures: {root: true, dataList: true, legacyList: true}
  });
  const incomplete = await failedLists.service.exportFullAccountBackup3();
  assert.deepEqual(plain(incomplete.counts), {root: 0, data: 0, legacy: 0});
});

contractTest("accepts legacy-flat backups and preserves legacy-root-data collision order", async loadBackup => {
  const { service } = loadBackup();
  assert.deepEqual(plain(service.validateFullAccountBackup3({pantry_v2: "[]"})), {
    ok: true,
    errors: [],
    counts: {root: 0, data: 0, legacy: 0, importable: 1}
  });

  const preview = await service.previewFullAccountBackupImport3({
    schema: "nutrition-tracker-account-backup",
    version: 3,
    legacy: {pantry_v2: '[{"id":"legacy"}]'},
    root: {pantry_v2: '[{"id":"root-1"},{"id":"root-2"}]'},
    data: {pantry_v2: '[{"id":"data-1"},{"id":"data-2"},{"id":"data-3"}]'}
  });
  assert.equal(preview.categories[0].total, 3);
});

contractTest("preview returns existingItems and treats read failures as new data", async loadBackup => {
  const incoming = {pantry_v2: '[{"id":"existing"},{"id":"new"}]'};
  const existing = loadBackup({current: {pantry_v2: '[{"id":"existing"}]'}});
  const existingPreview = await existing.service.previewFullAccountBackupImport3(incoming);
  assert.deepEqual(plain(existingPreview.categories[0]), {
    id: "pantry",
    keys: ["pantry_v2"],
    total: 2,
    newItems: 1,
    existingItems: 1,
    existingKeys: 1,
    newKeys: 0
  });

  const failedRead = loadBackup({
    current: {pantry_v2: '[{"id":"existing"}]'},
    failures: {currentRead: "pantry_v2"}
  });
  const failedPreview = await failedRead.service.previewFullAccountBackupImport3(incoming);
  assert.equal(failedPreview.categories[0].newItems, 2);
  assert.equal(failedPreview.categories[0].existingItems, 0);
  assert.equal(failedPreview.categories[0].newKeys, 1);
});

contractTest("preserves append merges, existing daily records, replace writes, and schema flags", async loadBackup => {
  const dayKey = "log_v2_2026-07-18";
  const append = loadBackup({
    current: {
      pantry_v2: '[{"id":"existing","name":"Rice"}]',
      [dayKey]: '{"meals":{"Almoço":[]}}'
    }
  });
  const incoming = {
    pantry_v2: '[{"id":"new","name":"Beans"}]',
    [dayKey]: '{"meals":{"Almoço":[{"id":"new-meal"}]}}'
  };
  assert.deepEqual(
    plain(await append.service.importFullAccountBackup3(incoming, {categories: {pantry: "append", diary: "append"}})),
    {imported: 1, skipped: 1}
  );
  assert.match(JSON.stringify(append.stored.get("pantry_v2")), /existing/);
  assert.match(JSON.stringify(append.stored.get("pantry_v2")), /new/);
  assert.deepEqual(append.clearedFallbacks, ["pantry_v2"]);
  assert.equal(append.stored.get(dayKey), '{"meals":{"Almoço":[]}}');
  assert.equal(append.patches.length, 1);
  assert.equal(append.patches[0].fields._schemaVersion, 4);
  assert.equal(append.patches[0].fields._storageSchemaVerified, true);
  assert.equal(append.patches[0].fields._legacyCleanupDone, true);
  assert.deepEqual(plain(append.patches[0].deleteKeys), ["_legacyCleanupErrorAt"]);

  const replace = loadBackup({current: {[dayKey]: "old"}});
  assert.deepEqual(
    plain(await replace.service.importFullAccountBackup3({[dayKey]: "new"}, {categories: {diary: "replace"}})),
    {imported: 1, skipped: 0}
  );
  assert.equal(replace.stored.get(dayKey), "new");
  assert.deepEqual(replace.clearedFallbacks, [dayKey]);
});

contractTest("imports a legacy pantry alias into pantry_v2", async loadBackup => {
  const fixture = loadBackup();
  const result = await fixture.service.importFullAccountBackup3(
    {pantry: '[{"id":"legacy-food"}]'},
    {categories: {pantry: "replace"}}
  );
  assert.deepEqual(plain(result), {imported: 1, skipped: 0});
  assert.equal(fixture.writes[0].key, "pantry_v2");
  assert.deepEqual(fixture.clearedFallbacks, ["pantry_v2"]);
});

contractTest("preserves prior batches without rollback when a later write fails", async loadBackup => {
  const incoming = {};
  for (let day = 1; day <= 16; day++) {
    const key = `notes_2026-07-${String(day).padStart(2, "0")}`;
    incoming[key] = `note-${day}`;
  }
  const fixture = loadBackup({failures: {write: "notes_2026-07-16"}});
  await assert.rejects(
    fixture.service.importFullAccountBackup3(incoming, {categories: {notes: "replace"}}),
    /write failed/
  );
  assert.equal(fixture.writes.length, 15);
  assert.equal(fixture.clearedFallbacks.length, 15);
  assert.equal(fixture.patches.length, 0);
});
