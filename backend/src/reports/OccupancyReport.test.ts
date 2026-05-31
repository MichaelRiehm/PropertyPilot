import { describe, expect, it, vi } from 'vitest';
import { OccupancyReport } from './OccupancyReport';
import { Property } from '../domain/Property';
import { Unit } from '../domain/Unit';
import { Lease } from '../domain/Lease';
import type {
  LeaseRepository,
  PropertyRepository,
  UnitRepository,
} from '../repositories';

function makePaginated<T>(items: T[]) {
  return { data: items, total: items.length, page: 1, pageSize: 200, totalPages: 1 };
}

function makeStubRepo<T>(items: T[]): unknown {
  return {
    list: vi.fn().mockResolvedValue(makePaginated(items)),
  };
}

const OWNER = 'owner-1';

function buildScenario() {
  const propertyA = Property.create({
    ownerId: OWNER,
    name: 'Maple',
    addressLine1: '1 Maple',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
  const propertyB = Property.create({
    ownerId: OWNER,
    name: 'Pine',
    addressLine1: '2 Pine',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'CONDO',
  });
  const aUnit1 = Unit.create({
    propertyId: propertyA.id,
    label: 'A1',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    marketRent: 1000,
  });
  const aUnit2 = Unit.create({
    propertyId: propertyA.id,
    label: 'A2',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    marketRent: 1000,
  });
  const bUnit1 = Unit.create({
    propertyId: propertyB.id,
    label: 'B1',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    marketRent: 1500,
  });
  // Only A1 has an ACTIVE lease overlapping today.
  const lease = Lease.create({
    unitId: aUnit1.id,
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1000,
    securityDeposit: 1000,
    status: 'ACTIVE',
    documentLink: null,
  });
  return { propertyA, propertyB, aUnit1, aUnit2, bUnit1, lease };
}

describe('OccupancyReport.generate', () => {
  it('counts occupied and vacant units per property and appends a Total row', async () => {
    const s = buildScenario();
    const report = new OccupancyReport(
      makeStubRepo([s.propertyA, s.propertyB]) as PropertyRepository,
      makeStubRepo([s.aUnit1, s.aUnit2, s.bUnit1]) as UnitRepository,
      makeStubRepo([s.lease]) as LeaseRepository,
      { ownerId: OWNER, asOf: new Date('2026-06-01') },
    );
    await report.generate();
    // 2 properties + 1 Total row
    expect(report.rows).toHaveLength(3);
    const total = report.rows[2];
    expect(total.property).toBe('Total');
    expect(total.totalUnits).toBe(3);
    expect(total.occupiedUnits).toBe(1);
    expect(total.vacantUnits).toBe(2);
  });

  it('filters to a single property when propertyId is given', async () => {
    const s = buildScenario();
    const report = new OccupancyReport(
      makeStubRepo([s.propertyA, s.propertyB]) as PropertyRepository,
      makeStubRepo([s.aUnit1, s.aUnit2, s.bUnit1]) as UnitRepository,
      makeStubRepo([s.lease]) as LeaseRepository,
      { ownerId: OWNER, propertyId: s.propertyA.id, asOf: new Date('2026-06-01') },
    );
    await report.generate();
    // 1 property + 1 Total row
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0].property).toBe('Maple');
  });

  it('shows 0% occupancy when no leases overlap the asOf date', async () => {
    const s = buildScenario();
    const report = new OccupancyReport(
      makeStubRepo([s.propertyA, s.propertyB]) as PropertyRepository,
      makeStubRepo([s.aUnit1, s.aUnit2, s.bUnit1]) as UnitRepository,
      makeStubRepo([s.lease]) as LeaseRepository,
      { ownerId: OWNER, asOf: new Date('2028-01-01') },
    );
    await report.generate();
    const total = report.rows[report.rows.length - 1];
    expect(total.occupiedUnits).toBe(0);
    expect(total.occupancyRate).toBe('0%');
  });
});
