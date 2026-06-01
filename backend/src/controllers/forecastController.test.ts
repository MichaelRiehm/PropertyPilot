import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ForecastController } from './forecastController';
import { Property } from '../domain';
import { NotFoundError } from '../errors';
import type {
  LeaseRepository,
  PropertyRepository,
  TransactionRepository,
  UnitRepository,
} from '../repositories';

function paginated<T>(rows: T[] = []) {
  return { data: rows, total: rows.length, page: 1, pageSize: 200, totalPages: 1 };
}

function makeRes() {
  return { json: vi.fn().mockReturnThis() } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
  };
}

function makeReq(opts: {
  propertyId: string;
  query?: Record<string, unknown>;
}): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    params: { propertyId: opts.propertyId },
    query: opts.query ?? {},
  } as unknown as Request;
}

function makeProperty(): Property {
  return new Property({
    id: 'prop-1',
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '1 Main',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ForecastController.forecast', () => {
  it('returns a forecast result for an owned property', async () => {
    const properties = {
      findById: vi.fn().mockResolvedValue(makeProperty()),
    } as unknown as PropertyRepository;
    const units = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as UnitRepository;
    const leases = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as LeaseRepository;
    const transactions = {
      list: vi.fn().mockResolvedValue(paginated()),
    } as unknown as TransactionRepository;

    const controller = new ForecastController(properties, units, leases, transactions);
    const res = makeRes();

    await controller.forecast(makeReq({ propertyId: 'prop-1' }), res);

    const body = res.json.mock.calls[0][0];
    expect(body.propertyId).toBe('prop-1');
    expect(body.propertyName).toBe('Maple Court');
    expect(body.monthsAhead).toBe(12);
    expect(body.trailingMonthsForExpenses).toBe(6);
    expect(body.projections).toHaveLength(12);
  });

  it('honors the monthsAhead and trailingMonths query overrides', async () => {
    const properties = {
      findById: vi.fn().mockResolvedValue(makeProperty()),
    } as unknown as PropertyRepository;
    const units = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as UnitRepository;
    const leases = { list: vi.fn().mockResolvedValue(paginated()) } as unknown as LeaseRepository;
    const transactions = {
      list: vi.fn().mockResolvedValue(paginated()),
    } as unknown as TransactionRepository;

    const controller = new ForecastController(properties, units, leases, transactions);
    const res = makeRes();

    await controller.forecast(
      makeReq({
        propertyId: 'prop-1',
        query: { monthsAhead: '6', trailingMonths: '3' },
      }),
      res,
    );

    const body = res.json.mock.calls[0][0];
    expect(body.monthsAhead).toBe(6);
    expect(body.trailingMonthsForExpenses).toBe(3);
    expect(body.projections).toHaveLength(6);
  });

  it('throws NotFoundError when the property does not belong to the owner', async () => {
    const properties = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as PropertyRepository;
    const controller = new ForecastController(
      properties,
      { list: vi.fn() } as unknown as UnitRepository,
      { list: vi.fn() } as unknown as LeaseRepository,
      { list: vi.fn() } as unknown as TransactionRepository,
    );

    await expect(
      controller.forecast(makeReq({ propertyId: 'someone-elses' }), makeRes()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects monthsAhead out of range', async () => {
    const controller = new ForecastController(
      { findById: vi.fn() } as unknown as PropertyRepository,
      { list: vi.fn() } as unknown as UnitRepository,
      { list: vi.fn() } as unknown as LeaseRepository,
      { list: vi.fn() } as unknown as TransactionRepository,
    );

    await expect(
      controller.forecast(
        makeReq({ propertyId: 'prop-1', query: { monthsAhead: '999' } }),
        makeRes(),
      ),
    ).rejects.toThrow();
  });
});
