import { randomBytes } from "node:crypto";
import FirebaseConfigInternal from "../firebase-config-internal.js";

const { FB_KEY } = FirebaseConfigInternal.createFirebaseConfig();
const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts";
const WORKER_ENDPOINT = "https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/pantry-suggestions";
const CONTRACT_VERSION = "pantry-suggestions-v2";

const pantry = [
  { id: "rice", name: "Arroz cozido", unit: "g", protein100: 2.7, kcal100: 130, carbs100: 28, sugars100: 0.1, fat100: 0.3, satfat100: 0.1, fiber100: 0.4, salt100: 0.01 },
  { id: "beans", name: "Feijão cozido", unit: "g", protein100: 4.8, kcal100: 76, carbs100: 13.6, sugars100: 0.3, fat100: 0.5, satfat100: 0.1, fiber100: 8.5, salt100: 0.02 },
  { id: "chicken", name: "Peito de frango grelhado", unit: "g", protein100: 31, kcal100: 165, carbs100: 0, sugars100: 0, fat100: 3.6, satfat100: 1, fiber100: 0, salt100: 0.19 },
  { id: "egg", name: "Ovo cozido", unit: "un", protein100: 6.3, kcal100: 78, carbs100: 0.6, sugars100: 0.6, fat100: 5.3, satfat100: 1.6, fiber100: 0, salt100: 0.16 },
  { id: "banana", name: "Banana", unit: "g", protein100: 1.1, kcal100: 89, carbs100: 22.8, sugars100: 12.2, fat100: 0.3, satfat100: 0.1, fiber100: 2.6, salt100: 0 },
  { id: "yogurt", name: "Iogurte natural", unit: "g", protein100: 4.1, kcal100: 63, carbs100: 7, sugars100: 7, fat100: 1.6, satfat100: 1, fiber100: 0, salt100: 0.12 }
];

function validateResponse(body) {
  const pantryIds = new Set(pantry.map(food => food.id));
  return body?.contractVersion === CONTRACT_VERSION &&
    Array.isArray(body.suggestions) && body.suggestions.length > 0 &&
    body.suggestions.length <= 3 && body.suggestions.every(suggestion =>
      typeof suggestion?.name === "string" && suggestion.name.trim() &&
      Array.isArray(suggestion.items) && suggestion.items.length > 0 &&
      suggestion.items.every(item => pantryIds.has(item?.foodId) &&
        typeof item.quantity === "number" && Number.isFinite(item.quantity) &&
        item.quantity > 0)
    );
}

let idToken = "";
let failed = false;

try {
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const signup = await fetch(`${AUTH_BASE}:signUp?key=${FB_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `c08e-smoke-${suffix}@example.com`,
      password: `C08e-${randomBytes(18).toString("base64url")}!`,
      returnSecureToken: true
    })
  });
  const signupBody = await signup.json().catch(() => ({}));
  idToken = typeof signupBody.idToken === "string" ? signupBody.idToken : "";
  console.log(`signupStatus=${signup.status}`);
  if (!signup.ok || !idToken) throw new Error("disposable-signup-failed");

  const response = await fetch(WORKER_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
      "Origin": "https://magnoclovis.github.io"
    },
    body: JSON.stringify({
      contractVersion: CONTRACT_VERSION,
      language: "pt",
      remaining: { protein: 35, kcal: 620, carbs: 70 },
      pantry
    })
  });
  const body = await response.json().catch(() => ({}));
  const validContract = validateResponse(body);
  console.log(`endpointStatus=${response.status}`);
  console.log(`contractVersion=${validContract ? body.contractVersion : "invalid"}`);
  console.log(`suggestionCount=${validContract ? body.suggestions.length : 0}`);
  if (!response.ok || !validContract) throw new Error("production-endpoint-smoke-failed");
} catch (error) {
  failed = true;
  console.error(`smokeResult=${error instanceof Error ? error.message : "unknown-failure"}`);
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
