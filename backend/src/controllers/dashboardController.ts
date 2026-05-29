import { Request, Response } from 'express';
import {
  LeaseRepository,
  MaintenanceTicketRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import type { MaintenanceStatus } from '../domain';

function startOfCurrentYearUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

export class DashboardController {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly leases: LeaseRepository,
    private readonly transactions: TransactionRepository,
    private readonly maintenanceTickets: MaintenanceTicketRepository,
  ) {}

  public summary = async (req: Request, res: Response): Promise<void> => {
    const ownerId = req.user!.id;
    const now = new Date();
    const yearStart = startOfCurrentYearUtc();

    const [
      propertiesResult,
      unitsResult,
      activeLeasesResult,
      rentTransactions,
      expenseTransactions,
      recentTransactions,
      ticketsResult,
    ] = await Promise.all([
      this.properties.list({ ownerId, page: 1, pageSize: 200 }),
      this.units.list({ ownerId, page: 1, pageSize: 200 }),
      this.leases.list({ ownerId, status: 'ACTIVE', page: 1, pageSize: 200 }),
      this.transactions.list({
        ownerId,
        type: 'RENT_INCOME',
        dateFrom: yearStart,
        dateTo: now,
        page: 1,
        pageSize: 500,
      }),
      this.transactions.list({
        ownerId,
        type: 'EXPENSE',
        dateFrom: yearStart,
        dateTo: now,
        page: 1,
        pageSize: 500,
      }),
      this.transactions.list({ ownerId, page: 1, pageSize: 10 }),
      this.maintenanceTickets.list({ ownerId, page: 1, pageSize: 200 }),
    ]);

    const occupiedUnitIds = new Set<string>();
    for (const lease of activeLeasesResult.data) {
      if (lease.startDate <= now && lease.endDate >= now) {
        occupiedUnitIds.add(lease.unitId);
      }
    }

    const ytdRentCollected = rentTransactions.data.reduce((sum, t) => sum + t.amount, 0);
    const ytdExpenses = expenseTransactions.data.reduce((sum, t) => sum + t.amount, 0);

    const propertyNameById = new Map(
      propertiesResult.data.map((p) => [p.id, p.name]),
    );

    const recentTransactionsView = recentTransactions.data.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      type: t.type,
      category: t.category,
      amount: t.amount,
      signedAmount: t.signedAmount(),
      isIncome: t.isIncome(),
      description: t.description,
      propertyId: t.propertyId,
      propertyName: propertyNameById.get(t.propertyId) ?? 'Unknown property',
    }));

    const statusCounts: Record<MaintenanceStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      CLOSED: 0,
      CANCELED: 0,
    };
    for (const ticket of ticketsResult.data) {
      statusCounts[ticket.status] += 1;
    }

    res.json({
      generatedAt: now.toISOString(),
      totalProperties: propertiesResult.total,
      totalUnits: unitsResult.total,
      occupiedUnits: occupiedUnitIds.size,
      totalActiveLeases: activeLeasesResult.total,
      ytdRentCollected,
      ytdExpenses,
      recentTransactions: recentTransactionsView,
      maintenanceTicketsByStatus: statusCounts,
    });
  };
}
