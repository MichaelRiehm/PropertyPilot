import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { TenantRepository } from './TenantRepository';
import { Tenant } from '../domain';
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
  return { tenant: tableMock() } as unknown as PrismaClient & {
    tenant: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'tenant-1',
    ownerId: 'owner-1',
    firstName: 'Sam',
    lastName: 'Smith',
    email: 'sam@example.com',
    phone: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTenant(): Tenant {
  return Tenant.create({
    ownerId: 'owner-1',
    firstName: 'Sam',
    lastName: 'Smith',
    email: 'sam@example.com',
    phone: null,
  });
}

describe('TenantRepository', () => {
  it('findById scopes by ownerId', async () => {
    const prisma = mockPrisma();
    prisma.tenant.findFirst.mockResolvedValue(fakeRow());
    const repo = new TenantRepository(prisma);
    const result = await repo.findById('t', 'o');
    expect(result).toBeInstanceOf(Tenant);
    expect(prisma.tenant.findFirst).toHaveBeenCalledWith({ where: { id: 't', ownerId: 'o' } });
  });

  it('findById returns null when missing', async () => {
    const prisma = mockPrisma();
    prisma.tenant.findFirst.mockResolvedValue(null);
    const repo = new TenantRepository(prisma);
    expect(await repo.findById('t', 'o')).toBeNull();
  });

  it('list returns a PaginatedResult with totals and pageSize', async () => {
    const prisma = mockPrisma();
    prisma.tenant.findMany.mockResolvedValue([fakeRow(), fakeRow({ id: 'tenant-2' })]);
    prisma.tenant.count.mockResolvedValue(2);
    const repo = new TenantRepository(prisma);
    const result = await repo.list({ ownerId: 'o', page: 1, pageSize: 50 });
    expect(result.total).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it('update throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.tenant.updateMany.mockResolvedValue({ count: 0 });
    const repo = new TenantRepository(prisma);
    await expect(repo.update(makeTenant(), 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delete succeeds when count is one', async () => {
    const prisma = mockPrisma();
    prisma.tenant.deleteMany.mockResolvedValue({ count: 1 });
    const repo = new TenantRepository(prisma);
    await expect(repo.delete('t', 'o')).resolves.toBeUndefined();
  });

  it('search runs an OR across name and email fields', async () => {
    const prisma = mockPrisma();
    prisma.tenant.findMany.mockResolvedValue([fakeRow()]);
    const repo = new TenantRepository(prisma);
    await repo.search('sam', 'owner-1');
    const call = prisma.tenant.findMany.mock.calls[0][0];
    expect(call.where.ownerId).toBe('owner-1');
    expect(call.where.OR).toHaveLength(3);
  });

  it('search short-circuits on a blank query', async () => {
    const prisma = mockPrisma();
    const repo = new TenantRepository(prisma);
    expect(await repo.search('', 'owner-1')).toEqual([]);
    expect(prisma.tenant.findMany).not.toHaveBeenCalled();
  });
});
