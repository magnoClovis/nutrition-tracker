const test = require("node:test");
const assert = require("node:assert/strict");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../firebase-firestore-internal.js"))],
  ["ESM", () => import("../../src/firebase/firebase-firestore-internal.js")]
];
const BASE = "https://firestore.example.test/nutrition";
const UID = "user-1";
const ROOT = `${BASE}/${UID}`;

function response(body = {}, {ok = true, status = 200} = {}) {
  return {ok, status, async json() { return body; }};
}
function encoded(value) { return {stringValue: String(value)}; }

function createBackend({root = {}, data = {}, failures = {}} = {}) {
  const requests = [];
  const fetchRequest = async (urlValue, options = {}) => {
    const url = String(urlValue);
    const method = options.method || "GET";
    requests.push({url, method, options});
    const dataMatch = url.match(/\/data\/([^?]+)$/);
    if (dataMatch) {
      const key = decodeURIComponent(dataMatch[1]);
      if (method === "PATCH") {
        if (failures.dataWrite === key) return response({}, {ok: false, status: 500});
        data[key] = JSON.parse(options.body).fields.value.stringValue;
        return response({});
      }
      if (method === "DELETE") {
        if (failures.dataDelete === key) return response({}, {ok: false, status: 500});
        const existed = Object.hasOwn(data, key);
        delete data[key];
        return response({}, {ok: existed, status: existed ? 200 : 404});
      }
      if (failures.dataRead === key) return response({}, {ok: false, status: 500});
      return Object.hasOwn(data, key)
        ? response({fields: {value: encoded(data[key])}})
        : response({}, {ok: false, status: 404});
    }
    if (url.startsWith(`${ROOT}/data?pageSize=1000`)) {
      if (failures.dataList) return response({}, {ok: false, status: 500});
      return response({documents: Object.keys(data).map(key => ({name: `${ROOT}/data/${encodeURIComponent(key)}`}))});
    }
    if (url.startsWith(ROOT)) {
      if (method === "PATCH") {
        if (failures.rootWrite) return response({}, {ok: false, status: 500});
        const body = JSON.parse(options.body);
        Object.entries(body.fields || {}).forEach(([key, value]) => { root[key] = value.stringValue; });
        return response({});
      }
      if (failures.rootRead) return response({}, {ok: false, status: 500});
      return response({fields: Object.fromEntries(Object.entries(root).map(([key, value]) => [key, encoded(value)]))});
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };
  return {fetchRequest, requests, root, data};
}

function loadFirestore(createFirebaseFirestore, {uid = UID, fetchRequest} = {}, warnings = []) {
  return createFirebaseFirestore({
    firestoreBase: BASE,
    getUid: () => uid,
    getAuthHeaders: async () => ({Authorization: "Bearer test-token"}),
    fetchRequest: fetchRequest || (async () => response({}, {ok: false, status: 404}))
  });
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const {createFirebaseFirestore} = await load();
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => warnings.push(args);
      try {
        await callback((options = {}) => loadFirestore(createFirebaseFirestore, options, warnings), warnings);
      } finally {
        console.warn = originalWarn;
      }
    });
  });
}

contractTest("publishes only canonical CRUD and a narrow support port", create => {
  const firestore = create();
  assert.deepEqual(Object.keys(firestore).sort(), ["fbDel3", "fbGet3", "fbList3", "fbSet3", "resetStorageCaches", "support"]);
  assert.equal(typeof firestore.support.listDataKeys, "function");
  assert.equal("legacyGet2" in firestore.support, false);
  assert.equal("listLegacyKeys3" in firestore.support, false);
});

contractTest("reads profile fields only from root and application data only from data documents", async create => {
  const backend = createBackend({root: {goalType: "lose_weight", misplaced: "root-only"}, data: {pantry_v2: "[]"}});
  const firestore = create({fetchRequest: backend.fetchRequest});
  assert.deepEqual(await firestore.fbGet3("goalType"), {value: "loss"});
  assert.deepEqual(await firestore.fbGet3("pantry_v2"), {value: "[]"});
  assert.equal(await firestore.fbGet3("misplaced"), null);
  assert.equal(backend.requests.some(request => request.url.startsWith(`${BASE}/${UID}_`)), false);
  assert.equal(backend.requests.some(request => request.url === BASE || request.url.startsWith(`${BASE}?`)), false);
});

contractTest("coalesces concurrent profile reads into one root request", async create => {
  const backend = createBackend({root: {gender: "female", height: "170", goalType: "loss"}});
  const firestore = create({fetchRequest: backend.fetchRequest});

  assert.deepEqual(await Promise.all([
    firestore.fbGet3("gender"),
    firestore.fbGet3("height"),
    firestore.fbGet3("goalType")
  ]), [
    {value: "female"},
    {value: "170"},
    {value: "loss"}
  ]);
  assert.equal(backend.requests.filter(request => request.method === "GET" && request.url === ROOT).length, 1);
});

