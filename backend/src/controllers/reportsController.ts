import { Request, Response } from 'express';
import {
  LeaseRepository,
  PropertyRepository,
  TenantRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import { PnLReport, RentRollReport } from '../reports';
import { pnlQuerySchema, rentRollQuerySchema } from '../schemas';

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
}
