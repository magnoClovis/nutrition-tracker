import {
  createFirebaseIdTokenVerifier,
  FirebaseIdTokenError
} from "./firebase-id-token.js";
import {
  geminiImageMealInteractionRequest,
  geminiImageMealInteractionText,
  validateImageMealEstimate,
  validateImageMealRequest
} from "./image-meal.js";
import {
  geminiStructuredInteractionRequest,
  validateDishEstimateRequest,
  validateFoodEstimateRequest,
  validateStructuredEstimate
} from "./structured-estimates.js";
import {
  geminiPantrySuggestionsInteractionRequest,
  validatePantrySuggestionsRequest,
  validatePantrySuggestionsResponse
} from "./pantry-suggestions.js";

const COMPLETION_PATH = "/v1/ai/completion";
const IMAGE_MEAL_PATH = "/v1/ai/image-meal";
const FOOD_ESTIMATE_PATH = "/v1/ai/food-estimate";
const DISH_ESTIMATE_PATH = "/v1/ai/dish-estimate";
const PANTRY_SUGGESTIONS_PATH = "/v1/ai/pantry-suggestions";
const FIREBASE_PROJECT_ID = "nutrition-tracker-780b3";
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_COMPLETION_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_INTERACTIONS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_INTERACTIONS_REVISION = "2026-05-20";
const ALLOWED_ORIGINS = new Set([
  "https://magnoclovis.github.io",
  "https://localhost"
]);
const MAX_PROMPT_CHARACTERS = 40_000;
const MAX_OUTPUT_TOKENS = 1_200;
const MAX_REQUEST_BODY_BYTES = (MAX_PROMPT_CHARACTERS * 4) + 4_096;
const MAX_IMAGE_REQUEST_BODY_BYTES = 2_200_000;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(status, body, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    Object.assign(headers, corsHeaders(origin));
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(status, code, origin) {
  return jsonResponse(status, { error: { code } }, origin);
}

function rateLimitScope(limit) {
  if (limit === "uid-minute") return "user";
  if (limit === "uid-image-minute") return "image-user";
  if (limit === "global-minute") return "global";
  if (limit === "global-day") return "daily";
  return null;
}

async function readBoundedText(request, maximumBytes) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RangeError("request-too-large");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new RangeError("request-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function parseAuthorizationToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  return match ? match[1] : null;
}

function isCompletionBody(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 2 &&
    keys.includes("prompt") &&
    keys.includes("maxTokens") &&
    typeof value.prompt === "string" &&
    value.prompt.trim().length > 0 &&
    value.prompt.length <= MAX_PROMPT_CHARACTERS &&
    Number.isInteger(value.maxTokens) &&
    value.maxTokens >= 1 &&
    value.maxTokens <= MAX_OUTPUT_TOKENS;
}

function geminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .filter(part => part && typeof part.text === "string")
    .map(part => part.text)
    .join("");
  return text || null;
}