contractTest("merges profile reads with root writes that finish while the read is in flight", async create => {
  let releaseRootRead;
  const rootReadStarted = new Promise(resolve => { releaseRootRead = resolve; });
  let finishRootRead;
  const rootReadFinished = new Promise(resolve => { finishRootRead = resolve; });
  const requests = [];
  const fetchRequest = async (urlValue, options = {}) => {
    const url = String(urlValue);
    const method = options.method || "GET";
    requests.push({url, method, options});
    if (url !== ROOT && !url.startsWith(`${ROOT}?`)) throw new Error(`Unexpected request: ${method} ${url}`);
    if (method === "PATCH") return response({});
    releaseRootRead();
    await rootReadFinished;
    return response({fields: {
      birthDate: encoded("1990-01-01"),
      gender: encoded("female"),
      activityLevel: encoded("moderate"),
      goalType: encoded("maintenance")
    }});
  };
  const firestore = create({fetchRequest});

  const birthDate = firestore.fbGet3("birthDate");
  await rootReadStarted;
  await firestore.fbSet3("lastLoginAt", "2026-08-28T11:40:55.000Z");
  finishRootRead();

  assert.deepEqual(await birthDate, {value: "1990-01-01"});
  assert.deepEqual(await firestore.fbGet3("gender"), {value: "female"});
  assert.deepEqual(await firestore.fbGet3("lastLoginAt"), {value: "2026-08-28T11:40:55.000Z"});
  assert.equal(requests.filter(request => request.method === "GET").length, 1);
});

contractTest("coalesces data reads and keeps the value cache coherent after writes and deletes", async create => {
  const backend = createBackend({data: {pantry_v2: '[{"id":"initial"}]'}});
  const firestore = create({fetchRequest: backend.fetchRequest});

  assert.deepEqual(await Promise.all([
    firestore.fbGet3("pantry_v2"),
    firestore.fbGet3("pantry_v2"),
    firestore.fbGet3("pantry_v2")
  ]), [
    {value: '[{"id":"initial"}]'},
    {value: '[{"id":"initial"}]'},
    {value: '[{"id":"initial"}]'}
  ]);
  const pantryReads = () => backend.requests.filter(request => request.method === "GET" && request.url === `${ROOT}/data/pantry_v2`).length;
  assert.equal(pantryReads(), 1);

  await firestore.fbSet3("pantry_v2", '[{"id":"updated"}]');
  assert.deepEqual(await firestore.fbGet3("pantry_v2"), {value: '[{"id":"updated"}]'});
  assert.equal(pantryReads(), 1);

  await firestore.fbDel3("pantry_v2");
  assert.equal(await firestore.fbGet3("pantry_v2"), null);
  assert.equal(pantryReads(), 1);
});

contractTest("preserves canonical CRUD, prefix listing, profile normalization, and 404 deletion", async create => {
  const backend = createBackend({root: {language: "pt"}, data: {pantry_v2: "[]"}});
  const firestore = create({fetchRequest: backend.fetchRequest});
  await firestore.fbSet3("gender", "Feminino");
  await firestore.fbSet3("pantry_v2", [{id: "food"}]);
  assert.deepEqual(await firestore.fbGet3("gender"), {value: "female"});
  assert.equal(backend.data.pantry_v2, '[{"id":"food"}]');
  assert.deepEqual(await firestore.fbList3("pantry"), {keys: ["pantry_v2"]});
  await firestore.fbDel3("pantry_v2");
  await firestore.fbDel3("pantry_v2");
  assert.equal(await firestore.fbGet3("pantry_v2"), null);
});

contractTest("preserves read fallbacks and write rejection semantics without legacy promotion", async (create, warnings) => {
  const backend = createBackend({failures: {rootRead: true, dataRead: "weightHistory", dataWrite: "pantry_v2"}});
  const firestore = create({fetchRequest: backend.fetchRequest});
  assert.equal(await firestore.fbGet3("weightHistory"), null);
  assert.equal(await firestore.fbGet3("language"), null);
  await assert.rejects(firestore.fbSet3("pantry_v2", "[]"), /Firestore data write failed/);
  assert.equal(warnings.some(args => args[0] === "Firestore data read failed"), true);
  assert.equal(warnings.some(args => args[0] === "Firestore root read failed"), true);
});

contractTest("keeps the unauthenticated null/no-op contract", async create => {
  const firestore = create({uid: null});
  assert.equal(await firestore.fbGet3("pantry_v2"), null);
  assert.equal(await firestore.fbSet3("pantry_v2", "[]"), undefined);
  assert.equal(await firestore.fbDel3("pantry_v2"), undefined);
});
