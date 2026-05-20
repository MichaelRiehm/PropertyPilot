import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';
import { MaintenancePriority, MaintenanceStatus } from './enums';

export interface MaintenanceTicketProps {
  id: string;
  propertyId: string;
  unitId: string | null;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reportedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewMaintenanceTicketInput = Omit<
  MaintenanceTicketProps,
  'id' | 'createdAt' | 'updatedAt'
>;

export class MaintenanceTicket extends Entity implements Reportable {
  private readonly _propertyId: string;
  private readonly _unitId: string | null;
  private readonly _reportedAt: Date;
  private _title: string;
  private _description: string;
  private _status: MaintenanceStatus;
  private _priority: MaintenancePriority;
  private _resolvedAt: Date | null;

  public constructor(props: MaintenanceTicketProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._propertyId = props.propertyId;
    this._unitId = props.unitId;
    this._reportedAt = props.reportedAt;
    this._title = props.title;
    this._description = props.description;
    this._status = props.status;
    this._priority = props.priority;
    this._resolvedAt = props.resolvedAt;
  }

  public static create(input: NewMaintenanceTicketInput): MaintenanceTicket {
    const now = new Date();
    return new MaintenanceTicket({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  public get propertyId(): string {
    return this._propertyId;
  }
  public get unitId(): string | null {
    return this._unitId;
  }
  public get title(): string {
    return this._title;
  }
  public get description(): string {
    return this._description;
  }
  public get status(): MaintenanceStatus {
    return this._status;
  }
  public get priority(): MaintenancePriority {
    return this._priority;
  }
  public get reportedAt(): Date {
    return new Date(this._reportedAt);
  }
  public get resolvedAt(): Date | null {
    return this._resolvedAt ? new Date(this._resolvedAt) : null;
  }

  public isOpen(): boolean {
    return this._status === 'OPEN' || this._status === 'IN_PROGRESS';
  }

  public ageInDays(asOf: Date = new Date()): number {
    const end = this._resolvedAt ?? asOf;
    const ms = end.getTime() - this._reportedAt.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  public updateDetails(details: { title: string; description: string }): void {
    this._title = details.title;
    this._description = details.description;
    this.touch();
  }

  public setPriority(priority: MaintenancePriority): void {
    this._priority = priority;
    this.touch();
  }

  public start(): void {
    this._status = 'IN_PROGRESS';
    this.touch();
  }

  public close(resolvedAt: Date = new Date()): void {
    this._status = 'CLOSED';
    this._resolvedAt = resolvedAt;
    this.touch();
  }

  public cancel(): void {
    this._status = 'CANCELED';
    this._resolvedAt = new Date();
    this.touch();
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._propertyId.trim()) errors.push('propertyId is required');
    if (!this._title.trim()) errors.push('title is required');
    if (!this._description.trim()) errors.push('description is required');
    if (!(this._reportedAt instanceof Date) || Number.isNaN(this._reportedAt.getTime())) {
      errors.push('reportedAt is invalid');
    }
    if (this._resolvedAt !== null) {
      if (Number.isNaN(this._resolvedAt.getTime())) errors.push('resolvedAt is invalid');
      else if (this._resolvedAt < this._reportedAt) errors.push('resolvedAt cannot be before reportedAt');
    }
    if ((this._status === 'CLOSED' || this._status === 'CANCELED') && this._resolvedAt === null) {
      errors.push('closed/canceled tickets must have a resolvedAt timestamp');
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      title: this._title,
      status: this._status,
      priority: this._priority,
      reportedAt: this._reportedAt.toISOString().slice(0, 10),
      resolvedAt: this._resolvedAt ? this._resolvedAt.toISOString().slice(0, 10) : null,
      ageDays: this.ageInDays(),
    };
  }
}
