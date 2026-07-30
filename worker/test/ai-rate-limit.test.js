import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

const PACIFIC_MIDNIGHT = Date.parse("2026-07-30T07:00:00.000Z");

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

    for (let index = 0; index < 5; index += 1) {
      await expect(limiter.check("user-a", index * 10_000))
        .resolves.toEqual({ allowed: true });
    }

    await expect(limiter.check("user-a", 50_000)).resolves.toEqual({
      allowed: false,
      limit: "uid-minute",
      retryAfterSeconds: 10
    });
    await expect(limiter.check("user-a", 60_000))
      .resolves.toEqual({ allowed: true });
  });

  it("enforces the 12 RPM global safety margin with Retry-After", async () => {
    const limiter = freshLimiter(`global-minute-${sequence}`);

    for (let index = 0; index < 12; index += 1) {
      await expect(limiter.check(`user-${index}`, 100_000))
        .resolves.toEqual({ allowed: true });
    }

    await expect(limiter.check("user-12", 100_000)).resolves.toEqual({
      allowed: false,
      limit: "global-minute",
      retryAfterSeconds: 60
    });
    await expect(limiter.check("user-12", 159_999)).resolves.toEqual({
      allowed: false,
      limit: "global-minute",
      retryAfterSeconds: 1
    });
    await expect(limiter.check("user-12", 160_000))
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
});
