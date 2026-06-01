import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UserRepository } from './UserRepository';

function userTableMock() {
  return {
    findUnique: vi.fn(),
    create: vi.fn(),
  };
}

function mockPrisma() {
  return { user: userTableMock() } as unknown as PrismaClient & {
    user: ReturnType<typeof userTableMock>;
  };
}

function fakeUser(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'u-1',
    email: 'owner@example.com',
    passwordHash: 'hashed',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('UserRepository', () => {
  it('findById returns the user record when found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(fakeUser());
    const repo = new UserRepository(prisma);
    const result = await repo.findById('u-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u-1' } });
    expect(result?.email).toBe('owner@example.com');
  });

  it('findById returns null when not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const repo = new UserRepository(prisma);
    expect(await repo.findById('u-missing')).toBeNull();
  });

  it('findByEmail looks up by the email field', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(fakeUser({ email: 'a@b.com' }));
    const repo = new UserRepository(prisma);
    const result = await repo.findByEmail('a@b.com');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    expect(result?.email).toBe('a@b.com');
  });

  it('findByEmail returns null when not found', async () => {
    const prisma = mockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const repo = new UserRepository(prisma);
    expect(await repo.findByEmail('nobody@example.com')).toBeNull();
  });

  it('create passes email and passwordHash and returns the record', async () => {
    const prisma = mockPrisma();
    prisma.user.create.mockResolvedValue(fakeUser({ email: 'new@example.com' }));
    const repo = new UserRepository(prisma);
    const result = await repo.create({ email: 'new@example.com', passwordHash: 'hashed' });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'new@example.com', passwordHash: 'hashed' },
    });
    expect(result.email).toBe('new@example.com');
  });
});
