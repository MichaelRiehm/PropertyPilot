import { PrismaClient } from '@prisma/client';
import { MaintenanceStatus, MaintenanceTicket } from '../domain';
import {
  maintenanceTicketFromPrisma,
  maintenanceTicketToCreateInput,
  maintenanceTicketToUpdateInput,
} from '../domain/mappers';
import { BaseRepository, ListOptions, PaginatedResult } from './BaseRepository';
import { NotFoundError } from '../errors';

export interface MaintenanceTicketListFilter extends ListOptions {
  ownerId: string;
  propertyId?: string;
  status?: MaintenanceStatus;
  openOnly?: boolean;
}

export class MaintenanceTicketRepository extends BaseRepository<
  MaintenanceTicket,
  MaintenanceTicketListFilter
> {
  public constructor(prisma: PrismaClient) {
    super(prisma);
  }

  public async findById(id: string, ownerId: string): Promise<MaintenanceTicket | null> {
    const row = await this.prisma.maintenanceTicket.findFirst({
      where: { id, property: { ownerId } },
    });
    return row ? maintenanceTicketFromPrisma(row) : null;
  }

  public async list(
    filter: MaintenanceTicketListFilter,
  ): Promise<PaginatedResult<MaintenanceTicket>> {
    const { limit, offset } = this.normalizePagination(filter);
    const where = {
      property: { ownerId: filter.ownerId },
      ...(filter.propertyId ? { propertyId: filter.propertyId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.openOnly ? { status: { in: ['OPEN', 'IN_PROGRESS'] as MaintenanceStatus[] } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where,
        orderBy: [{ reportedAt: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);
    return { data: rows.map(maintenanceTicketFromPrisma), total, limit, offset };
  }

  public async create(entity: MaintenanceTicket): Promise<MaintenanceTicket> {
    this.ensureValid(entity);
    const row = await this.prisma.maintenanceTicket.create({
      data: maintenanceTicketToCreateInput(entity),
    });
    return maintenanceTicketFromPrisma(row);
  }

  public async update(
    entity: MaintenanceTicket,
    ownerId: string,
  ): Promise<MaintenanceTicket> {
    this.ensureValid(entity);
    const result = await this.prisma.maintenanceTicket.updateMany({
      where: { id: entity.id, property: { ownerId } },
      data: maintenanceTicketToUpdateInput(entity),
    });
    if (result.count === 0) {
      throw new NotFoundError('MaintenanceTicket', entity.id);
    }
    const row = await this.prisma.maintenanceTicket.findUniqueOrThrow({
      where: { id: entity.id },
    });
    return maintenanceTicketFromPrisma(row);
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const result = await this.prisma.maintenanceTicket.deleteMany({
      where: { id, property: { ownerId } },
    });
    if (result.count === 0) {
      throw new NotFoundError('MaintenanceTicket', id);
    }
  }
}
