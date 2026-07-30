const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSign,
  generateKeyPairSync,
  webcrypto
} = require("node:crypto");

const PROJECT_ID = "nutrition-tracker-780b3";
const NOW_MS = Date.UTC(2026, 6, 30, 12, 0, 0);
const NOW_SECONDS = Math.floor(NOW_MS / 1000);

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(privateKey, {
  header = {},
  payload = {}
} = {}) {
  const completeHeader = { alg: "RS256", typ: "JWT", kid: "test-kid", ...header };
  const completePayload = {
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: "firebase-user-1",
    iat: NOW_SECONDS - 60,
    exp: NOW_SECONDS + 3600,
    auth_time: NOW_SECONDS - 120,
    ...payload
  };
  const encodedHeader = base64url(JSON.stringify(completeHeader));
  const encodedPayload = base64url(JSON.stringify(completePayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).end().sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function createFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicJwk = publicKey.export({ format: "jwk" });
  const cryptoKey = await webcrypto.subtle.importKey(
    "jwk",
    publicJwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const certificateRequests = [];
  const certificateImports = [];
  const module = await import("../../worker/src/firebase-id-token.js");
  const verify = module.createFirebaseIdTokenVerifier({
    projectId: PROJECT_ID,
    now: () => NOW_MS,
    fetchRequest: async (...args) => {
      certificateRequests.push(args);
      return new Response(JSON.stringify({ "test-kid": "fake-public-certificate" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600"
        }
      });
    },
    importCertificate: async (...args) => {
      certificateImports.push(args);
      return cryptoKey;
    }
  });
  return {
    module,
    privateKey,
    verify,
    certificateRequests,
    certificateImports
  };
}

test("verifies an RS256 Firebase ID token and returns its UID", async () => {
  const fixture = await createFixture();
  const token = signToken(fixture.privateKey);

  const result = await fixture.verify(token);

  assert.equal(result.uid, "firebase-user-1");
  assert.equal(result.claims.aud, PROJECT_ID);
  assert.equal(fixture.certificateRequests.length, 1);
  assert.deepEqual(fixture.certificateImports[0], ["fake-public-certificate", "RS256"]);
  assert.equal(
    fixture.certificateRequests[0][0],
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
});

test("caches imported certificates according to Google's max-age", async () => {
  const fixture = await createFixture();
  const token = signToken(fixture.privateKey);

  await fixture.verify(token);
  await fixture.verify(token);

  assert.equal(fixture.certificateRequests.length, 1);
  assert.equal(fixture.certificateImports.length, 1);
});

test("rejects unsupported algorithms and missing key IDs before fetching certificates", async () => {
  const fixture = await createFixture();
  const unsupported = signToken(fixture.privateKey, { header: { alg: "HS256" } });
  const missingKid = signToken(fixture.privateKey, { header: { kid: "" } });

  for (const token of [unsupported, missingKid]) {
    await assert.rejects(
      fixture.verify(token),
      error => error instanceof fixture.module.FirebaseIdTokenError &&
        error.code === "invalid-token"
    );
  }
  assert.equal(fixture.certificateRequests.length, 0);
});

test("rejects invalid Firebase audience, issuer, expiry, issued-at, subject, and auth time", async () => {
  const fixture = await createFixture();
  const invalidPayloads = [
    { aud: "another-project" },
    { aud: [PROJECT_ID] },
    { iss: "https://securetoken.google.com/another-project" },
    { exp: undefined },
    { exp: NOW_SECONDS - 301 },
    { iat: undefined },
    { iat: NOW_SECONDS + 301 },
    { sub: undefined },
    { sub: "" },
    { sub: "x".repeat(129) },
    { auth_time: NOW_SECONDS + 301 }
  ];

  for (const payload of invalidPayloads) {
    await assert.rejects(
      fixture.verify(signToken(fixture.privateKey, { payload })),
      error => error instanceof fixture.module.FirebaseIdTokenError &&
        error.code === "invalid-token",
      JSON.stringify(payload)
    );
  }
});

test("rejects an invalid signature and an unknown certificate key ID", async () => {
  const fixture = await createFixture();
  const otherKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });

  await assert.rejects(
    fixture.verify(signToken(otherKeys.privateKey)),
    error => error instanceof fixture.module.FirebaseIdTokenError &&
      error.code === "invalid-token"
  );
  await assert.rejects(
    fixture.verify(signToken(fixture.privateKey, { header: { kid: "unknown-kid" } })),
    error => error instanceof fixture.module.FirebaseIdTokenError &&
      error.code === "invalid-token"
  );
});

test("classifies certificate endpoint and certificate import failures as unavailable", async () => {
  const module = await import("../../worker/src/firebase-id-token.js");
  const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2lkIn0.e30.signature";
  const failedFetchVerifier = module.createFirebaseIdTokenVerifier({
    projectId: PROJECT_ID,
    fetchRequest: async () => new Response("unavailable", { status: 503 })
  });
  const failedImportVerifier = module.createFirebaseIdTokenVerifier({
    projectId: PROJECT_ID,
    fetchRequest: async () => new Response(JSON.stringify({ "test-kid": "bad-cert" }), {
      status: 200
    }),
    importCertificate: async () => {
      throw new Error("bad certificate");
    }
  });

  for (const verify of [failedFetchVerifier, failedImportVerifier]) {
    await assert.rejects(
      verify(token),
      error => error instanceof module.FirebaseIdTokenError &&
        error.code === "certificate-unavailable"
    );
  }
});
