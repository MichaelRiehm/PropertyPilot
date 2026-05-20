import { PrismaClient } from '@prisma/client';
import { DomainValidationError, Entity } from '../domain';

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export abstract class BaseRepository<T extends Entity, F extends ListOptions = ListOptions> {
  protected readonly prisma: PrismaClient;

  protected constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public abstract findById(id: string): Promise<T | null>;
  public abstract list(filter?: F): Promise<PaginatedResult<T>>;
  public abstract create(entity: T): Promise<T>;
  public abstract update(entity: T): Promise<T>;
  public abstract delete(id: string): Promise<void>;

  protected ensureValid(entity: T): void {
    const result = entity.validate();
    if (!result.ok) {
      throw new DomainValidationError(result.errors);
    }
  }

  protected normalizePagination(filter: ListOptions | undefined): { limit: number; offset: number } {
    const limit = Math.min(Math.max(filter?.limit ?? 50, 1), 200);
    const offset = Math.max(filter?.offset ?? 0, 0);
    return { limit, offset };
  }
}
