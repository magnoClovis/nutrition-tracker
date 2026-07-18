const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "..", "firebase-storage.js"), "utf8");
const FB_BASE = "https://firestore.googleapis.com/v1/projects/nutrition-tracker-780b3/databases/(default)/documents/nutrition";

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); }
  };
}

function response(data, { ok = true, status = ok ? 200 : 400, jsonError } = {}) {
  return {
    ok,
    status,
    async json() {
      if (jsonError) throw jsonError;
      return data;
    }
  };
}

function decodeFirestoreValue(value) {
  if (!value) return undefined;
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return Number(value.doubleValue);
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if (value.mapValue) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return undefined;
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])) } };
  }
  return { stringValue: String(value) };
}

function createFirestoreBackend({ uid = "user-1", root = {}, data = {}, legacy = {}, failures = {} } = {}) {
  const rootFields = { ...root };
  const dataDocs = new Map(Object.entries(data).map(([key, value]) => [key, String(value)]));
  const legacyDocs = new Map(Object.entries(legacy).map(([key, value]) => [key, String(value)]));
  const calls = [];
  const rootUrl = `${FB_BASE}/${encodeURIComponent(uid)}`;

  async function fetchRequest(urlValue, options = {}) {
    const url = String(urlValue);
    const method = options.method || "GET";
    calls.push({ url, options: { ...options, method } });

    if (url.includes("identitytoolkit.googleapis.com") || url.includes("securetoken.googleapis.com")) {
      throw new Error(`Unexpected auth request: ${url}`);
    }

    if (url === FB_BASE + "?pageSize=1000" || url.startsWith(FB_BASE + "?pageSize=1000&pageToken=")) {
      if (failures.legacyList) return response({}, { ok: false, status: 500 });
      return response({
        documents: Array.from(legacyDocs.keys()).map(key => ({ name: `${FB_BASE}/${encodeURIComponent(uid + "_" + key)}` }))
      });
    }

    if (url.startsWith(rootUrl + "/data?pageSize=1000")) {
      if (failures.dataList) return response({}, { ok: false, status: 500 });
      return response({
        documents: Array.from(dataDocs.keys()).map(key => ({ name: `${rootUrl}/data/${encodeURIComponent(key)}` }))
      });
    }

    if (url.startsWith(rootUrl + "/data/")) {
      const key = decodeURIComponent(url.slice((rootUrl + "/data/").length).split("?")[0]);
      if (method === "GET") {
        if (failures.dataRead === key) return response({}, { ok: false, status: 500 });
        if (!dataDocs.has(key)) return response({}, { ok: false, status: 404 });
        return response({ fields: { value: encodeFirestoreValue(dataDocs.get(key)) } });
      }
      if (method === "PATCH") {
        if (failures.dataWrite === key) return response({}, { ok: false, status: 500 });
        const body = JSON.parse(options.body);
        dataDocs.set(key, String(decodeFirestoreValue(body.fields.value)));
        return response({});
      }
      if (method === "DELETE") {
        if (failures.dataDelete === key) return response({}, { ok: false, status: 500 });
        const existed = dataDocs.delete(key);
        return response({}, { ok: existed, status: existed ? 200 : 404 });
      }
    }

    if (url === rootUrl || url.startsWith(rootUrl + "?")) {
      if (method === "GET") {
        if (failures.rootRead) return response({}, { ok: false, status: 500 });
        return response({ fields: Object.fromEntries(Object.entries(rootFields).map(([key, value]) => [key, encodeFirestoreValue(value)])) });
      }
      if (method === "PATCH") {
        if (failures.rootWrite) return response({}, { ok: false, status: 500 });
        const body = JSON.parse(options.body);
        const masks = new URL(url).searchParams.getAll("updateMask.fieldPaths").map(key => key.replace(/^`|`$/g, ""));
        const written = new Set(Object.keys(body.fields || {}));
        Object.entries(body.fields || {}).forEach(([key, value]) => { rootFields[key] = decodeFirestoreValue(value); });
        masks.filter(key => !written.has(key)).forEach(key => { delete rootFields[key]; });
        return response({});
      }
      if (method === "DELETE") {
        if (failures.rootDeleteNetwork) throw new Error("root delete network failure");
        if (failures.rootDelete) return response({}, { ok: false, status: 500 });
        Object.keys(rootFields).forEach(key => delete rootFields[key]);
        return response({});
      }
    }

    if (url.startsWith(FB_BASE + "/")) {
      const rawId = decodeURIComponent(url.slice((FB_BASE + "/").length).split("?")[0]);
      const prefix = uid + "_";
      const key = rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
      if (method === "GET") {
        if (!legacyDocs.has(key)) return response({}, { ok: false, status: 404 });
        return response({ fields: { value: encodeFirestoreValue(legacyDocs.get(key)) } });
      }
      if (method === "DELETE") {
        if (failures.legacyDelete === key) return response({}, { ok: false, status: 500 });
        const existed = legacyDocs.delete(key);
        return response({}, { ok: existed, status: existed ? 200 : 404 });
      }
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  }

  return { fetchRequest, calls, rootFields, dataDocs, legacyDocs };
}

function loadFirebaseStorage({ local = {}, reportConfig, fetchRequest } = {}) {
  const calls = [];
  const warnings = [];
  const errors = [];
  const localStorage = createLocalStorage(local);
  const context = {
    URL,
    URLSearchParams,
    Date,
    Promise,
    JSON,
    Math,
    Set,
    Map,
    console: {
      log() {},
      table() {},
      warn(...args) { warnings.push(args); },
      error(...args) { errors.push(args); }
    },
    localStorage,
    NUTRITION_TRACKER_CONFIG: reportConfig,
    async fetch(...args) {
      calls.push(args);
      if (!fetchRequest) throw new Error(`Unexpected fetch: ${args[0]}`);
      return fetchRequest(...args);
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "firebase-storage.js" });

  return {
    context,
    calls,
    warnings,
    errors,
    localStorage,
    evaluate(expression) { return vm.runInContext(expression, context); },
    saveSession(overrides = {}) {
      context._saveSession({
        idToken: "id-token",
        refreshToken: "refresh-token",
        localId: "user-1",
        expiresIn: "3600",
        ...overrides
      });
    },
    suppressAutomaticMigration() {
      vm.runInContext("_migrationPromise3 = Promise.resolve({ skipped: 1 })", context);
    }
  };
}

test("publishes the complete intentional Firebase contract with stable arities and aliases", () => {
  const fixture = loadFirebaseStorage();
  const { context } = fixture;
  const arities = {
    fbSignIn: 2,
    fbSignUp: 2,
    fbUpdateProfile: 1,
    fbSendVerificationEmail: 0,
    fbSendPasswordResetEmail: 1,
    fbCheckEmailVerified: 0,
    fbRefreshToken: 0,
    fbToken: 0,
    fbSignOut: 0,
    fbIsLoggedIn: 0,
    fbHeaders: 0,
    fbGet: 1,
    fbSet: 2,
    fbDel: 1,
    fbList: 1,
    fbGet3: 1,
    fbSet3: 2,
    fbDel3: 1,
    fbList3: 1,
    fbGetLegacyInactive: 1,
    fbSetLegacyInactive: 2,
    fbDelLegacyInactive: 1,
    fbListLegacyInactive: 1,
    _saveSession: 1
  };

  Object.entries(arities).forEach(([name, length]) => {
    assert.equal(typeof context[name], "function", name);
    assert.equal(context[name].length, length, `${name}.length`);
  });
  assert.deepEqual(Object.keys(context.storage), ["get", "set", "delete", "list"]);
  assert.equal(context.storage.get, context.fbGet);
  assert.equal(context.storage.set, context.fbSet);
  assert.equal(context.storage.delete, context.fbDel);
  assert.equal(context.storage.list, context.fbList);

  [
    "migrateStorageToFirestoreV3",
    "migrateLegacyNutritionDocs",
    "normalizeCurrentUserStorage",
    "cleanupLegacyNutritionDocs",
    "deleteCurrentUserFirestoreData",
    "exportFullAccountBackup",
    "validateFullAccountBackup",
    "previewFullAccountBackupImport",
    "importFullAccountBackup",
    "debugNutritionStorage"
  ].forEach(name => assert.equal(typeof context[name], "function", name));
  assert.equal(context.migrateLegacyNutritionDocs, context.migrateStorageToFirestoreV3);
  assert.equal(context.normalizeCurrentUserStorage, context.migrateStorageToFirestoreV3);
});

test("preserves the exposed inactive-legacy fb* stub contract", async () => {
  const { context } = loadFirebaseStorage();
  assert.equal(await context.fbGetLegacyInactive("key"), null);
  assert.equal(await context.fbSetLegacyInactive("key", "value"), undefined);
  assert.equal(await context.fbDelLegacyInactive("key"), undefined);
  assert.deepEqual(plain(await context.fbListLegacyInactive("prefix")), { keys: [] });
});

test("keeps the Firebase constants and one-time report configuration behavior", () => {
  const enabled = loadFirebaseStorage({ reportConfig: { reportServerUrl: " https://reports.example.test/root/ " } });
  assert.equal(enabled.evaluate("FB_PROJECT"), "nutrition-tracker-780b3");
  assert.equal(enabled.evaluate("FB_KEY"), "AIzaSyCFRIi8LToXFRqO3vwoaL0EEqzrK3TUgGE");
  assert.equal(enabled.evaluate("AUTH_BASE"), "https://identitytoolkit.googleapis.com/v1/accounts");
  assert.equal(enabled.evaluate("TOKEN_BASE"), "https://securetoken.googleapis.com/v1/token");
  assert.equal(enabled.evaluate("REPORT_SERVER_URL"), "https://reports.example.test/root");
  assert.equal(enabled.evaluate("REPORTS_ENABLED"), true);

  enabled.context.NUTRITION_TRACKER_CONFIG.reportServerUrl = "https://changed.example.test";
  assert.equal(enabled.evaluate("REPORT_SERVER_URL"), "https://reports.example.test/root");

  const disabled = loadFirebaseStorage({ reportConfig: { reportServerUrl: "http://insecure.example.test" } });
  assert.equal(disabled.evaluate("REPORT_SERVER_URL"), "");
  assert.equal(disabled.evaluate("REPORTS_ENABLED"), false);
  assert.equal(disabled.warnings.length, 1);
});

test("signs in, stores the session, reuses the cached token and exposes authenticated headers", async () => {
  const requests = [];
  const fixture = loadFirebaseStorage({
    fetchRequest: async (url, options) => {
      requests.push({ url: String(url), options });
      return response({ idToken: "signed-in-token", refreshToken: "signed-in-refresh", localId: "user-1", expiresIn: "3600" });
    }
  });

  const result = await fixture.context.fbSignIn("person@example.test", "secret");
  assert.equal(result.idToken, "signed-in-token");
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /accounts:signInWithPassword\?key=/);
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: "person@example.test",
    password: "secret",
    returnSecureToken: true
  });
  assert.equal(fixture.context.fbIsLoggedIn(), true);
  assert.equal(await fixture.context.fbToken(), "signed-in-token");
  assert.deepEqual(plain(await fixture.context.fbHeaders()), {
    "Content-Type": "application/json",
    Authorization: "Bearer signed-in-token"
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(fixture.localStorage.snapshot(), {
    fb_refresh: "signed-in-refresh",
    fb_uid: "user-1",
    fb_email: "person@example.test"
  });
});

