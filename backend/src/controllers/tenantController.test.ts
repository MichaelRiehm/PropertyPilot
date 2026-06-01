import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { TenantController } from './tenantController';
import { Tenant } from '../domain';
import { NotFoundError } from '../errors';
import type { TenantRepository } from '../repositories';

function makeRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    ...overrides,
  } as unknown as TenantRepository;
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

function makeReq(opts: {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
} = {}): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
  } as unknown as Request;
}

function makeTenant(): Tenant {
  return Tenant.create({
    ownerId: 'owner-1',
    firstName: 'Avery',
    lastName: 'Lee',
    email: 'avery@example.com',
    phone: '+16085551234',
  });
}

describe('TenantController.get', () => {
  it('returns serialized tenant when found', async () => {
    const tenant = makeTenant();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(tenant) });
    const controller = new TenantController(repo);
    const res = makeRes();

    await controller.get(makeReq({ params: { id: tenant.id } }), res);

    expect(res.json.mock.calls[0][0].fullName).toBe('Avery Lee');
  });

  it('throws NotFoundError when missing', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TenantController(repo);

    await expect(
      controller.get(makeReq({ params: { id: 'missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TenantController.create', () => {
  it('creates and returns 201', async () => {
    const repo = makeRepo({
      create: vi.fn().mockImplementation(async (t: Tenant) => t),
    });
    const controller = new TenantController(repo);
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          firstName: 'Avery',
          lastName: 'Lee',
          email: 'avery@example.com',
          phone: '+16085551234',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].firstName).toBe('Avery');
  });

  it('rejects an invalid email', async () => {
    const controller = new TenantController(makeRepo());
    await expect(
      controller.create(
        makeReq({ body: { firstName: 'A', lastName: 'B', email: 'not-email' } }),
        makeRes(),
      ),
    ).rejects.toThrow();
  });
});

describe('TenantController.update', () => {
  it('throws NotFoundError when missing', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TenantController(repo);

    await expect(
      controller.update(
        makeReq({ params: { id: 'missing' }, body: { firstName: 'X' } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates name and returns the payload', async () => {
    const tenant = makeTenant();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(tenant),
      update: vi.fn().mockImplementation(async (t: Tenant) => t),
    });
    const controller = new TenantController(repo);
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: tenant.id }, body: { firstName: 'Bee' } }),
      res,
    );

    expect(res.json.mock.calls[0][0].firstName).toBe('Bee');
  });
});

describe('TenantController.remove', () => {
  it('returns 204', async () => {
    const repo = makeRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new TenantController(repo);
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 't-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});
