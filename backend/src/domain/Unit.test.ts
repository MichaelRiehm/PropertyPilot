import { describe, expect, it } from 'vitest';
import { Unit } from './Unit';

function makeUnit(overrides: Partial<Parameters<typeof Unit.create>[0]> = {}): Unit {
  return Unit.create({
    propertyId: 'prop-1',
    label: 'Apt 1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    marketRent: 1500,
    ...overrides,
  });
}

describe('Unit.validate', () => {
  it('passes for a typical unit', () => {
    expect(makeUnit().validate()).toEqual({ ok: true });
  });

  it('passes with null squareFeet', () => {
    expect(makeUnit({ squareFeet: null }).validate()).toEqual({ ok: true });
  });

  it('fails when label is blank', () => {
    const result = makeUnit({ label: '' }).validate();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('label is required');
  });

  it('fails when bedrooms is negative', () => {
    const result = makeUnit({ bedrooms: -1 }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when bedrooms is fractional', () => {
    const result = makeUnit({ bedrooms: 1.5 }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when bathrooms is negative', () => {
    const result = makeUnit({ bathrooms: -0.5 }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when marketRent is negative', () => {
    const result = makeUnit({ marketRent: -100 }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when squareFeet is negative', () => {
    const result = makeUnit({ squareFeet: -1 }).validate();
    expect(result.ok).toBe(false);
  });

  it('fails when propertyId is empty', () => {
    const result = makeUnit({ propertyId: ' ' }).validate();
    expect(result.ok).toBe(false);
  });
});

describe('Unit mutators', () => {
  it('setMarketRent updates value and bumps updatedAt', async () => {
    const u = makeUnit();
    const before = u.updatedAt.getTime();
    await new Promise((r) => setTimeout(r, 5));
    u.setMarketRent(1800);
    expect(u.marketRent).toBe(1800);
    expect(u.updatedAt.getTime()).toBeGreaterThan(before);
  });
});
