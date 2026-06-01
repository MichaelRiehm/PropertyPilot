import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { LeaseController } from './leaseController';
import { Lease, Tenant, Unit } from '../domain';
import { NotFoundError } from '../errors';
import type {
  LeaseRepository,
  TenantRepository,
  UnitRepository,
} from '../repositories';

function makeLeaseRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as unknown as LeaseRepository;
}

function makeUnitRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as UnitRepository;
}

function makeTenantRepo(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return { findById: vi.fn(), ...overrides } as unknown as TenantRepository;
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

function makeTenant(): Tenant {
  return Tenant.create({
    ownerId: 'owner-1',
    firstName: 'Avery',
    lastName: 'Lee',
    email: 'avery@example.com',
    phone: null,
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

describe('LeaseController.get', () => {
  it('returns lease when found', async () => {
    const lease = makeLease();
    const repo = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(lease) });
    const controller = new LeaseController(repo, makeUnitRepo(), makeTenantRepo());
    const res = makeRes();

    await controller.get(makeReq({ params: { id: lease.id } }), res);

    expect(res.json.mock.calls[0][0].id).toBe(lease.id);
  });

  it('throws NotFoundError when missing', async () => {
    const repo = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new LeaseController(repo, makeUnitRepo(), makeTenantRepo());

    await expect(
      controller.get(makeReq({ params: { id: 'l-missing' } }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('LeaseController.create', () => {
  it('verifies the unit and tenant before creating', async () => {
    const unit = makeUnit();
    const tenant = makeTenant();
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(unit) });
    const tenants = makeTenantRepo({ findById: vi.fn().mockResolvedValue(tenant) });
    const leases = makeLeaseRepo({
      create: vi.fn().mockImplementation(async (l: Lease) => l),
    });
    const controller = new LeaseController(leases, units, tenants);
    const res = makeRes();

    await controller.create(
      makeReq({
        body: {
          unitId: unit.id,
          tenantId: tenant.id,
          startDate: '2026-01-01',
          endDate: '2027-01-01',
          monthlyRent: 1500,
          securityDeposit: 1500,
          status: 'ACTIVE',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(units.findById).toHaveBeenCalledWith(unit.id, 'owner-1');
    expect(tenants.findById).toHaveBeenCalledWith(tenant.id, 'owner-1');
  });

  it('throws NotFoundError when unit is not owned by user', async () => {
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(null) });
    const tenants = makeTenantRepo();
    const leases = makeLeaseRepo();
    const controller = new LeaseController(leases, units, tenants);

    await expect(
      controller.create(
        makeReq({
          body: {
            unitId: 'unit-x',
            tenantId: 'tenant-1',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            monthlyRent: 1500,
            securityDeposit: 1500,
            status: 'ACTIVE',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leases.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when tenant is not owned by user', async () => {
    const units = makeUnitRepo({ findById: vi.fn().mockResolvedValue(makeUnit()) });
    const tenants = makeTenantRepo({ findById: vi.fn().mockResolvedValue(null) });
    const leases = makeLeaseRepo();
    const controller = new LeaseController(leases, units, tenants);

    await expect(
      controller.create(
        makeReq({
          body: {
            unitId: 'unit-1',
            tenantId: 'tenant-x',
            startDate: '2026-01-01',
            endDate: '2027-01-01',
            monthlyRent: 1500,
            securityDeposit: 1500,
            status: 'ACTIVE',
          },
        }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leases.create).not.toHaveBeenCalled();
  });
});

describe('LeaseController.update', () => {
  it('throws NotFoundError when lease is missing', async () => {
    const repo = makeLeaseRepo({ findById: vi.fn().mockResolvedValue(null) });
    const controller = new LeaseController(repo, makeUnitRepo(), makeTenantRepo());

    await expect(
      controller.update(
        makeReq({ params: { id: 'l-x' }, body: { status: 'TERMINATED' } }),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('terminates a lease and returns the updated payload', async () => {
    const lease = makeLease();
    const repo = makeLeaseRepo({
      findById: vi.fn().mockResolvedValue(lease),
      update: vi.fn().mockImplementation(async (l: Lease) => l),
    });
    const controller = new LeaseController(repo, makeUnitRepo(), makeTenantRepo());
    const res = makeRes();

    await controller.update(
      makeReq({ params: { id: lease.id }, body: { status: 'TERMINATED' } }),
      res,
    );

    expect(res.json.mock.calls[0][0].status).toBe('TERMINATED');
  });
});

describe('LeaseController.remove', () => {
  it('returns 204', async () => {
    const repo = makeLeaseRepo({ delete: vi.fn().mockResolvedValue(undefined) });
    const controller = new LeaseController(repo, makeUnitRepo(), makeTenantRepo());
    const res = makeRes();

    await controller.remove(makeReq({ params: { id: 'l-1' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});
