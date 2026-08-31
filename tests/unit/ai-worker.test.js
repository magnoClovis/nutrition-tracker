const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ENDPOINT = "https://trofia-ai-proxy.example/v1/ai/completion";
const WEB_ORIGIN = "https://magnoclovis.github.io";
const ANDROID_ORIGIN = "https://localhost";
const JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");

function imageRequestBody(overrides = {}) {
  return JSON.stringify({
    image: {
      mimeType: "image/jpeg",
      data: JPEG_BASE64
    },
    language: "pt",
    ...overrides
  });
}

function imageEstimate(overrides = {}) {
  return {
    status: "identified",
    dishName: "Arroz com frango",
    overallConfidence: "medium",
    assumptions: ["Porção estimada visualmente"],
    items: [{
      name: "Arroz",
      quantity: 120,
      unit: "g",
      estimatedGrams: 120,
      protein: 3,
      kcal: 156,
      carbs: 34,
      fat: 0.4,
      fiber: 0.5,
      salt: null,
      sugars: null,
      satfat: null,
      confidence: "medium"
    }],
    ...overrides
  };
}

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
          async check(uid, timestampMs, requestKind) {
            rateLimiterChecks.push([uid, timestampMs, requestKind]);
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

  for (const [origin, pathName] of [
    [WEB_ORIGIN, "/v1/ai/completion"],
    [ANDROID_ORIGIN, "/v1/ai/completion"],
    [WEB_ORIGIN, "/v1/ai/image-meal"],
    [ANDROID_ORIGIN, "/v1/ai/image-meal"],
    [WEB_ORIGIN, "/v1/ai/food-estimate"],
    [ANDROID_ORIGIN, "/v1/ai/dish-estimate"]
  ]) {
    const response = await fixture.worker.fetch(request({
      origin,
      pathName,
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
  assert.deepEqual(fixture.rateLimiterChecks, [["firebase-user-1", 123_456, "text"]]);
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

test("sends an inline JPEG through Interactions without storage and validates the full result", async () => {
  const estimate = imageEstimate();
  const fixture = await createFixture({
    providerResponse: new Response(JSON.stringify({
      status: "completed",
      steps: [{ type: "thought", signature: "provider-private-signature" }, {
        type: "model_output",
        content: [
          { type: "image", data: "ignored-provider-content" },
          { type: "text", text: JSON.stringify(estimate).slice(0, 40) }
        ]
      }, {
        type: "model_output",
        content: [{ type: "text", text: JSON.stringify(estimate).slice(40) }]
      }]
    }), { status: 200 })
  });
  const schemaModule = await import("../../worker/src/image-meal.js");
  const response = await fixture.worker.fetch(request({
    pathName: "/v1/ai/image-meal",
    body: imageRequestBody()
  }), fixture.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await responseBody(response), { estimate });
  assert.deepEqual(fixture.rateLimiterChecks, [["firebase-user-1", 123_456, "image"]]);
  assert.equal(fixture.providerRequests[0][0],
    "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(fixture.providerRequests[0][1].headers["Api-Revision"], "2026-05-20");

  const providerBody = JSON.parse(fixture.providerRequests[0][1].body);
  assert.equal(providerBody.model, "gemini-3.5-flash-lite");
  assert.equal(providerBody.store, false);
  assert.match(providerBody.input[0].text, /Brazilian Portuguese/);
  assert.deepEqual(providerBody.input[1], {
    type: "image",
    data: JPEG_BASE64,
    mime_type: "image/jpeg",
    resolution: "medium"
  });
  assert.deepEqual(providerBody.generation_config, {
    max_output_tokens: 1_200
  });
  assert.deepEqual(providerBody.response_format, {
    type: "text",
    mime_type: "application/json",
    schema: schemaModule.GEMINI_IMAGE_MEAL_PROVIDER_SCHEMA
  });
  assert.notDeepEqual(providerBody.response_format.schema, schemaModule.IMAGE_MEAL_RESPONSE_SCHEMA);
  const providerItemSchema = providerBody.response_format.schema.properties.items.items;
  assert.deepEqual(providerItemSchema.required, [
    "name",
    "quantity",
    "unit",
    "estimatedGrams",
    "protein",
    "kcal",
    "carbs",
    "fat",
    "fiber",
    "salt",
    "sugars",
    "satfat",
    "confidence"
  ]);
  assert.deepEqual(providerItemSchema.properties.carbs, { type: ["number", "null"] });
  assert.equal(providerItemSchema.additionalProperties, undefined);
  assert.equal(providerItemSchema.properties.kcal.maximum, undefined);
});

test("uses structured Interactions for food and dish estimates and returns only validated data", async () => {
  const foodEstimate = {
    status: "estimated",
    reason: null,
    confidence: "medium",
    unitWeightG: null,
    nutrients: {
      protein100: 12, kcal100: 200, carbs100: null, sugars100: null,
      fat100: 8, satfat100: null, fiber100: null, salt100: 0.4
    }
  };
  const cases = [{
    pathName: "/v1/ai/food-estimate",
    body: { foodName: "Tofu", unit: "g", language: "en" },
    estimate: foodEstimate,
    prompt: /<food>Tofu<\/food>/,
    tokens: 700
  }, {
    pathName: "/v1/ai/dish-estimate",
    body: { description: "Rice and beans", language: "pt" },
    estimate: imageEstimate(),
    prompt: /<description>Rice and beans<\/description>/,
    tokens: 1_200
  }];

  for (const expected of cases) {
    const fixture = await createFixture({
      providerResponse: new Response(JSON.stringify({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(expected.estimate) }] }]
      }), { status: 200 })
    });
    const response = await fixture.worker.fetch(request({
      pathName: expected.pathName,
      body: JSON.stringify(expected.body)
    }), fixture.env);

    assert.equal(response.status, 200);
    assert.deepEqual(await responseBody(response), { estimate: expected.estimate });
    assert.deepEqual(fixture.rateLimiterChecks, [["firebase-user-1", 123_456, "text"]]);
    assert.equal(fixture.providerRequests[0][0], "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(fixture.providerRequests[0][1].headers["Api-Revision"], "2026-05-20");
    const providerBody = JSON.parse(fixture.providerRequests[0][1].body);
    assert.equal(providerBody.store, false);
    assert.match(providerBody.input[0].text, expected.prompt);
    assert.equal(providerBody.generation_config.max_output_tokens, expected.tokens);
    assert.equal(providerBody.response_format.mime_type, "application/json");
  }
});

test("rejects invalid structured requests and provider estimates fail-closed", async () => {
  const fixture = await createFixture();
  for (const [pathName, body] of [
    ["/v1/ai/food-estimate", { foodName: "", unit: "g", language: "pt" }],
    ["/v1/ai/food-estimate", { foodName: "Rice", unit: "kg", language: "pt" }],
    ["/v1/ai/dish-estimate", { description: "Dish", language: "fr" }],
    ["/v1/ai/dish-estimate", { description: "Dish", language: "pt", extra: true }]
  ]) {
    const response = await fixture.worker.fetch(request({ pathName, body: JSON.stringify(body) }), fixture.env);
    assert.equal(response.status, 400);
    assert.deepEqual(await responseBody(response), { error: { code: "invalid-request" } });
  }
  assert.equal(fixture.providerRequests.length, 0);

  const invalidProvider = await createFixture({
    providerResponse: new Response(JSON.stringify({
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
        status: "estimated", reason: null, confidence: "high", unitWeightG: null,
        nutrients: { protein100: 10, kcal100: 100 }
      }) }] }]
    }), { status: 200 })
  });
  const invalidResponse = await invalidProvider.worker.fetch(request({
    pathName: "/v1/ai/food-estimate",
    body: JSON.stringify({ foodName: "Rice", unit: "g", language: "pt" })
  }), invalidProvider.env);
  assert.equal(invalidResponse.status, 502);
  assert.deepEqual(await responseBody(invalidResponse), { error: { code: "invalid-provider-response" } });
});

