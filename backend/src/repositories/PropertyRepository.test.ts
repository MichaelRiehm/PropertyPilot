import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PropertyRepository } from './PropertyRepository';
import { Property } from '../domain';
import { NotFoundError } from '../errors';
import { DomainValidationError } from '../domain';

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
  return { property: tableMock() } as unknown as PrismaClient & {
    property: ReturnType<typeof tableMock>;
  };
}

function fakeRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'prop-1',
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeValidProperty(): Property {
  return Property.create({
    ownerId: 'owner-1',
    name: 'Maple Court',
    addressLine1: '128 Maple Ct',
    addressLine2: null,
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  });
}

describe('PropertyRepository.findById', () => {
  it('returns null when no row matches the owner scope', async () => {
    const prisma = mockPrisma();
    prisma.property.findFirst.mockResolvedValue(null);
    const repo = new PropertyRepository(prisma);
    expect(await repo.findById('prop-1', 'owner-1')).toBeNull();
    expect(prisma.property.findFirst).toHaveBeenCalledWith({
      where: { id: 'prop-1', ownerId: 'owner-1' },
    });
  });

  it('returns a Property domain instance when the row is found', async () => {
    const prisma = mockPrisma();
    prisma.property.findFirst.mockResolvedValue(fakeRow());
    const repo = new PropertyRepository(prisma);
    const result = await repo.findById('prop-1', 'owner-1');
    expect(result).toBeInstanceOf(Property);
    expect(result?.name).toBe('Maple Court');
  });
});

describe('PropertyRepository.list', () => {
  it('returns a paginated result with page/pageSize defaults', async () => {
    const prisma = mockPrisma();
    prisma.property.findMany.mockResolvedValue([fakeRow()]);
    prisma.property.count.mockResolvedValue(1);
    const repo = new PropertyRepository(prisma);
    const result = await repo.list({ ownerId: 'owner-1' });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'owner-1' }, take: 20, skip: 0 }),
    );
  });

  it('honors a custom page and pageSize', async () => {
    const prisma = mockPrisma();
    prisma.property.findMany.mockResolvedValue([]);
    prisma.property.count.mockResolvedValue(0);
    const repo = new PropertyRepository(prisma);
    await repo.list({ ownerId: 'owner-1', page: 3, pageSize: 10 });
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });
});

describe('PropertyRepository.create', () => {
  it('persists the entity and returns the mapped domain instance', async () => {
    const prisma = mockPrisma();
    const property = makeValidProperty();
    prisma.property.create.mockResolvedValue(fakeRow({ id: property.id, name: property.name }));
    const repo = new PropertyRepository(prisma);
    const result = await repo.create(property);
    expect(prisma.property.create).toHaveBeenCalled();
    expect(result.id).toBe(property.id);
    expect(result.name).toBe(property.name);
  });

  it('throws DomainValidationError when the entity is invalid', async () => {
    const prisma = mockPrisma();
    const invalid = new Property({
      id: 'p1',
      ownerId: '',
      name: '',
      addressLine1: '',
      addressLine2: null,
      city: '',
      state: 'xx',
      postalCode: 'nope',
      propertyType: 'OTHER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repo = new PropertyRepository(prisma);
    await expect(repo.create(invalid)).rejects.toBeInstanceOf(DomainValidationError);
    expect(prisma.property.create).not.toHaveBeenCalled();
  });
});

describe('PropertyRepository.update', () => {
  it('throws NotFoundError when no rows are updated', async () => {
    const prisma = mockPrisma();
    prisma.property.updateMany.mockResolvedValue({ count: 0 });
    const repo = new PropertyRepository(prisma);
    await expect(repo.update(makeValidProperty(), 'owner-1')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.property.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('re-reads and returns the updated row on success', async () => {
    const prisma = mockPrisma();
    prisma.property.updateMany.mockResolvedValue({ count: 1 });
    prisma.property.findUniqueOrThrow.mockResolvedValue(fakeRow({ name: 'Renamed' }));
    const repo = new PropertyRepository(prisma);
    const property = makeValidProperty();
    const result = await repo.update(property, 'owner-1');
    expect(result.name).toBe('Renamed');
    expect(prisma.property.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: property.id },
    });
  });
});

describe('PropertyRepository.delete', () => {
  it('throws NotFoundError when no rows are deleted', async () => {
    const prisma = mockPrisma();
    prisma.property.deleteMany.mockResolvedValue({ count: 0 });
    const repo = new PropertyRepository(prisma);
    await expect(repo.delete('prop-1', 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('succeeds when a row is deleted', async () => {
    const prisma = mockPrisma();
    prisma.property.deleteMany.mockResolvedValue({ count: 1 });
    const repo = new PropertyRepository(prisma);
    await expect(repo.delete('prop-1', 'owner-1')).resolves.toBeUndefined();
    expect(prisma.property.deleteMany).toHaveBeenCalledWith({
      where: { id: 'prop-1', ownerId: 'owner-1' },
    });
  });
});

describe('PropertyRepository.search', () => {
  it('runs a case-insensitive OR across name, addressLine1, and city', async () => {
    const prisma = mockPrisma();
    prisma.property.findMany.mockResolvedValue([fakeRow()]);
    const repo = new PropertyRepository(prisma);
    const results = await repo.search('maple', 'owner-1');
    expect(results).toHaveLength(1);
    const call = prisma.property.findMany.mock.calls[0][0];
    expect(call.where.ownerId).toBe('owner-1');
    const ors = call.where.OR;
    expect(Array.isArray(ors)).toBe(true);
    expect(ors).toHaveLength(3);
  });

  it('returns an empty array for a blank query without hitting Prisma', async () => {
    const prisma = mockPrisma();
    const repo = new PropertyRepository(prisma);
    expect(await repo.search('   ', 'owner-1')).toEqual([]);
    expect(prisma.property.findMany).not.toHaveBeenCalled();
  });
});
