import { NextResponse } from 'next/server';

/**
 * Lightweight in-memory fixed-window rate limiter, keyed by client IP + bucket.
 *
 * NOTE: On Vercel this is per-serverless-instance and resets on cold start, so it
 * blunts bursts/abuse but is not a global limiter. For hard guarantees across
 * instances, back this with Upstash Redis. It is intentionally dependency-free
 * to honor the project's "no extra third parties" preference.
 */
interface Bucket { count: number; reset: number }
const store = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const key = `${bucket}:${clientIp(req)}`;
  const entry = store.get(key);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (store.size > 5000) {
    for (const [k, v] of store) if (now > v.reset) store.delete(k);
  }

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((entry.reset - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
