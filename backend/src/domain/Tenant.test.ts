import { describe, expect, it } from 'vitest';
import { Tenant } from './Tenant';

function makeTenant(overrides: Partial<Parameters<typeof Tenant.create>[0]> = {}): Tenant {
  return Tenant.create({
    ownerId: 'owner-1',
    firstName: 'Sam',
    lastName: 'Smith',
    email: 'sam@example.com',
    phone: '6085551212',
    ...overrides,
  });
}

describe('Tenant.validate', () => {
  it('passes for a typical tenant', () => {
    expect(makeTenant().validate()).toEqual({ ok: true });
  });

  it('passes with null phone', () => {
    expect(makeTenant({ phone: null }).validate()).toEqual({ ok: true });
  });

  it('fails when firstName is blank', () => {
    const result = makeTenant({ firstName: ' ' }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when lastName is blank', () => {
    const result = makeTenant({ lastName: '' }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when email is invalid', () => {
    const result = makeTenant({ email: 'not-an-email' }).validate();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/email/i);
  });

  it('fails when phone has too few digits', () => {
    const result = makeTenant({ phone: '123456' }).validate();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/phone/i);
  });

  it('accepts phone with formatting characters', () => {
    expect(makeTenant({ phone: '(608) 555-1212' }).validate()).toEqual({ ok: true });
  });
});

describe('Tenant.fullName', () => {
  it('joins first and last with a space', () => {
    expect(makeTenant({ firstName: 'Pat', lastName: 'Romero' }).fullName()).toBe('Pat Romero');
  });
});
