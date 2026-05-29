import { PrismaClient } from '@prisma/client';
import { DomainValidationError, Entity } from '../domain';

export interface ListOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  take: number;
  skip: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

export abstract class BaseRepository<T extends Entity, F extends ListOptions = ListOptions> {
  protected readonly prisma: PrismaClient;

  protected constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public abstract findById(id: string, ownerId: string): Promise<T | null>;
  public abstract list(filter: F): Promise<PaginatedResult<T>>;
  public abstract create(entity: T): Promise<T>;
  public abstract update(entity: T, ownerId: string): Promise<T>;
  public abstract delete(id: string, ownerId: string): Promise<void>;

  protected ensureValid(entity: T): void {
    const result = entity.validate();
    if (!result.ok) {
      throw new DomainValidationError(result.errors);
    }
  }

  protected resolvePagination(filter: ListOptions | undefined): ResolvedPagination {
    const page = Math.max(filter?.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(filter?.pageSize ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    return { page, pageSize, take: pageSize, skip: (page - 1) * pageSize };
  }

  protected paginate<U>(rows: U[], total: number, page: number, pageSize: number): PaginatedResult<U> {
    return {
      data: rows,
      total,
      page,
      pageSize,
      totalPages: pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
    };
  }
}
