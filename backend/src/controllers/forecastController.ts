import { Request, Response } from 'express';
import {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import { CashFlowForecaster } from '../forecast';
import { forecastParamsSchema, forecastQuerySchema } from '../schemas';

export class ForecastController {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly leases: LeaseRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  public forecast = async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = forecastParamsSchema.parse(req.params);
    const { monthsAhead, trailingMonths } = forecastQuerySchema.parse(req.query);

    const forecaster = new CashFlowForecaster(
      this.properties,
      this.units,
      this.leases,
      this.transactions,
      {
        ownerId: req.user!.id,
        propertyId,
        monthsAhead,
        trailingMonthsForExpenses: trailingMonths,
      },
    );

    const result = await forecaster.forecast();
    res.json(result);
  };
}
