const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../firebase-firestore-internal.js"))],
  ["ESM", () => import("../../src/firebase/firebase-firestore-internal.js")]
];
const BASE = "https://firestore.example.test/nutrition";
const UID = "user-1";
const ROOT = `${BASE}/${UID}`;

function response(body = {}, { ok = true, status = 200 } = {}) {
  return { ok, status, async json() { return body; } };
}

function encoded(value) { return { stringValue: String(value) }; }

function createLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function createBackend({ root = {}, data = {}, legacy = {}, failV2Writes = false, failV3Writes = false } = {}) {
  const requests = [];
  let rootReads = 0;
  const fetchRequest = async (urlValue, options = {}) => {
    const url = String(urlValue);
    const method = options.method || "GET";
    requests.push({ url, method, options });

    const dataMatch = url.match(/\/data\/([^?]+)$/);
    if (dataMatch) {
      const key = decodeURIComponent(dataMatch[1]);
      if (method === "PATCH") {
        if (failV3Writes) return response({}, { ok: false, status: 500 });
        data[key] = options.body ? JSON.parse(options.body).fields.value.stringValue : "";
        return response({});
      }
      if (method === "DELETE") return response({}, { status: 200 });
      return Object.prototype.hasOwnProperty.call(data, key)
        ? response({ fields: { value: encoded(data[key]) } })
        : response({}, { ok: false, status: 404 });
    }

    if (url.startsWith(`${ROOT}/data?pageSize=1000`)) {
      return response({ documents: Object.keys(data).map(key => ({ name: `${ROOT}/data/${encodeURIComponent(key)}` })) });
    }

    if (url.startsWith(`${BASE}/${UID}_`)) {
      const key = decodeURIComponent(url.slice(`${BASE}/${UID}_`.length));
      return Object.prototype.hasOwnProperty.call(legacy, key)
        ? response({ fields: { value: encoded(legacy[key]) } })
        : response({}, { ok: false, status: 404 });
    }

    if (url.startsWith(ROOT)) {
      if (method === "PATCH") {
        if (failV2Writes) return response({}, { ok: false, status: 500 });
        return response({});
      }
      rootReads++;
      return response({ fields: Object.fromEntries(Object.entries(root).map(([key, value]) => [key, encoded(value)])) });
    }

    if (url.startsWith(`${BASE}?pageSize=1000`)) return response({ documents: [] });
    return response({}, { ok: false, status: 404 });
  };

  return { fetchRequest, requests, getRootReads: () => rootReads };
}

function loadFirestore(createFirebaseFirestore, {
  uid = UID,
  local = {},
  fetchRequest = async () => response({}, { ok: false, status: 404 }),
  runLegacyMigration = async () => ({ skipped: 1 }),
  runStorageMigration = async () => ({ skipped: 1 })
} = {}, warnings = []) {
  const firestore = createFirebaseFirestore({
    firestoreBase: BASE,
    getUid: () => uid,
    getAuthHeaders: async () => ({ Authorization: "Bearer test-token" }),
    fetchRequest,
    localStorage: createLocalStorage(local),
    runLegacyMigration,
    runStorageMigration
  });
  return { firestore, warnings };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createFirebaseFirestore } = await load();
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => warnings.push(args);
      try {
        return await callback(options => loadFirestore(createFirebaseFirestore, options, warnings));
      } finally {
        console.warn = originalWarn;
      }
    });
  });
}

contractTest("publishes the namespaced factory and keeps v2 infrastructure available", loadFirestore => {
  const { firestore } = loadFirestore();
  assert.equal(typeof firestore.fbGetV2, "function");
  assert.equal(typeof firestore.fbSetV2, "function");
  assert.equal(typeof firestore.fbGet3, "function");
  assert.equal(typeof firestore.resetStorageCaches, "function");
  assert.equal(typeof firestore.support.patchUserFields2, "function");
});

contractTest("preserves data, root, legacy, and local fallback priority", async loadFirestore => {
  const backend = createBackend({
    root: { allSources: "root", rootOnly: "root-only" },
    data: { allSources: "data" },
    legacy: { allSources: "legacy", rootOnly: "legacy-lower", legacyOnly: "legacy-only" }
  });
  const { firestore } = loadFirestore({
    local: {
      [`${UID}_allSources`]: "local",
      [`${UID}_rootOnly`]: "local-lower",
      [`${UID}_legacyOnly`]: "local-lower",
      [`${UID}_localOnly`]: "local-only"
    },
    fetchRequest: backend.fetchRequest
  });

  assert.equal((await firestore.fbGet3("allSources")).value, "data");
  assert.equal((await firestore.fbGet3("rootOnly")).value, "root-only");
  assert.equal((await firestore.fbGet3("legacyOnly")).value, "legacy-only");
  assert.equal((await firestore.fbGet3("localOnly")).value, "local-only");
});

