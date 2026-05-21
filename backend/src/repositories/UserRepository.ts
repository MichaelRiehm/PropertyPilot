import { PrismaClient, User as PrismaUser } from '@prisma/client';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: PrismaUser): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class UserRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toRecord(row) : null;
  }

  public async create(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    const row = await this.prisma.user.create({
      data: { email: input.email, passwordHash: input.passwordHash },
    });
    return toRecord(row);
  }
}