test("preserves successful signup, profile, email verification, lookup and password-reset requests", async () => {
  const requests = [];
  const fixture = loadFirebaseStorage({
    fetchRequest: async (urlValue, options) => {
      const url = String(urlValue);
      const body = options.body && options.headers["Content-Type"] === "application/json" ? JSON.parse(options.body) : options.body;
      requests.push({ url, body });
      if (url.includes(":signUp")) return response({ idToken: "signup-token", refreshToken: "signup-refresh", localId: "user-1", expiresIn: "3600" });
      if (url.includes(":lookup")) return response({ users: [{ emailVerified: true }] });
      return response({ accepted: true });
    }
  });

  await fixture.context.fbSignUp("new@example.test", "password");
  assert.deepEqual(await fixture.context.fbUpdateProfile("New User"), { accepted: true });
  assert.deepEqual(await fixture.context.fbSendVerificationEmail(), { accepted: true });
  assert.equal(await fixture.context.fbCheckEmailVerified(), true);
  assert.deepEqual(await fixture.context.fbSendPasswordResetEmail("  new@example.test  "), { accepted: true });

  assert.deepEqual(requests.map(item => item.body), [
    { email: "new@example.test", password: "password", returnSecureToken: true },
    { idToken: "signup-token", displayName: "New User", returnSecureToken: false },
    { requestType: "VERIFY_EMAIL", idToken: "signup-token" },
    { idToken: "signup-token" },
    { requestType: "PASSWORD_RESET", email: "new@example.test" }
  ]);
});

