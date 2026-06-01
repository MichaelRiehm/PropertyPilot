import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { TransactionController } from './transactionController';
import { Lease, Property, Transaction, Unit } from '../domain';
import { NotFoundError } from '../errors';
import type {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';

function makeTxRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as TransactionRepository;
}

function makePropertyRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as PropertyRepository;
}

function makeUnitRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as UnitRepository;
}

function makeLeaseRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as LeaseRepository;
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
  body?: unknown;
  query?: Record<string, unknown>;
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

function makeUnit(): Unit {
  return Unit.create({
    propertyId: 'prop-1',
    label: 'A',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    marketRent: 1200,
  });
}

function makeLease(): Lease {
  return Lease.create({
    unitId: 'unit-1',
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
  });
}

function makeTransaction(): Transaction {
  return Transaction.create({
    propertyId: 'prop-1',
    unitId: 'unit-1',
    leaseId: 'lease-1',
    type: 'RENT_INCOME',
    category: null,
    amount: 1500,
    date: new Date('2026-05-01'),
    description: 'May rent',
  });
}

describe('TransactionController.get', () => {
  it('returns serialized transaction when found', async () => {
    const tx = makeTransaction();
    const repo = makeTxRepo({ findById: vi.fn().mockResolvedValue(tx) });
    const controller = new TransactionController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
      makeLeaseRepo(),
    );
    const res = makeRes();

    await controller.get(makeReq({ params: { id: tx.id } }), res);

    const body = res.json.mock.calls[0][0];
    expect(body.id).toBe(tx.id);
    expect(body.isIncome).toBe(true);
    expect(body.signedAmount).toBe(1500);
  });

  it('throws NotFoundError when missing', async () => {
    const repo = makeTxRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TransactionController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
      makeLeaseRepo(),
    );

    await expect(
      controller.get(makeReq({ params: { id: 'missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TransactionController.create', () => {
  it('verifies the property, unit, and lease before creating', async () => {
    const property = makeProperty();
    const unit = makeUnit();
    const lease = makeLease();
    const properties = makePropertyRepo({
      findById: vi.fn().mockResolvedValue(property),
    });
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(unit) });
    const leases = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(lease) });
    const txRepo = makeTxRepo({
      create: vi.fn().mockImplementation(async (t: Transaction) => t),
    });
    const controller = new TransactionController(txRepo, properties, units, leases);
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          propertyId: property.id,
          unitId: unit.id,
          leaseId: lease.id,
          type: 'RENT_INCOME',
          amount: 1500,
          date: '2026-05-01',
          description: 'May rent',
        },
      }),
      res,
    );

    expect(properties.findById).toHaveBeenCalled();
    expect(units.findById).toHaveBeenCalled();
    expect(leases.findById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws NotFoundError when the property is not owned by the user', async () => {
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TransactionController(
      makeTxRepo(),
      properties,
      makeUnitRepo(),
      makeLeaseRepo(),
    );

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'p-x',
            type: 'EXPENSE',
            amount: 100,
            date: '2026-05-01',
            description: 'Repair',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when an attached unit is not owned by the user', async () => {
    const properties = makePropertyRepo({ findById: vi.fn().mockResolvedValue(makeProperty()) });
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TransactionController(
      makeTxRepo(),
      properties,
      units,
      makeLeaseRepo(),
    );

    await expect(
      controller.create(
        makeReq({
          body: {
            propertyId: 'prop-1',
            unitId: 'u-x',
            type: 'EXPENSE',
            amount: 100,
            date: '2026-05-01',
            description: 'Repair',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TransactionController.update', () => {
  it('throws NotFoundError when missing', async () => {
    const repo = makeTxRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new TransactionController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
      makeLeaseRepo(),
    );

    await expect(
      controller.update(
        makeReq({ params: { id: 'tx-x' }, body: { amount: 2000 } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates amount and returns the payload', async () => {
    const tx = makeTransaction();
    const repo = makeTxRepo({
      findById: vi.fn().mockResolvedValue(tx),
      update: vi.fn().mockImplementation(async (t: Transaction) => t),
    });
    const controller = new TransactionController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
      makeLeaseRepo(),
    );
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: tx.id }, body: { amount: 2000 } }),
      res,
    );

    expect(res.json.mock.calls[0][0].amount).toBe(2000);
  });
});

describe('TransactionController.remove', () => {
  it('returns 204', async () => {
    const repo = makeTxRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new TransactionController(
      repo,
      makePropertyRepo(),
      makeUnitRepo(),
      makeLeaseRepo(),
    );
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 'tx-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});
