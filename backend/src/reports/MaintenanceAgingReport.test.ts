import { describe, expect, it, vi } from 'vitest';
import { MaintenanceAgingReport } from './MaintenanceAgingReport';
import { Property } from '../domain/Property';
import { Unit } from '../domain/Unit';
import { MaintenanceTicket } from '../domain/MaintenanceTicket';
import type {
  MaintenanceTicketRepository,
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

function daysAgo(n: number, from: Date): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

describe('MaintenanceAgingReport.generate', () => {
  const asOf = new Date('2026-06-01T00:00:00Z');
  const property = Property.create({
    ownerId: OWNER,
    name: 'Maple',
    addressLine1: '1 Maple',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
  const unit = Unit.create({
    propertyId: property.id,
    label: 'A1',
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: null,
    marketRent: 1000,
  });

  function ticketAged(days: number, status: 'OPEN' | 'IN_PROGRESS' = 'OPEN') {
    return MaintenanceTicket.create({
      propertyId: property.id,
      unitId: unit.id,
      title: `${days}d ticket`,
      description: 'desc',
      status,
      priority: 'MEDIUM',
      reportedAt: daysAgo(days, asOf),
      resolvedAt: null,
    });
  }

  it('places each ticket in the correct aging bucket', async () => {
    const tickets = [
      ticketAged(3),
      ticketAged(15),
      ticketAged(45),
      ticketAged(75),
    ];
    const report = new MaintenanceAgingReport(
      makeStubRepo(tickets) as MaintenanceTicketRepository,
      makeStubRepo([property]) as PropertyRepository,
      makeStubRepo([unit]) as UnitRepository,
      { ownerId: OWNER, asOf },
    );
    await report.generate();
    expect(report.rows).toHaveLength(4);
    // sorted age desc
    expect(report.rows[0].ageDays).toBe(75);
    expect(report.rows[0].bucket).toBe('61+ days');
    expect(report.rows[1].bucket).toBe('31-60 days');
    expect(report.rows[2].bucket).toBe('8-30 days');
    expect(report.rows[3].bucket).toBe('0-7 days');
  });

  it('returns no rows when there are no open tickets', async () => {
    const report = new MaintenanceAgingReport(
      makeStubRepo([]) as MaintenanceTicketRepository,
      makeStubRepo([property]) as PropertyRepository,
      makeStubRepo([unit]) as UnitRepository,
      { ownerId: OWNER, asOf },
    );
    await report.generate();
    expect(report.rows).toHaveLength(0);
  });

  it('sorts within the same age bucket by priority', async () => {
    const high = MaintenanceTicket.create({
      propertyId: property.id,
      unitId: unit.id,
      title: 'high',
      description: 'desc',
      status: 'OPEN',
      priority: 'HIGH',
      reportedAt: daysAgo(5, asOf),
      resolvedAt: null,
    });
    const low = MaintenanceTicket.create({
      propertyId: property.id,
      unitId: unit.id,
      title: 'low',
      description: 'desc',
      status: 'OPEN',
      priority: 'LOW',
      reportedAt: daysAgo(5, asOf),
      resolvedAt: null,
    });
    const report = new MaintenanceAgingReport(
      makeStubRepo([low, high]) as MaintenanceTicketRepository,
      makeStubRepo([property]) as PropertyRepository,
      makeStubRepo([unit]) as UnitRepository,
      { ownerId: OWNER, asOf },
    );
    await report.generate();
    expect(report.rows[0].title).toBe('high');
    expect(report.rows[1].title).toBe('low');
  });
});
