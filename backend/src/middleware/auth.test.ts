import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createAuthMiddleware } from './auth';
import type { AuthService } from '../services/authService';
import { HttpError } from '../errors';

function makeReq(headers: Record<string, string | undefined>): Request {
  return { headers } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

function makeAuthService(verify: (token: string) => { sub: string; email: string }) {
  return { verifyToken: vi.fn(verify) } as unknown as AuthService;
}

describe('createAuthMiddleware', () => {
  it('attaches req.user and calls next() on a valid bearer token', () => {
    const service = makeAuthService(() => ({ sub: 'u-1', email: 'a@b.com' }));
    const middleware = createAuthMiddleware(service);
    const req = makeReq({ authorization: 'Bearer valid.jwt.token' });
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, makeRes(), next);

    expect(req.user).toEqual({ id: 'u-1', email: 'a@b.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts a case-insensitive Bearer prefix', () => {
    const service = makeAuthService(() => ({ sub: 'u-1', email: 'a@b.com' }));
    const middleware = createAuthMiddleware(service);
    const req = makeReq({ authorization: 'bearer abc.def.ghi' });
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, makeRes(), next);

    expect(req.user).toEqual({ id: 'u-1', email: 'a@b.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 401 when the Authorization header is missing', () => {
    const service = makeAuthService(() => ({ sub: 'u-1', email: 'a@b.com' }));
    const middleware = createAuthMiddleware(service);
    const next = vi.fn() as unknown as NextFunction;

    middleware(makeReq({}), makeRes(), next);

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/Missing or malformed/);
  });

  it('rejects with 401 when the Authorization header does not start with Bearer', () => {
    const service = makeAuthService(() => ({ sub: 'u-1', email: 'a@b.com' }));
    const middleware = createAuthMiddleware(service);
    const next = vi.fn() as unknown as NextFunction;

    middleware(makeReq({ authorization: 'Basic abc123' }), makeRes(), next);

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(err.status).toBe(401);
  });

  it('rejects with 401 when the bearer token is empty', () => {
    const service = makeAuthService(() => ({ sub: 'u-1', email: 'a@b.com' }));
    const middleware = createAuthMiddleware(service);
    const next = vi.fn() as unknown as NextFunction;

    middleware(makeReq({ authorization: 'Bearer ' }), makeRes(), next);

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/Missing bearer token/);
  });

  it('rejects with 401 when token verification throws', () => {
    const service = {
      verifyToken: vi.fn(() => {
        throw new Error('jwt expired');
      }),
    } as unknown as AuthService;
    const middleware = createAuthMiddleware(service);
    const next = vi.fn() as unknown as NextFunction;

    middleware(makeReq({ authorization: 'Bearer bad.token.here' }), makeRes(), next);

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/Invalid or expired token/);
  });

  it('does not leak verification errors to the caller', () => {
    const service = {
      verifyToken: vi.fn(() => {
        throw new Error('SECRET INFO LEAKED');
      }),
    } as unknown as AuthService;
    const middleware = createAuthMiddleware(service);
    const next = vi.fn() as unknown as NextFunction;

    middleware(makeReq({ authorization: 'Bearer x' }), makeRes(), next);

    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpError;
    expect(err.message).not.toContain('SECRET INFO LEAKED');
  });
});
