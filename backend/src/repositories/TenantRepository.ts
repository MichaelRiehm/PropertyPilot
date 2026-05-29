import { PrismaClient } from '@prisma/client';
import { Tenant } from '../domain';
import {
  tenantFromPrisma,
  tenantToCreateInput,
  tenantToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface TenantListFilter extends ListOptions {
  ownerId: string;
}

export class TenantRepository extends BaseRepository<Tenant, TenantListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findFirst({ where: { id, ownerId } });
    return row ? tenantFromPrisma(row) : null;
  }

  public async list(filter: TenantListFilter): Promise<PaginatedResult<Tenant>> {
    const { page, pageSize, take, skip } = this.resolvePagination(filter);
    const where = { ownerId: filter.ownerId };
    const [rows, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take,
        skip,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return this.paginate(rows.map(tenantFromPrisma), total, page, pageSize);
  }

  public async create(entity: Tenant): Promise<Tenant> {
    this.ensureValid(entity);
    const row = await this.prisma.tenant.create({ data: tenantToCreateInput(entity) });
    return tenantFromPrisma(row);
  }

  public async update(entity: Tenant, ownerId: string): Promise<Tenant> {
    this.ensureValid(entity);
    const result = await this.prisma.tenant.updateMany({
      where: { id: entity.id, ownerId },
      data: tenantToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('Tenant', entity.id);
    }
    const row = await this.prisma.tenant.findUniqueOrThrow({ where: { id: entity.id } });
    return tenantFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.tenant.deleteMany({ where: { id, ownerId } });
    if (result.count === 0) {
      throw new NotFoundError('Tenant', id);
    }
  }

  public async search(query: string, ownerId: string, take = 25): Promise<Tenant[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.prisma.tenant.findMany({
      where: {
        ownerId,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take,
    });
    return rows.map(tenantFromPrisma);
  }
}
