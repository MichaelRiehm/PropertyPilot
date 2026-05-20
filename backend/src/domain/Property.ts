import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';
import { PropertyType } from './enums';

export interface PropertyProps {
  id: string;
  ownerId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  propertyType: PropertyType;
  createdAt: Date;
  updatedAt: Date;
}

export type NewPropertyInput = Omit<PropertyProps, 'id' | 'createdAt' | 'updatedAt'>;

export class Property extends Entity implements Reportable {
  private readonly _ownerId: string;
  private _name: string;
  private _addressLine1: string;
  private _addressLine2: string | null;
  private _city: string;
  private _state: string;
  private _postalCode: string;
  private _propertyType: PropertyType;

  public constructor(props: PropertyProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._ownerId = props.ownerId;
    this._name = props.name;
    this._addressLine1 = props.addressLine1;
    this._addressLine2 = props.addressLine2;
    this._city = props.city;
    this._state = props.state;
    this._postalCode = props.postalCode;
    this._propertyType = props.propertyType;
  }

  public static create(input: NewPropertyInput): Property {
    const now = new Date();
    return new Property({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get ownerId(): string {
    return this._ownerId;
  }
  public get name(): string {
    return this._name;
  }
  public get addressLine1(): string {
    return this._addressLine1;
  }
  public get addressLine2(): string | null {
    return this._addressLine2;
  }
  public get city(): string {
    return this._city;
  }
  public get state(): string {
    return this._state;
  }
  public get postalCode(): string {
    return this._postalCode;
  }
  public get propertyType(): PropertyType {
    return this._propertyType;
  }

  public rename(name: string): void {
    this._name = name;
    this.touch();
  }

  public updateAddress(addr: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  }): void {
    this._addressLine1 = addr.addressLine1;
    this._addressLine2 = addr.addressLine2;
    this._city = addr.city;
    this._state = addr.state;
    this._postalCode = addr.postalCode;
    this.touch();
  }

  public changeType(propertyType: PropertyType): void {
    this._propertyType = propertyType;
    this.touch();
  }

  public fullAddress(): string {
    const line2 = this._addressLine2 ? `, ${this._addressLine2}` : '';
    return `${this._addressLine1}${line2}, ${this._city}, ${this._state} ${this._postalCode}`;
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._ownerId.trim()) errors.push('ownerId is required');
    if (!this._name.trim()) errors.push('name is required');
    if (this._name.length > 120) errors.push('name must be 120 characters or fewer');
    if (!this._addressLine1.trim()) errors.push('addressLine1 is required');
    if (!this._city.trim()) errors.push('city is required');
    if (!/^[A-Z]{2}$/.test(this._state)) errors.push('state must be a 2-letter US state code (uppercase)');
    if (!/^\d{5}(-\d{4})?$/.test(this._postalCode)) errors.push('postalCode must be 5 digits or ZIP+4');
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      name: this._name,
      address: this.fullAddress(),
      propertyType: this._propertyType,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
