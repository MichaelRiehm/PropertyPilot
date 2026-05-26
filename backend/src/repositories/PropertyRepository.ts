import { PrismaClient } from '@prisma/client';
import { Property } from '../domain';
import {
  propertyFromPrisma,
  propertyToCreateInput,
  propertyToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface PropertyListFilter extends ListOptions {
  ownerId: string;
}

export class PropertyRepository extends BaseRepository<Property, PropertyListFilter> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<Property | null> {
    const row = await this.prisma.property.findFirst({ where: { id, ownerId } });
    return row ? propertyFromPrisma(row) : null;
  }

  public async list(filter: PropertyListFilter): Promise<PaginatedResult<Property>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = { ownerId: filter.ownerId };
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

  public async update(entity: Property, ownerId: string): Promise<Property> {
    this.ensureValid(entity);
    const result = await this.prisma.property.updateMany({
      where: { id: entity.id, ownerId },
      data: propertyToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('Property', entity.id);
    }
    const row = await this.prisma.property.findUniqueOrThrow({ where: { id: entity.id } });
    return propertyFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.property.deleteMany({ where: { id, ownerId } });
    if (result.count === 0) {
      throw new NotFoundError('Property', id);
    }
  }

  public async search(query: string, ownerId: string, take = 25): Promise<Property[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.prisma.property.findMany({
      where: {
        ownerId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { addressLine1: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take,
    });
    return rows.map(propertyFromPrisma);
  }
}
