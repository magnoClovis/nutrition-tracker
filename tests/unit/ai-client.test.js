const test = require("node:test");
const assert = require("node:assert/strict");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../ai-client.js"))],
  ["ESM", () => import("../../src/leaf/ai-client.js")]
];

function response(body, {
  ok = true,
  status = ok ? 200 : 500,
  retryAfter,
  jsonError
} = {}) {
  return {
    ok,
    status,
    headers: new Headers(retryAfter ? { "Retry-After": retryAfter } : {}),
    async json() {
      if (jsonError) throw jsonError;
      return body;
    }
  };
}

function createFixture({ createAIClient }, {
  idToken = "firebase-id-token",
  tokenError,
  responses = []
} = {}) {
  const requests = [];
  const tokenReads = [];
  const queue = [...responses];
  const api = createAIClient({
    getIdToken: async () => {
      tokenReads.push(idToken);
      if (tokenError) throw tokenError;
      return idToken;
    },
    fetchRequest: async (...args) => {
      requests.push(args);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next;
    }
  });
  return { api, requests, tokenReads };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

contractTest("sends the exact managed request with a current Firebase ID token", async module => {
  const fixture = createFixture(module, {
    responses: [response({ text: "Expected answer" })]
  });

  assert.equal(await fixture.api.callAI("Nutrition prompt", 321), "Expected answer");
  assert.deepEqual(fixture.tokenReads, ["firebase-id-token"]);
  assert.equal(fixture.requests.length, 1);
  assert.equal(
    fixture.requests[0][0],
    "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/completion"
  );
  assert.deepEqual(fixture.requests[0][1], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer firebase-id-token"
    },
    body: JSON.stringify({
      prompt: "Nutrition prompt",
      maxTokens: 321
    })
  });
});

contractTest("rejects a missing Firebase token before making a request", async module => {
  const { AIClientError } = module;
  const fixture = createFixture(module, { idToken: "" });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error instanceof AIClientError &&
      error.code === "authentication-error"
  );
  assert.equal(fixture.requests.length, 0);
});

contractTest("maps sanitized Worker HTTP failures and rate-limit metadata to neutral errors", async module => {
  const { AIClientError } = module;
  const cases = [
    [401, "authentication-error", undefined, undefined],
    [429, "rate-limited", 17, "user"],
    [500, "service-unavailable", undefined, undefined],
    [503, "service-unavailable", undefined, undefined],
    [400, "api-error", undefined, undefined]
  ];

  for (const [status, code, retryAfterSeconds, scope] of cases) {
    const fixture = createFixture(module, {
      responses: [response(
        { error: { code: "sanitized-worker-code", scope } },
        {
          ok: false,
          status,
          retryAfter: retryAfterSeconds ? String(retryAfterSeconds) : undefined
        }
      )]
    });

    await assert.rejects(
      fixture.api.callAI("prompt"),
      error => error instanceof AIClientError &&
        error.code === code &&
        error.retryAfterSeconds === retryAfterSeconds &&
        error.scope === scope
    );
  }
});

contractTest("ignores invalid or non-rate-limit scope metadata", async module => {
  const invalidScope = createFixture(module, {
    responses: [response(
      { error: { code: "rate-limit-exceeded", scope: "private-limit-name" } },
      { ok: false, status: 429 }
    )]
  });
  await assert.rejects(
    invalidScope.api.callAI("prompt"),
    error => error.scope === undefined
  );

  const unrelatedScope = createFixture(module, {
    responses: [response(
      { error: { code: "provider-error", scope: "global" } },
      { ok: false, status: 503 }
    )]
  });
  await assert.rejects(
    unrelatedScope.api.callAI("prompt"),
    error => error.scope === undefined
  );
});

contractTest("rejects malformed or structurally invalid Worker responses", async module => {
  const { AIClientError } = module;
  const fixtures = [
    createFixture(module, {
      responses: [response(null, { jsonError: new SyntaxError("private response") })]
    }),
    createFixture(module, { responses: [response({})] }),
    createFixture(module, { responses: [response({ text: 42 })] })
  ];

  for (const fixture of fixtures) {
    await assert.rejects(
      fixture.api.callAI("prompt"),
      error => error instanceof AIClientError &&
        error.code === "invalid-response" &&
        !error.message.includes("private response")
    );
  }
});

contractTest("propagates Firebase refresh and network failures unchanged", async module => {
  const tokenError = new Error("session refresh failed");
  const tokenFixture = createFixture(module, { tokenError });
  await assert.rejects(
    tokenFixture.api.callAI("prompt"),
    error => error === tokenError
  );
  assert.equal(tokenFixture.requests.length, 0);

  const networkError = new TypeError("Failed to fetch");
  const networkFixture = createFixture(module, { responses: [networkError] });
  await assert.rejects(
    networkFixture.api.callAI("prompt"),
    error => error === networkError
  );
});

contractTest("reads a fresh token per call and preserves the 800-token fallback", async module => {
  const fixture = createFixture(module, {
    responses: [
      response({ text: "one" }),
      response({ text: "two" }),
      response({ text: "" })
    ]
  });

  await fixture.api.callAI("explicit", 250);
  await fixture.api.callAI("missing");
  await fixture.api.callAI("zero", 0);

  assert.equal(fixture.tokenReads.length, 3);
  assert.deepEqual(
    fixture.requests.map(request => JSON.parse(request[1].body).maxTokens),
    [250, 800, 800]
  );
});