test("refreshes expired sessions and preserves the current refresh-failure cleanup contract", async () => {
  let mode = "success";
  const fixture = loadFirebaseStorage({
    local: { fb_refresh: "old-refresh", fb_uid: "user-1", fb_email: "person@example.test" },
    fetchRequest: async (url, options) => {
      assert.match(String(url), /securetoken\.googleapis\.com\/v1\/token\?key=/);
      assert.equal(options.body, "grant_type=refresh_token&refresh_token=old-refresh");
      if (mode === "failure") return response({}, { ok: false, status: 401 });
      return response({ id_token: "refreshed-token", refresh_token: "new-refresh", user_id: "user-1", expires_in: "3600" });
    }
  });

  assert.equal(await fixture.context.fbToken(), "refreshed-token");
  assert.equal(fixture.localStorage.getItem("fb_refresh"), "new-refresh");

  fixture.localStorage.setItem("fb_refresh", "old-refresh");
  fixture.localStorage.setItem("fb_uid", "user-1");
  fixture.evaluate('_refreshToken = "old-refresh"; _uid = "user-1"; _idToken = null; _tokenExpiry = 0');
  mode = "failure";
  await assert.rejects(fixture.context.fbRefreshToken(), /Sessão expirada/);
  assert.equal(fixture.localStorage.getItem("fb_refresh"), null);
  assert.equal(fixture.localStorage.getItem("fb_uid"), null);
  assert.equal(fixture.localStorage.getItem("fb_email"), "person@example.test");
  assert.equal(fixture.evaluate("_uid"), "user-1");
});

