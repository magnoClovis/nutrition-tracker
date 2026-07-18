const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  createFirebaseAccountData
} = require(path.join(__dirname, "..", "..", "firebase-account-data-internal.js"));

function createFixture({
  uid = "user-1",
  dataKeys = [],
  legacyKeys = [],
  dataFailures = [],
  legacyFailures = [],
  dataListError = null,
  legacyListError = null,
  rootResponse = {ok: true, status: 200},
  rootError = null
} = {}) {
  const events = [];
  let resetCount = 0;
  let rootRequest = null;

  const service = createFirebaseAccountData({
    getUid: () => uid,
    getAuthHeaders: async () => {
      events.push("headers");
      return {Authorization: "Bearer token"};
    },
    resetStorageCaches: () => {
      events.push("reset");
      resetCount++;
    },
    fetchRequest: async (url, options) => {
      events.push("root");
      rootRequest = {url, options};
      if (rootError) throw rootError;
      return rootResponse;
    },
    firestorePort: {
      async listDataKeys3() {
        events.push("list-data");
        if (dataListError) throw dataListError;
        return dataKeys;
      },
      async listLegacyKeys3() {
        events.push("list-legacy");
        if (legacyListError) throw legacyListError;
        return new Set(legacyKeys);
      },
      async deleteDataDoc3(key) {
        events.push("data:" + key);
        if (dataFailures.includes(key)) throw new Error("data delete failed: " + key);
      },
      async legacyDelete3(key) {
        events.push("legacy:" + key);
        if (legacyFailures.includes(key)) throw new Error("legacy delete failed: " + key);
      },
      getUserDocumentUrl() {
        events.push("root-url");
        return "https://firestore.example.test/nutrition/" + uid;
      }
    }
  });

  return {
    service,
    events,
    get resetCount() { return resetCount; },
    get rootRequest() { return rootRequest; }
  };
}

test("publishes the namespaced UMD factory and the destructive operation", () => {
  assert.equal(typeof createFirebaseAccountData, "function");
  const fixture = createFixture();
  assert.equal(typeof fixture.service.deleteCurrentUserFirestoreData3, "function");
});

test("deletes current, legacy, and root Firestore data in the preserved order", async () => {
  const fixture = createFixture({
    dataKeys: ["pantry_v2", "log_v2_2026-07-18"],
    legacyKeys: ["weightHistory", "notes_2026-07-18"]
  });

  assert.deepEqual(
    await fixture.service.deleteCurrentUserFirestoreData3(),
    {deleted: 5, failed: 0}
  );
  assert.deepEqual(fixture.events, [
    "list-data",
    "list-legacy",
    "data:pantry_v2",
    "data:log_v2_2026-07-18",
    "legacy:weightHistory",
    "legacy:notes_2026-07-18",
    "root-url",
    "headers",
    "root",
    "reset"
  ]);
  assert.deepEqual(fixture.rootRequest, {
    url: "https://firestore.example.test/nutrition/user-1",
    options: {method: "DELETE", headers: {Authorization: "Bearer token"}}
  });
});

test("keeps 20-item batches sequential while deleting within each batch concurrently", async () => {
  const dataKeys = Array.from({length: 21}, (_, index) => "key-" + index);
  const started = [];
  let releaseFirstBatch;
  const firstBatchGate = new Promise(resolve => { releaseFirstBatch = resolve; });
  let resetCount = 0;

  const service = createFirebaseAccountData({
    getUid: () => "user-1",
    getAuthHeaders: async () => ({}),
    resetStorageCaches: () => { resetCount++; },
    fetchRequest: async () => ({ok: true, status: 200}),
    firestorePort: {
      listDataKeys3: async () => dataKeys,
      listLegacyKeys3: async () => new Set(),
      async deleteDataDoc3(key) {
        started.push(key);
        if (key !== "key-20") await firstBatchGate;
      },
      legacyDelete3: async () => {},
      getUserDocumentUrl: () => "root-url"
    }
  });

  const deletion = service.deleteCurrentUserFirestoreData3();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(started.length, 20);
  assert.equal(started.includes("key-20"), false);
  releaseFirstBatch();
  assert.deepEqual(await deletion, {deleted: 22, failed: 0});
  assert.equal(started[20], "key-20");
  assert.equal(resetCount, 1);
});

test("deletes the root and resets caches before throwing for partial child failures", async () => {
  const fixture = createFixture({
    dataKeys: ["kept", "failed-data"],
    legacyKeys: ["failed-legacy"],
    dataFailures: ["failed-data"],
    legacyFailures: ["failed-legacy"]
  });

  await assert.rejects(
    fixture.service.deleteCurrentUserFirestoreData3(),
    /Some account data could not be deleted/
  );
  assert.equal(fixture.events.includes("root"), true);
  assert.equal(fixture.resetCount, 1);
  assert.equal(fixture.events.at(-1), "reset");
});

test("preserves root HTTP failure aggregation and cache-reset ordering", async () => {
  const fixture = createFixture({rootResponse: {ok: false, status: 500}});

  await assert.rejects(
    fixture.service.deleteCurrentUserFirestoreData3(),
    /Some account data could not be deleted/
  );
  assert.equal(fixture.resetCount, 1);
  assert.deepEqual(fixture.events.slice(-2), ["root", "reset"]);
});

test("propagates a root network failure before resetting caches", async () => {
  const networkError = new Error("network unavailable");
  const fixture = createFixture({rootError: networkError});

  await assert.rejects(
    fixture.service.deleteCurrentUserFirestoreData3(),
    error => error === networkError
  );
  assert.equal(fixture.resetCount, 0);
  assert.equal(fixture.events.includes("root"), true);
});

test("masks listing failures as empty and still deletes the root document", async () => {
  const fixture = createFixture({
    dataListError: new Error("data listing failed"),
    legacyListError: new Error("legacy listing failed")
  });

  assert.deepEqual(
    await fixture.service.deleteCurrentUserFirestoreData3(),
    {deleted: 1, failed: 0}
  );
  assert.equal(fixture.events.some(event => event.startsWith("data:")), false);
  assert.equal(fixture.events.some(event => event.startsWith("legacy:")), false);
  assert.equal(fixture.events.includes("root"), true);
  assert.equal(fixture.resetCount, 1);
});

test("rejects without performing I/O when no authenticated UID exists", async () => {
  const fixture = createFixture({uid: null});
  await assert.rejects(
    fixture.service.deleteCurrentUserFirestoreData3(),
    /No authenticated user/
  );
  assert.deepEqual(fixture.events, []);
  assert.equal(fixture.resetCount, 0);
});
