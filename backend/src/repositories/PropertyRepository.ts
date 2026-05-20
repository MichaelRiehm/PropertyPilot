import { PrismaClient } from '@prisma/client';
import { Property } from '../domain';
import {
  propertyFromPrisma,
  propertyToCreateInput,
  propertyToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';

export interface PropertyListFilter extends ListOptions {
  ownerId?: string;
}

export class PropertyRepository extends BaseRepository<Property, PropertyListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string): Promise<Property | null> {
    const row = await this.prisma.property.findUnique({ where: { id } });
    return row ? propertyFromPrisma(row) : null;
  }

  public async list(filter: PropertyListFilter = {}): Promise<PaginatedResult<Property>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = filter.ownerId ? { ownerId: filter.ownerId } : {};
    const [rows, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.property.count({ where }),
    ]);
    return { data: rows.map(propertyFromPrisma), total, limit, offset };
  }

  public async create(entity: Property): Promise<Property> {
    this.ensureValid(entity);
    const row = await this.prisma.property.create({ data: propertyToCreateInput(entity) });
    return propertyFromPrisma(row);
  }

  public async update(entity: Property): Promise<Property> {
    this.ensureValid(entity);
    const row = await this.prisma.property.update({
      where: { id: entity.id },
      data: propertyToUpdateInput(entity),
    });
    return propertyFromPrisma(row);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.property.delete({ where: { id } });
  }
}
