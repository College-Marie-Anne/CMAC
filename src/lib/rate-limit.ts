import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting via Upstash Redis (sliding window).
 *
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set,
 * rate limiting is disabled (returns always-allowed).
 * This allows local dev without Redis while enforcing limits in production.
 */

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`
) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `cmac:${prefix}`,
    analytics: false,
  });
}

// ─── Auth (par IP) ───
export const loginLimiter = createLimiter("login", 5, "1 m");
export const registerLimiter = createLimiter("register", 3, "1 h");
export const resetPasswordLimiter = createLimiter("reset-pwd", 3, "1 h");

// ─── Forum (par user ID) ───
export const createPostLimiter = createLimiter("post", 5, "1 h");
export const createCommentLimiter = createLimiter("comment", 20, "1 h");
export const reactionLimiter = createLimiter("reaction", 30, "1 m");
export const reportLimiter = createLimiter("report", 10, "1 h");

// ─── DMs (par user ID) ───
export const sendMessageLimiter = createLimiter("dm", 30, "1 m");
export const createConversationLimiter = createLimiter("conversation", 10, "1 h");

// ─── Global (par user ID) ───
export const globalLimiter = createLimiter("global", 100, "1 m");

// ─── Change password (par user ID, session active) ───
export const changePasswordLimiter = createLimiter("change-pwd", 3, "1 h");

// ─── Account deactivation (par user ID) ───
export const deactivateAccountLimiter = createLimiter("deactivate", 1, "1 d");

/**
 * Validate and sanitize an IP address.
 * Strips port suffixes, rejects obviously invalid values,
 * and falls back to "unknown" which still rate-limits (just globally).
 */
const IP_V4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IP_V6 = /^[0-9a-fA-F:]+$/;

export function sanitizeIp(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  // x-forwarded-for may contain "ip1, ip2, ip3" — take the first (client IP)
  const first = raw.split(",")[0]?.trim() ?? "";
  // Strip port suffix (e.g., "1.2.3.4:12345")
  const noPort = first.replace(/:\d+$/, "");
  // Validate format
  if (IP_V4.test(noPort) || IP_V6.test(noPort)) return noPort;
  // If it doesn't look like an IP, hash it to prevent injection into Redis keys
  return `untrusted:${noPort.slice(0, 45).replace(/[^a-zA-Z0-9.:]/g, "_")}`;
}

/**
 * Check rate limit. Returns { allowed, remaining, resetAt } or allows if limiter is null.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  if (!limiter) {
    return { allowed: true, remaining: 999, resetAt: 0 };
  }

  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}
