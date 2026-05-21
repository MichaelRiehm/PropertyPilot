import { PrismaClient } from '@prisma/client';
import { Transaction, TransactionType } from '../domain';
import {
  transactionFromPrisma,
  transactionToCreateInput,
  transactionToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';

export interface TransactionListFilter extends ListOptions {
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

  public async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });
    return row ? transactionFromPrisma(row) : null;
  }

  public async list(filter: TransactionListFilter = {}): Promise<PaginatedResult<Transaction>> {
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

  public async update(entity: Transaction): Promise<Transaction> {
    this.ensureValid(entity);
    const row = await this.prisma.transaction.update({
      where: { id: entity.id },
      data: transactionToUpdateInput(entity),
    });
    return transactionFromPrisma(row);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { id } });
  }
}