contractTest("chooses the richest critical candidate while preserving tie-order semantics", async loadFirestore => {
  const backend = createBackend({
    root: { pantry_v2: JSON.stringify([{ id: "root" }]) },
    data: { pantry_v2: "[]" },
    legacy: { pantry_v2: JSON.stringify([{ id: "legacy-1" }, { id: "legacy-2" }]) }
  });
  const richest = JSON.stringify([{ id: "local-1" }, { id: "local-2" }, { id: "local-3" }]);
  const { firestore } = loadFirestore({ local: { [`${UID}_pantry_v2`]: richest }, fetchRequest: backend.fetchRequest });
  assert.equal((await firestore.fbGet3("pantry_v2")).value, richest);
});

contractTest("keeps profile root priority, normalization, and misplaced-data fallback", async loadFirestore => {
  const rootedBackend = createBackend({ root: { goalType: "lose_weight" }, data: { goalType: "gain" } });
  const rooted = loadFirestore({ fetchRequest: rootedBackend.fetchRequest }).firestore;
  assert.deepEqual(JSON.parse(JSON.stringify(await rooted.fbGet3("goalType"))), { value: "loss" });

  const misplacedBackend = createBackend({ data: { gender: "feminino" } });
  const misplaced = loadFirestore({ fetchRequest: misplacedBackend.fetchRequest }).firestore;
  assert.deepEqual(JSON.parse(JSON.stringify(await misplaced.fbGet3("gender"))), { value: "female" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(misplacedBackend.requests.some(request => request.method === "PATCH" && request.url.startsWith(ROOT)), true);
});

contractTest("starts storage migration once in the background without awaiting it", async loadFirestore => {
  let migrationCalls = 0;
  const neverFinishes = new Promise(() => {});
  const backend = createBackend({ data: { pantry: "ready" } });
  const { firestore } = loadFirestore({
    fetchRequest: backend.fetchRequest,
    runStorageMigration() { migrationCalls++; return neverFinishes; }
  });

  assert.equal((await firestore.fbGet3("pantry")).value, "ready");
  assert.equal((await firestore.fbGet3("pantry")).value, "ready");
  assert.equal(migrationCalls, 1);
});

contractTest("preserves silent read failures and sticky empty root cache", async loadFirestore => {
  let rootReads = 0;
  const { firestore, warnings } = loadFirestore({
    fetchRequest: async urlValue => {
      const url = String(urlValue);
      if (url.includes("/data/pantry_v2")) throw new Error("network down");
      if (url === ROOT) { rootReads++; return response({}, { ok: false, status: 500 }); }
      return response({}, { ok: false, status: 404 });
    }
  });

  assert.equal(await firestore.fbGet3("pantry_v2"), null);
  assert.equal(await firestore.fbGet3("anotherKey"), null);
  assert.equal(rootReads, 1);
  assert.equal(warnings.some(args => args[0] === "Firestore data read failed"), true);
  assert.equal(warnings.some(args => args[0] === "Firestore root read failed"), true);
});

contractTest("keeps partial data-key cache and root/data underscore inconsistency", async loadFirestore => {
  let listRequests = 0;
  const { firestore } = loadFirestore({
    fetchRequest: async urlValue => {
      const url = String(urlValue);
      if (url === ROOT) return response({ fields: { visibleRoot: encoded("yes"), _hiddenRoot: encoded("yes") } });
      if (url.includes("/data?pageSize=1000") && !url.includes("pageToken")) {
        listRequests++;
        return response({ documents: [{ name: `${ROOT}/data/_visibleData` }], nextPageToken: "next" });
      }
      if (url.includes("pageToken=next")) { listRequests++; return response({}, { ok: false, status: 500 }); }
      return response({}, { ok: false, status: 404 });
    }
  });

  assert.deepEqual(JSON.parse(JSON.stringify(await firestore.fbList3())), { keys: ["visibleRoot", "_visibleData"] });
  assert.deepEqual(JSON.parse(JSON.stringify(await firestore.fbList3())), { keys: ["visibleRoot", "_visibleData"] });
  assert.equal(listRequests, 2);
});

contractTest("preserves swallowed v2 writes and propagated active-v3 writes", async loadFirestore => {
  const backend = createBackend({ failV2Writes: true, failV3Writes: true });
  const { firestore } = loadFirestore({ fetchRequest: backend.fetchRequest });
  assert.equal(await firestore.fbSetV2("language", "pt"), undefined);
  await assert.rejects(firestore.fbSet3("pantry_v2", "[]"), /Firestore data write failed/);
});

contractTest("preserves null/no-op behavior without an authenticated UID", async loadFirestore => {
  const { firestore } = loadFirestore({ uid: null });
  assert.equal(await firestore.fbGet3("pantry_v2"), null);
  assert.equal(await firestore.fbSet3("pantry_v2", "[]"), undefined);
  assert.equal(await firestore.fbDel3("pantry_v2"), undefined);
});
