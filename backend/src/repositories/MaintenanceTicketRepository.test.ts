import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { MaintenanceTicketRepository } from './MaintenanceTicketRepository';
import { MaintenanceTicket } from '../domain';
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
  return { maintenanceTicket: tableMock() } as unknown as PrismaClient & {
    maintenanceTicket: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'mt-1',
    propertyId: 'prop-1',
    unitId: 'unit-1',
    title: 'Leaky faucet',
    description: 'Tenant reports drip',
    status: 'OPEN',
    priority: 'MEDIUM',
    reportedAt: new Date('2026-05-01'),
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTicket(): MaintenanceTicket {
  return MaintenanceTicket.create({
    propertyId: 'prop-1',
    unitId: 'unit-1',
    title: 'Leaky faucet',
    description: 'Tenant reports drip',
    status: 'OPEN',
    priority: 'MEDIUM',
    reportedAt: new Date('2026-05-01'),
    resolvedAt: null,
  });
}

describe('MaintenanceTicketRepository', () => {
  it('findById scopes through property.ownerId', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.findFirst.mockResolvedValue(fakeRow());
    const repo = new MaintenanceTicketRepository(prisma);
    await repo.findById('mt-1', 'owner-1');
    expect(prisma.maintenanceTicket.findFirst).toHaveBeenCalledWith({
      where: { id: 'mt-1', property: { ownerId: 'owner-1' } },
    });
  });

  it('list applies propertyId and status filters', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.findMany.mockResolvedValue([]);
    prisma.maintenanceTicket.count.mockResolvedValue(0);
    const repo = new MaintenanceTicketRepository(prisma);
    await repo.list({ ownerId: 'owner-1', propertyId: 'prop-1', status: 'OPEN' });
    const call = prisma.maintenanceTicket.findMany.mock.calls[0][0];
    expect(call.where.propertyId).toBe('prop-1');
    expect(call.where.status).toBe('OPEN');
  });

  it('list with openOnly filters to OPEN or IN_PROGRESS', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.findMany.mockResolvedValue([]);
    prisma.maintenanceTicket.count.mockResolvedValue(0);
    const repo = new MaintenanceTicketRepository(prisma);
    await repo.list({ ownerId: 'owner-1', openOnly: true });
    const call = prisma.maintenanceTicket.findMany.mock.calls[0][0];
    expect(call.where.status).toEqual({ in: ['OPEN', 'IN_PROGRESS'] });
  });

  it('update throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.updateMany.mockResolvedValue({ count: 0 });
    const repo = new MaintenanceTicketRepository(prisma);
    await expect(repo.update(makeTicket(), 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update re-reads and returns the row when count is one', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.updateMany.mockResolvedValue({ count: 1 });
    prisma.maintenanceTicket.findUniqueOrThrow.mockResolvedValue(
      fakeRow({ status: 'CLOSED', resolvedAt: new Date('2026-05-10') }),
    );
    const repo = new MaintenanceTicketRepository(prisma);
    const result = await repo.update(makeTicket(), 'owner-1');
    expect(result.status).toBe('CLOSED');
  });

  it('delete throws NotFoundError when no rows match', async () => {
    const prisma = mockPrisma();
    prisma.maintenanceTicket.deleteMany.mockResolvedValue({ count: 0 });
    const repo = new MaintenanceTicketRepository(prisma);
    await expect(repo.delete('mt-1', 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
