export type PropertyType =
  | 'SINGLE_FAMILY'
  | 'MULTI_FAMILY'
  | 'DUPLEX'
  | 'TRIPLEX'
  | 'FOURPLEX'
  | 'CONDO'
  | 'TOWNHOUSE'
  | 'OTHER';

export type LeaseStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export type TransactionType =
  | 'RENT_INCOME'
  | 'DEPOSIT_INCOME'
  | 'OTHER_INCOME'
  | 'EXPENSE'
  | 'REFUND';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
