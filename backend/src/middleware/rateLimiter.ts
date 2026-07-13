import rateLimit from 'express-rate-limit';

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
