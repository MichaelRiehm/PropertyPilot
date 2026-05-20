import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';
import { LeaseStatus } from './enums';

export interface LeaseProps {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  documentLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewLeaseInput = Omit<LeaseProps, 'id' | 'createdAt' | 'updatedAt'>;

export class Lease extends Entity implements Reportable {
  private readonly _unitId: string;
  private readonly _tenantId: string;
  private readonly _startDate: Date;
  private _endDate: Date;
  private _monthlyRent: number;
  private _securityDeposit: number;
  private _status: LeaseStatus;
  private _documentLink: string | null;

  public constructor(props: LeaseProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._unitId = props.unitId;
    this._tenantId = props.tenantId;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._monthlyRent = props.monthlyRent;
    this._securityDeposit = props.securityDeposit;
    this._status = props.status;
    this._documentLink = props.documentLink;
  }

  public static create(input: NewLeaseInput): Lease {
    const now = new Date();
    return new Lease({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get unitId(): string {
    return this._unitId;
  }
  public get tenantId(): string {
    return this._tenantId;
  }
  public get startDate(): Date {
    return new Date(this._startDate);
  }
  public get endDate(): Date {
    return new Date(this._endDate);
  }
  public get monthlyRent(): number {
    return this._monthlyRent;
  }
  public get securityDeposit(): number {
    return this._securityDeposit;
  }
  public get status(): LeaseStatus {
    return this._status;
  }
  public get documentLink(): string | null {
    return this._documentLink;
  }

  public activate(): void {
    this._status = 'ACTIVE';
    this.touch();
  }

  public terminate(): void {
    this._status = 'TERMINATED';
    this.touch();
  }

  public extendTo(endDate: Date): void {
    this._endDate = endDate;
    this.touch();
  }

  public setRent(monthlyRent: number, securityDeposit: number): void {
    this._monthlyRent = monthlyRent;
    this._securityDeposit = securityDeposit;
    this.touch();
  }

  public attachDocument(url: string | null): void {
    this._documentLink = url;
    this.touch();
  }

  public isActiveOn(date: Date): boolean {
    return (
      this._status === 'ACTIVE' &&
      date >= this._startDate &&
      date <= this._endDate
    );
  }

  public termInMonths(): number {
    const ms = this._endDate.getTime() - this._startDate.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24 * 30.4375));
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._unitId.trim()) errors.push('unitId is required');
    if (!this._tenantId.trim()) errors.push('tenantId is required');
    if (!(this._startDate instanceof Date) || Number.isNaN(this._startDate.getTime())) {
      errors.push('startDate is invalid');
    }
    if (!(this._endDate instanceof Date) || Number.isNaN(this._endDate.getTime())) {
      errors.push('endDate is invalid');
    }
    if (this._startDate >= this._endDate) errors.push('startDate must be before endDate');
    if (this._monthlyRent <= 0) errors.push('monthlyRent must be greater than 0');
    if (this._securityDeposit < 0) errors.push('securityDeposit must be non-negative');
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      unitId: this._unitId,
      tenantId: this._tenantId,
      startDate: this._startDate.toISOString().slice(0, 10),
      endDate: this._endDate.toISOString().slice(0, 10),
      monthlyRent: this._monthlyRent,
      status: this._status,
    };
  }
}
