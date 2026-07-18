const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(path.join(__dirname, "..", "..", "firebase-auth-internal.js"), "utf8");

function response(body, { ok = true, jsonError } = {}) {
  return {
    ok,
    async json() {
      if (jsonError) throw jsonError;
      return body;
    }
  };
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

function loadAuth({ local = {}, fetchRequest = async () => response({}) } = {}) {
  const context = { console };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "firebase-auth-internal.js" });

  const localStorage = createLocalStorage(local);
  let uid = localStorage.getItem("fb_uid") || null;
  let resetCount = 0;
  const auth = context.FirebaseAuthInternal.createFirebaseAuth({
    apiKey: "test-key",
    authBase: "https://identity.example.test/accounts",
    tokenBase: "https://token.example.test/token",
    fetchRequest,
    localStorage,
    resetStorageCaches() { resetCount++; },
    getCurrentUid() { return uid; },
    setCurrentUid(value) { uid = value; }
  });

  return {
    auth,
    localStorage,
    getUid: () => uid,
    getResetCount: () => resetCount
  };
}

test("publishes a namespaced UMD authentication factory", () => {
  const fixture = loadAuth();
  assert.equal(typeof fixture.auth.fbSignIn, "function");
  assert.equal(typeof fixture.auth.fbToken, "function");
  assert.equal(typeof fixture.auth._saveSession, "function");
});

test("preserves successful sign-in and sign-up session behavior", async () => {
  const requests = [];
  const fixture = loadAuth({
    fetchRequest: async (url, options) => {
      requests.push({ url, options });
      if (url.includes(":signInWithPassword")) {
        return response({ idToken: "login-id", refreshToken: "login-refresh", localId: "login-user", expiresIn: "3600" });
      }
      return response({ idToken: "signup-id", refreshToken: "signup-refresh", localId: "signup-user", expiresIn: "3600" });
    }
  });

  assert.equal((await fixture.auth.fbSignIn("person@example.test", "secret")).idToken, "login-id");
  assert.equal(fixture.getUid(), "login-user");
  assert.equal(fixture.localStorage.getItem("fb_email"), "person@example.test");
  assert.equal(await fixture.auth.fbToken(), "login-id");

  assert.equal((await fixture.auth.fbSignUp("new@example.test", "password")).idToken, "signup-id");
  assert.equal(fixture.getUid(), "signup-user");
  assert.equal(fixture.localStorage.getItem("fb_refresh"), "signup-refresh");
  assert.equal(fixture.getResetCount(), 2);
  assert.equal(requests.length, 2);
});

test("preserves sign-in and sign-up provider errors and malformed JSON propagation", async t => {
  await t.test("sign-in provider error", async () => {
    const fixture = loadAuth({ fetchRequest: async () => response({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, { ok: false }) });
    await assert.rejects(fixture.auth.fbSignIn("bad@example.test", "bad"), /INVALID_LOGIN_CREDENTIALS/);
    assert.equal(fixture.getResetCount(), 0);
  });

  await t.test("sign-up provider error", async () => {
    const fixture = loadAuth({ fetchRequest: async () => response({ error: { message: "EMAIL_EXISTS" } }, { ok: false }) });
    await assert.rejects(fixture.auth.fbSignUp("used@example.test", "secret"), /EMAIL_EXISTS/);
    assert.equal(fixture.getResetCount(), 0);
  });

  await t.test("malformed sign-in JSON", async () => {
    const fixture = loadAuth({ fetchRequest: async () => response(null, { jsonError: new SyntaxError("bad json") }) });
    await assert.rejects(fixture.auth.fbSignIn("bad@example.test", "bad"), /bad json/);
    assert.equal(fixture.getResetCount(), 0);
  });
});

test("preserves missing expiresIn as an immediately non-cacheable token", async () => {
  let requests = 0;
  const fixture = loadAuth({
    local: { fb_refresh: "old-refresh", fb_uid: "user-1" },
    fetchRequest: async () => {
      requests++;
      return response({ id_token: `id-${requests}`, refresh_token: `refresh-${requests}`, user_id: "user-1" });
    }
  });

  assert.equal(await fixture.auth.fbToken(), "id-1");
  assert.equal(await fixture.auth.fbToken(), "id-2");
  assert.equal(requests, 2);
  assert.equal(fixture.getResetCount(), 2);
});

test("preserves concurrent fbToken refreshes without Promise deduplication", async () => {
  let requests = 0;
  const fixture = loadAuth({
    local: { fb_refresh: "shared-refresh", fb_uid: "user-1" },
    fetchRequest: async () => {
      requests++;
      await Promise.resolve();
      return response({ id_token: `id-${requests}`, refresh_token: "shared-refresh", user_id: "user-1", expires_in: "3600" });
    }
  });

  const tokens = await Promise.all([fixture.auth.fbToken(), fixture.auth.fbToken()]);
  assert.equal(requests, 2);
  assert.equal(tokens.length, 2);
  assert.equal(fixture.getResetCount(), 2);
});

test("preserves refresh-failure cleanup without resetting caches or the bridged UID", async () => {
  const fixture = loadAuth({
    local: { fb_refresh: "expired", fb_uid: "user-1", fb_email: "person@example.test" },
    fetchRequest: async () => response({}, { ok: false })
  });

  await assert.rejects(fixture.auth.fbRefreshToken(), /Sessão expirada/);
  assert.equal(fixture.localStorage.getItem("fb_refresh"), null);
  assert.equal(fixture.localStorage.getItem("fb_uid"), null);
  assert.equal(fixture.localStorage.getItem("fb_email"), "person@example.test");
  assert.equal(fixture.getUid(), "user-1");
  assert.equal(fixture.getResetCount(), 0);
});

test("resets caches on external session save, successful refresh, and sign-out only", async () => {
  const fixture = loadAuth({
    local: { fb_refresh: "initial-refresh", fb_uid: "initial-user", fb_email: "person@example.test" },
    fetchRequest: async () => response({ id_token: "refreshed-id", refresh_token: "refreshed-token", user_id: "initial-user", expires_in: "3600" })
  });

  fixture.auth._saveSession({ idToken: "manual-id", refreshToken: "manual-refresh", localId: "manual-user", expiresIn: "3600" });
  assert.equal(fixture.getResetCount(), 1);
  assert.equal(fixture.getUid(), "manual-user");

  await fixture.auth.fbRefreshToken();
  assert.equal(fixture.getResetCount(), 2);

  fixture.auth.fbSignOut();
  assert.equal(fixture.getResetCount(), 3);
  assert.equal(fixture.getUid(), null);
  assert.equal(fixture.auth.fbIsLoggedIn(), false);
  assert.deepEqual(fixture.localStorage.snapshot(), {});
  await assert.rejects(fixture.auth.fbToken(), /Sem sessão/);
});
