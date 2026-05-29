import rateLimit from 'express-rate-limit';

// Brute-force protection for login and registration. Keeping the limit tight
// (5 attempts per 15 minutes per IP) — the auth flow has no cookies, so the
// only meaningful state to track is the client IP.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
});
