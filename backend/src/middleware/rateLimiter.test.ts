import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { shouldSkipWriteLimit, userIdKey } from './rateLimiter';

function makeReq(overrides: Partial<Request>): Request {
  return {
    method: 'GET',
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

describe('userIdKey', () => {
  it('returns the authenticated user id when req.user is present', () => {
    const req = makeReq({ user: { id: 'u-alice', email: 'alice@example.com' } });
    expect(userIdKey(req)).toBe('u-alice');
  });

  it('never returns the same key for two different users on the same IP', () => {
    const alice = makeReq({ user: { id: 'u-alice', email: 'a@x.com' }, ip: '10.0.0.1' });
    const bob = makeReq({ user: { id: 'u-bob', email: 'b@x.com' }, ip: '10.0.0.1' });
    expect(userIdKey(alice)).not.toBe(userIdKey(bob));
  });

  it('falls back to an ip-prefixed key when req.user is missing (misconfiguration guard)', () => {
    const req = makeReq({ ip: '198.51.100.42' });
    expect(userIdKey(req)).toMatch(/^ip:/);
  });

  it('preserves the IPv4 address unchanged in the fallback key', () => {
    const req = makeReq({ ip: '198.51.100.42' });
    expect(userIdKey(req)).toBe('ip:198.51.100.42');
  });

  it('collapses two IPv6 addresses in the same /64 subnet to the same fallback key', () => {
    // Both addresses fall under 2001:db8::/64 — same physical client under
    // typical IPv6 allocation, so the rate limiter must treat them as one.
    const client1 = makeReq({ ip: '2001:db8::1' });
    const client2 = makeReq({ ip: '2001:db8::abcd:beef:1234:5678' });
    expect(userIdKey(client1)).toBe(userIdKey(client2));
  });

  it('gives distinct fallback keys to IPv6 addresses in different /64 subnets', () => {
    const client1 = makeReq({ ip: '2001:db8::1' });
    const client2 = makeReq({ ip: '2001:db8:1::1' });
    expect(userIdKey(client1)).not.toBe(userIdKey(client2));
  });

  it('marks the IP fallback distinctly so it cannot collide with a real user id', () => {
    const req = makeReq({ ip: '198.51.100.42' });
    const spoofed = makeReq({ user: { id: '198.51.100.42', email: 'e@x.com' } });
    expect(userIdKey(req)).not.toBe(userIdKey(spoofed));
  });
});

describe('shouldSkipWriteLimit', () => {
  const originalBypass = process.env.E2E_BYPASS_WRITE_RATE_LIMITS;

  beforeEach(() => {
    delete process.env.E2E_BYPASS_WRITE_RATE_LIMITS;
  });

  afterEach(() => {
    if (originalBypass === undefined) {
      delete process.env.E2E_BYPASS_WRITE_RATE_LIMITS;
    } else {
      process.env.E2E_BYPASS_WRITE_RATE_LIMITS = originalBypass;
    }
  });

  it('skips GET (reads are cheap and not a rate-limit vector)', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'GET' }))).toBe(true);
  });

  it('skips HEAD', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'HEAD' }))).toBe(true);
  });

  it('skips OPTIONS (CORS preflight)', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'OPTIONS' }))).toBe(true);
  });

  it('counts POST against the limit', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'POST' }))).toBe(false);
  });

  it('counts PATCH against the limit', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'PATCH' }))).toBe(false);
  });

  it('counts PUT against the limit', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'PUT' }))).toBe(false);
  });

  it('counts DELETE against the limit', () => {
    expect(shouldSkipWriteLimit(makeReq({ method: 'DELETE' }))).toBe(false);
  });

  it('bypasses everything (including POST) when E2E_BYPASS_WRITE_RATE_LIMITS=1', () => {
    process.env.E2E_BYPASS_WRITE_RATE_LIMITS = '1';
    expect(shouldSkipWriteLimit(makeReq({ method: 'POST' }))).toBe(true);
    expect(shouldSkipWriteLimit(makeReq({ method: 'DELETE' }))).toBe(true);
  });

  it('does not bypass when the env var has any value other than exactly "1"', () => {
    process.env.E2E_BYPASS_WRITE_RATE_LIMITS = 'true';
    expect(shouldSkipWriteLimit(makeReq({ method: 'POST' }))).toBe(false);
    process.env.E2E_BYPASS_WRITE_RATE_LIMITS = '0';
    expect(shouldSkipWriteLimit(makeReq({ method: 'POST' }))).toBe(false);
  });
});
