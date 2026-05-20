import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';

export interface UnitProps {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRent: number;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUnitInput = Omit<UnitProps, 'id' | 'createdAt' | 'updatedAt'>;

export class Unit extends Entity implements Reportable {
  private readonly _propertyId: string;
  private _label: string;
  private _bedrooms: number;
  private _bathrooms: number;
  private _squareFeet: number | null;
  private _marketRent: number;

  public constructor(props: UnitProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._propertyId = props.propertyId;
    this._label = props.label;
    this._bedrooms = props.bedrooms;
    this._bathrooms = props.bathrooms;
    this._squareFeet = props.squareFeet;
    this._marketRent = props.marketRent;
  }

  public static create(input: NewUnitInput): Unit {
    const now = new Date();
    return new Unit({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get propertyId(): string {
    return this._propertyId;
  }
  public get label(): string {
    return this._label;
  }
  public get bedrooms(): number {
    return this._bedrooms;
  }
  public get bathrooms(): number {
    return this._bathrooms;
  }
  public get squareFeet(): number | null {
    return this._squareFeet;
  }
  public get marketRent(): number {
    return this._marketRent;
  }

  public relabel(label: string): void {
    this._label = label;
    this.touch();
  }

  public updateSpecs(specs: { bedrooms: number; bathrooms: number; squareFeet: number | null }): void {
    this._bedrooms = specs.bedrooms;
    this._bathrooms = specs.bathrooms;
    this._squareFeet = specs.squareFeet;
    this.touch();
  }

  public setMarketRent(amount: number): void {
    this._marketRent = amount;
    this.touch();
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._propertyId.trim()) errors.push('propertyId is required');
    if (!this._label.trim()) errors.push('label is required');
    if (!Number.isInteger(this._bedrooms) || this._bedrooms < 0) errors.push('bedrooms must be a non-negative integer');
    if (this._bathrooms < 0) errors.push('bathrooms must be non-negative');
    if (this._squareFeet !== null && (!Number.isInteger(this._squareFeet) || this._squareFeet < 0)) {
      errors.push('squareFeet must be a non-negative integer when provided');
    }
    if (this._marketRent < 0) errors.push('marketRent must be non-negative');
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      label: this._label,
      bedrooms: this._bedrooms,
      bathrooms: this._bathrooms,
      squareFeet: this._squareFeet,
      marketRent: this._marketRent,
    };
  }
}
