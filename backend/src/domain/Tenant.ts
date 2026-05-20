import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';
import { isValidEmail } from './enums';

export interface TenantProps {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewTenantInput = Omit<TenantProps, 'id' | 'createdAt' | 'updatedAt'>;

export class Tenant extends Entity implements Reportable {
  private readonly _ownerId: string;
  private _firstName: string;
  private _lastName: string;
  private _email: string;
  private _phone: string | null;

  public constructor(props: TenantProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._ownerId = props.ownerId;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._email = props.email;
    this._phone = props.phone;
  }

  public static create(input: NewTenantInput): Tenant {
    const now = new Date();
    return new Tenant({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get ownerId(): string {
    return this._ownerId;
  }
  public get firstName(): string {
    return this._firstName;
  }
  public get lastName(): string {
    return this._lastName;
  }
  public get email(): string {
    return this._email;
  }
  public get phone(): string | null {
    return this._phone;
  }

  public fullName(): string {
    return `${this._firstName} ${this._lastName}`.trim();
  }

  public updateContact(contact: { email: string; phone: string | null }): void {
    this._email = contact.email;
    this._phone = contact.phone;
    this.touch();
  }

  public updateName(firstName: string, lastName: string): void {
    this._firstName = firstName;
    this._lastName = lastName;
    this.touch();
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._ownerId.trim()) errors.push('ownerId is required');
    if (!this._firstName.trim()) errors.push('firstName is required');
    if (!this._lastName.trim()) errors.push('lastName is required');
    if (!isValidEmail(this._email)) errors.push('email must be a valid email address');
    if (this._phone !== null && this._phone.replace(/\D/g, '').length < 7) {
      errors.push('phone must contain at least 7 digits when provided');
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.fullName(),
      email: this._email,
      phone: this._phone ?? '',
    };
  }
}