test("enforces the image JSON, MIME, language, JPEG, and decoded-size contracts", async () => {
  const fixture = await createFixture();
  const oversizedBytes = Buffer.alloc(1_500_001);
  oversizedBytes[0] = 0xff;
  oversizedBytes[1] = 0xd8;
  oversizedBytes[2] = 0xff;
  const invalidBodies = [
    imageRequestBody({ language: "fr" }),
    imageRequestBody({ image: { mimeType: "image/png", data: JPEG_BASE64 } }),
    imageRequestBody({ image: { mimeType: "image/jpeg", data: "not-base64" } }),
    imageRequestBody({ image: { mimeType: "image/jpeg", data: Buffer.from("text").toString("base64") } }),
    imageRequestBody({ image: {
      mimeType: "image/jpeg",
      data: oversizedBytes.toString("base64")
    } }),
    JSON.stringify({
      image: { mimeType: "image/jpeg", data: JPEG_BASE64 },
      language: "pt",
      extra: true
    })
  ];

  for (const body of invalidBodies) {
    const response = await fixture.worker.fetch(request({
      pathName: "/v1/ai/image-meal",
      body
    }), fixture.env);
    assert.equal(response.status, 400);
    assert.deepEqual(await responseBody(response), { error: { code: "invalid-request" } });
  }
  assert.equal(fixture.providerRequests.length, 0);
  assert.equal(fixture.rateLimiterChecks.length, 0);
});

