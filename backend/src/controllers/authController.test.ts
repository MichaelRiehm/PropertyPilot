import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthController } from './authController';
import { ConflictError, HttpError } from '../errors';
import type { UserRepository } from '../repositories';
import type { AuthService } from '../services/authService';

function makeUsers(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

function makeAuth(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    hashPassword: vi.fn().mockResolvedValue('hashed'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    signToken: vi.fn().mockReturnValue('signed.jwt.token'),
    verifyToken: vi.fn(),
    ...overrides,
  } as unknown as AuthService;
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function userRecord(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'u-1',
    email: 'owner@example.com',
    passwordHash: 'hashed-pw',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthController.register', () => {
  it('creates a user, signs a token, and returns 201', async () => {
    const users = makeUsers({ create: vi.fn().mockResolvedValue(userRecord()) });
    const auth = makeAuth();
    const controller = new AuthController(users, auth);
    const res = makeRes();
    const req = {
      body: { email: 'OWNER@example.com', password: 'sup3rsecret!' },
    } as unknown as Request;

    await controller.register(req, res);

    expect(auth.hashPassword).toHaveBeenCalledWith('sup3rsecret!');
    expect(users.create).toHaveBeenCalledWith({
      email: 'owner@example.com',
      passwordHash: 'hashed',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.token).toBe('signed.jwt.token');
    expect(body.user.email).toBe('owner@example.com');
    expect((body.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('translates a Prisma P2002 unique violation into a ConflictError', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    const users = makeUsers({ create: vi.fn().mockRejectedValue(prismaError) });
    const controller = new AuthController(users, makeAuth());
    const req = {
      body: { email: 'taken@example.com', password: 'sup3rsecret!' },
    } as unknown as Request;

    await expect(controller.register(req, makeRes())).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects an invalid body with a Zod error', async () => {
    const controller = new AuthController(makeUsers(), makeAuth());
    const req = { body: { email: 'nope', password: 'short' } } as unknown as Request;
    await expect(controller.register(req, makeRes())).rejects.toThrow();
  });
});

describe('AuthController.login', () => {
  it('returns a token and the user on valid credentials', async () => {
    const users = makeUsers({ findByEmail: vi.fn().mockResolvedValue(userRecord()) });
    const auth = makeAuth({ verifyPassword: vi.fn().mockResolvedValue(true) });
    const controller = new AuthController(users, auth);
    const res = makeRes();
    const req = {
      body: { email: 'OWNER@example.com', password: 'sup3rsecret!' },
    } as unknown as Request;

    await controller.login(req, res);

    expect(users.findByEmail).toHaveBeenCalledWith('owner@example.com');
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].token).toBe('signed.jwt.token');
  });

  it('throws 401 when the user is not found', async () => {
    const users = makeUsers({ findByEmail: vi.fn().mockResolvedValue(null) });
    const controller = new AuthController(users, makeAuth());
    const req = {
      body: { email: 'nope@example.com', password: 'sup3rsecret!' },
    } as unknown as Request;

    await expect(controller.login(req, makeRes())).rejects.toMatchObject({
      status: 401,
    });
  });

  it('throws 401 when the password does not match', async () => {
    const users = makeUsers({ findByEmail: vi.fn().mockResolvedValue(userRecord()) });
    const auth = makeAuth({ verifyPassword: vi.fn().mockResolvedValue(false) });
    const controller = new AuthController(users, auth);
    const req = {
      body: { email: 'owner@example.com', password: 'wrongpass1!' },
    } as unknown as Request;

    await expect(controller.login(req, makeRes())).rejects.toBeInstanceOf(HttpError);
  });
});

describe('AuthController.me', () => {
  it('returns the user payload without password hash', async () => {
    const users = makeUsers({ findById: vi.fn().mockResolvedValue(userRecord()) });
    const controller = new AuthController(users, makeAuth());
    const res = makeRes();
    const req = { user: { id: 'u-1', email: 'owner@example.com' } } as unknown as Request;

    await controller.me(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.id).toBe('u-1');
    expect((body as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('throws 401 when the authenticated user no longer exists', async () => {
    const users = makeUsers({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new AuthController(users, makeAuth());
    const req = { user: { id: 'u-gone', email: 'gone@example.com' } } as unknown as Request;

    await expect(controller.me(req, makeRes())).rejects.toMatchObject({ status: 401 });
  });
});
