import { tooMany } from './errors.js';

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Deliberately dependency-free and per-instance: this app is a single small
 * service, and the limiter exists to blunt accidental hammering of the solver,
 * not to enforce quotas across a fleet. Put a shared store behind it if this
 * ever runs multi-replica.
 */
export function rateLimit({ windowMs = 60_000, max = 120, key = defaultKey } = {}) {
  const hits = new Map();

  // Drop expired buckets periodically so the map cannot grow without bound.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, bucket] of hits) {
      if (bucket.resetAt <= now) hits.delete(id);
    }
  }, windowMs);
  // Never hold the event loop open just for housekeeping.
  sweeper.unref?.();

  const middleware = (req, res, next) => {
    const now = Date.now();
    const id = key(req);
    let bucket = hits.get(id);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(id, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      next(tooMany(`Rate limit of ${max} requests per ${windowMs / 1000}s exceeded`));
      return;
    }

    next();
  };

  middleware.stop = () => clearInterval(sweeper);
  return middleware;
}

function defaultKey(req) {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
