import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CashFlowForecaster } from './CashFlowForecaster';
import { Property } from '../domain/Property';
import { Unit } from '../domain/Unit';
import { Lease } from '../domain/Lease';
import { Transaction } from '../domain/Transaction';
import type {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import { NotFoundError } from '../errors';

const OWNER = 'owner-1';

function makePaginated<T>(items: T[]) {
  return { data: items, total: items.length, page: 1, pageSize: 200, totalPages: 1 };
}

function buildProperty(): Property {
  return Property.create({
    ownerId: OWNER,
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
}

function buildUnit(propertyId: string): Unit {
  return Unit.create({
    propertyId,
    label: 'A1',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    marketRent: 1500,
  });
}

interface Stubs {
  propertyRepo: PropertyRepository;
  unitRepo: UnitRepository;
  leaseRepo: LeaseRepository;
  transactionRepo: TransactionRepository;
}

function buildStubs(opts: {
  property: Property | null;
  units: Unit[];
  leases: Lease[];
  expenses: Transaction[];
}): Stubs {
  return {
    propertyRepo: {
      findById: vi.fn().mockResolvedValue(opts.property),
      list: vi.fn().mockResolvedValue(makePaginated(opts.property ? [opts.property] : [])),
    } as unknown as PropertyRepository,
    unitRepo: {
      list: vi.fn().mockResolvedValue(makePaginated(opts.units)),
    } as unknown as UnitRepository,
    leaseRepo: {
      list: vi.fn().mockResolvedValue(makePaginated(opts.leases)),
    } as unknown as LeaseRepository,
    transactionRepo: {
      list: vi.fn().mockResolvedValue(makePaginated(opts.expenses)),
    } as unknown as TransactionRepository,
  };
}

describe('CashFlowForecaster.forecast', () => {
  beforeEach(() => {
    // Freeze the clock at May 1, 2026 so projections are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws NotFoundError when the property is not owned', async () => {
    const stubs = buildStubs({ property: null, units: [], leases: [], expenses: [] });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: 'missing' },
    );
    await expect(f.forecast()).rejects.toBeInstanceOf(NotFoundError);
  });

  it('produces 12 monthly projections by default', async () => {
    const property = buildProperty();
    const stubs = buildStubs({ property, units: [], leases: [], expenses: [] });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    expect(result.projections).toHaveLength(12);
    expect(result.monthsAhead).toBe(12);
  });

  it('keeps income constant for the full window when a lease covers every month', async () => {
    const property = buildProperty();
    const unit = buildUnit(property.id);
    const lease = Lease.create({
      unitId: unit.id,
      tenantId: 'tenant-1',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2028-12-31'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
      documentLink: null,
    });
    const stubs = buildStubs({
      property,
      units: [unit],
      leases: [lease],
      expenses: [],
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    expect(result.projections.every((p) => p.income === 1500)).toBe(true);
  });

  it('drops income to zero once the lease ends', async () => {
    const property = buildProperty();
    const unit = buildUnit(property.id);
    const lease = Lease.create({
      unitId: unit.id,
      tenantId: 'tenant-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-08-31'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
      documentLink: null,
    });
    const stubs = buildStubs({
      property,
      units: [unit],
      leases: [lease],
      expenses: [],
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    const byMonth = new Map(result.projections.map((p) => [p.month, p.income]));
    // Forecast starts May 2026.
    expect(byMonth.get('2026-05')).toBe(1500);
    expect(byMonth.get('2026-08')).toBe(1500);
    expect(byMonth.get('2026-09')).toBe(0);
    expect(byMonth.get('2027-04')).toBe(0);
  });

  it('starts income at zero when the lease begins mid-forecast', async () => {
    const property = buildProperty();
    const unit = buildUnit(property.id);
    const lease = Lease.create({
      unitId: unit.id,
      tenantId: 'tenant-1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-12-31'),
      monthlyRent: 1200,
      securityDeposit: 1200,
      status: 'ACTIVE',
      documentLink: null,
    });
    const stubs = buildStubs({
      property,
      units: [unit],
      leases: [lease],
      expenses: [],
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    const byMonth = new Map(result.projections.map((p) => [p.month, p.income]));
    expect(byMonth.get('2026-05')).toBe(0);
    expect(byMonth.get('2026-07')).toBe(0);
    expect(byMonth.get('2026-08')).toBe(1200);
    expect(byMonth.get('2027-04')).toBe(1200);
  });

  it('computes the baseline expense as the trailing average', async () => {
    const property = buildProperty();
    // 6 trailing months, total $1800 → baseline $300/mo.
    const expenses = [
      Transaction.create({
        propertyId: property.id,
        unitId: null,
        leaseId: null,
        type: 'EXPENSE',
        category: null,
        amount: 600,
        date: new Date('2026-02-15'),
        description: 'repair',
      }),
      Transaction.create({
        propertyId: property.id,
        unitId: null,
        leaseId: null,
        type: 'EXPENSE',
        category: null,
        amount: 1200,
        date: new Date('2026-03-10'),
        description: 'roof',
      }),
    ];
    const stubs = buildStubs({
      property,
      units: [],
      leases: [],
      expenses,
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    expect(result.baselineMonthlyExpense).toBe(300);
    expect(result.projections.every((p) => p.expenses === 300)).toBe(true);
  });

  it('flags months where expenses exceed income', async () => {
    const property = buildProperty();
    const expenses = [
      Transaction.create({
        propertyId: property.id,
        unitId: null,
        leaseId: null,
        type: 'EXPENSE',
        category: null,
        amount: 1800,
        date: new Date('2026-02-15'),
        description: 'big repair',
      }),
    ];
    const stubs = buildStubs({
      property,
      units: [],
      leases: [],
      expenses,
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    // Income is zero (no leases); baseline expense $300 > $0.
    expect(result.projections.every((p) => p.expensesExceedIncome)).toBe(true);
    expect(result.projections.every((p) => p.net < 0)).toBe(true);
  });

  it('ignores leases on units that do not belong to the target property', async () => {
    const property = buildProperty();
    const unit = buildUnit(property.id);
    const otherUnitId = 'other-unit-from-another-property';
    const ourLease = Lease.create({
      unitId: unit.id,
      tenantId: 'tenant-1',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2028-01-01'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
      documentLink: null,
    });
    const noiseLease = Lease.create({
      unitId: otherUnitId,
      tenantId: 'tenant-2',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2028-01-01'),
      monthlyRent: 9999,
      securityDeposit: 0,
      status: 'ACTIVE',
      documentLink: null,
    });
    const stubs = buildStubs({
      property,
      units: [unit],
      leases: [ourLease, noiseLease],
      expenses: [],
    });
    const f = new CashFlowForecaster(
      stubs.propertyRepo,
      stubs.unitRepo,
      stubs.leaseRepo,
      stubs.transactionRepo,
      { ownerId: OWNER, propertyId: property.id },
    );
    const result = await f.forecast();
    expect(result.projections.every((p) => p.income === 1500)).toBe(true);
  });
});
