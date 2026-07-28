import { createMiddleware } from "hono/factory";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, WindowState>>();

function storeForKey(key: string): Map<string, WindowState> {
  let store = stores.get(key);
  if (!store) {
    store = new Map();
    stores.set(key, store);
  }
  return store;
}

export function getClientIp(forwardedFor: string | undefined, realIp: string | undefined): string {
  const forwarded = forwardedFor?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  if (realIp?.trim()) {
    return realIp.trim();
  }
  return "unknown";
}

export function checkRateLimit(
  store: Map<string, WindowState>,
  clientKey: string,
  options: RateLimitOptions,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = store.get(clientKey);
  if (!existing || now >= existing.resetAt) {
    store.set(clientKey, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** In-memory fixed-window rate limiter (per route key + client IP). */
export function rateLimit(routeKey: string, options: RateLimitOptions) {
  const store = storeForKey(routeKey);

  return createMiddleware(async (context, next) => {
    const clientIp = getClientIp(
      context.req.header("x-forwarded-for"),
      context.req.header("x-real-ip"),
    );
    const result = checkRateLimit(store, clientIp, options);

    if (!result.allowed) {
      context.header("Retry-After", String(result.retryAfterSeconds));
      return context.json(
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Try again later.",
        },
        429,
      );
    }

    await next();
  });
}
