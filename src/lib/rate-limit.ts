/**
 * Simple in-memory rate limiter for API routes.
 * Suitable for single-instance deployments (this is a private personal app).
 * For multi-instance, replace with Redis-based solution.
 */
const store = new Map<string, { count: number; resetAt: number }>();

// Automatically purge expired entries every minute to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (now > val.resetAt) store.delete(key);
    }
  }, 60_000);
}

/**
 * @param key       Unique identifier (e.g. IP address, or `${ip}:${profileId}`)
 * @param limit     Max requests allowed in the window (default: 5)
 * @param windowMs  Window duration in milliseconds (default: 60 seconds)
 */
export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
