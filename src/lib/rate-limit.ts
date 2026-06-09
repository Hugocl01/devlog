interface Entry {
  count: number;
  resetAt: number;
}

// In-memory store — works for single-process Node.js (PM2 single instance)
const store = new Map<string, Entry>();

// Periodically clean expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key      Unique identifier (e.g. "login:1.2.3.4")
 * @param max      Maximum requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/**
 * Returns a Response with 429 status.
 */
export function rateLimitedResponse(retryAfterSeconds = 60): Response {
  return new Response(
    JSON.stringify({ error: "Demasiados intentos. Inténtalo de nuevo más tarde." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Extracts the best available IP from the request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
