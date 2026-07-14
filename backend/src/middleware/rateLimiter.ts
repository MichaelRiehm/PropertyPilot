import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Brute-force protection for login and registration. Keeping the limit tight
// (5 attempts per 15 minutes per IP) — the auth flow has no cookies, so the
// only meaningful state to track is the client IP.
//
// The `skip` predicate lets E2E test suites and local dev override the limit
// via `E2E_BYPASS_AUTH_RATE_LIMIT=1`. Never set this in production.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
  skip: () => process.env.E2E_BYPASS_AUTH_RATE_LIMIT === '1',
});

// Per-user (authenticated) key for the write and upload limiters below.
// Mounted after authMiddleware so req.user is guaranteed populated; the IP
// fallback exists only so a misconfiguration fails closed rather than open.
export function userIdKey(req: Request): string {
  return req.user?.id ?? `ip:${req.ip ?? 'unknown'}`;
}

// Predicate for the write limiter: skip reads (they're cheap and not a vector),
// and honor the E2E bypass. Exported so it can be unit-tested directly.
export function shouldSkipWriteLimit(req: Request): boolean {
  if (process.env.E2E_BYPASS_WRITE_RATE_LIMITS === '1') return true;
  return req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
}

// Per-user cap on write operations (POST/PUT/PATCH/DELETE) across all
// authenticated /api routes. Keyed on the authenticated user id so a shared
// NAT (office, coffee shop) doesn't share a budget. Reads are not counted.
//
// 60 writes / 5 min is comfortably above any legitimate manual workflow (an
// aggressive human clicking every button is well under 12/min) and low
// enough that a runaway script gets throttled within seconds.
export const writeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  keyGenerator: userIdKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many write requests. Please slow down and try again shortly.',
  },
  skip: shouldSkipWriteLimit,
});

// Stricter cap specifically for lease document uploads. Every upload touches
// R2 (storage + Class A op) so this endpoint has a direct cost per call in a
// way the other write endpoints don't.
//
// 20 uploads / hour / user leaves plenty of room for a legitimate landlord
// swapping a mis-uploaded lease PDF, while catching a script that would
// otherwise blow through the R2 free-tier ceilings before the CDN alert fires.
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: userIdKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many uploads in the last hour. Please try again later.',
  },
  skip: () => process.env.E2E_BYPASS_WRITE_RATE_LIMITS === '1',
});
