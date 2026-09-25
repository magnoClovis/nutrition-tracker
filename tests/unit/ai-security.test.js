const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("pseudonymizes UIDs deterministically without retaining the source identifier", async () => {
  const { pseudonymizeSubject } = await import("../../worker/src/ai-security.js");
  const secret = "test-only-secret-with-at-least-32-characters";
  const first = await pseudonymizeSubject("firebase-user-1", secret);
  const second = await pseudonymizeSubject("firebase-user-1", secret);
  const other = await pseudonymizeSubject("firebase-user-2", secret);

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.doesNotMatch(first, /firebase|user-1/u);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/u);
});

test("resolves configured arbitrary tiers from verified claims and falls back safely", async () => {
  const { resolveTierPolicy } = await import("../../worker/src/ai-security.js");
  const env = {
    AI_TIER_MODE: "observe",
    AI_TIER_CONFIG: JSON.stringify({
      defaultTier: "testing",
      tiers: {
        testing: { dailyRequests: null },
        free: { dailyRequests: 25 },
        paid: { dailyRequests: 250 }
      }
    })
  };

  assert.deepEqual(resolveTierPolicy({ trofia_ai_tier: "paid" }, env), {
    mode: "observe", tier: "paid", dailyRequests: 250
  });
  assert.deepEqual(resolveTierPolicy({ trofia_ai_tier: "invented" }, env), {
    mode: "observe", tier: "testing", dailyRequests: null
  });
  assert.deepEqual(resolveTierPolicy({}, env), {
    mode: "observe", tier: "testing", dailyRequests: null
  });
});

test("rejects missing, malformed, or unsafe tier configuration", async () => {
  const { resolveTierPolicy } = await import("../../worker/src/ai-security.js");
  const invalid = [
    {},
    { AI_TIER_MODE: "disabled", AI_TIER_CONFIG: "{}" },
    { AI_TIER_MODE: "observe", AI_TIER_CONFIG: "{" },
    { AI_TIER_MODE: "enforce", AI_TIER_CONFIG: JSON.stringify({
      defaultTier: "free", tiers: { free: { dailyRequests: 0 } }
    }) },
    { AI_TIER_MODE: "observe", AI_TIER_CONFIG: JSON.stringify({
      defaultTier: "free", tiers: { free: { dailyRequests: null, extra: true } }
    }) }
  ];
  for (const env of invalid) {
    assert.throws(() => resolveTierPolicy({}, env), /tier policy|tier daily limit/u);
  }
});

test("creates metrics from strict sanitized dimensions only", async () => {
  const { sanitizedRequestMetric } = await import("../../worker/src/ai-security.js");
  const metric = sanitizedRequestMetric({
    endpoint: "/v1/ai/image-meal",
    status: 502,
    latencyMs: 40_123.4,
    appCheck: "valid",
    tier: "testing",
    uid: "must-not-appear",
    prompt: "must-not-appear",
    token: "must-not-appear"
  });

  assert.deepEqual(metric, {
    event: "ai-request",
    endpoint: "image-meal",
    status: 502,
    scope: "server-error",
    latencyMs: 40_123,
    appCheck: "valid",
    tier: "testing"
  });
  assert.doesNotMatch(JSON.stringify(metric), /must-not-appear|uid|prompt|token/u);
});

test("keeps commercial limits in observe mode and secrets outside Wrangler config", () => {
  const configPath = path.join(__dirname, "..", "..", "worker", "wrangler.jsonc");
  const source = fs.readFileSync(configPath, "utf8");

  assert.match(source, /"AI_TIER_MODE"\s*:\s*"observe"/u);
  assert.match(source, /\\"testing\\":\{\\"dailyRequests\\":null\}/u);
  assert.doesNotMatch(source, /RATE_LIMIT_PSEUDONYM_KEY/u);
});
