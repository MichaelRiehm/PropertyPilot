import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ReportsController } from './reportsController';
import type {
  LeaseRepository,
  MaintenanceTicketRepository,
  PropertyRepository,
  TenantRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';

function paginated<T>(rows: T[] = []) {
  return { data: rows, total: rows.length, page: 1, pageSize: 200, totalPages: 1 };
}

function emptyRepos() {
  const properties = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as PropertyRepository;
  const units = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as UnitRepository;
  const tenants = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as TenantRepository;
  const leases = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as LeaseRepository;
  const transactions = {
    list: vi.fn().mockResolvedValue(paginated()),
  } as unknown as TransactionRepository;
  const maintenanceTickets = {
    list: vi.fn().mockResolvedValue(paginated()),
  } as unknown as MaintenanceTicketRepository;
  return { properties, units, tenants, leases, transactions, maintenanceTickets };
}

function makeRes() {
  return { json: vi.fn().mockReturnThis() } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
  };
}

function makeReq(query: Record<string, unknown> = {}): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    query,
  } as unknown as Request;
}

describe('ReportsController.rentRoll', () => {
  it('returns a rent roll report JSON with the expected title', async () => {
    const { properties, units, tenants, leases, transactions, maintenanceTickets } = emptyRepos();
    const controller = new ReportsController(
      properties,
      units,
      tenants,
      leases,
      transactions,
      maintenanceTickets,
    );
    const res = makeRes();

    await controller.rentRoll(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Rent Roll');
    expect(Array.isArray(body.rows)).toBe(true);
  });
});

describe('ReportsController.pnl', () => {
  it('defaults dateFrom/dateTo to current year-to-date when omitted', async () => {
    const { properties, units, tenants, leases, transactions, maintenanceTickets } = emptyRepos();
    const controller = new ReportsController(
      properties,
      units,
      tenants,
      leases,
      transactions,
      maintenanceTickets,
    );
    const res = makeRes();

    await controller.pnl(makeReq(), res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Year-to-date Profit & Loss');
  });
});

describe('ReportsController.occupancy', () => {
  it('returns an occupancy report JSON', async () => {
    const { properties, units, tenants, leases, transactions, maintenanceTickets } = emptyRepos();
    const controller = new ReportsController(
      properties,
      units,
      tenants,
      leases,
      transactions,
      maintenanceTickets,
    );
    const res = makeRes();

    await controller.occupancy(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Occupancy');
  });
});

describe('ReportsController.maintenanceAging', () => {
  it('returns a maintenance aging report JSON', async () => {
    const { properties, units, tenants, leases, transactions, maintenanceTickets } = emptyRepos();
    const controller = new ReportsController(
      properties,
      units,
      tenants,
      leases,
      transactions,
      maintenanceTickets,
    );
    const res = makeRes();

    await controller.maintenanceAging(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.title).toBe('Maintenance Aging');
  });

  it('rejects an invalid asOf date with a Zod error', async () => {
    const { properties, units, tenants, leases, transactions, maintenanceTickets } = emptyRepos();
    const controller = new ReportsController(
      properties,
      units,
      tenants,
      leases,
      transactions,
      maintenanceTickets,
    );

    await expect(
      controller.maintenanceAging(makeReq({ asOf: 'not-a-date' }), makeRes()),
    ).rejects.toThrow();
  });
});
