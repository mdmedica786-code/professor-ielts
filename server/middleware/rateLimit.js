/**
 * Dependency-free, in-memory fixed-window rate limiter.
 *
 * Why this exists: every /api route below calls a PAID OpenAI endpoint and the
 * app has no authentication. Without a limit, a single client (or a script) can
 * run up an unbounded bill and exhaust the provider quota for everyone. This
 * caps requests per client IP per window.
 *
 * Limitations (documented on purpose):
 *  - In-memory => per-process. If you run multiple server instances, move this
 *    to a shared store (Redis) so the limit is global. For a single-node MVP
 *    this is sufficient.
 *  - Keyed by client IP. Behind a reverse proxy/load balancer, set
 *    `app.set("trust proxy", 1)` so req.ip is the real client address.
 *
 * Tunable via env: RATE_LIMIT_WINDOW_MS (default 15 min), RATE_LIMIT_MAX
 * (default 60 requests/window).
 */

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX, 10) || 60;

// Map<ip, { count, resetAt }>
const hits = new Map();

// Periodically evict stale entries so the map can't grow without bound.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}, WINDOW_MS);
// Don't keep the event loop alive just for the sweeper.
if (typeof sweep.unref === "function") sweep.unref();

function rateLimit(req, res, next) {
  const key = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();

  let entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(key, entry);
  }

  entry.count += 1;

  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

  if (entry.count > MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({
      success: false,
      error: `Too many requests. Please retry in ${retryAfterSec}s.`,
    });
  }

  next();
}

module.exports = rateLimit;
