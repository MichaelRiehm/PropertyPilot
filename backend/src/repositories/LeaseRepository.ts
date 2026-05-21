import { PrismaClient } from '@prisma/client';
import { Lease, LeaseStatus } from '../domain';
import {
  leaseFromPrisma,
  leaseToCreateInput,
  leaseToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';

export interface LeaseListFilter extends ListOptions {
  unitId?: string;
  tenantId?: string;
  status?: LeaseStatus;
}

export class LeaseRepository extends BaseRepository<Lease, LeaseListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string): Promise<Lease | null> {
    const row = await this.prisma.lease.findUnique({ where: { id } });
    return row ? leaseFromPrisma(row) : null;
  }

  public async list(filter: LeaseListFilter = {}): Promise<PaginatedResult<Lease>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = {
      ...(filter.unitId ? { unitId: filter.unitId } : {}),
      ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        orderBy: [{ startDate: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.lease.count({ where }),
    ]);
    return { data: rows.map(leaseFromPrisma), total, limit, offset };
  }

  public async create(entity: Lease): Promise<Lease> {
    this.ensureValid(entity);
    const row = await this.prisma.lease.create({ data: leaseToCreateInput(entity) });
    return leaseFromPrisma(row);
  }

  public async update(entity: Lease): Promise<Lease> {
    this.ensureValid(entity);
    const row = await this.prisma.lease.update({
      where: { id: entity.id },
      data: leaseToUpdateInput(entity),
    });
    return leaseFromPrisma(row);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.lease.delete({ where: { id } });
  }
}
