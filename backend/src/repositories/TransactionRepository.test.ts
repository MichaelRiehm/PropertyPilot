import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { TransactionRepository } from './TransactionRepository';
import { Transaction } from '../domain';
import { NotFoundError } from '../errors';

function tableMock() {
  return {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  };
}

function mockPrisma() {
  return { transaction: tableMock() } as unknown as PrismaClient & {
    transaction: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'tx-1',
    propertyId: 'prop-1',
    unitId: 'unit-1',
    leaseId: 'lease-1',
    type: 'RENT_INCOME',
    amount: 1500,
    date: new Date('2026-05-01'),
    description: 'May rent',
    category: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTransaction(): Transaction {
  return Transaction.create({
    propertyId: 'prop-1',
    unitId: 'unit-1',
    leaseId: 'lease-1',
    type: 'RENT_INCOME',
    amount: 1500,
    date: new Date('2026-05-01'),
    description: 'May rent',
    category: null,
  });
}

describe('TransactionRepository', () => {
  it('findById scopes through property.ownerId', async () => {
    const prisma = mockPrisma();
    prisma.transaction.findFirst.mockResolvedValue(fakeRow());
    const repo = new TransactionRepository(prisma);
    await repo.findById('tx-1', 'owner-1');
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 'tx-1', property: { ownerId: 'owner-1' } },
    });
  });

  it('findById returns null when not found', async () => {
    const prisma = mockPrisma();
    prisma.transaction.findFirst.mockResolvedValue(null);
    const repo = new TransactionRepository(prisma);
    expect(await repo.findById('tx-1', 'owner-1')).toBeNull();
  });

  it('list applies propertyId, unitId, leaseId, type and date range filters', async () => {
    const prisma = mockPrisma();
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);
    const repo = new TransactionRepository(prisma);
    const from = new Date('2026-01-01');
    const to = new Date('2026-12-31');
    await repo.list({
      ownerId: 'owner-1',
      propertyId: 'prop-1',
      unitId: 'unit-1',
      leaseId: 'lease-1',
      type: 'RENT_INCOME',
      dateFrom: from,
      dateTo: to,
    });
    const call = prisma.transaction.findMany.mock.calls[0][0];
    expect(call.where.property).toEqual({ ownerId: 'owner-1' });
    expect(call.where.propertyId).toBe('prop-1');
    expect(call.where.unitId).toBe('unit-1');
    expect(call.where.leaseId).toBe('lease-1');
    expect(call.where.type).toBe('RENT_INCOME');
    expect(call.where.date).toEqual({ gte: from, lte: to });
  });

  it('list omits the date filter when neither dateFrom nor dateTo is set', async () => {
    const prisma = mockPrisma();
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);
    const repo = new TransactionRepository(prisma);
    await repo.list({ ownerId: 'owner-1' });
    const call = prisma.transaction.findMany.mock.calls[0][0];
    expect(call.where.date).toBeUndefined();
  });

  it('update throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.transaction.updateMany.mockResolvedValue({ count: 0 });
    const repo = new TransactionRepository(prisma);
    await expect(repo.update(makeTransaction(), 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update re-reads and returns the row when count is one', async () => {
    const prisma = mockPrisma();
    prisma.transaction.updateMany.mockResolvedValue({ count: 1 });
    prisma.transaction.findUniqueOrThrow.mockResolvedValue(fakeRow({ amount: 2000 }));
    const repo = new TransactionRepository(prisma);
    const result = await repo.update(makeTransaction(), 'owner-1');
    expect(result.amount).toBe(2000);
  });

  it('delete throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.transaction.deleteMany.mockResolvedValue({ count: 0 });
    const repo = new TransactionRepository(prisma);
    await expect(repo.delete('tx-1', 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('search returns empty for a blank query without hitting Prisma', async () => {
    const prisma = mockPrisma();
    const repo = new TransactionRepository(prisma);
    expect(await repo.search('   ', 'owner-1')).toEqual([]);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('search runs a case-insensitive contains on description scoped to owner', async () => {
    const prisma = mockPrisma();
    prisma.transaction.findMany.mockResolvedValue([fakeRow()]);
    const repo = new TransactionRepository(prisma);
    await repo.search('rent', 'owner-1');
    const call = prisma.transaction.findMany.mock.calls[0][0];
    expect(call.where.property).toEqual({ ownerId: 'owner-1' });
    expect(call.where.description).toEqual({ contains: 'rent', mode: 'insensitive' });
  });
});
