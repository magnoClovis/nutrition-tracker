const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ENDPOINT = "https://trofia-ai-proxy.example/v1/ai/completion";
const WEB_ORIGIN = "https://magnoclovis.github.io";
const ANDROID_ORIGIN = "https://localhost";

function request({
  origin = WEB_ORIGIN,
  method = "POST",
  token = "firebase-id-token",
  contentType = "application/json",
  body = JSON.stringify({ prompt: "Nutrition prompt", maxTokens: 321 }),
  pathName = "/v1/ai/completion",
  headers = {}
} = {}) {
  const requestHeaders = { ...headers };
  if (origin !== null) requestHeaders.Origin = origin;
  if (contentType !== null) requestHeaders["Content-Type"] = contentType;
  if (token !== null) requestHeaders.Authorization = `Bearer ${token}`;
  return new Request(`https://trofia-ai-proxy.example${pathName}`, {
    method,
    headers: requestHeaders,
    body: ["GET", "HEAD", "OPTIONS"].includes(method) ? undefined : body
  });
}

async function responseBody(response) {
  return JSON.parse(await response.text());
}

async function createFixture({
  verificationResult = { uid: "firebase-user-1" },
  verificationError,
  providerResponse = new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "Expected " }, { text: "answer" }] } }]
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }),
  geminiApiKey = "test-only-gemini-key",
  rateLimitResult = { allowed: true },
  rateLimitError,
  rateLimiterBinding = true,
  now = 123_456
} = {}) {
  const module = await import("../../worker/src/ai-worker.js");
  const verifiedTokens = [];
  const providerRequests = [];
  const rateLimiterNames = [];
  const rateLimiterChecks = [];
  const worker = module.createAIWorker({
    verifyFirebaseIdToken: async token => {
      verifiedTokens.push(token);
      if (verificationError) throw verificationError;
      return verificationResult;
    },
    fetchRequest: async (...args) => {
      providerRequests.push(args);
      if (providerResponse instanceof Error) throw providerResponse;
      return providerResponse;
    },
    now: () => now
  });
  const env = geminiApiKey === null ? {} : { GEMINI_API_KEY: geminiApiKey };
  if (rateLimiterBinding) {
    env.AI_RATE_LIMITER = {
      getByName(name) {
        rateLimiterNames.push(name);
        return {
          async check(uid, timestampMs) {
            rateLimiterChecks.push([uid, timestampMs]);
            if (rateLimitError) throw rateLimitError;
            return rateLimitResult;
          }
        };
      }
    };
  }
  return {
    module,
    worker,
    env,
    verifiedTokens,
    providerRequests,
    rateLimiterNames,
    rateLimiterChecks
  };
}

test("accepts the web and Capacitor HTTPS origins in CORS preflight", async () => {
  const fixture = await createFixture();

  for (const origin of [WEB_ORIGIN, ANDROID_ORIGIN]) {
    const response = await fixture.worker.fetch(request({
      origin,
      method: "OPTIONS",
      token: null,
      contentType: null,
      body: undefined,
      headers: {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type"
      }
    }), fixture.env);

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(response.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
    assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
    assert.equal(response.headers.get("Vary"), "Origin");
  }
});

test("rejects HTTP localhost, arbitrary origins, and missing origins", async () => {
  const fixture = await createFixture();

  for (const origin of ["http://localhost", "https://attacker.example", null]) {
    const response = await fixture.worker.fetch(request({ origin }), fixture.env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
    assert.deepEqual(await responseBody(response), {
      error: { code: "origin-not-allowed" }
    });
  }
});

test("rejects preflights for methods or headers outside the CORS contract", async () => {
  const fixture = await createFixture();
  const cases = [
    {
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization"
    },
    {
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, x-unexpected"
    }
  ];

  for (const headers of cases) {
    const response = await fixture.worker.fetch(request({
      method: "OPTIONS",
      token: null,
      contentType: null,
      body: undefined,
      headers
    }), fixture.env);
    assert.equal(response.status, 405);
    assert.deepEqual(await responseBody(response), {
      error: { code: "method-not-allowed" }
    });
  }
});

test("sends the exact stable Gemini generateContent request", async () => {
  const fixture = await createFixture();
  const response = await fixture.worker.fetch(request(), fixture.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await responseBody(response), { text: "Expected answer" });
  assert.deepEqual(fixture.verifiedTokens, ["firebase-id-token"]);
  assert.deepEqual(fixture.rateLimiterNames, ["gemini-project-quota"]);
  assert.deepEqual(fixture.rateLimiterChecks, [["firebase-user-1", 123_456]]);
  assert.equal(fixture.providerRequests.length, 1);
  assert.equal(
    fixture.providerRequests[0][0],
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
  );
  assert.deepEqual(fixture.providerRequests[0][1], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": "test-only-gemini-key"
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: "Nutrition prompt" }]
      }],
      generationConfig: {
        maxOutputTokens: 321,
        temperature: 0
      }
    })
  });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), WEB_ORIGIN);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("enforces the endpoint path, method, and JSON content type", async () => {
  const fixture = await createFixture();
  const cases = [
    [request({ pathName: "/v1/other" }), 404, "not-found"],
    [request({ method: "GET", body: undefined }), 405, "method-not-allowed"],
    [request({ contentType: "text/plain" }), 415, "unsupported-media-type"]
  ];

  for (const [incomingRequest, status, code] of cases) {
    const response = await fixture.worker.fetch(incomingRequest, fixture.env);
    assert.equal(response.status, status);
    assert.deepEqual(await responseBody(response), { error: { code } });
  }
});

