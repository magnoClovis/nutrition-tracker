/**
 * Observable state and bounded retries for idempotent Firestore writes.
 *
 * Only sanitized provider codes are retained. Payloads and account identifiers
 * never enter the observable state.
 *
 * @module FirebaseSyncState
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FirebaseSyncState = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const RETRY_DELAYS_MS = Object.freeze([500, 2000]);
  const RETRYABLE_CODES = new Set([
    "aborted", "cancelled", "deadline-exceeded", "internal",
    "resource-exhausted", "unavailable", "unknown"
  ]);
  const ENTRY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
  const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const VALID_KINDS = new Set(["meal", "water", "supplement"]);

  function sanitizedCode(error) {
    const raw = String(error?.code || "unknown").trim().toLowerCase();
    const normalized = raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
    return /^[a-z0-9-]{1,80}$/.test(normalized) ? normalized : "unknown";
  }

  function retryableError(error) {
    return RETRYABLE_CODES.has(sanitizedCode(error));
  }

  function normalizeIdentity(identity) {
    const kind = String(identity?.kind || "");
    const date = String(identity?.date || "");
    const entryId = String(identity?.entryId || "");
    if (!VALID_KINDS.has(kind) || !CIVIL_DATE_PATTERN.test(date) ||
        !ENTRY_ID_PATTERN.test(entryId)) {
      throw new TypeError("Invalid Firestore sync identity");
    }
    return Object.freeze({kind, date, entryId, key: `${kind}:${date}:${entryId}`});
  }

  function syncError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function createFirestoreSyncState({
    retryDelaysMs = RETRY_DELAYS_MS,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    now = Date.now,
    isRetryable = retryableError,
  } = {}) {
    if (!Array.isArray(retryDelaysMs) || retryDelaysMs.some(delay =>
      !Number.isInteger(delay) || delay < 0) || typeof setTimeoutFn !== "function" ||
      typeof clearTimeoutFn !== "function" || typeof now !== "function" ||
      typeof isRetryable !== "function") {
      throw new TypeError("FirebaseSyncState requires valid retry and timer options");
    }

    const states = new Map();
    const operations = new Map();
    const generations = new Map();
    const timers = new Map();
    const listeners = new Set();

    function publicState(identity, status, attempt, errorCode = null, retryAt = null) {
      return Object.freeze({
        key: identity.key,
        kind: identity.kind,
        date: identity.date,
        entryId: identity.entryId,
        status,
        attempt,
        errorCode,
        retryAt,
        updatedAt: Number(now()),
      });
    }

    function notify(state) {
      listeners.forEach(listener => {
        try { listener(state); } catch (_) {}
      });
    }

    function publish(identity, status, attempt, errorCode, retryAt) {
      const state = publicState(identity, status, attempt, errorCode, retryAt);
      states.set(identity.key, state);
      notify(state);
      return state;
    }

    function invalidate(key, code = "write-superseded") {
      generations.set(key, (generations.get(key) || 0) + 1);
      const pending = timers.get(key);
      if (pending) {
        clearTimeoutFn(pending.timerId);
        timers.delete(key);
        pending.reject(syncError(code));
      }
    }

    async function runAttempt(identity, generation, operation, attempt) {
      if (generations.get(identity.key) !== generation) {
        throw syncError("write-superseded");
      }
      publish(identity, "pending", attempt, null, null);
      try {
        const value = await operation();
        if (generations.get(identity.key) === generation) {
          operations.delete(identity.key);
          publish(identity, "synced", attempt, null, null);
        }
        return value;
      } catch (error) {
        if (generations.get(identity.key) !== generation) throw error;
        const code = sanitizedCode(error);
        const delay = retryDelaysMs[attempt - 1];
        if (delay !== undefined && isRetryable(error)) {
          publish(identity, "pending", attempt, code, Number(now()) + delay);
          return new Promise((resolve, reject) => {
            const timerId = setTimeoutFn(() => {
              timers.delete(identity.key);
              runAttempt(identity, generation, operation, attempt + 1).then(resolve, reject);
            }, delay);
            timers.set(identity.key, {timerId, reject});
          });
        }
        publish(identity, "error", attempt, code, null);
        throw error;
      }
    }

    function execute(identityValue, operation) {
      if (typeof operation !== "function") throw new TypeError("Firestore sync operation is required");
      const identity = normalizeIdentity(identityValue);
      invalidate(identity.key);
      const generation = generations.get(identity.key);
      operations.set(identity.key, {identity, operation});
      return runAttempt(identity, generation, operation, 1);
    }

    function normalizeBatchIdentities(identityValues) {
      if (!Array.isArray(identityValues) || identityValues.length === 0) {
        throw new TypeError("Firestore sync batch requires identities");
      }
      const unique = new Map();
      identityValues.forEach(value => {
        const identity = normalizeIdentity(value);
        unique.set(identity.key, identity);
      });
      return Array.from(unique.values());
    }

    async function runBatchAttempt(identities, batchGenerations, operation, attempt) {
      if (identities.some(identity => generations.get(identity.key) !== batchGenerations.get(identity.key))) {
        throw syncError("write-superseded");
      }
      identities.forEach(identity => publish(identity, "pending", attempt, null, null));
      try {
        const value = await operation();
        if (identities.every(identity =>
          generations.get(identity.key) === batchGenerations.get(identity.key))) {
          identities.forEach(identity => {
            operations.delete(identity.key);
            publish(identity, "synced", attempt, null, null);
          });
        }
        return value;
      } catch (error) {
        if (identities.some(identity =>
          generations.get(identity.key) !== batchGenerations.get(identity.key))) throw error;
        const code = sanitizedCode(error);
        const delay = retryDelaysMs[attempt - 1];
        if (delay !== undefined && isRetryable(error)) {
          const retryAt = Number(now()) + delay;
          identities.forEach(identity => publish(identity, "pending", attempt, code, retryAt));
          const primary = identities[0];
          return new Promise((resolve, reject) => {
            const timerId = setTimeoutFn(() => {
              timers.delete(primary.key);
              runBatchAttempt(identities, batchGenerations, operation, attempt + 1).then(resolve, reject);
            }, delay);
            timers.set(primary.key, {timerId, reject});
          });
        }
        identities.forEach(identity => publish(identity, "error", attempt, code, null));
        throw error;
      }
    }

    function executeBatch(identityValues, operation) {
      if (typeof operation !== "function") throw new TypeError("Firestore sync operation is required");
      const identities = normalizeBatchIdentities(identityValues);
      identities.forEach(identity => invalidate(identity.key));
      const batchGenerations = new Map(identities.map(identity => [
        identity.key,
        generations.get(identity.key)
      ]));
      const retained = {identities, operation, batch: true};
      identities.forEach(identity => operations.set(identity.key, retained));
      return runBatchAttempt(identities, batchGenerations, operation, 1);
    }

    function retry(identityValue) {
      const identity = normalizeIdentity(identityValue);
      const state = states.get(identity.key);
      const retained = operations.get(identity.key);
      if (state?.status !== "error" || !retained) {
        throw new TypeError("Only failed Firestore writes can be retried manually");
      }
      if (retained.batch) {
        retained.identities.forEach(item => invalidate(item.key));
        const batchGenerations = new Map(retained.identities.map(item => [
          item.key,
          generations.get(item.key)
        ]));
        retained.identities.forEach(item => operations.set(item.key, retained));
        return runBatchAttempt(retained.identities, batchGenerations, retained.operation, 1);
      }
      invalidate(identity.key);
      const generation = generations.get(identity.key);
      operations.set(identity.key, retained);
      return runAttempt(identity, generation, retained.operation, 1);
    }

    function get(identityValue) {
      return states.get(normalizeIdentity(identityValue).key) || null;
    }

    function list() {
      return Array.from(states.values());
    }

    function subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Firestore sync listener is required");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function reset(code = "write-cancelled") {
      const keys = new Set([...states.keys(), ...operations.keys(), ...timers.keys()]);
      keys.forEach(key => invalidate(key, code));
      states.clear();
      operations.clear();
      notify(null);
    }

    return Object.freeze({execute, executeBatch, retry, get, list, subscribe, reset});
  }

  return {
    RETRY_DELAYS_MS,
    RETRYABLE_CODES,
    createFirestoreSyncState,
    normalizeIdentity,
    retryableError,
    sanitizedCode,
  };
});
