import { describe, expect, it } from 'vitest';
import { Lease } from './Lease';

function makeLease(overrides: Partial<Parameters<typeof Lease.create>[0]> = {}): Lease {
  return Lease.create({
    unitId: 'unit-1',
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
    ...overrides,
  });
}

describe('Lease.validate', () => {
  it('passes for a typical lease', () => {
    expect(makeLease().validate()).toEqual({ ok: true });
  });

  it('fails when startDate equals endDate', () => {
    const sameDay = new Date('2026-01-01');
    const lease = makeLease({ startDate: sameDay, endDate: new Date(sameDay) });
    const result = lease.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /before endDate/i.test(e))).toBe(true);
  });

  it('fails when startDate is after endDate', () => {
    const lease = makeLease({
      startDate: new Date('2027-01-01'),
      endDate: new Date('2026-01-01'),
    });
    expect(lease.validate().ok).toBe(false);
  });

  it('fails when monthlyRent is zero', () => {
    expect(makeLease({ monthlyRent: 0 }).validate().ok).toBe(false);
  });

  it('fails when securityDeposit is negative', () => {
    expect(makeLease({ securityDeposit: -100 }).validate().ok).toBe(false);
  });

  it('fails when unitId or tenantId is blank', () => {
    expect(makeLease({ unitId: '' }).validate().ok).toBe(false);
    expect(makeLease({ tenantId: ' ' }).validate().ok).toBe(false);
  });
});

describe('Lease behavior', () => {
  it('isActiveOn returns true within the lease window when status is ACTIVE', () => {
    const lease = makeLease({
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    });
    expect(lease.isActiveOn(new Date('2026-06-15'))).toBe(true);
  });

  it('isActiveOn returns false outside the lease window', () => {
    const lease = makeLease({
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    });
    expect(lease.isActiveOn(new Date('2025-12-31'))).toBe(false);
    expect(lease.isActiveOn(new Date('2027-01-01'))).toBe(false);
  });

  it('isActiveOn returns false when status is PENDING', () => {
    const lease = makeLease({ status: 'PENDING' });
    expect(lease.isActiveOn(new Date('2026-06-15'))).toBe(false);
  });

  it('termInMonths approximates the length', () => {
    const lease = makeLease({
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
    });
    expect(lease.termInMonths()).toBe(12);
  });

  it('terminate() flips status and bumps updatedAt', async () => {
    const lease = makeLease({ status: 'ACTIVE' });
    const before = lease.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    lease.terminate();
    expect(lease.status).toBe('TERMINATED');
    expect(lease.updatedAt.getTime()).toBeGreaterThan(before);
  });
});
