import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UnitRepository } from './UnitRepository';
import { Unit } from '../domain';
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
  return { unit: tableMock() } as unknown as PrismaClient & {
    unit: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'unit-1',
    propertyId: 'prop-1',
    label: 'Apt 1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    marketRent: 1500,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUnit(): Unit {
  return Unit.create({
    propertyId: 'prop-1',
    label: 'Apt 1',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 900,
    marketRent: 1500,
  });
}

describe('UnitRepository.findById', () => {
  it('scopes the lookup through property.ownerId', async () => {
    const prisma = mockPrisma();
    prisma.unit.findFirst.mockResolvedValue(fakeRow());
    const repo = new UnitRepository(prisma);
    const result = await repo.findById('unit-1', 'owner-1');
    expect(result).toBeInstanceOf(Unit);
    expect(prisma.unit.findFirst).toHaveBeenCalledWith({
      where: { id: 'unit-1', property: { ownerId: 'owner-1' } },
    });
  });

  it('returns null when nothing matches', async () => {
    const prisma = mockPrisma();
    prisma.unit.findFirst.mockResolvedValue(null);
    const repo = new UnitRepository(prisma);
    expect(await repo.findById('unit-1', 'owner-1')).toBeNull();
  });
});

describe('UnitRepository.list', () => {
  it('joins through property for owner scoping and optionally filters by propertyId', async () => {
    const prisma = mockPrisma();
    prisma.unit.findMany.mockResolvedValue([fakeRow()]);
    prisma.unit.count.mockResolvedValue(1);
    const repo = new UnitRepository(prisma);
    const result = await repo.list({ ownerId: 'owner-1', propertyId: 'prop-1' });
    expect(result.total).toBe(1);
    const call = prisma.unit.findMany.mock.calls[0][0];
    expect(call.where.property).toEqual({ ownerId: 'owner-1' });
    expect(call.where.propertyId).toBe('prop-1');
  });
});

describe('UnitRepository.create / update / delete', () => {
  it('create persists the entity', async () => {
    const prisma = mockPrisma();
    prisma.unit.create.mockResolvedValue(fakeRow());
    const repo = new UnitRepository(prisma);
    await repo.create(makeUnit());
    expect(prisma.unit.create).toHaveBeenCalled();
  });

  it('update throws NotFoundError when count is zero', async () => {
    const prisma = mockPrisma();
    prisma.unit.updateMany.mockResolvedValue({ count: 0 });
    const repo = new UnitRepository(prisma);
    await expect(repo.update(makeUnit(), 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update re-reads and returns when count is one', async () => {
    const prisma = mockPrisma();
    prisma.unit.updateMany.mockResolvedValue({ count: 1 });
    prisma.unit.findUniqueOrThrow.mockResolvedValue(fakeRow({ label: 'New' }));
    const repo = new UnitRepository(prisma);
    const result = await repo.update(makeUnit(), 'owner-1');
    expect(result.label).toBe('New');
  });

  it('delete throws NotFoundError when count is zero', async () => {
    const prisma = mockPrisma();
    prisma.unit.deleteMany.mockResolvedValue({ count: 0 });
    const repo = new UnitRepository(prisma);
    await expect(repo.delete('u', 'o')).rejects.toBeInstanceOf(NotFoundError);
  });
});
