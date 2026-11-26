import "server-only";

/**
 * Fixed-window in-memory rate limiter keyed by an arbitrary string (usually `route:ip`).
 * NOTE: state is per server instance (each serverless instance/region has its own counters), so it
 * is a basic abuse brake, not a global quota. Use a shared store (e.g. Redis) for strict limits.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const maxKeys = opts.maxKeys ?? 10_000;

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfterSeconds: number } {
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size >= maxKeys) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
        if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
      }
      entry = { count: 0, resetAt: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return { ok: entry.count <= opts.limit, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  };
}

/**
 * Best-effort client IP. Prefers the headers the hosting platform sets itself and clients cannot
 * forge on Vercel (`x-vercel-forwarded-for`, then `x-real-ip`); falls back to the first
 * X-Forwarded-For hop, which is only trustworthy behind a proxy that overwrites it.
 */
export function clientIp(headers: Headers): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  return (
    first(headers.get("x-vercel-forwarded-for")) ??
    first(headers.get("x-real-ip")) ??
    first(headers.get("x-forwarded-for")) ??
    "unknown"
  );
}

export const ORDER_BODY_MAX_BYTES = 32 * 1024;
export const WEBHOOK_BODY_MAX_BYTES = 64 * 1024;

/**
 * True when the declared Content-Length exceeds the cap (or is malformed), so the route can answer
 * 413 without reading the body. Bodies without the header are still capped after reading.
 */
export function exceedsContentLength(req: Request, maxBytes: number): boolean {
  const header = req.headers.get("content-length");
  if (header === null) return false;
  if (!/^\d{1,12}$/.test(header.trim())) return true;
  return Number(header) > maxBytes;
}

/** Stop reading once the byte cap is exceeded, including requests without Content-Length. */
export async function readBody(req: Request, maxBytes: number): Promise<string | undefined> {
  if (exceedsContentLength(req, maxBytes)) return undefined;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}

/** Reads JSON with a byte cap. Invalid, interrupted and oversized bodies return undefined. */
export async function readJsonBody(req: Request, maxBytes = ORDER_BODY_MAX_BYTES): Promise<unknown> {
  const text = await readBody(req, maxBytes);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