test("stops reading image JSON bodies above 2.2 MB", async () => {
  const fixture = await createFixture();
  const response = await fixture.worker.fetch(request({
    pathName: "/v1/ai/image-meal",
    body: JSON.stringify({
      image: { mimeType: "image/jpeg", data: "A".repeat(2_200_000) },
      language: "pt"
    })
  }), fixture.env);

  assert.equal(response.status, 413);
  assert.deepEqual(await responseBody(response), { error: { code: "request-too-large" } });
  assert.equal(fixture.providerRequests.length, 0);
});

test("rejects malformed or structurally unsafe Gemini image estimates", async () => {
  const invalidEstimates = [
    "not-json",
    JSON.stringify(imageEstimate({ items: [] })),
    JSON.stringify(imageEstimate({ items: [{ ...imageEstimate().items[0], protein: null }] })),
    JSON.stringify(imageEstimate({ unexpected: true }))
  ];

  for (const text of invalidEstimates) {
    const fixture = await createFixture({
      providerResponse: new Response(JSON.stringify({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text }] }]
      }), { status: 200 })
    });
    const response = await fixture.worker.fetch(request({
      pathName: "/v1/ai/image-meal",
      body: imageRequestBody()
    }), fixture.env);

    assert.equal(response.status, 502);
    assert.deepEqual(await responseBody(response), {
      error: { code: "invalid-provider-response" }
    });
  }
});

test("rejects incomplete Interactions responses and responses without model text", async () => {
  const estimateText = JSON.stringify(imageEstimate());
  const invalidPayloads = [{
    status: "failed",
    steps: [{ type: "model_output", content: [{ type: "text", text: estimateText }] }]
  }, {
    status: "incomplete",
    steps: [{ type: "model_output", content: [{ type: "text", text: estimateText }] }]
  }, {
    status: "completed",
    steps: [{ type: "thought", content: [{ type: "text", text: estimateText }] }]
  }, {
    status: "completed",
    steps: [{ type: "model_output", content: [{ type: "image", data: "ignored" }] }]
  }];

  for (const providerPayload of invalidPayloads) {
    const fixture = await createFixture({
      providerResponse: new Response(JSON.stringify(providerPayload), { status: 200 })
    });
    const response = await fixture.worker.fetch(request({
      pathName: "/v1/ai/image-meal",
      body: imageRequestBody()
    }), fixture.env);

    assert.equal(response.status, 502);
    assert.deepEqual(await responseBody(response), {
      error: { code: "invalid-provider-response" }
    });
  }
});

test("returns the image-specific public scope and Retry-After", async () => {
  const fixture = await createFixture({
    rateLimitResult: {
      allowed: false,
      limit: "uid-image-minute",
      retryAfterSeconds: 42
    }
  });
  const response = await fixture.worker.fetch(request({
    pathName: "/v1/ai/image-meal",
    body: imageRequestBody()
  }), fixture.env);

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "42");
  assert.deepEqual(await responseBody(response), {
    error: { code: "rate-limit-exceeded", scope: "image-user" }
  });
  assert.equal(fixture.providerRequests.length, 0);
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

test("returns 429 with public scope and Retry-After for every quota", async () => {
  const cases = [
    ["uid-minute", "user"],
    ["global-minute", "global"],
    ["global-day", "daily"]
  ];

  for (const [limit, scope] of cases) {
    const fixture = await createFixture({
      rateLimitResult: {
        allowed: false,
        limit,
        retryAfterSeconds: 17
      }
    });
    const response = await fixture.worker.fetch(request(), fixture.env);

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "17");
    assert.deepEqual(await responseBody(response), {
      error: { code: "rate-limit-exceeded", scope }
    });
    assert.equal(fixture.providerRequests.length, 0);
  }
});

test("fails closed when the limiter returns an unknown denied scope", async () => {
  const fixture = await createFixture({
    rateLimitResult: {
      allowed: false,
      limit: "unexpected-private-limit",
      retryAfterSeconds: 17
    }
  });
  const response = await fixture.worker.fetch(request(), fixture.env);

  assert.equal(response.status, 503);
  assert.deepEqual(await responseBody(response), {
    error: { code: "rate-limit-unavailable" }
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
  const imageMealSource = fs.readFileSync(
    path.join(__dirname, "..", "..", "worker", "src", "image-meal.js"),
    "utf8"
  );
  assert.doesNotMatch(imageMealSource, /\bconsole\./);
  const structuredSource = fs.readFileSync(
    path.join(__dirname, "..", "..", "worker", "src", "structured-estimates.js"),
    "utf8"
  );
  assert.doesNotMatch(structuredSource, /\bconsole\./);
});
