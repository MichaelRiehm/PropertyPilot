import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { DashboardController } from './dashboardController';
import { Lease, Property, Transaction, Unit, MaintenanceTicket } from '../domain';
import type {
  LeaseRepository,
  MaintenanceTicketRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';

function paginated<T>(rows: T[], total = rows.length, pageSize = 200) {
  return { data: rows, total, page: 1, pageSize, totalPages: 1 };
}

function makeRes() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

function makeReq(): Request {
  return { user: { id: 'owner-1', email: 'owner@example.com' } } as unknown as Request;
}

function makeProperty(id = 'prop-1', name = 'Maple Court'): Property {
  return new Property({
    id,
    ownerId: 'owner-1',
    name,
    addressLine1: '1 Main',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function activeLease(unitId: string): Lease {
  return new Lease({
    id: `lease-${unitId}`,
    unitId,
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function rentTx(amount: number): Transaction {
  return new Transaction({
    id: `tx-${amount}-rent`,
    propertyId: 'prop-1',
    unitId: 'unit-1',
    leaseId: 'lease-1',
    type: 'RENT_INCOME',
    category: null,
    amount,
    date: new Date('2026-03-01'),
    description: 'Rent',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function expenseTx(amount: number): Transaction {
  return new Transaction({
    id: `tx-${amount}-exp`,
    propertyId: 'prop-1',
    unitId: null,
    leaseId: null,
    type: 'EXPENSE',
    category: 'Repairs',
    amount,
    date: new Date('2026-03-15'),
    description: 'Repair',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function ticket(status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED'): MaintenanceTicket {
  return new MaintenanceTicket({
    id: `mt-${status}`,
    propertyId: 'prop-1',
    unitId: null,
    title: 'Leak',
    description: 'Drip',
    status,
    priority: 'MEDIUM',
    reportedAt: new Date('2026-04-01'),
    resolvedAt: status === 'CLOSED' || status === 'CANCELED' ? new Date('2026-04-05') : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('DashboardController.summary', () => {
  it('aggregates property/unit counts, occupancy, YTD totals, and ticket statuses', async () => {
    const properties = {
      list: vi.fn().mockResolvedValue(paginated([makeProperty()], 1)),
    } as unknown as PropertyRepository;

    const units = {
      list: vi.fn().mockResolvedValue(
        paginated(
          [
            new Unit({
              id: 'unit-1',
              propertyId: 'prop-1',
              label: 'A',
              bedrooms: 2,
              bathrooms: 1,
              squareFeet: 800,
              marketRent: 1200,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
            new Unit({
              id: 'unit-2',
              propertyId: 'prop-1',
              label: 'B',
              bedrooms: 1,
              bathrooms: 1,
              squareFeet: 600,
              marketRent: 900,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          ],
          2,
        ),
      ),
    } as unknown as UnitRepository;

    const leases = {
      list: vi.fn().mockResolvedValue(paginated([activeLease('unit-1')], 1)),
    } as unknown as LeaseRepository;

    let txCall = 0;
    const transactions = {
      list: vi.fn().mockImplementation(async () => {
        txCall += 1;
        if (txCall === 1) return paginated([rentTx(1500), rentTx(1500)], 2, 500);
        if (txCall === 2) return paginated([expenseTx(500)], 1, 500);
        return paginated([rentTx(1500), expenseTx(500)], 2, 10);
      }),
    } as unknown as TransactionRepository;

    const maintenanceTickets = {
      list: vi.fn().mockResolvedValue(
        paginated([ticket('OPEN'), ticket('IN_PROGRESS'), ticket('CLOSED')], 3),
      ),
    } as unknown as MaintenanceTicketRepository;

    const controller = new DashboardController(
      properties,
      units,
      leases,
      transactions,
      maintenanceTickets,
    );
    const res = makeRes();

    await controller.summary(makeReq(), res);

    const body = res.json.mock.calls[0][0];
    expect(body.totalProperties).toBe(1);
    expect(body.totalUnits).toBe(2);
    expect(body.occupiedUnits).toBe(1);
    expect(body.totalActiveLeases).toBe(1);
    expect(body.ytdRentCollected).toBe(3000);
    expect(body.ytdExpenses).toBe(500);
    expect(body.maintenanceTicketsByStatus).toEqual({
      OPEN: 1,
      IN_PROGRESS: 1,
      CLOSED: 1,
      CANCELED: 0,
    });
    expect(body.recentTransactions).toHaveLength(2);
    expect(body.recentTransactions[0].propertyName).toBe('Maple Court');
  });
});
