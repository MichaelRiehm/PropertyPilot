import { describe, expect, it } from 'vitest';
import { Property } from './Property';

function makeProperty(overrides: Partial<Parameters<typeof Property.create>[0]> = {}): Property {
  return Property.create({
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    ...overrides,
  });
}

describe('Property.validate', () => {
  it('passes for a fully populated property', () => {
    const p = makeProperty();
    expect(p.validate()).toEqual({ ok: true });
  });

  it('passes when addressLine2 is null', () => {
    const p = makeProperty({ addressLine2: null });
    expect(p.validate()).toEqual({ ok: true });
  });

  it('fails when name is blank', () => {
    const p = makeProperty({ name: '   ' });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('name is required');
    }
  });

  it('fails when name exceeds 120 characters', () => {
    const p = makeProperty({ name: 'a'.repeat(121) });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('name must be 120 characters or fewer');
    }
  });

  it('fails when addressLine1 is blank', () => {
    const p = makeProperty({ addressLine1: '' });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('addressLine1 is required');
    }
  });

  it('fails when city is blank', () => {
    const p = makeProperty({ city: ' ' });
    const result = p.validate();
    expect(result.ok).toBe(false);
  });

  it('fails when state is lowercase', () => {
    const p = makeProperty({ state: 'wi' });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/state/i);
    }
  });

  it('fails when state is too long', () => {
    const p = makeProperty({ state: 'WIS' });
    const result = p.validate();
    expect(result.ok).toBe(false);
  });

  it('fails when postalCode is malformed', () => {
    const p = makeProperty({ postalCode: 'abcde' });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/postalCode/i);
    }
  });

  it('accepts ZIP+4 format', () => {
    const p = makeProperty({ postalCode: '53703-1234' });
    expect(p.validate()).toEqual({ ok: true });
  });

  it('aggregates multiple errors at once', () => {
    const p = makeProperty({ name: '', state: 'xx', postalCode: 'oops' });
    const result = p.validate();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Property mutators', () => {
  it('rename() updates name and bumps updatedAt', async () => {
    const p = makeProperty();
    const before = p.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    p.rename('Renamed');
    expect(p.name).toBe('Renamed');
    expect(p.updatedAt.getTime()).toBeGreaterThan(before);
  });

  it('fullAddress() combines the parts with optional line 2', () => {
    const p = makeProperty({ addressLine2: 'Apt 2' });
    expect(p.fullAddress()).toBe('128 Maple Ct, Apt 2, Madison, WI 53703');
    const q = makeProperty({ addressLine2: null });
    expect(q.fullAddress()).toBe('128 Maple Ct, Madison, WI 53703');
  });
});
