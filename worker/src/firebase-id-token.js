import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const FIREBASE_CERTIFICATES_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_CERTIFICATE_TTL_MS = 5 * 60 * 1000;
const CLOCK_TOLERANCE_SECONDS = 300;

export class FirebaseIdTokenError extends Error {
  constructor(code, cause) {
    super(code, cause ? { cause } : undefined);
    this.name = "FirebaseIdTokenError";
    this.code = code;
  }
}

function cacheMaxAgeMilliseconds(cacheControl) {
  const match = String(cacheControl || "").match(/(?:^|,)\s*max-age=(\d+)\s*(?:,|$)/i);
  if (!match) return DEFAULT_CERTIFICATE_TTL_MS;
  return Math.max(0, Number(match[1])) * 1000;
}

function isCertificateMap(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(certificate => typeof certificate === "string");
}

export function createFirebaseIdTokenVerifier({
  projectId,
  fetchRequest = globalThis.fetch,
  importCertificate = importX509,
  now = () => Date.now(),
  certificatesUrl = FIREBASE_CERTIFICATES_URL
}) {
  if (!projectId || typeof projectId !== "string") {
    throw new TypeError("Firebase ID token verifier requires a projectId");
  }
  if (typeof fetchRequest !== "function" ||
      typeof importCertificate !== "function" ||
      typeof now !== "function") {
    throw new TypeError("Firebase ID token verifier requires fetch, certificate import, and clock functions");
  }

  let cachedKeys = new Map();
  let cacheExpiresAt = 0;

  async function refreshPublicKeys() {
    let response;
    let certificates;

    try {
      response = await fetchRequest(certificatesUrl, {
        headers: { Accept: "application/json" }
      });
      if (!response?.ok) throw new Error("Firebase certificate endpoint rejected the request");
      certificates = await response.json();
      if (!isCertificateMap(certificates)) throw new Error("Firebase certificate response is invalid");
    } catch (error) {
      throw new FirebaseIdTokenError("certificate-unavailable", error);
    }

    const importedKeys = new Map();
    try {
      for (const [kid, certificate] of Object.entries(certificates)) {
        importedKeys.set(kid, await importCertificate(certificate, "RS256"));
      }
    } catch (error) {
      throw new FirebaseIdTokenError("certificate-unavailable", error);
    }

    cachedKeys = importedKeys;
    cacheExpiresAt = now() + cacheMaxAgeMilliseconds(response.headers?.get("Cache-Control"));
  }

  async function publicKeyFor(kid) {
    if (now() >= cacheExpiresAt || !cachedKeys.has(kid)) {
      await refreshPublicKeys();
    }
    const key = cachedKeys.get(kid);
    if (!key) throw new FirebaseIdTokenError("invalid-token");
    return key;
  }

  return async function verifyFirebaseIdToken(token) {
    if (!token || typeof token !== "string") {
      throw new FirebaseIdTokenError("invalid-token");
    }

    let protectedHeader;
    try {
      protectedHeader = decodeProtectedHeader(token);
    } catch (error) {
      throw new FirebaseIdTokenError("invalid-token", error);
    }

    if (protectedHeader?.alg !== "RS256" ||
        typeof protectedHeader.kid !== "string" ||
        !protectedHeader.kid) {
      throw new FirebaseIdTokenError("invalid-token");
    }

    try {
      const verificationTime = now();
      const key = await publicKeyFor(protectedHeader.kid);
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["RS256"],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        currentDate: new Date(verificationTime),
        clockTolerance: CLOCK_TOLERANCE_SECONDS
      });
      const nowSeconds = Math.floor(verificationTime / 1000);

      if (typeof payload.exp !== "number" ||
          payload.exp <= nowSeconds - CLOCK_TOLERANCE_SECONDS ||
          typeof payload.iat !== "number" ||
          payload.iat > nowSeconds + CLOCK_TOLERANCE_SECONDS ||
          payload.aud !== projectId ||
          typeof payload.sub !== "string" ||
          payload.sub.length === 0 ||
          payload.sub.length > 128) {
        throw new FirebaseIdTokenError("invalid-token");
      }

      if (payload.auth_time !== undefined &&
          (typeof payload.auth_time !== "number" ||
           payload.auth_time > nowSeconds + CLOCK_TOLERANCE_SECONDS)) {
        throw new FirebaseIdTokenError("invalid-token");
      }

      return { uid: payload.sub, claims: payload };
    } catch (error) {
      if (error instanceof FirebaseIdTokenError) throw error;
      throw new FirebaseIdTokenError("invalid-token", error);
    }
  };
}
