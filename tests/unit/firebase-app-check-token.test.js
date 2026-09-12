const test = require("node:test");
const assert = require("node:assert/strict");
const { createSign, generateKeyPairSync, webcrypto } = require("node:crypto");

const PROJECT_NUMBER = "128834310181";
const WEB_APP_ID = `1:${PROJECT_NUMBER}:web:test-app`;
const NOW_MS = Date.UTC(2026, 8, 10, 12, 0, 0);
const NOW_SECONDS = Math.floor(NOW_MS / 1000);

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signToken(privateKey, { header = {}, payload = {} } = {}) {
  const encodedHeader = base64url(JSON.stringify({
    alg: "RS256",
    typ: "JWT",
    kid: "app-check-test-key",
    ...header
  }));
  const encodedPayload = base64url(JSON.stringify({
    iss: `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`,
    aud: [`projects/${PROJECT_NUMBER}`],
    sub: WEB_APP_ID,
    iat: NOW_SECONDS - 30,
    exp: NOW_SECONDS + 3600,
    ...payload
  }));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function createFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicJwk = {
    ...publicKey.export({ format: "jwk" }),
    kid: "app-check-test-key",
    alg: "RS256",
    use: "sig"
  };
  const cryptoKey = await webcrypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const keyRequests = [];
  const keyImports = [];
  const module = await import("../../worker/src/firebase-app-check-token.js");
  const verify = module.createFirebaseAppCheckTokenVerifier({
    projectNumber: PROJECT_NUMBER,
    allowedAppIds: [WEB_APP_ID, `1:${PROJECT_NUMBER}:android:test-app`],
    now: () => NOW_MS,
    fetchRequest: async (...args) => {
      keyRequests.push(args);
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "Cache-Control": "public, max-age=3600" }
      });
    },
    importKey: async (...args) => {
      keyImports.push(args);
      return cryptoKey;
    }
  });
  return { module, privateKey, verify, keyRequests, keyImports };
}

test("verifies the App Check RS256 contract and allowed Firebase app subject", async () => {
  const fixture = await createFixture();
  const result = await fixture.verify(signToken(fixture.privateKey));

  assert.deepEqual(result, { appId: WEB_APP_ID });
  assert.equal(fixture.keyRequests.length, 1);
  assert.equal(fixture.keyRequests[0][0], "https://firebaseappcheck.googleapis.com/v1/jwks");
  assert.equal(fixture.keyImports.length, 1);
  assert.equal(fixture.keyImports[0][1], "RS256");
});
test("caches App Check public keys according to max-age", async () => {
  const fixture = await createFixture();
  const token = signToken(fixture.privateKey);
  await fixture.verify(token);
  await fixture.verify(token);
  assert.equal(fixture.keyRequests.length, 1);
  assert.equal(fixture.keyImports.length, 1);
});

test("rejects wrong algorithm, token type, missing key ID, issuer, audience, expiry, and app", async () => {
  const fixture = await createFixture();
  const invalidTokens = [
    signToken(fixture.privateKey, { header: { alg: "HS256" } }),
    signToken(fixture.privateKey, { header: { typ: "OTHER" } }),
    signToken(fixture.privateKey, { header: { kid: "" } }),
    signToken(fixture.privateKey, { payload: { iss: "https://example.invalid" } }),
    signToken(fixture.privateKey, { payload: { aud: ["projects/other"] } }),
    signToken(fixture.privateKey, { payload: { exp: NOW_SECONDS - 61 } }),
    signToken(fixture.privateKey, { payload: { sub: `1:${PROJECT_NUMBER}:web:not-allowed` } })
  ];

  for (const token of invalidTokens) {
    await assert.rejects(
      fixture.verify(token),
      error => error instanceof fixture.module.FirebaseAppCheckTokenError &&
        ["invalid-token", "app-not-allowed"].includes(error.code)
    );
  }
});

test("classifies unavailable or malformed JWKS without exposing provider detail", async () => {
  const module = await import("../../worker/src/firebase-app-check-token.js");
  const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleSJ9.e30.signature";
  const verifiers = [
    module.createFirebaseAppCheckTokenVerifier({
      projectNumber: PROJECT_NUMBER,
      allowedAppIds: [WEB_APP_ID],
      fetchRequest: async () => new Response("unavailable", { status: 503 })
    }),
    module.createFirebaseAppCheckTokenVerifier({
      projectNumber: PROJECT_NUMBER,
      allowedAppIds: [WEB_APP_ID],
      fetchRequest: async () => new Response(JSON.stringify({ keys: [] }), { status: 200 })
    })
  ];

  for (const verify of verifiers) {
    await assert.rejects(
      verify(token),
      error => error instanceof module.FirebaseAppCheckTokenError &&
        error.code === "key-unavailable"
    );
  }
});
