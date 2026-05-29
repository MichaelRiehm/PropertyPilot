import { PrismaClient } from '@prisma/client';
import { Lease, LeaseStatus } from '../domain';
import {
  leaseFromPrisma,
  leaseToCreateInput,
  leaseToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface LeaseListFilter extends ListOptions {
  ownerId: string;
  unitId?: string;
  tenantId?: string;
  status?: LeaseStatus;
}

export class LeaseRepository extends BaseRepository<Lease, LeaseListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<Lease | null> {
    const row = await this.prisma.lease.findFirst({
      where: { id, unit: { property: { ownerId } } },
    });
    return row ? leaseFromPrisma(row) : null;
  }

  public async list(filter: LeaseListFilter): Promise<PaginatedResult<Lease>> {
    const { page, pageSize, take, skip } = this.resolvePagination(filter);
    const where = {
      unit: { property: { ownerId: filter.ownerId } },
      ...(filter.unitId ? { unitId: filter.unitId } : {}),
      ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.lease.findMany({
        where,
        orderBy: [{ startDate: 'desc' }],
        take,
        skip,
      }),
      this.prisma.lease.count({ where }),
    ]);
    return this.paginate(rows.map(leaseFromPrisma), total, page, pageSize);
  }

  public async create(entity: Lease): Promise<Lease> {
    this.ensureValid(entity);
    const row = await this.prisma.lease.create({ data: leaseToCreateInput(entity) });
    return leaseFromPrisma(row);
  }

  public async update(entity: Lease, ownerId: string): Promise<Lease> {
    this.ensureValid(entity);
    const result = await this.prisma.lease.updateMany({
      where: { id: entity.id, unit: { property: { ownerId } } },
      data: leaseToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('Lease', entity.id);
    }
    const row = await this.prisma.lease.findUniqueOrThrow({ where: { id: entity.id } });
    return leaseFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.lease.deleteMany({
      where: { id, unit: { property: { ownerId } } },
    });
    if (result.count === 0) {
      throw new NotFoundError('Lease', id);
    }
  }
}
