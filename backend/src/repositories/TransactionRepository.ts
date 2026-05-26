import { PrismaClient } from '@prisma/client';
import { Transaction, TransactionType } from '../domain';
import {
  transactionFromPrisma,
  transactionToCreateInput,
  transactionToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface TransactionListFilter extends ListOptions {
  ownerId: string;
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  type?: TransactionType;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TransactionRepository extends BaseRepository<Transaction, TransactionListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findFirst({
      where: { id, property: { ownerId } },
    });
    return row ? transactionFromPrisma(row) : null;
  }

  public async list(filter: TransactionListFilter): Promise<PaginatedResult<Transaction>> {
    const { limit, offset } = this.normalizePagination(filter);
    const dateFilter =
      filter.dateFrom || filter.dateTo
        ? {
            date: {
              ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
              ...(filter.dateTo ? { lte: filter.dateTo } : {}),
            },
          }
        : {};
    const where = {
      property: { ownerId: filter.ownerId },
      ...(filter.propertyId ? { propertyId: filter.propertyId } : {}),
      ...(filter.unitId ? { unitId: filter.unitId } : {}),
      ...(filter.leaseId ? { leaseId: filter.leaseId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...dateFilter,
    };
    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data: rows.map(transactionFromPrisma), total, limit, offset };
  }

  public async create(entity: Transaction): Promise<Transaction> {
    this.ensureValid(entity);
    const row = await this.prisma.transaction.create({
      data: transactionToCreateInput(entity),
    });
    return transactionFromPrisma(row);
  }

  public async update(entity: Transaction, ownerId: string): Promise<Transaction> {
    this.ensureValid(entity);
    const result = await this.prisma.transaction.updateMany({
      where: { id: entity.id, property: { ownerId } },
      data: transactionToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('Transaction', entity.id);
    }
    const row = await this.prisma.transaction.findUniqueOrThrow({ where: { id: entity.id } });
    return transactionFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.transaction.deleteMany({
      where: { id, property: { ownerId } },
    });
    if (result.count === 0) {
      throw new NotFoundError('Transaction', id);
    }
  }

  public async search(query: string, ownerId: string, take = 25): Promise<Transaction[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.prisma.transaction.findMany({
      where: {
        property: { ownerId },
        description: { contains: q, mode: 'insensitive' },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take,
    });
    return rows.map(transactionFromPrisma);
  }
}
