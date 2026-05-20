import { randomUUID } from 'crypto';
import { Entity, ValidationResult } from './Entity';
import { Reportable } from './Reportable';
import { TransactionType } from './enums';

export interface TransactionProps {
  id: string;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  type: TransactionType;
  category: string | null;
  amount: number;
  date: Date;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewTransactionInput = Omit<TransactionProps, 'id' | 'createdAt' | 'updatedAt'>;

const INCOME_TYPES: ReadonlyArray<TransactionType> = ['RENT_INCOME', 'DEPOSIT_INCOME', 'OTHER_INCOME'];

export class Transaction extends Entity implements Reportable {
  private readonly _propertyId: string;
  private readonly _unitId: string | null;
  private readonly _leaseId: string | null;
  private readonly _type: TransactionType;
  private readonly _date: Date;
  private _category: string | null;
  private _amount: number;
  private _description: string;

  public constructor(props: TransactionProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._propertyId = props.propertyId;
    this._unitId = props.unitId;
    this._leaseId = props.leaseId;
    this._type = props.type;
    this._category = props.category;
    this._amount = props.amount;
    this._date = props.date;
    this._description = props.description;
  }

  public static create(input: NewTransactionInput): Transaction {
    const now = new Date();
    return new Transaction({
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
  public get leaseId(): string | null {
    return this._leaseId;
  }
  public get type(): TransactionType {
    return this._type;
  }
  public get category(): string | null {
    return this._category;
  }
  public get amount(): number {
    return this._amount;
  }
  public get date(): Date {
    return new Date(this._date);
  }
  public get description(): string {
    return this._description;
  }

  public isIncome(): boolean {
    return INCOME_TYPES.includes(this._type);
  }

  public signedAmount(): number {
    return this.isIncome() ? Math.abs(this._amount) : -Math.abs(this._amount);
  }

  public reclassify(category: string | null): void {
    this._category = category;
    this.touch();
  }

  public correctAmount(amount: number): void {
    this._amount = amount;
    this.touch();
  }

  public updateDescription(description: string): void {
    this._description = description;
    this.touch();
  }

  public validate(): ValidationResult {
    const errors: string[] = [];
    if (!this._propertyId.trim()) errors.push('propertyId is required');
    if (this._amount === 0 || Number.isNaN(this._amount)) errors.push('amount must be a non-zero number');
    if (!(this._date instanceof Date) || Number.isNaN(this._date.getTime())) errors.push('date is invalid');
    if (!this._description.trim()) errors.push('description is required');
    if (this._type === 'RENT_INCOME' && this._leaseId === null) {
      errors.push('RENT_INCOME transactions must be linked to a lease');
    }
    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  }

  public toReportRow(): Record<string, unknown> {
    return {
      id: this.id,
      date: this._date.toISOString().slice(0, 10),
      type: this._type,
      category: this._category ?? '',
      amount: this._amount,
      signedAmount: this.signedAmount(),
      description: this._description,
    };
  }
}
