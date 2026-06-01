import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { PropertyController } from './propertyController';
import { Property } from '../domain';
import { NotFoundError } from '../errors';
import type { PropertyRepository } from '../repositories';

function makeRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    ...overrides,
  } as unknown as PropertyRepository;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function makeReq(opts: {
  user?: { id: string; email: string };
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}): Request {
  return {
    user: opts.user ?? { id: 'owner-1', email: 'owner@example.com' },
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
  } as unknown as Request;
}

function makeProperty(overrides: Partial<Parameters<typeof Property.create>[0]> = {}): Property {
  return Property.create({
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    ...overrides,
  });
}

describe('PropertyController.list', () => {
  it('returns the paginated payload with serialized rows', async () => {
    const repo = makeRepo({
      list: vi.fn().mockResolvedValue({
        data: [makeProperty()],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    });
    const controller = new PropertyController(repo);
    const req = makeReq({});
    const res = makeRes();

    await controller.list(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.total).toBe(1);
    expect(body.data[0].name).toBe('Maple Court');
    expect(body.data[0].fullAddress).toContain('Madison');
  });
});

describe('PropertyController.get', () => {
  it('returns the serialized property when found', async () => {
    const property = makeProperty();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(property) });
    const controller = new PropertyController(repo);
    const res = makeRes();

    await controller.get(makeReq({ params: { id: property.id } }), res);

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].id).toBe(property.id);
  });

  it('throws NotFoundError when the property is missing', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new PropertyController(repo);

    await expect(
      controller.get(makeReq({ params: { id: 'prop-missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('PropertyController.create', () => {
  it('persists a new property and returns 201', async () => {
    const repo = makeRepo({
      create: vi.fn().mockImplementation(async (p: Property) => p),
    });
    const controller = new PropertyController(repo);
    const res = makeRes();
    const req = makeReq({
      body: {
        name: 'New Place',
        addressLine1: '1 Main St',
        city: 'Madison',
        state: 'WI',
        postalCode: '53703',
        propertyType: 'SINGLE_FAMILY',
      },
    });

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].name).toBe('New Place');
  });

  it('throws when the body fails Zod validation', async () => {
    const repo = makeRepo();
    const controller = new PropertyController(repo);
    const req = makeReq({ body: { name: '' } });

    await expect(controller.create(req, makeRes())).rejects.toThrow();
  });
});

describe('PropertyController.update', () => {
  it('throws NotFoundError when the property does not exist', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new PropertyController(repo);

    await expect(
      controller.update(
        makeReq({ params: { id: 'prop-missing' }, body: { name: 'New' } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('renames the property and returns the updated payload', async () => {
    const property = makeProperty();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(property),
      update: vi.fn().mockImplementation(async (p: Property) => p),
    });
    const controller = new PropertyController(repo);
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: property.id }, body: { name: 'Renamed' } }),
      res,
    );

    expect(res.json.mock.calls[0][0].name).toBe('Renamed');
    expect((repo.update as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('PropertyController.remove', () => {
  it('returns 204 on success', async () => {
    const repo = makeRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new PropertyController(repo);
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 'prop-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
