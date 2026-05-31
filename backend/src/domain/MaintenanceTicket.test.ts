import { describe, expect, it } from 'vitest';
import { MaintenanceTicket } from './MaintenanceTicket';

function makeTicket(
  overrides: Partial<Parameters<typeof MaintenanceTicket.create>[0]> = {},
): MaintenanceTicket {
  return MaintenanceTicket.create({
    propertyId: 'prop-1',
    unitId: 'unit-1',
    title: 'Leaky faucet',
    description: 'Tenant reports drip',
    status: 'OPEN',
    priority: 'MEDIUM',
    reportedAt: new Date('2026-05-01'),
    resolvedAt: null,
    ...overrides,
  });
}

describe('MaintenanceTicket.validate', () => {
  it('passes for an open ticket', () => {
    expect(makeTicket().validate()).toEqual({ ok: true });
  });

  it('passes for a closed ticket with a resolvedAt', () => {
    const t = makeTicket({
      status: 'CLOSED',
      resolvedAt: new Date('2026-05-10'),
    });
    expect(t.validate()).toEqual({ ok: true });
  });

  it('fails when closed without a resolvedAt', () => {
    const result = makeTicket({ status: 'CLOSED', resolvedAt: null }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when title is blank', () => {
    expect(makeTicket({ title: '' }).validate().ok).toBe(false);
  });

  it('fails when description is blank', () => {
    expect(makeTicket({ description: ' ' }).validate().ok).toBe(false);
  });

  it('fails when resolvedAt is before reportedAt', () => {
    const t = makeTicket({
      reportedAt: new Date('2026-05-10'),
      resolvedAt: new Date('2026-05-01'),
      status: 'CLOSED',
    });
    expect(t.validate().ok).toBe(false);
  });
});

describe('MaintenanceTicket behavior', () => {
  it('isOpen reports OPEN and IN_PROGRESS as open', () => {
    expect(makeTicket({ status: 'OPEN' }).isOpen()).toBe(true);
    expect(makeTicket({ status: 'IN_PROGRESS' }).isOpen()).toBe(true);
    expect(
      makeTicket({ status: 'CLOSED', resolvedAt: new Date() }).isOpen(),
    ).toBe(false);
    expect(makeTicket({ status: 'CANCELED', resolvedAt: new Date() }).isOpen()).toBe(false);
  });

  it('ageInDays measures from reportedAt to a given as-of date', () => {
    const t = makeTicket({ reportedAt: new Date('2026-05-01') });
    expect(t.ageInDays(new Date('2026-05-11'))).toBe(10);
  });

  it('close() sets status and resolvedAt', () => {
    const t = makeTicket({ status: 'OPEN' });
    t.close(new Date('2026-05-15'));
    expect(t.status).toBe('CLOSED');
    expect(t.resolvedAt?.toISOString()).toContain('2026-05-15');
  });
});
