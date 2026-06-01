import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { SearchController } from './searchController';
import { Property, Tenant, Transaction } from '../domain';
import type {
  PropertyRepository,
  TenantRepository,
  TransactionRepository,
} from '../repositories';

function makeRes() {
  return { json: vi.fn().mockReturnThis() } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
  };
}

function makeReq(q: string): Request {
  return {
    user: { id: 'owner-1', email: 'owner@example.com' },
    query: { q },
  } as unknown as Request;
}

function makeProperty(): Property {
  return new Property({
    id: 'prop-1',
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeTenant(): Tenant {
  return new Tenant({
    id: 'tenant-1',
    ownerId: 'owner-1',
    firstName: 'Maple',
    lastName: 'Lee',
    email: 'maple@example.com',
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeTransaction(): Transaction {
  return new Transaction({
    id: 'tx-1',
    propertyId: 'prop-1',
    unitId: null,
    leaseId: null,
    type: 'RENT_INCOME',
    category: null,
    amount: 1500,
    date: new Date('2026-05-01'),
    description: 'Maple lease rent',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('SearchController.search', () => {
  it('returns combined hits across properties, tenants, and transactions', async () => {
    const properties = {
      search: vi.fn().mockResolvedValue([makeProperty()]),
      list: vi.fn().mockResolvedValue({
        data: [makeProperty()],
        total: 1,
        page: 1,
        pageSize: 200,
        totalPages: 1,
      }),
    } as unknown as PropertyRepository;
    const tenants = {
      search: vi.fn().mockResolvedValue([makeTenant()]),
    } as unknown as TenantRepository;
    const transactions = {
      search: vi.fn().mockResolvedValue([makeTransaction()]),
    } as unknown as TransactionRepository;

    const controller = new SearchController(properties, tenants, transactions);
    const res = makeRes();

    await controller.search(makeReq('maple'), res);

    const body = res.json.mock.calls[0][0];
    expect(body.query).toBe('maple');
    expect(body.totalHits).toBe(3);
    expect(body.counts).toEqual({ property: 1, tenant: 1, transaction: 1 });
    const txHit = body.results.find((r: { type: string }) => r.type === 'transaction');
    expect(txHit.propertyName).toBe('Maple Court');
  });

  it('rejects an empty query with a Zod error', async () => {
    const controller = new SearchController(
      { search: vi.fn(), list: vi.fn() } as unknown as PropertyRepository,
      { search: vi.fn() } as unknown as TenantRepository,
      { search: vi.fn() } as unknown as TransactionRepository,
    );
    await expect(controller.search(makeReq(''), makeRes())).rejects.toThrow();
  });
});
