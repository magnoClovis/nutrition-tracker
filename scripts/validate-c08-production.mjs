import { randomBytes } from "node:crypto";
import FirebaseConfigInternal from "../firebase-config-internal.js";
import { validateImageMealEstimate } from "../worker/src/image-meal.js";
import { validatePantrySuggestionsResponse } from "../worker/src/pantry-suggestions.js";
import { validateFoodEstimate } from "../worker/src/structured-estimates.js";

const { FB_KEY } = FirebaseConfigInternal.createFirebaseConfig();
const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts";
const WORKER_BASE = "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai";
const EXPECTED_CALLS = 4;

const pantry = [
  { id: "rice", name: "Arroz cozido", unit: "g", protein100: 2.7, kcal100: 130, carbs100: 28, sugars100: 0.1, fat100: 0.3, satfat100: 0.1, fiber100: 0.4, salt100: 0.01 },
  { id: "beans", name: "Feijao cozido", unit: "g", protein100: 4.8, kcal100: 76, carbs100: 13.6, sugars100: 0.3, fat100: 0.5, satfat100: 0.1, fiber100: 8.5, salt100: 0.02 },
  { id: "chicken", name: "Pechuga de pollo", unit: "g", protein100: 31, kcal100: 165, carbs100: 0, sugars100: 0, fat100: 3.6, satfat100: 1, fiber100: 0, salt100: 0.19 }
];

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => actual.includes(key));
}

function validFoodEstimate(body) {
  return validateFoodEstimate(body?.estimate, "g");
}

function validDishEstimate(body) {
  return validateImageMealEstimate(body?.estimate);
}

function validPantrySuggestions(body, requestBody) {
  return validatePantrySuggestionsResponse(body, requestBody);
}

function validNarrative(body) {
  return exactKeys(body, ["text"]) && typeof body.text === "string" &&
    body.text.trim().length > 0 && body.text.length <= 8_000;
}

const evaluations = [
  {
    id: "food-pt",
    path: "/food-estimate",
    body: { foodName: "iogurte natural", unit: "g", language: "pt" },
    validate: validFoodEstimate
  },
  {
    id: "dish-en",
    path: "/dish-estimate",
    body: { description: "one bowl of rice, beans and grilled chicken", language: "en" },
    validate: validDishEstimate
  },
  {
    id: "pantry-es",
    path: "/pantry-suggestions",
    body: {
      contractVersion: "pantry-suggestions-v2",
      language: "es",
      remaining: { protein: 35, kcal: 620, carbs: 70 },
      pantry
    },
    validate: validPantrySuggestions
  },
  {
    id: "narrative-pt",
    path: "/completion",
    body: {
      prompt: "Explique em portugues, sem diagnostico, que uma avaliacao nutricional contextual com nota local definitiva 4,2 de 5 indica boa adequacao ao restante do dia. Nao recalcule a nota. Responda em duas frases.",
      maxTokens: 180
    },
    validate: validNarrative
  }
];

if (evaluations.length !== EXPECTED_CALLS) throw new Error("unexpected-evaluation-call-count");

let idToken = "";
let failed = false;

try {
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const signup = await fetch(`${AUTH_BASE}:signUp?key=${FB_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `c08f-validation-${suffix}@example.com`,
      password: `C08f-${randomBytes(18).toString("base64url")}!`,
      returnSecureToken: true
    })
  });
  const signupBody = await signup.json().catch(() => ({}));
  idToken = typeof signupBody.idToken === "string" ? signupBody.idToken : "";
  console.log(`signupStatus=${signup.status}`);
  if (!signup.ok || !idToken) throw new Error("disposable-signup-failed");

  for (const evaluation of evaluations) {
    const response = await fetch(`${WORKER_BASE}${evaluation.path}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "Content-Type": "application/json",
        "Origin": "https://magnoclovis.github.io"
      },
      body: JSON.stringify(evaluation.body)
    });
    const responseBody = await response.json().catch(() => ({}));
    const valid = response.ok && evaluation.validate(responseBody, evaluation.body);
    console.log(`${evaluation.id}Status=${response.status}`);
    console.log(`${evaluation.id}Contract=${valid ? "valid" : "invalid"}`);
    if (!valid) throw new Error(`${evaluation.id}-validation-failed`);
  }
} catch (error) {
  failed = true;
  console.error(`validationResult=${error instanceof Error ? error.message : "unknown-failure"}`);
} finally {
  if (idToken) {
    const cleanup = await fetch(`${AUTH_BASE}:delete?key=${FB_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    console.log(`cleanupStatus=${cleanup.status}`);
    if (!cleanup.ok) failed = true;
  }
}

if (failed) process.exitCode = 1;
