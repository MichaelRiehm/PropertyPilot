import { describe, expect, it, vi } from 'vitest';
import { RentRollReport } from './RentRollReport';
import { Property } from '../domain/Property';
import { Unit } from '../domain/Unit';
import { Tenant } from '../domain/Tenant';
import { Lease } from '../domain/Lease';
import type {
  LeaseRepository,
  PropertyRepository,
  TenantRepository,
  UnitRepository,
} from '../repositories';

function makePaginated<T>(items: T[]) {
  return { data: items, total: items.length, page: 1, pageSize: 200, totalPages: 1 };
}

function makeStubRepo<T>(items: T[]): unknown {
  return {
    list: vi.fn().mockResolvedValue(makePaginated(items)),
    findById: vi.fn(),
  };
}

const OWNER = 'owner-1';

function buildScenario() {
  const property = Property.create({
    ownerId: OWNER,
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
  const otherProperty = Property.create({
    ownerId: OWNER,
    name: 'Pine Condo',
    addressLine1: '702 Pine',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53704',
    propertyType: 'CONDO',
  });
  const unit1 = Unit.create({
    propertyId: property.id,
    label: 'Apt 1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    marketRent: 1500,
  });
  const unit2 = Unit.create({
    propertyId: otherProperty.id,
    label: 'Suite A',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1400,
    marketRent: 1850,
  });
  const tenant1 = Tenant.create({
    ownerId: OWNER,
    firstName: 'Sam',
    lastName: 'Smith',
    email: 'sam@example.com',
    phone: null,
  });
  const tenant2 = Tenant.create({
    ownerId: OWNER,
    firstName: 'Pat',
    lastName: 'Romero',
    email: 'pat@example.com',
    phone: null,
  });
  const lease1 = Lease.create({
    unitId: unit1.id,
    tenantId: tenant1.id,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
  });
  const lease2 = Lease.create({
    unitId: unit2.id,
    tenantId: tenant2.id,
    startDate: new Date('2025-06-01'),
    endDate: new Date('2026-06-01'),
    monthlyRent: 1850,
    securityDeposit: 1850,
    status: 'ACTIVE',
    documentLink: null,
  });
  return { property, otherProperty, unit1, unit2, tenant1, tenant2, lease1, lease2 };
}

describe('RentRollReport.generate', () => {
  it('produces one row per lease with property, unit, and tenant joined in', async () => {
    const s = buildScenario();
    const report = new RentRollReport(
      makeStubRepo([s.property, s.otherProperty]) as PropertyRepository,
      makeStubRepo([s.unit1, s.unit2]) as UnitRepository,
      makeStubRepo([s.tenant1, s.tenant2]) as TenantRepository,
      makeStubRepo([s.lease1, s.lease2]) as LeaseRepository,
      { ownerId: OWNER },
    );
    await report.generate();
    expect(report.rows).toHaveLength(2);
    const first = report.rows[0];
    expect(first.property).toBeDefined();
    expect(first.tenant).toBeDefined();
    expect(first.monthlyRent).toBeGreaterThan(0);
  });

  it('filters to a single property when propertyId is set', async () => {
    const s = buildScenario();
    const report = new RentRollReport(
      makeStubRepo([s.property, s.otherProperty]) as PropertyRepository,
      makeStubRepo([s.unit1, s.unit2]) as UnitRepository,
      makeStubRepo([s.tenant1, s.tenant2]) as TenantRepository,
      makeStubRepo([s.lease1, s.lease2]) as LeaseRepository,
      { ownerId: OWNER, propertyId: s.property.id },
    );
    await report.generate();
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].property).toBe('Maple Court');
  });

  it('respects an asOf date by excluding leases not covering that date', async () => {
    const s = buildScenario();
    const report = new RentRollReport(
      makeStubRepo([s.property, s.otherProperty]) as PropertyRepository,
      makeStubRepo([s.unit1, s.unit2]) as UnitRepository,
      makeStubRepo([s.tenant1, s.tenant2]) as TenantRepository,
      makeStubRepo([s.lease1, s.lease2]) as LeaseRepository,
      { ownerId: OWNER, asOf: new Date('2026-12-01') },
    );
    await report.generate();
    // lease2 ended 2026-06-01, lease1 ends 2027-01-01 — only lease1 covers Dec 2026
    expect(report.rows).toHaveLength(1);
  });

  it('sets title, generatedAt, and toJSON shape', async () => {
    const s = buildScenario();
    const report = new RentRollReport(
      makeStubRepo([s.property]) as PropertyRepository,
      makeStubRepo([s.unit1]) as UnitRepository,
      makeStubRepo([s.tenant1]) as TenantRepository,
      makeStubRepo([s.lease1]) as LeaseRepository,
      { ownerId: OWNER },
    );
    await report.generate();
    expect(report.title).toBe('Rent Roll');
    expect(report.generatedAt).toBeInstanceOf(Date);
    const json = report.toJSON();
    expect(json.title).toBe('Rent Roll');
    expect(Array.isArray(json.columns)).toBe(true);
    expect(Array.isArray(json.rows)).toBe(true);
    expect(typeof json.generatedAt).toBe('string');
  });
});
