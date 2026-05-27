import { Request, Response } from 'express';
import {
  LeaseRepository,
  MaintenanceTicketRepository,
  PropertyRepository,
  TenantRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import {
  MaintenanceAgingReport,
  OccupancyReport,
  PnLReport,
  RentRollReport,
} from '../reports';
import {
  maintenanceAgingQuerySchema,
  occupancyQuerySchema,
  pnlQuerySchema,
  rentRollQuerySchema,
} from '../schemas';

function startOfCurrentYearUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

export class ReportsController {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly tenants: TenantRepository,
    private readonly leases: LeaseRepository,
    private readonly transactions: TransactionRepository,
    private readonly maintenanceTickets: MaintenanceTicketRepository,
  ) {}

  public rentRoll = async (req: Request, res: Response): Promise<void> => {
    const query = rentRollQuerySchema.parse(req.query);
    const report = new RentRollReport(
      this.properties,
      this.units,
      this.tenants,
      this.leases,
      {
        ownerId: req.user!.id,
        propertyId: query.propertyId,
        asOf: query.asOf,
      },
    );
    await report.generate();
    res.json(report.toJSON());
  };

  public pnl = async (req: Request, res: Response): Promise<void> => {
    const query = pnlQuerySchema.parse(req.query);
    const report = new PnLReport(this.transactions, {
      ownerId: req.user!.id,
      propertyId: query.propertyId,
      dateFrom: query.dateFrom ?? startOfCurrentYearUtc(),
      dateTo: query.dateTo ?? new Date(),
    });
    await report.generate();
    res.json(report.toJSON());
  };

  public occupancy = async (req: Request, res: Response): Promise<void> => {
    const query = occupancyQuerySchema.parse(req.query);
    const report = new OccupancyReport(this.properties, this.units, this.leases, {
      ownerId: req.user!.id,
      propertyId: query.propertyId,
      asOf: query.asOf,
    });
    await report.generate();
    res.json(report.toJSON());
  };

  public maintenanceAging = async (req: Request, res: Response): Promise<void> => {
    const query = maintenanceAgingQuerySchema.parse(req.query);
    const report = new MaintenanceAgingReport(
      this.maintenanceTickets,
      this.properties,
      this.units,
      {
        ownerId: req.user!.id,
        propertyId: query.propertyId,
        asOf: query.asOf,
      },
    );
    await report.generate();
    res.json(report.toJSON());
  };
}
