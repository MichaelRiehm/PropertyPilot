export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export abstract class Entity {
  private readonly _id: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor(id: string, createdAt: Date, updatedAt: Date) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  public abstract validate(): ValidationResult;
}

export class DomainValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Domain validation failed: ${errors.join('; ')}`);
    this.name = 'DomainValidationError';
    this.errors = errors;
  }
}
