import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { LeaseRepository } from './LeaseRepository';
import { Lease } from '../domain';
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
  return { lease: tableMock() } as unknown as PrismaClient & {
    lease: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'lease-1',
    unitId: 'unit-1',
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeLease(): Lease {
  return Lease.create({
    unitId: 'unit-1',
    tenantId: 'tenant-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    documentLink: null,
  });
}

describe('LeaseRepository', () => {
  it('findById scopes through unit.property.ownerId', async () => {
    const prisma = mockPrisma();
    prisma.lease.findFirst.mockResolvedValue(fakeRow());
    const repo = new LeaseRepository(prisma);
    await repo.findById('lease-1', 'owner-1');
    expect(prisma.lease.findFirst).toHaveBeenCalledWith({
      where: { id: 'lease-1', unit: { property: { ownerId: 'owner-1' } } },
    });
  });

  it('list passes through unitId, tenantId, and status filters', async () => {
    const prisma = mockPrisma();
    prisma.lease.findMany.mockResolvedValue([]);
    prisma.lease.count.mockResolvedValue(0);
    const repo = new LeaseRepository(prisma);
    await repo.list({
      ownerId: 'o',
      unitId: 'u1',
      tenantId: 't1',
      status: 'ACTIVE',
    });
    const call = prisma.lease.findMany.mock.calls[0][0];
    expect(call.where.unitId).toBe('u1');
    expect(call.where.tenantId).toBe('t1');
    expect(call.where.status).toBe('ACTIVE');
  });

  it('update throws NotFoundError when no rows match the owner', async () => {
    const prisma = mockPrisma();
    prisma.lease.updateMany.mockResolvedValue({ count: 0 });
    const repo = new LeaseRepository(prisma);
    await expect(repo.update(makeLease(), 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update re-reads and returns when count is one', async () => {
    const prisma = mockPrisma();
    prisma.lease.updateMany.mockResolvedValue({ count: 1 });
    prisma.lease.findUniqueOrThrow.mockResolvedValue(fakeRow({ status: 'TERMINATED' }));
    const repo = new LeaseRepository(prisma);
    const result = await repo.update(makeLease(), 'owner-1');
    expect(result.status).toBe('TERMINATED');
  });

  it('delete throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.lease.deleteMany.mockResolvedValue({ count: 0 });
    const repo = new LeaseRepository(prisma);
    await expect(repo.delete('l', 'o')).rejects.toBeInstanceOf(NotFoundError);
  });
});
