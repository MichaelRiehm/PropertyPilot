import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { UnitController } from './unitController';
import { Property, Unit } from '../domain';
import { NotFoundError } from '../errors';
import type { PropertyRepository, UnitRepository } from '../repositories';

function makeUnitRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as UnitRepository;
}

function makePropertyRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    ...overrides,
  } as unknown as PropertyRepository;
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

function makeProperty(): Property {
  return Property.create({
    ownerId: 'owner-1',
    name: 'P',
    addressLine1: '1 Main',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
}

function makeUnit(propertyId = 'prop-1'): Unit {
  return Unit.create({
    propertyId,
    label: 'A',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    marketRent: 1200,
  });
}

describe('UnitController.get', () => {
  it('returns the unit when found', async () => {
    const unit = makeUnit();
    const repo = makeUnitRepo({ findById: vi.fn().mockResolvedValue(unit) });
    const controller = new UnitController(repo, makePropertyRepo());
    const res = makeRes();

    await controller.get(makeReq({ params: { id: unit.id } }), res);

    expect(res.json.mock.calls[0][0].id).toBe(unit.id);
  });

  it('throws NotFoundError when missing', async () => {
    const repo = makeUnitRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new UnitController(repo, makePropertyRepo());

    await expect(
      controller.get(makeReq({ params: { id: 'unit-missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UnitController.create', () => {
  it('verifies the parent property belongs to the user before creating', async () => {
    const property = makeProperty();
    const properties = makePropertyRepo({
      findById: vi.fn().mockResolvedValue(property),
    });
    const units = makeUnitRepo({
      create: vi.fn().mockImplementation(async (u: Unit) => u),
    });
    const controller = new UnitController(units, properties);
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          propertyId: property.id,
          label: 'A',
          bedrooms: 2,
          bathrooms: 1,
          marketRent: 1200,
        },
      }),
      res,
    );

    expect(properties.findById).toHaveBeenCalledWith(property.id, 'owner-1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws NotFoundError when the parent property does not belong to the user', async () => {
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(null) });
    const units = makeUnitRepo();
    const controller = new UnitController(units, properties);

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'someone-elses-prop',
            label: 'A',
            bedrooms: 2,
            bathrooms: 1,
            marketRent: 1200,
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(units.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid body with a Zod error', async () => {
    const controller = new UnitController(makeUnitRepo(), makePropertyRepo());
    await expect(
      controller.create(makeReq({ body: { propertyId: 'p', label: '' } }), makeRes()),
    ).rejects.toThrow();
  });
});

describe('UnitController.update', () => {
  it('throws NotFoundError when the unit is missing', async () => {
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new UnitController(units, makePropertyRepo());

    await expect(
      controller.update(
        makeReq({ params: { id: 'unit-x' }, body: { marketRent: 1500 } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates market rent and returns the updated payload', async () => {
    const unit = makeUnit();
    const units = makeUnitRepo({
      findById: vi.fn().mockResolvedValue(unit),
      update: vi.fn().mockImplementation(async (u: Unit) => u),
    });
    const controller = new UnitController(units, makePropertyRepo());
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: unit.id }, body: { marketRent: 1500 } }),
      res,
    );

    expect(res.json.mock.calls[0][0].marketRent).toBe(1500);
  });
});

describe('UnitController.remove', () => {
  it('returns 204 on success', async () => {
    const units = makeUnitRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new UnitController(units, makePropertyRepo());
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 'unit-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});
