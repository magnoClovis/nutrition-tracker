const test = require("node:test");
const assert = require("node:assert/strict");
const { createGroqClient, GroqClientError } = require("../../groq-client.js");

function response(body, { ok = true, jsonError } = {}) {
  return {
    ok,
    async json() {
      if (jsonError) throw jsonError;
      return body;
    }
  };
}

function createFixture({ apiKey = "test-key", responses = [] } = {}) {
  const requests = [];
  const keyReads = [];
  const queue = [...responses];
  const api = createGroqClient({
    getApiKey: () => {
      keyReads.push(apiKey);
      return apiKey;
    },
    fetchRequest: async (...args) => {
      requests.push(args);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next;
    }
  });
  return { api, requests, keyReads };
}

test("sends the exact Groq request and returns the first assistant content", async () => {
  const fixture = createFixture({
    responses: [response({ choices: [{ message: { content: "Expected answer" } }] })]
  });

  assert.equal(await fixture.api.callAI("Nutrition prompt", 321), "Expected answer");
  assert.deepEqual(fixture.keyReads, ["test-key"]);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0][0], "https://api.groq.com/openai/v1/chat/completions");
  assert.deepEqual(fixture.requests[0][1], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-key"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Nutrition prompt" }],
      max_tokens: 321,
      temperature: 0
    })
  });
});

test("rejects a missing API key before making any request", async () => {
  const fixture = createFixture({ apiKey: "", responses: [] });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error instanceof GroqClientError && error.code === "missing-api-key"
  );
  assert.deepEqual(fixture.keyReads, [""]);
  assert.equal(fixture.requests.length, 0);
});

test("keeps the Groq provider message on a non-success HTTP response", async () => {
  const fixture = createFixture({
    responses: [response({ error: { message: "Provider rejected request" } }, { ok: false })]
  });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error instanceof GroqClientError &&
      error.code === "api-error" &&
      error.providerMessage === "Provider rejected request"
  );
});

test("returns a neutral API error when a non-success response has no provider message", async () => {
  const fixture = createFixture({ responses: [response({}, { ok: false })] });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error instanceof GroqClientError &&
      error.code === "api-error" &&
      error.providerMessage === undefined
  );
});

test("parses JSON before checking HTTP status and propagates an invalid-JSON error", async () => {
  const parseError = new SyntaxError("Unexpected token");
  const fixture = createFixture({
    responses: [response(null, { ok: false, jsonError: parseError })]
  });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error === parseError
  );
});

test("propagates the original network error", async () => {
  const networkError = new TypeError("Failed to fetch");
  const fixture = createFixture({ responses: [networkError] });

  await assert.rejects(
    fixture.api.callAI("prompt"),
    error => error === networkError
  );
});

test("returns an empty string when assistant content is absent", async () => {
  const fixtures = [
    createFixture({ responses: [response({})] }),
    createFixture({ responses: [response({ choices: [] })] }),
    createFixture({ responses: [response({ choices: [{ message: {} }] })] })
  ];

  for (const fixture of fixtures) {
    assert.equal(await fixture.api.callAI("prompt"), "");
  }
});

test("uses the supplied max_tokens and preserves the literal falsy fallback to 800", async () => {
  const fixture = createFixture({
    responses: [
      response({ choices: [] }),
      response({ choices: [] }),
      response({ choices: [] })
    ]
  });

  await fixture.api.callAI("explicit", 250);
  await fixture.api.callAI("missing");
  await fixture.api.callAI("zero", 0);

  assert.deepEqual(
    fixture.requests.map(request => JSON.parse(request[1].body).max_tokens),
    [250, 800, 800]
  );
});