export function createAIWorker({
  verifyFirebaseIdToken = createFirebaseIdTokenVerifier({
    projectId: FIREBASE_PROJECT_ID
  }),
  fetchRequest = globalThis.fetch,
  now = () => Date.now()
} = {}) {
  if (typeof verifyFirebaseIdToken !== "function" ||
      typeof fetchRequest !== "function" ||
      typeof now !== "function") {
    throw new TypeError("AI Worker requires token verification, fetch, and clock functions");
  }

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const isCompletion = url.pathname === COMPLETION_PATH;
      const isImageMeal = url.pathname === IMAGE_MEAL_PATH;
      const isFoodEstimate = url.pathname === FOOD_ESTIMATE_PATH;
      const isDishEstimate = url.pathname === DISH_ESTIMATE_PATH;
      const isPantrySuggestions = url.pathname === PANTRY_SUGGESTIONS_PATH;
      const isStructuredText = isFoodEstimate || isDishEstimate || isPantrySuggestions;
      if (!isCompletion && !isImageMeal && !isStructuredText) {
        return errorResponse(404, "not-found");
      }

      const origin = request.headers.get("Origin");
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return errorResponse(403, "origin-not-allowed");
      }

      if (request.method === "OPTIONS") {
        const requestedMethod = request.headers.get("Access-Control-Request-Method");
        const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") || "")
          .split(",")
          .map(header => header.trim().toLowerCase())
          .filter(Boolean);
        const allowedHeaders = new Set(["authorization", "content-type"]);
        if (requestedMethod !== "POST" ||
            requestedHeaders.some(header => !allowedHeaders.has(header))) {
          return errorResponse(405, "method-not-allowed", origin);
        }
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      if (request.method !== "POST") {
        const response = errorResponse(405, "method-not-allowed", origin);
        response.headers.set("Allow", "POST, OPTIONS");
        return response;
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        return errorResponse(415, "unsupported-media-type", origin);
      }

      const token = parseAuthorizationToken(request);
      if (!token) return errorResponse(401, "invalid-authentication", origin);

      let identity;
      try {
        identity = await verifyFirebaseIdToken(token);
      } catch (error) {
        if (error instanceof FirebaseIdTokenError &&
            error.code === "certificate-unavailable") {
          return errorResponse(503, "authentication-unavailable", origin);
        }
        return errorResponse(401, "invalid-authentication", origin);
      }

      let body;
      try {
        const maximumBodyBytes = isImageMeal
          ? MAX_IMAGE_REQUEST_BODY_BYTES
          : MAX_REQUEST_BODY_BYTES;
        const rawBody = await readBoundedText(request, maximumBodyBytes);
        body = JSON.parse(rawBody);
      } catch (error) {
        if (error instanceof RangeError && error.message === "request-too-large") {
          return errorResponse(413, "request-too-large", origin);
        }
        return errorResponse(400, "invalid-json", origin);
      }

      if ((isCompletion && !isCompletionBody(body)) ||
          (isImageMeal && !validateImageMealRequest(body)) ||
          (isFoodEstimate && !validateFoodEstimateRequest(body)) ||
          (isDishEstimate && !validateDishEstimateRequest(body)) ||
          (isPantrySuggestions && !validatePantrySuggestionsRequest(body))) {
        return errorResponse(400, "invalid-request", origin);
      }
      if (!env?.GEMINI_API_KEY || typeof env.GEMINI_API_KEY !== "string") {
        return errorResponse(503, "provider-not-configured", origin);
      }

      let rateLimitResult;
      try {
        if (!env.AI_RATE_LIMITER ||
            typeof env.AI_RATE_LIMITER.getByName !== "function") {
          throw new TypeError("missing rate limiter binding");
        }
        const limiter = env.AI_RATE_LIMITER.getByName("gemini-project-quota");
        rateLimitResult = await limiter.check(
          identity.uid,
          now(),
          isImageMeal ? "image" : "text"
        );
        if (!rateLimitResult ||
            typeof rateLimitResult.allowed !== "boolean") {
          throw new TypeError("invalid rate limiter response");
        }
      } catch (_) {
        return errorResponse(503, "rate-limit-unavailable", origin);
      }

      if (!rateLimitResult.allowed) {
        const scope = rateLimitScope(rateLimitResult.limit);
        if (!scope) {
          return errorResponse(503, "rate-limit-unavailable", origin);
        }
        const response = jsonResponse(429, {
          error: {
            code: "rate-limit-exceeded",
            scope
          }
        }, origin);
        response.headers.set(
          "Retry-After",
          String(Math.max(1, Math.ceil(rateLimitResult.retryAfterSeconds || 1)))
        );
        return response;
      }

      let providerResponse;
      let providerPayload;
      try {
        const providerHeaders = {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        };
        if (isImageMeal || isStructuredText) {
          providerHeaders["Api-Revision"] = GEMINI_INTERACTIONS_REVISION;
        }
        providerResponse = await fetchRequest(
          (isImageMeal || isStructuredText) ? GEMINI_INTERACTIONS_ENDPOINT : GEMINI_COMPLETION_ENDPOINT,
          {
            method: "POST",
            headers: providerHeaders,
            body: JSON.stringify({
              ...(isImageMeal ? geminiImageMealInteractionRequest(body, GEMINI_MODEL, "medium") : isPantrySuggestions
                ? geminiPantrySuggestionsInteractionRequest(body, GEMINI_MODEL)
                : isStructuredText ? geminiStructuredInteractionRequest({
                    kind: isFoodEstimate ? "food" : "dish",
                    body,
                    model: GEMINI_MODEL
                  })
                : {
                contents: [{
                  role: "user",
                  parts: [{ text: body.prompt }]
                }],
                generationConfig: {
                  maxOutputTokens: body.maxTokens,
                  temperature: 0
                }
              })
            })
          }
        );
        providerPayload = await providerResponse.json();
      } catch (_) {
        return errorResponse(502, "provider-unavailable", origin);
      }

      if (!providerResponse.ok) {
        return errorResponse(502, "provider-error", origin);
      }
      const text = (isImageMeal || isStructuredText)
        ? geminiImageMealInteractionText(providerPayload)
        : geminiText(providerPayload);
      if (text === null) {
        return errorResponse(502, "invalid-provider-response", origin);
      }
      if (isImageMeal || isStructuredText) {
        let estimate;
        try {
          estimate = JSON.parse(text);
        } catch (_) {
          return errorResponse(502, "invalid-provider-response", origin);
        }
        const validStructuredResult = isPantrySuggestions
          ? validatePantrySuggestionsResponse(estimate, body)
          : isImageMeal
            ? validateImageMealEstimate(estimate)
            : validateStructuredEstimate(isFoodEstimate ? "food" : "dish", estimate, body);
        if (!validStructuredResult) {
          return errorResponse(502, "invalid-provider-response", origin);
        }
        return jsonResponse(200, isPantrySuggestions ? estimate : { estimate }, origin);
      }
      return jsonResponse(200, { text }, origin);
    }
  };
}