test("preserves authentication HTTP errors, malformed JSON propagation and lookup-without-user errors", async t => {
  await t.test("uses Firebase's login error message", async () => {
    const fixture = loadFirebaseStorage({ fetchRequest: async () => response({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, { ok: false }) });
    await assert.rejects(fixture.context.fbSignIn("bad@example.test", "bad"), /INVALID_LOGIN_CREDENTIALS/);
  });

  await t.test("propagates malformed JSON from sign-in", async () => {
    const fixture = loadFirebaseStorage({ fetchRequest: async () => response(null, { jsonError: new SyntaxError("bad json") }) });
    await assert.rejects(fixture.context.fbSignIn("bad@example.test", "bad"), /bad json/);
  });

  await t.test("rejects account lookup without a user", async () => {
    const fixture = loadFirebaseStorage({ fetchRequest: async () => response({ users: [] }) });
    fixture.saveSession();
    await assert.rejects(fixture.context.fbCheckEmailVerified(), /Account lookup returned no user/);
  });

  await t.test("returns false for an existing unverified account", async () => {
    const fixture = loadFirebaseStorage({ fetchRequest: async () => response({ users: [{ emailVerified: false }] }) });
    fixture.saveSession();
    assert.equal(await fixture.context.fbCheckEmailVerified(), false);
  });

  await t.test("rejects token access without a refresh session", async () => {
    const fixture = loadFirebaseStorage();
    await assert.rejects(fixture.context.fbToken(), /Sem sessão/);
  });
});

test("preserves each Firebase auth operation's provider-error propagation", async t => {
  const cases = [
    ["signup", context => context.fbSignUp("person@example.test", "secret"), "EMAIL_EXISTS"],
    ["profile", context => context.fbUpdateProfile("Person"), "PROFILE_ERROR"],
    ["verification", context => context.fbSendVerificationEmail(), "VERIFY_ERROR"],
    ["password reset", context => context.fbSendPasswordResetEmail("person@example.test"), "RESET_ERROR"],
    ["lookup", context => context.fbCheckEmailVerified(), "LOOKUP_ERROR"]
  ];

  for (const [name, invoke, message] of cases) {
    await t.test(name, async () => {
      const fixture = loadFirebaseStorage({
        fetchRequest: async () => response({ error: { message } }, { ok: false })
      });
      fixture.saveSession();
      await assert.rejects(invoke(fixture.context), new RegExp(message));
    });
  }
});

test("sign-out clears session storage and returns the unauthenticated storage null/no-op contract", async () => {
  const fixture = loadFirebaseStorage({ local: { fb_refresh: "refresh", fb_uid: "user-1", fb_email: "person@example.test" } });
  fixture.context.fbSignOut();
  assert.equal(fixture.context.fbIsLoggedIn(), false);
  assert.deepEqual(fixture.localStorage.snapshot(), {});
  assert.equal(await fixture.context.storage.get("pantry_v2"), null);
  assert.equal(await fixture.context.storage.set("pantry_v2", "[]"), undefined);
  assert.equal(await fixture.context.storage.delete("pantry_v2"), undefined);
});

test("normalizes profile values while preserving storage {value} string records", async () => {
  const backend = createFirestoreBackend();
  const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
  fixture.saveSession();
  fixture.suppressAutomaticMigration();

  assert.equal(await fixture.context.storage.set("goalType", "lose_weight"), undefined);
  assert.deepEqual(plain(await fixture.context.storage.get("goalType")), { value: "loss" });
  assert.equal(backend.rootFields.goalType, "loss");

  await fixture.context.storage.set("gender", "Feminino");
  await fixture.context.storage.set("activityLevel", "moderado");
  assert.deepEqual(plain(await fixture.context.storage.get("gender")), { value: "female" });
  assert.deepEqual(plain(await fixture.context.storage.get("activityLevel")), { value: "moderate" });
});

test("preserves data-document CRUD, JSON stringification, 404 deletion and prefix listing", async () => {
  const backend = createFirestoreBackend({ root: { language: "pt", _storageSchemaVerified: true } });
  const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
  fixture.saveSession();
  fixture.suppressAutomaticMigration();

  await fixture.context.storage.set("pantry_v2", [{ id: "food-1" }]);
  assert.equal(backend.dataDocs.get("pantry_v2"), '[{"id":"food-1"}]');
  assert.deepEqual(plain(await fixture.context.storage.get("pantry_v2")), { value: '[{"id":"food-1"}]' });
  assert.deepEqual(plain(await fixture.context.storage.list("pantry")), { keys: ["pantry_v2"] });

  assert.equal(await fixture.context.storage.delete("pantry_v2"), undefined);
  assert.equal(await fixture.context.storage.delete("pantry_v2"), undefined);
  assert.equal(await fixture.context.storage.get("pantry_v2"), null);
});

test("preserves root, legacy and local fallbacks plus richest-candidate selection for critical keys", async () => {
  const backend = createFirestoreBackend({
    root: { customText: "root-value", pantry_v2: "[]", _storageSchemaVerified: true },
    data: { pantry_v2: '[{"id":"cloud"}]' },
    legacy: { legacyOnly: "legacy-value", pantry_v2: '[{"id":"legacy"},{"id":"legacy-2"}]' }
  });
  const fixture = loadFirebaseStorage({
    local: { localOnly: "local-value", pantry_v2: '[{"id":"local"},{"id":"local-2"},{"id":"local-3"}]' },
    fetchRequest: backend.fetchRequest
  });
  fixture.saveSession();
  fixture.suppressAutomaticMigration();

  assert.deepEqual(plain(await fixture.context.storage.get("customText")), { value: "root-value" });
  assert.deepEqual(plain(await fixture.context.storage.get("legacyOnly")), { value: "legacy-value" });
  assert.deepEqual(plain(await fixture.context.storage.get("localOnly")), { value: "local-value" });
  assert.deepEqual(plain(await fixture.context.storage.get("pantry_v2")), { value: '[{"id":"local"},{"id":"local-2"},{"id":"local-3"}]' });
});

test("preserves storage read-null/list-empty behavior and write/delete rejection semantics", async t => {
  await t.test("failed reads become null and failed lists become empty", async () => {
    const backend = createFirestoreBackend({ failures: { rootRead: true, dataRead: "weightHistory", dataList: true, legacyList: true } });
    const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
    fixture.saveSession();
    fixture.suppressAutomaticMigration();
    assert.equal(await fixture.context.storage.get("weightHistory"), null);
    assert.deepEqual(plain(await fixture.context.storage.list()), { keys: [] });
  });

  await t.test("failed active-v3 writes and deletes reject", async () => {
    const backend = createFirestoreBackend({ failures: { dataWrite: "pantry_v2", dataDelete: "weightHistory", rootWrite: true } });
    const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
    fixture.saveSession();
    fixture.suppressAutomaticMigration();
    await assert.rejects(fixture.context.storage.set("pantry_v2", "[]"), /Firestore data write failed/);
    await assert.rejects(fixture.context.storage.delete("weightHistory"), /Firestore data delete failed/);
    await assert.rejects(fixture.context.storage.set("language", "en"), /Firestore write failed/);
  });
});

test("keeps migration aliases and the already-verified early-return format", async () => {
  const backend = createFirestoreBackend({ root: { _storageSchemaVerified: true } });
  const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
  fixture.saveSession();
  assert.deepEqual(
    plain(await fixture.context.normalizeCurrentUserStorage({ cleanup: true })),
    { migrated: 0, cleaned: 0, skipped: 1 }
  );
});

test("preserves backup validation, preview and import return shapes", async () => {
  const backend = createFirestoreBackend({
    root: { activityLevel: "moderate", _storageSchemaVerified: true },
    data: { pantry_v2: '[{"id":"existing","name":"Rice"}]' }
  });
  const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
  fixture.saveSession();
  fixture.suppressAutomaticMigration();

  const backup = await fixture.context.exportFullAccountBackup();
  assert.equal(backup.schema, "nutrition-tracker-account-backup");
  assert.equal(backup.version, 3);
  assert.deepEqual(plain(backup.counts), { root: 1, data: 1, legacy: 0 });
  assert.deepEqual(plain(fixture.context.validateFullAccountBackup(backup)), {
    ok: true,
    errors: [],
    counts: { root: 1, data: 1, legacy: 0, importable: 2 }
  });

  const incoming = {
    schema: "nutrition-tracker-account-backup",
    version: 3,
    exportedAt: "2026-07-18T12:00:00.000Z",
    root: { goalType: "loss" },
    data: { pantry_v2: '[{"id":"new","name":"Beans"}]' },
    legacy: {}
  };
  const preview = await fixture.context.previewFullAccountBackupImport(incoming);
  assert.equal(preview.ok, true);
  assert.equal(preview.importable, 2);
  assert.equal(preview.categories.length, 2);
  assert.equal(preview.exportedAt, incoming.exportedAt);

  const result = await fixture.context.importFullAccountBackup(incoming, {
    categories: { profile: "replace", pantry: "append" }
  });
  assert.deepEqual(plain(result), { imported: 2, skipped: 0 });
  assert.equal(backend.rootFields.goalType, "loss");
  assert.match(backend.dataDocs.get("pantry_v2"), /existing/);
  assert.match(backend.dataDocs.get("pantry_v2"), /new/);
});

test("preserves destructive deletion behavior when child listings fail", async () => {
  const backend = createFirestoreBackend({
    root: { userName: "Person" },
    data: { pantry_v2: '[{"id":"food"}]' },
    legacy: { weightHistory: "[]" },
    failures: { dataList: true, legacyList: true }
  });
  const fixture = loadFirebaseStorage({ fetchRequest: backend.fetchRequest });
  fixture.saveSession();
  fixture.suppressAutomaticMigration();

  assert.deepEqual(plain(await fixture.context.deleteCurrentUserFirestoreData()), { deleted: 1, failed: 0 });
  assert.equal(backend.dataDocs.has("pantry_v2"), true);
  assert.equal(backend.legacyDocs.has("weightHistory"), true);
  assert.deepEqual(backend.rootFields, {});
});
