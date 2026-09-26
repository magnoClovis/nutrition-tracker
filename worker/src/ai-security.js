const TIER_CLAIM = "trofia_ai_tier";
const VALID_TIER_MODES = new Set(["observe", "enforce"]);
const MAX_TIER_NAME_LENGTH = 32;
const MAX_TIERS = 16;
const MAX_COMMERCIAL_DAILY_REQUESTS = 1_000_000;

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function pseudonymizeSubject(uid, secret, cryptoApi = globalThis.crypto) {
  if (typeof uid !== "string" || uid.length === 0 || uid.length > 128 ||
      typeof secret !== "string" || secret.length < 32 ||
      !cryptoApi?.subtle) {
    throw new TypeError("invalid pseudonymization input");
  }

  const encoder = new TextEncoder();
  const key = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await cryptoApi.subtle.sign("HMAC", key, encoder.encode(uid));
  return base64Url(new Uint8Array(signature));
}

function isTierName(value) {
  return typeof value === "string" &&
    /^[a-z][a-z0-9-]*$/u.test(value) &&
    value.length <= MAX_TIER_NAME_LENGTH;
}

function parseDailyLimit(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_COMMERCIAL_DAILY_REQUESTS) {
    throw new TypeError("invalid tier daily limit");
  }
  return value;
}

export function resolveTierPolicy(claims, env) {
  const mode = env?.AI_TIER_MODE;
  if (!VALID_TIER_MODES.has(mode) || typeof env?.AI_TIER_CONFIG !== "string") {
    throw new TypeError("tier policy is not configured");
  }

  let config;
  try {
    config = JSON.parse(env.AI_TIER_CONFIG);
  } catch (error) {
    throw new TypeError("tier policy is invalid", { cause: error });
  }

  if (!config || typeof config !== "object" || Array.isArray(config) ||
      !isTierName(config.defaultTier) ||
      !config.tiers || typeof config.tiers !== "object" || Array.isArray(config.tiers)) {
    throw new TypeError("tier policy is invalid");
  }

  const tierEntries = Object.entries(config.tiers);
  if (tierEntries.length === 0 || tierEntries.length > MAX_TIERS ||
      !Object.hasOwn(config.tiers, config.defaultTier)) {
    throw new TypeError("tier policy is invalid");
  }

  const tiers = new Map();
  for (const [name, policy] of tierEntries) {
    if (!isTierName(name) || !policy || typeof policy !== "object" || Array.isArray(policy) ||
        Object.keys(policy).some(key => key !== "dailyRequests")) {
      throw new TypeError("tier policy is invalid");
    }
    tiers.set(name, { dailyRequests: parseDailyLimit(policy.dailyRequests ?? null) });
  }

  const claimedTier = claims?.[TIER_CLAIM];
  const tier = isTierName(claimedTier) && tiers.has(claimedTier)
    ? claimedTier
    : config.defaultTier;
  return { mode, tier, dailyRequests: tiers.get(tier).dailyRequests };
}

export function endpointMetricName(pathname) {
  const names = new Map([
    ["/v1/ai/completion", "completion"],
    ["/v1/ai/image-meal", "image-meal"],
    ["/v1/ai/food-estimate", "food-estimate"],
    ["/v1/ai/dish-estimate", "dish-estimate"],
    ["/v1/ai/pantry-suggestions", "pantry-suggestions"]
  ]);
  return names.get(pathname) ?? "unknown";
}

export function sanitizedRequestMetric({
  endpoint,
  status,
  latencyMs,
  appCheck,
  tier
}) {
  const safeStatus = Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : 500;
  return {
    event: "ai-request",
    endpoint: typeof endpoint === "string" ? endpointMetricName(endpoint) : "unknown",
    status: safeStatus,
    scope: safeStatus < 400 ? "success" : safeStatus < 500 ? "client-error" : "server-error",
    latencyMs: Math.max(0, Math.min(120_000, Math.round(Number(latencyMs) || 0))),
    appCheck: ["valid", "invalid-observed", "not-checked"].includes(appCheck)
      ? appCheck
      : "not-checked",
    tier: isTierName(tier) ? tier : "unknown"
  };
}

export function writeSanitizedMetric(metric) {
  console.log(JSON.stringify(metric));
}

export async function persistSanitizedMetric(env, metric, timestampMs) {
  if (!env?.AI_RATE_LIMITER || typeof env.AI_RATE_LIMITER.getByName !== "function") {
    throw new TypeError("metrics storage is unavailable");
  }
  const limiter = env.AI_RATE_LIMITER.getByName("gemini-project-quota");
  if (!limiter || typeof limiter.recordMetric !== "function") {
    throw new TypeError("metrics storage is unavailable");
  }
  await limiter.recordMetric(metric, timestampMs);
}
