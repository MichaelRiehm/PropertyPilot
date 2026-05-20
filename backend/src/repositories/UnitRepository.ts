import { PrismaClient } from '@prisma/client';
import { Unit } from '../domain';
import {
  unitFromPrisma,
  unitToCreateInput,
  unitToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';

export interface UnitListFilter extends ListOptions {
  propertyId?: string;
}

export class UnitRepository extends BaseRepository<Unit, UnitListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string): Promise<Unit | null> {
    const row = await this.prisma.unit.findUnique({ where: { id } });
    return row ? unitFromPrisma(row) : null;
  }

  public async list(filter: UnitListFilter = {}): Promise<PaginatedResult<Unit>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = filter.propertyId ? { propertyId: filter.propertyId } : {};
    const [rows, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        orderBy: [{ propertyId: 'asc' }, { label: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.unit.count({ where }),
    ]);
    return { data: rows.map(unitFromPrisma), total, limit, offset };
  }

  public async create(entity: Unit): Promise<Unit> {
    this.ensureValid(entity);
    const row = await this.prisma.unit.create({ data: unitToCreateInput(entity) });
    return unitFromPrisma(row);
  }

  public async update(entity: Unit): Promise<Unit> {
    this.ensureValid(entity);
    const row = await this.prisma.unit.update({
      where: { id: entity.id },
      data: unitToUpdateInput(entity),
    });
    return unitFromPrisma(row);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.unit.delete({ where: { id } });
  }
}
