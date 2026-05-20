import { PrismaClient } from '@prisma/client';
import { Tenant } from '../domain';
import {
  tenantFromPrisma,
  tenantToCreateInput,
  tenantToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';

export interface TenantListFilter extends ListOptions {
  ownerId?: string;
}

export class TenantRepository extends BaseRepository<Tenant, TenantListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({ where: { id } });
    return row ? tenantFromPrisma(row) : null;
  }

  public async list(filter: TenantListFilter = {}): Promise<PaginatedResult<Tenant>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = filter.ownerId ? { ownerId: filter.ownerId } : {};
    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data: rows.map(tenantFromPrisma), total, limit, offset };
  }

  public async create(entity: Tenant): Promise<Tenant> {
    this.ensureValid(entity);
    const row = await this.prisma.tenant.create({ data: tenantToCreateInput(entity) });
    return tenantFromPrisma(row);
  }

  public async update(entity: Tenant): Promise<Tenant> {
    this.ensureValid(entity);
    const row = await this.prisma.tenant.update({
      where: { id: entity.id },
      data: tenantToUpdateInput(entity),
    });
    return tenantFromPrisma(row);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.tenant.delete({ where: { id } });
  }
}
