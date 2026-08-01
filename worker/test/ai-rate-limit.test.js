import {
  env,
  runDurableObjectAlarm,
  runInDurableObject
} from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const PACIFIC_MIDNIGHT = Date.parse("2030-07-30T07:00:00.000Z");

function freshLimiter(name) {
  return env.AI_RATE_LIMITER.getByName(name);
}

describe("AIRateLimiter SQLite Durable Object", () => {
  let sequence;

  beforeEach(() => {
    sequence = crypto.randomUUID();
  });

  it("enforces five calls per UID in a sliding 60-second window", async () => {
    const limiter = freshLimiter(`uid-window-${sequence}`);
    const windowStart = Date.now();

    for (let index = 0; index < 5; index += 1) {
      await expect(limiter.check("user-a", windowStart + (index * 10_000)))
        .resolves.toEqual({ allowed: true });
    }

    await expect(limiter.check("user-a", windowStart + 50_000)).resolves.toEqual({
      allowed: false,
      limit: "uid-minute",
      retryAfterSeconds: 10
    });
    await expect(limiter.check("user-a", windowStart + 60_000))
      .resolves.toEqual({ allowed: true });
  });

  it("enforces the 12 RPM global safety margin with Retry-After", async () => {
    const limiter = freshLimiter(`global-minute-${sequence}`);
    const windowStart = Date.now();

    for (let index = 0; index < 12; index += 1) {
      await expect(limiter.check(`user-${index}`, windowStart))
        .resolves.toEqual({ allowed: true });
    }

    await expect(limiter.check("user-12", windowStart)).resolves.toEqual({
      allowed: false,
      limit: "global-minute",
      retryAfterSeconds: 60
    });
    await expect(limiter.check("user-12", windowStart + 59_999)).resolves.toEqual({
      allowed: false,
      limit: "global-minute",
      retryAfterSeconds: 1
    });
    await expect(limiter.check("user-12", windowStart + 60_000))
      .resolves.toEqual({ allowed: true });
  });

  it("enforces 400 requests per Pacific day and resets at midnight", async () => {
    const limiter = freshLimiter(`global-day-${sequence}`);

    for (let index = 0; index < 400; index += 1) {
      await expect(limiter.check(
        `user-${index}`,
        PACIFIC_MIDNIGHT + (index * 60_000)
      )).resolves.toEqual({ allowed: true });
    }

    const deniedAt = PACIFIC_MIDNIGHT + (400 * 60_000);
    await expect(limiter.check("user-400", deniedAt)).resolves.toEqual({
      allowed: false,
      limit: "global-day",
      retryAfterSeconds: 62_400
    });
    await expect(limiter.check("user-next-day", PACIFIC_MIDNIGHT + 86_400_000))
      .resolves.toEqual({ allowed: true });
  });

  it("enforces two images per UID while counting them in every general quota", async () => {
    const limiter = freshLimiter(`uid-image-window-${sequence}`);
    const windowStart = Date.now();

    await expect(limiter.check("image-user", windowStart, "image"))
      .resolves.toEqual({ allowed: true });
    await expect(limiter.check("image-user", windowStart + 10_000, "image"))
      .resolves.toEqual({ allowed: true });
    await runInDurableObject(limiter, async (_instance, state) => {
      const generalCount = [...state.storage.sql.exec(
        "SELECT COUNT(*) AS count FROM recent_requests"
      )][0].count;
      const imageCount = [...state.storage.sql.exec(
        "SELECT COUNT(*) AS count FROM recent_image_requests"
      )][0].count;
      const dailyCount = [...state.storage.sql.exec(
        "SELECT request_count FROM daily_usage"
      )][0].request_count;
      expect({ generalCount, imageCount, dailyCount }).toEqual({
        generalCount: 2,
        imageCount: 2,
        dailyCount: 2
      });
    });
    await expect(limiter.check("image-user", windowStart + 20_000, "image"))
      .resolves.toEqual({
        allowed: false,
        limit: "uid-image-minute",
        retryAfterSeconds: 40
      });

    for (let index = 0; index < 3; index += 1) {
      await expect(limiter.check("image-user", windowStart + 20_000 + index, "text"))
        .resolves.toEqual({ allowed: true });
    }
    await expect(limiter.check("image-user", windowStart + 30_000, "text"))
      .resolves.toEqual({
        allowed: false,
        limit: "uid-minute",
        retryAfterSeconds: 30
      });
    await expect(limiter.check("image-user", windowStart + 60_000, "image"))
      .resolves.toEqual({ allowed: true });
  });

  it("removes metadata older than 24 hours by alarm without another request", async () => {
    const limiter = freshLimiter(`retention-alarm-${sequence}`);
    const currentTimestamp = Date.now();
    const recordedAt = Date.now() - (25 * 60 * 60 * 1_000);

    await expect(limiter.check("user-stale", currentTimestamp, "image"))
      .resolves.toEqual({ allowed: true });

    await runInDurableObject(limiter, async (_instance, state) => {
      state.storage.sql.exec(
        "UPDATE recent_requests SET timestamp_ms = ? WHERE uid = ?",
        recordedAt,
        "user-stale"
      );
      state.storage.sql.exec(
        "UPDATE recent_image_requests SET timestamp_ms = ? WHERE uid = ?",
        recordedAt,
        "user-stale"
      );
      state.storage.sql.exec(
        "UPDATE daily_usage SET day_key = ?",
        "2000-01-01"
      );
      const recentBefore = [...state.storage.sql.exec(
        "SELECT uid, timestamp_ms FROM recent_requests"
      )];
      const dailyBefore = [...state.storage.sql.exec(
        "SELECT day_key, request_count FROM daily_usage"
      )];
      const imageBefore = [...state.storage.sql.exec(
        "SELECT uid, timestamp_ms FROM recent_image_requests"
      )];
      expect(recentBefore).toEqual([{
        uid: "user-stale",
        timestamp_ms: recordedAt
      }]);
      expect(dailyBefore).toHaveLength(1);
      expect(imageBefore).toEqual([{
        uid: "user-stale",
        timestamp_ms: recordedAt
      }]);
      expect(await state.storage.getAlarm()).not.toBeNull();
    });

    await expect(runDurableObjectAlarm(limiter)).resolves.toBe(true);

    await runInDurableObject(limiter, async (_instance, state) => {
      const recentAfter = [...state.storage.sql.exec(
        "SELECT uid, timestamp_ms FROM recent_requests"
      )];
      const dailyAfter = [...state.storage.sql.exec(
        "SELECT day_key, request_count FROM daily_usage"
      )];
      const imageAfter = [...state.storage.sql.exec(
        "SELECT uid, timestamp_ms FROM recent_image_requests"
      )];
      expect(recentAfter).toEqual([]);
      expect(dailyAfter).toEqual([]);
      expect(imageAfter).toEqual([]);
    });
  });
});
