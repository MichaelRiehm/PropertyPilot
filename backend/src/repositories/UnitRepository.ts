import { PrismaClient } from '@prisma/client';
import { Unit } from '../domain';
import {
  unitFromPrisma,
  unitToCreateInput,
  unitToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface UnitListFilter extends ListOptions {
  ownerId: string;
  propertyId?: string;
}

export class UnitRepository extends BaseRepository<Unit, UnitListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<Unit | null> {
    const row = await this.prisma.unit.findFirst({
      where: { id, property: { ownerId } },
    });
    return row ? unitFromPrisma(row) : null;
  }

  public async list(filter: UnitListFilter): Promise<PaginatedResult<Unit>> {
    const { page, pageSize, take, skip } = this.resolvePagination(filter);
    const where = {
      property: { ownerId: filter.ownerId },
      ...(filter.propertyId ? { propertyId: filter.propertyId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        orderBy: [{ propertyId: 'asc' }, { label: 'asc' }],
        take,
        skip,
      }),
      this.prisma.unit.count({ where }),
    ]);
    return this.paginate(rows.map(unitFromPrisma), total, page, pageSize);
  }

  public async create(entity: Unit): Promise<Unit> {
    this.ensureValid(entity);
    const row = await this.prisma.unit.create({ data: unitToCreateInput(entity) });
    return unitFromPrisma(row);
  }

  public async update(entity: Unit, ownerId: string): Promise<Unit> {
    this.ensureValid(entity);
    const result = await this.prisma.unit.updateMany({
      where: { id: entity.id, property: { ownerId } },
      data: unitToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('Unit', entity.id);
    }
    const row = await this.prisma.unit.findUniqueOrThrow({ where: { id: entity.id } });
    return unitFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.unit.deleteMany({
      where: { id, property: { ownerId } },
    });
    if (result.count === 0) {
      throw new NotFoundError('Unit', id);
    }
  }
}
