import { DurableObject } from "cloudflare:workers";

const WINDOW_MS = 60_000;
const POLICY_MAX_METADATA_RETENTION_MS = 24 * 60 * 60 * 1_000;
const ALARM_DELIVERY_SAFETY_MARGIN_MS = 60 * 60 * 1_000;
const INDIVIDUAL_METADATA_RETENTION_MS =
  POLICY_MAX_METADATA_RETENTION_MS - ALARM_DELIVERY_SAFETY_MARGIN_MS;
const UID_REQUESTS_PER_MINUTE = 5;
const GLOBAL_REQUESTS_PER_MINUTE = 12;
const GLOBAL_REQUESTS_PER_DAY = 400;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";

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
        CREATE TABLE IF NOT EXISTS daily_usage (
          day_key TEXT PRIMARY KEY,
          request_count INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO _sql_schema_migrations (version) VALUES (1);
      `);
      this.cleanupExpiredMetadata(Date.now());
      await this.scheduleCleanup(Date.now());
    });
  }

  cleanupExpiredMetadata(timestampMs) {
    this.sql.exec(
      "DELETE FROM recent_requests WHERE timestamp_ms <= ?",
      timestampMs - INDIVIDUAL_METADATA_RETENTION_MS
    );
    this.sql.exec(
      "DELETE FROM daily_usage WHERE day_key <> ?",
      pacificDay(timestampMs)
    );
  }

  async scheduleCleanup(timestampMs) {
    const nextRecent = [...this.sql.exec(
      "SELECT MIN(timestamp_ms) AS timestamp_ms FROM recent_requests"
    )][0]?.timestamp_ms;
    const hasDailyUsage = [...this.sql.exec(
      "SELECT 1 AS present FROM daily_usage LIMIT 1"
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

  async check(uid, timestampMs = Date.now()) {
    if (typeof uid !== "string" || uid.length === 0 ||
        !Number.isSafeInteger(timestampMs) || timestampMs < 0) {
      throw new TypeError("invalid rate limit input");
    }

    const result = this.ctx.storage.transactionSync(() => {
      const windowStart = timestampMs - WINDOW_MS;
      const dayKey = pacificDay(timestampMs);

      this.sql.exec(
        "DELETE FROM recent_requests WHERE timestamp_ms <= ?",
        windowStart
      );
      this.sql.exec("DELETE FROM daily_usage WHERE day_key <> ?", dayKey);

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
      this.sql.exec(
        `INSERT INTO daily_usage (day_key, request_count)
         VALUES (?, 1)
         ON CONFLICT(day_key) DO UPDATE
         SET request_count = request_count + 1`,
        dayKey
      );
      return { allowed: true };
    });
    await this.scheduleCleanup(timestampMs);
    return result;
  }
}
