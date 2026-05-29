import {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';
import { NotFoundError } from '../errors';

export interface MonthlyProjection {
  month: string;
  income: number;
  expenses: number;
  net: number;
  expensesExceedIncome: boolean;
}

export interface ForecastResult {
  propertyId: string;
  propertyName: string;
  generatedAt: string;
  monthsAhead: number;
  trailingMonthsForExpenses: number;
  baselineMonthlyExpense: number;
  projections: MonthlyProjection[];
}

export interface CashFlowForecasterOptions {
  ownerId: string;
  propertyId: string;
  monthsAhead?: number;
  trailingMonthsForExpenses?: number;
}

const DEFAULT_MONTHS_AHEAD = 12;
const DEFAULT_TRAILING = 6;

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addMonthsUtc(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class CashFlowForecaster {
  public constructor(
    private readonly properties: PropertyRepository,
    private readonly units: UnitRepository,
    private readonly leases: LeaseRepository,
    private readonly transactions: TransactionRepository,
    private readonly options: CashFlowForecasterOptions,
  ) {}

  public async forecast(): Promise<ForecastResult> {
    const { ownerId, propertyId } = this.options;
    const monthsAhead = this.options.monthsAhead ?? DEFAULT_MONTHS_AHEAD;
    const trailingMonths = this.options.trailingMonthsForExpenses ?? DEFAULT_TRAILING;

    const property = await this.properties.findById(propertyId, ownerId);
    if (!property) {
      throw new NotFoundError('Property', propertyId);
    }

    const [unitsResult, leasesResult, expensesResult] = await Promise.all([
      this.units.list({ ownerId, propertyId, page: 1, pageSize: 200 }),
      this.leases.list({ ownerId, status: 'ACTIVE', page: 1, pageSize: 200 }),
      this.loadTrailingExpenses(ownerId, propertyId, trailingMonths),
    ]);

    const propertyUnitIds = new Set(unitsResult.data.map((u) => u.id));
    const propertyLeases = leasesResult.data.filter((lease) =>
      propertyUnitIds.has(lease.unitId),
    );

    const totalExpenses = expensesResult.reduce((sum, t) => sum + t.amount, 0);
    const baselineMonthlyExpense = totalExpenses / trailingMonths;

    const startMonth = startOfMonthUtc(new Date());
    const projections: MonthlyProjection[] = [];

    for (let i = 0; i < monthsAhead; i += 1) {
      const monthStart = addMonthsUtc(startMonth, i);
      const monthEnd = endOfMonthUtc(monthStart);
      const income = propertyLeases
        .filter((lease) => lease.startDate <= monthEnd && lease.endDate >= monthStart)
        .reduce((sum, lease) => sum + lease.monthlyRent, 0);
      const expenses = baselineMonthlyExpense;
      const net = income - expenses;
      projections.push({
        month: monthKey(monthStart),
        income,
        expenses,
        net,
        expensesExceedIncome: expenses > income,
      });
    }

    return {
      propertyId,
      propertyName: property.name,
      generatedAt: new Date().toISOString(),
      monthsAhead,
      trailingMonthsForExpenses: trailingMonths,
      baselineMonthlyExpense,
      projections,
    };
  }

  private async loadTrailingExpenses(
    ownerId: string,
    propertyId: string,
    trailingMonths: number,
  ) {
    const now = new Date();
    const dateFrom = addMonthsUtc(startOfMonthUtc(now), -trailingMonths);
    const dateTo = now;
    const result = await this.transactions.list({
      ownerId,
      propertyId,
      type: 'EXPENSE',
      dateFrom,
      dateTo,
      page: 1,
      pageSize: 500,
    });
    return result.data;
  }
}
