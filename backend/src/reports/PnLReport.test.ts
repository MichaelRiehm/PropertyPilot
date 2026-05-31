import { describe, expect, it, vi } from 'vitest';
import { PnLReport } from './PnLReport';
import { Transaction } from '../domain/Transaction';
import type { TransactionRepository } from '../repositories';

function makePaginated<T>(items: T[]) {
  return { data: items, total: items.length, page: 1, pageSize: 200, totalPages: 1 };
}

function makeTransactionStub(items: Transaction[]): TransactionRepository {
  return {
    list: vi.fn().mockResolvedValue(makePaginated(items)),
  } as unknown as TransactionRepository;
}

const OWNER = 'owner-1';

function mkTxn(opts: Partial<Parameters<typeof Transaction.create>[0]> = {}): Transaction {
  return Transaction.create({
    propertyId: 'prop-1',
    unitId: null,
    leaseId: opts.type === 'RENT_INCOME' ? 'lease-1' : null,
    type: 'EXPENSE',
    category: null,
    amount: 100,
    date: new Date('2026-01-15'),
    description: 'test',
    ...opts,
  });
}

describe('PnLReport.generate', () => {
  it('groups income and expenses by month and finishes with a Total row', async () => {
    const txns = [
      mkTxn({ type: 'RENT_INCOME', amount: 1500, date: new Date('2026-01-01'), description: 'Jan rent' }),
      mkTxn({ type: 'EXPENSE', amount: 200, date: new Date('2026-01-15'), description: 'repair' }),
      mkTxn({ type: 'RENT_INCOME', amount: 1500, date: new Date('2026-02-01'), description: 'Feb rent' }),
    ];
    const report = new PnLReport(makeTransactionStub(txns), {
      ownerId: OWNER,
      dateFrom: new Date('2026-01-01'),
      dateTo: new Date('2026-03-01'),
    });
    await report.generate();
    expect(report.rows.length).toBe(3); // Jan, Feb, Total
    const total = report.rows[report.rows.length - 1];
    expect(total.period).toBe('Total');
    expect(total.income).toBe(3000);
    expect(total.expenses).toBe(200);
    expect(total.net).toBe(2800);
  });

  it('returns an empty rows array when there is no data', async () => {
    const report = new PnLReport(makeTransactionStub([]), {
      ownerId: OWNER,
      dateFrom: new Date('2026-01-01'),
      dateTo: new Date('2026-12-31'),
    });
    await report.generate();
    expect(report.rows).toHaveLength(0);
  });

  it('reports negative net when expenses exceed income in a month', async () => {
    const txns = [
      mkTxn({ type: 'EXPENSE', amount: 800, date: new Date('2026-04-10'), description: 'roof' }),
      mkTxn({ type: 'RENT_INCOME', amount: 500, date: new Date('2026-04-01'), description: 'half-month rent' }),
    ];
    const report = new PnLReport(makeTransactionStub(txns), {
      ownerId: OWNER,
      dateFrom: new Date('2026-04-01'),
      dateTo: new Date('2026-04-30'),
    });
    await report.generate();
    expect(report.rows.length).toBe(2);
    expect(report.rows[0].net).toBe(-300);
  });

  it('sets a YTD title', async () => {
    const report = new PnLReport(makeTransactionStub([]), {
      ownerId: OWNER,
      dateFrom: new Date('2026-01-01'),
      dateTo: new Date('2026-12-31'),
    });
    expect(report.title).toMatch(/Year-to-date/);
  });
});
