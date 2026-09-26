import { DurableObject } from "cloudflare:workers";

const WINDOW_MS = 60_000;
const POLICY_MAX_METADATA_RETENTION_MS = 24 * 60 * 60 * 1_000;
const ALARM_DELIVERY_SAFETY_MARGIN_MS = 60 * 60 * 1_000;
const INDIVIDUAL_METADATA_RETENTION_MS =
  POLICY_MAX_METADATA_RETENTION_MS - ALARM_DELIVERY_SAFETY_MARGIN_MS;
const SANITIZED_METRIC_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const UID_REQUESTS_PER_MINUTE = 5;
const UID_IMAGE_REQUESTS_PER_MINUTE = 2;
const GLOBAL_REQUESTS_PER_MINUTE = 12;
const GLOBAL_REQUESTS_PER_DAY = 400;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const METRIC_ENDPOINTS = new Set([
  "completion", "image-meal", "food-estimate", "dish-estimate",
  "pantry-suggestions", "unknown"
]);
const METRIC_SCOPES = new Set(["success", "client-error", "server-error"]);
const METRIC_APP_CHECK_STATES = new Set(["valid", "invalid-observed", "not-checked"]);

const pacificDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function pacificDay(timestampMs) {
  const parts = pacificDayFormatter.formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function secondsUntilNextPacificDay(timestampMs, currentDay) {
  let low = timestampMs + 1;
  let high = timestampMs + (27 * 60 * 60 * 1_000);

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (pacificDay(middle) === currentDay) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.max(1, Math.ceil((low - timestampMs) / 1_000));
}

function minuteRetryAfter(nowMs, oldestTimestampMs) {
  return Math.max(1, Math.ceil((oldestTimestampMs + WINDOW_MS - nowMs) / 1_000));
}

export class AIRateLimiter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
          version INTEGER PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS recent_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          timestamp_ms INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS recent_requests_uid_timestamp
          ON recent_requests (uid, timestamp_ms);
        CREATE INDEX IF NOT EXISTS recent_requests_timestamp
          ON recent_requests (timestamp_ms);
        CREATE TABLE IF NOT EXISTS recent_image_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT NOT NULL,
          timestamp_ms INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS recent_image_requests_uid_timestamp
          ON recent_image_requests (uid, timestamp_ms);
        CREATE INDEX IF NOT EXISTS recent_image_requests_timestamp
          ON recent_image_requests (timestamp_ms);
        CREATE TABLE IF NOT EXISTS daily_usage (
          day_key TEXT PRIMARY KEY,
          request_count INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS subject_daily_usage (
          subject_id TEXT NOT NULL,
          day_key TEXT NOT NULL,
          tier TEXT NOT NULL,
          request_count INTEGER NOT NULL,
          PRIMARY KEY (subject_id, day_key)
        );
        CREATE INDEX IF NOT EXISTS subject_daily_usage_day
          ON subject_daily_usage (day_key);
        CREATE TABLE IF NOT EXISTS daily_metrics (
          day_start_ms INTEGER NOT NULL,
          endpoint TEXT NOT NULL,
          status INTEGER NOT NULL,
          scope TEXT NOT NULL,
          app_check TEXT NOT NULL,
          tier TEXT NOT NULL,
          request_count INTEGER NOT NULL,
          latency_total_ms INTEGER NOT NULL,
          latency_max_ms INTEGER NOT NULL,
          PRIMARY KEY (day_start_ms, endpoint, status, scope, app_check, tier)
        );
        CREATE INDEX IF NOT EXISTS daily_metrics_expiry
          ON daily_metrics (day_start_ms);
        INSERT OR IGNORE INTO _sql_schema_migrations (version) VALUES (1);
        INSERT OR IGNORE INTO _sql_schema_migrations (version) VALUES (2);
      `);
      this.migrateLegacyIdentifiers();
      this.cleanupExpiredMetadata(Date.now());
      await this.scheduleCleanup(Date.now());
    });
  }

  migrateLegacyIdentifiers() {
    const applied = [...this.sql.exec(
      "SELECT 1 AS present FROM _sql_schema_migrations WHERE version = 3"
    )].length > 0;
    if (applied) return false;

    this.ctx.storage.transactionSync(() => {
      // Pre-C14-F1 rows contain raw Firebase UIDs and cannot be converted
      // without retaining the source identifier. Drop only the short-lived
      // individual windows; the aggregate project counter remains intact.
      this.sql.exec("DELETE FROM recent_requests");
      this.sql.exec("DELETE FROM recent_image_requests");
      this.sql.exec("DELETE FROM subject_daily_usage");
      this.sql.exec("INSERT INTO _sql_schema_migrations (version) VALUES (3)");
    });
    return true;
  }

  cleanupExpiredMetadata(timestampMs) {
    this.sql.exec(
      "DELETE FROM recent_requests WHERE timestamp_ms <= ?",
      timestampMs - INDIVIDUAL_METADATA_RETENTION_MS
    );
    this.sql.exec(
      "DELETE FROM recent_image_requests WHERE timestamp_ms <= ?",
      timestampMs - INDIVIDUAL_METADATA_RETENTION_MS
    );
    this.sql.exec(
      "DELETE FROM daily_usage WHERE day_key <> ?",
      pacificDay(timestampMs)
    );
    this.sql.exec(
      "DELETE FROM subject_daily_usage WHERE day_key <> ?",
      pacificDay(timestampMs)
    );
    this.sql.exec(
      "DELETE FROM daily_metrics WHERE day_start_ms <= ?",
      timestampMs - SANITIZED_METRIC_RETENTION_MS
    );
  }

  async scheduleCleanup(timestampMs) {
    const nextRecent = [...this.sql.exec(`
      SELECT MIN(timestamp_ms) AS timestamp_ms
      FROM (
        SELECT timestamp_ms FROM recent_requests
        UNION ALL
        SELECT timestamp_ms FROM recent_image_requests
      )
    `)][0]?.timestamp_ms;
    const hasDailyUsage = [...this.sql.exec(
      `SELECT 1 AS present FROM daily_usage
       UNION ALL
       SELECT 1 AS present FROM subject_daily_usage
       LIMIT 1`
    )].length > 0;
    const candidates = [];

    if (Number.isSafeInteger(nextRecent)) {
      candidates.push(nextRecent + INDIVIDUAL_METADATA_RETENTION_MS);
    }
    if (hasDailyUsage) {
      candidates.push(
        timestampMs + (secondsUntilNextPacificDay(
          timestampMs,
          pacificDay(timestampMs)
        ) * 1_000)
      );
    }
    const oldestMetricDay = [...this.sql.exec(
      "SELECT MIN(day_start_ms) AS day_start_ms FROM daily_metrics"
    )][0]?.day_start_ms;
    if (Number.isSafeInteger(oldestMetricDay)) {
      candidates.push(oldestMetricDay + SANITIZED_METRIC_RETENTION_MS);
    }
    if (candidates.length === 0) return;

    const requestedAlarm = Math.min(...candidates);
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null || requestedAlarm < currentAlarm) {
      await this.ctx.storage.setAlarm(requestedAlarm);
    }
  }

  async alarm() {
    const timestampMs = Date.now();
    this.cleanupExpiredMetadata(timestampMs);
    await this.scheduleCleanup(timestampMs);
  }

  async recordMetric(metric, timestampMs = Date.now()) {
    if (!metric || typeof metric !== "object" || Array.isArray(metric) ||
        Object.keys(metric).sort().join(",") !==
          "appCheck,endpoint,event,latencyMs,scope,status,tier" ||
        metric.event !== "ai-request" || !METRIC_ENDPOINTS.has(metric.endpoint) ||
        !Number.isInteger(metric.status) || metric.status < 100 || metric.status > 599 ||
        !METRIC_SCOPES.has(metric.scope) ||
        !Number.isSafeInteger(metric.latencyMs) || metric.latencyMs < 0 || metric.latencyMs > 120_000 ||
        !METRIC_APP_CHECK_STATES.has(metric.appCheck) ||
        typeof metric.tier !== "string" || !/^[a-z][a-z0-9-]{0,31}$/u.test(metric.tier) ||
        !Number.isSafeInteger(timestampMs) || timestampMs < 0) {
      throw new TypeError("invalid sanitized metric");
    }

    const dayStartMs = Math.floor(timestampMs / 86_400_000) * 86_400_000;
    this.ctx.storage.transactionSync(() => {
      this.sql.exec(
        "DELETE FROM daily_metrics WHERE day_start_ms <= ?",
        timestampMs - SANITIZED_METRIC_RETENTION_MS
      );
      this.sql.exec(
        `INSERT INTO daily_metrics (
          day_start_ms, endpoint, status, scope, app_check, tier,
          request_count, latency_total_ms, latency_max_ms
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(day_start_ms, endpoint, status, scope, app_check, tier) DO UPDATE
        SET request_count = request_count + 1,
            latency_total_ms = latency_total_ms + excluded.latency_total_ms,
            latency_max_ms = MAX(latency_max_ms, excluded.latency_max_ms)`,
        dayStartMs,
        metric.endpoint,
        metric.status,
        metric.scope,
        metric.appCheck,
        metric.tier,
        metric.latencyMs,
        metric.latencyMs
      );
    });
    await this.scheduleCleanup(timestampMs);
  }

  async check(uid, timestampMs = Date.now(), requestKind = "text", commercialPolicy = {}) {
    const commercialMode = commercialPolicy?.mode ?? "observe";
    const commercialTier = commercialPolicy?.tier ?? "testing";
    const commercialDailyLimit = commercialPolicy?.dailyRequests ?? null;
    if (typeof uid !== "string" || uid.length === 0 ||
        !Number.isSafeInteger(timestampMs) || timestampMs < 0 ||
        !["text", "image"].includes(requestKind) ||
        !["observe", "enforce"].includes(commercialMode) ||
        typeof commercialTier !== "string" || commercialTier.length === 0 ||
        (commercialDailyLimit !== null &&
          (!Number.isSafeInteger(commercialDailyLimit) || commercialDailyLimit < 1))) {
      throw new TypeError("invalid rate limit input");
    }

    const result = this.ctx.storage.transactionSync(() => {
      const windowStart = timestampMs - WINDOW_MS;
      const dayKey = pacificDay(timestampMs);

      this.sql.exec(
        "DELETE FROM recent_requests WHERE timestamp_ms <= ?",
        windowStart
      );
      this.sql.exec(
        "DELETE FROM recent_image_requests WHERE timestamp_ms <= ?",
        windowStart
      );
      this.sql.exec("DELETE FROM daily_usage WHERE day_key <> ?", dayKey);
      this.sql.exec("DELETE FROM subject_daily_usage WHERE day_key <> ?", dayKey);

      const dailyRow = [...this.sql.exec(
        "SELECT request_count FROM daily_usage WHERE day_key = ?",
        dayKey
      )][0];
      const dailyCount = dailyRow?.request_count ?? 0;
      if (dailyCount >= GLOBAL_REQUESTS_PER_DAY) {
        return {
          allowed: false,
          limit: "global-day",
          retryAfterSeconds: secondsUntilNextPacificDay(timestampMs, dayKey)
        };
      }

      let observedCommercialLimit = null;
      if (commercialDailyLimit !== null) {
        const subjectDailyRow = [...this.sql.exec(
          `SELECT request_count FROM subject_daily_usage
           WHERE subject_id = ? AND day_key = ?`,
          uid,
          dayKey
        )][0];
        if ((subjectDailyRow?.request_count ?? 0) >= commercialDailyLimit) {
          if (commercialMode === "enforce") {
            return {
              allowed: false,
              limit: "tier-day",
              retryAfterSeconds: secondsUntilNextPacificDay(timestampMs, dayKey)
            };
          }
          observedCommercialLimit = "tier-day";
        }
      }

      const uidRows = [...this.sql.exec(
        `SELECT timestamp_ms FROM recent_requests
         WHERE uid = ?
         ORDER BY timestamp_ms ASC`,
        uid
      )];
      if (uidRows.length >= UID_REQUESTS_PER_MINUTE) {
        return {
          allowed: false,
          limit: "uid-minute",
          retryAfterSeconds: minuteRetryAfter(timestampMs, uidRows[0].timestamp_ms)
        };
      }

      if (requestKind === "image") {
        const imageRows = [...this.sql.exec(
          `SELECT timestamp_ms FROM recent_image_requests
           WHERE uid = ?
           ORDER BY timestamp_ms ASC`,
          uid
        )];
        if (imageRows.length >= UID_IMAGE_REQUESTS_PER_MINUTE) {
          return {
            allowed: false,
            limit: "uid-image-minute",
            retryAfterSeconds: minuteRetryAfter(timestampMs, imageRows[0].timestamp_ms)
          };
        }
      }

      const globalRows = [...this.sql.exec(
        "SELECT timestamp_ms FROM recent_requests ORDER BY timestamp_ms ASC"
      )];
      if (globalRows.length >= GLOBAL_REQUESTS_PER_MINUTE) {
        return {
          allowed: false,
          limit: "global-minute",
          retryAfterSeconds: minuteRetryAfter(timestampMs, globalRows[0].timestamp_ms)
        };
      }

      this.sql.exec(
        "INSERT INTO recent_requests (uid, timestamp_ms) VALUES (?, ?)",
        uid,
        timestampMs
      );
      if (requestKind === "image") {
        this.sql.exec(
          "INSERT INTO recent_image_requests (uid, timestamp_ms) VALUES (?, ?)",
          uid,
          timestampMs
        );
      }
      this.sql.exec(
        `INSERT INTO daily_usage (day_key, request_count)
         VALUES (?, 1)
         ON CONFLICT(day_key) DO UPDATE
         SET request_count = request_count + 1`,
        dayKey
      );
      if (commercialDailyLimit !== null) {
        this.sql.exec(
          `INSERT INTO subject_daily_usage (subject_id, day_key, tier, request_count)
           VALUES (?, ?, ?, 1)
           ON CONFLICT(subject_id, day_key) DO UPDATE
           SET tier = excluded.tier,
               request_count = request_count + 1`,
          uid,
          dayKey,
          commercialTier
        );
      }
      return observedCommercialLimit
        ? { allowed: true, observedLimit: observedCommercialLimit }
        : { allowed: true };
    });
    await this.scheduleCleanup(timestampMs);
    return result;
  }
}