test("requires a strict Firebase bearer token before reading the request body", async () => {
  const fixture = await createFixture();

  for (const authorization of [null, "Basic token", "Bearer token with-spaces"]) {
    const incomingRequest = request({
      token: null,
      headers: authorization ? { Authorization: authorization } : {}
    });
    const response = await fixture.worker.fetch(incomingRequest, fixture.env);
    assert.equal(response.status, 401);
    assert.deepEqual(await responseBody(response), {
      error: { code: "invalid-authentication" }
    });
  }
  assert.equal(fixture.providerRequests.length, 0);
});

test("maps invalid tokens to 401 and certificate outages to 503", async () => {
  const firebaseModule = await import("../../worker/src/firebase-id-token.js");
  const cases = [
    [new firebaseModule.FirebaseIdTokenError("invalid-token"), 401, "invalid-authentication"],
    [new firebaseModule.FirebaseIdTokenError("certificate-unavailable"), 503, "authentication-unavailable"]
  ];

  for (const [verificationError, status, code] of cases) {
    const fixture = await createFixture({ verificationError });
    const response = await fixture.worker.fetch(request(), fixture.env);
    assert.equal(response.status, status);
    assert.deepEqual(await responseBody(response), { error: { code } });
    assert.equal(fixture.providerRequests.length, 0);
  }
});

test("rejects malformed JSON and invalid prompt/maxTokens contracts", async () => {
  const fixture = await createFixture();
  const invalidBodies = [
    ["{", "invalid-json"],
    [JSON.stringify({ prompt: "", maxTokens: 800 }), "invalid-request"],
    [JSON.stringify({ prompt: "   ", maxTokens: 800 }), "invalid-request"],
    [JSON.stringify({ prompt: "x".repeat(40_001), maxTokens: 800 }), "invalid-request"],
    [JSON.stringify({ prompt: "valid", maxTokens: 0 }), "invalid-request"],
    [JSON.stringify({ prompt: "valid", maxTokens: 1_201 }), "invalid-request"],
    [JSON.stringify({ prompt: "valid", maxTokens: 1.5 }), "invalid-request"],
    [JSON.stringify({ prompt: "valid" }), "invalid-request"],
    [JSON.stringify({ prompt: "valid", maxTokens: 800, extra: true }), "invalid-request"]
  ];

  for (const [body, code] of invalidBodies) {
    const response = await fixture.worker.fetch(request({ body }), fixture.env);
    assert.equal(response.status, 400);
    assert.deepEqual(await responseBody(response), { error: { code } });
  }
  assert.equal(fixture.providerRequests.length, 0);
});

test("stops reading request bodies larger than the bounded maximum", async () => {
  const fixture = await createFixture();
  const response = await fixture.worker.fetch(request({
    body: JSON.stringify({ prompt: "x".repeat(170_000), maxTokens: 800 })
  }), fixture.env);

  assert.equal(response.status, 413);
  assert.deepEqual(await responseBody(response), {
    error: { code: "request-too-large" }
  });
});

test("requires the Gemini secret only after authentication and input validation", async () => {
  const fixture = await createFixture({ geminiApiKey: null });
  const response = await fixture.worker.fetch(request(), fixture.env);

  assert.equal(response.status, 503);
  assert.deepEqual(await responseBody(response), {
    error: { code: "provider-not-configured" }
  });
  assert.deepEqual(fixture.verifiedTokens, ["firebase-id-token"]);
  assert.equal(fixture.providerRequests.length, 0);
  assert.equal(fixture.rateLimiterChecks.length, 0);
});

test("returns 429 with Retry-After when the shared limiter rejects a call", async () => {
  const fixture = await createFixture({
    rateLimitResult: {
      allowed: false,
      limit: "uid-minute",
      retryAfterSeconds: 17
    }
  });
  const response = await fixture.worker.fetch(request(), fixture.env);

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "17");
  assert.deepEqual(await responseBody(response), {
    error: { code: "rate-limit-exceeded" }
  });
  assert.equal(fixture.providerRequests.length, 0);
});

test("fails closed when the shared rate limiter is unavailable", async () => {
  for (const options of [
    { rateLimiterBinding: false },
    { rateLimitError: new Error("private Durable Object detail") },
    { rateLimitResult: {} }
  ]) {
    const fixture = await createFixture(options);
    const response = await fixture.worker.fetch(request(), fixture.env);
    const rawResponse = await response.text();

    assert.equal(response.status, 503);
    assert.deepEqual(JSON.parse(rawResponse), {
      error: { code: "rate-limit-unavailable" }
    });
    assert.doesNotMatch(rawResponse, /private Durable Object detail/);
    assert.equal(fixture.providerRequests.length, 0);
  }
});

test("returns sanitized provider failures without logging payloads", async () => {
  const cases = [
    [new Error("network detail"), 502, "provider-unavailable"],
    [new Response(JSON.stringify({ error: { message: "private provider detail" } }), {
      status: 429
    }), 502, "provider-error"],
    [new Response(JSON.stringify({ candidates: [] }), { status: 200 }), 502, "invalid-provider-response"]
  ];

  for (const [providerResponse, status, code] of cases) {
    const fixture = await createFixture({ providerResponse });
    const response = await fixture.worker.fetch(request(), fixture.env);
    const rawResponse = await response.text();
    assert.equal(response.status, status);
    assert.deepEqual(JSON.parse(rawResponse), { error: { code } });
    assert.doesNotMatch(rawResponse, /private provider detail|network detail/);
  }

  const source = fs.readFileSync(
    path.join(__dirname, "..", "..", "worker", "src", "ai-worker.js"),
    "utf8"
  );
  assert.doesNotMatch(source, /\bconsole\./);
  const rateLimiterSource = fs.readFileSync(
    path.join(__dirname, "..", "..", "worker", "src", "rate-limiter.js"),
    "utf8"
  );
  assert.doesNotMatch(rateLimiterSource, /\bconsole\./);
});
