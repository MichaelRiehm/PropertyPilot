import { Report } from './Report';
import { TransactionRepository } from '../repositories';

export interface PnLOptions {
  ownerId: string;
  propertyId?: string;
  dateFrom: Date;
  dateTo: Date;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class PnLReport extends Report {
  public constructor(
    private readonly transactions: TransactionRepository,
    private readonly options: PnLOptions,
  ) {
    super('Year-to-date Profit & Loss');
    this._columns = [
      { key: 'period', label: 'Period' },
      { key: 'income', label: 'Income', format: 'currency', align: 'right' },
      { key: 'expenses', label: 'Expenses', format: 'currency', align: 'right' },
      { key: 'net', label: 'Net', format: 'currency', align: 'right' },
    ];
  }

  public async generate(): Promise<void> {
    const { ownerId, propertyId, dateFrom, dateTo } = this.options;
    const result = await this.transactions.list({
      ownerId,
      propertyId,
      dateFrom,
      dateTo,
      limit: 200,
      offset: 0,
    });

    const buckets = new Map<string, { income: number; expenses: number }>();
    for (const t of result.data) {
      const key = monthKey(t.date);
      const bucket = buckets.get(key) ?? { income: 0, expenses: 0 };
      if (t.isIncome()) bucket.income += t.amount;
      else bucket.expenses += t.amount;
      buckets.set(key, bucket);
    }

    const sortedKeys = Array.from(buckets.keys()).sort();
    let totalIncome = 0;
    let totalExpenses = 0;
    const monthlyRows = sortedKeys.map((key) => {
      const { income, expenses } = buckets.get(key) ?? { income: 0, expenses: 0 };
      totalIncome += income;
      totalExpenses += expenses;
      return {
        period: key,
        income,
        expenses,
        net: income - expenses,
      };
    });

    if (monthlyRows.length === 0) {
      this._rows = [];
      return;
    }

    this._rows = [
      ...monthlyRows,
      {
        period: 'Total',
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
      },
    ];
  }
}
