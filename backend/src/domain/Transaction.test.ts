import { describe, expect, it } from 'vitest';
import { Transaction } from './Transaction';

function makeTransaction(
  overrides: Partial<Parameters<typeof Transaction.create>[0]> = {},
): Transaction {
  return Transaction.create({
    propertyId: 'prop-1',
    unitId: null,
    leaseId: null,
    type: 'EXPENSE',
    category: 'repairs',
    amount: 250,
    date: new Date('2026-05-01'),
    description: 'Plumbing repair',
    ...overrides,
  });
}

describe('Transaction.validate', () => {
  it('passes for a typical expense', () => {
    expect(makeTransaction().validate()).toEqual({ ok: true });
  });

  it('fails when amount is zero', () => {
    expect(makeTransaction({ amount: 0 }).validate().ok).toBe(false);
  });

  it('fails when description is blank', () => {
    expect(makeTransaction({ description: ' ' }).validate().ok).toBe(false);
  });

  it('fails when propertyId is blank', () => {
    expect(makeTransaction({ propertyId: '' }).validate().ok).toBe(false);
  });

  it('fails when RENT_INCOME has no leaseId', () => {
    const result = makeTransaction({
      type: 'RENT_INCOME',
      amount: 1500,
      leaseId: null,
      description: 'Rent',
    }).validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /RENT_INCOME/i.test(e))).toBe(true);
    }
  });

  it('passes when RENT_INCOME has a leaseId', () => {
    expect(
      makeTransaction({
        type: 'RENT_INCOME',
        amount: 1500,
        leaseId: 'lease-1',
        description: 'Rent',
      }).validate(),
    ).toEqual({ ok: true });
  });
});

describe('Transaction behavior', () => {
  it('isIncome returns true for income types', () => {
    expect(makeTransaction({ type: 'RENT_INCOME', leaseId: 'l1' }).isIncome()).toBe(true);
    expect(makeTransaction({ type: 'DEPOSIT_INCOME' }).isIncome()).toBe(true);
    expect(makeTransaction({ type: 'OTHER_INCOME' }).isIncome()).toBe(true);
  });

  it('isIncome returns false for expense and refund', () => {
    expect(makeTransaction({ type: 'EXPENSE' }).isIncome()).toBe(false);
    expect(makeTransaction({ type: 'REFUND' }).isIncome()).toBe(false);
  });

  it('signedAmount is positive for income and negative for non-income', () => {
    expect(
      makeTransaction({ type: 'RENT_INCOME', amount: 1500, leaseId: 'l1' }).signedAmount(),
    ).toBe(1500);
    expect(makeTransaction({ type: 'EXPENSE', amount: 250 }).signedAmount()).toBe(-250);
  });
});
