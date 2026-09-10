import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

const FIREBASE_APP_CHECK_JWKS_URL =
  "https://firebaseappcheck.googleapis.com/v1/jwks";
const DEFAULT_KEY_TTL_MS = 5 * 60 * 1000;
const MAX_KEY_TTL_MS = 6 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_SECONDS = 60;

export class FirebaseAppCheckTokenError extends Error {
  constructor(code, cause) {
    super(code, cause ? { cause } : undefined);
    this.name = "FirebaseAppCheckTokenError";
    this.code = code;
  }
}

function cacheMaxAgeMilliseconds(cacheControl) {
  const match = String(cacheControl || "").match(/(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i);
  const requestedTtl = match ? Number(match[1]) * 1000 : DEFAULT_KEY_TTL_MS;
  return Math.min(MAX_KEY_TTL_MS, Math.max(0, requestedTtl));
}

function isJwkSet(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray(value.keys) &&
    value.keys.length > 0 &&
    value.keys.every(key => key &&
      typeof key === "object" &&
      typeof key.kid === "string" &&
      key.kid.length > 0 &&
      key.kty === "RSA" &&
      key.alg === "RS256");
}

export function createFirebaseAppCheckTokenVerifier({
  projectNumber,
  allowedAppIds,
  fetchRequest = globalThis.fetch,
  importKey = importJWK,
  now = () => Date.now(),
  jwksUrl = FIREBASE_APP_CHECK_JWKS_URL
}) {
  if (!/^\d+$/.test(String(projectNumber || ""))) {
    throw new TypeError("Firebase App Check verifier requires a project number");
  }
  if (!Array.isArray(allowedAppIds) || allowedAppIds.length === 0 ||
      allowedAppIds.some(appId => typeof appId !== "string" || !appId.trim())) {
    throw new TypeError("Firebase App Check verifier requires allowed app IDs");
  }
  if (typeof fetchRequest !== "function" ||
      typeof importKey !== "function" ||
      typeof now !== "function") {
    throw new TypeError("Firebase App Check verifier requires fetch, key import, and clock functions");
  }

  const expectedIssuer = `https://firebaseappcheck.googleapis.com/${projectNumber}`;
  const expectedAudience = `projects/${projectNumber}`;
  const allowedSubjects = new Set(allowedAppIds);
  let cachedKeys = new Map();
  let cacheExpiresAt = 0;

  async function refreshPublicKeys() {
    let response;
    let jwks;
    try {
      response = await fetchRequest(jwksUrl, { headers: { Accept: "application/json" } });
      if (!response?.ok) throw new Error("App Check JWKS endpoint rejected the request");
      jwks = await response.json();
      if (!isJwkSet(jwks)) throw new Error("App Check JWKS response is invalid");
    } catch (error) {
      throw new FirebaseAppCheckTokenError("key-unavailable", error);
    }

    const importedKeys = new Map();
    try {
      for (const jwk of jwks.keys) {
        importedKeys.set(jwk.kid, await importKey(jwk, "RS256"));
      }
    } catch (error) {
      throw new FirebaseAppCheckTokenError("key-unavailable", error);
    }
    cachedKeys = importedKeys;
    cacheExpiresAt = now() + cacheMaxAgeMilliseconds(response.headers?.get("Cache-Control"));
  }

  async function publicKeyFor(kid) {
    if (now() >= cacheExpiresAt || !cachedKeys.has(kid)) {
      await refreshPublicKeys();
    }
    const key = cachedKeys.get(kid);
    if (!key) throw new FirebaseAppCheckTokenError("invalid-token");
    return key;
  }

  return async function verifyFirebaseAppCheckToken(token) {
    if (typeof token !== "string" || !token) {
      throw new FirebaseAppCheckTokenError("invalid-token");
    }

    let protectedHeader;
    try {
      protectedHeader = decodeProtectedHeader(token);
    } catch (error) {
      throw new FirebaseAppCheckTokenError("invalid-token", error);
    }
    if (protectedHeader?.alg !== "RS256" ||
        protectedHeader?.typ !== "JWT" ||
        typeof protectedHeader.kid !== "string" ||
        !protectedHeader.kid) {
      throw new FirebaseAppCheckTokenError("invalid-token");
    }

    try {
      const verificationTime = now();
      const key = await publicKeyFor(protectedHeader.kid);
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["RS256"],
        issuer: expectedIssuer,
        audience: expectedAudience,
        currentDate: new Date(verificationTime),
        clockTolerance: CLOCK_TOLERANCE_SECONDS
      });
      if (typeof payload.sub !== "string" || !allowedSubjects.has(payload.sub)) {
        throw new FirebaseAppCheckTokenError("app-not-allowed");
      }
      return { appId: payload.sub };
    } catch (error) {
      if (error instanceof FirebaseAppCheckTokenError) throw error;
      throw new FirebaseAppCheckTokenError("invalid-token", error);
    }
  };
}
