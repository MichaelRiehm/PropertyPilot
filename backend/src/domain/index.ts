export { Entity, DomainValidationError, type ValidationResult } from './Entity';
export { type Reportable } from './Reportable';
export {
  type PropertyType,
  type LeaseStatus,
  type TransactionType,
  type MaintenanceStatus,
  type MaintenancePriority,
  isValidEmail,
} from './enums';
export { Property, type PropertyProps, type NewPropertyInput } from './Property';
export { Unit, type UnitProps, type NewUnitInput } from './Unit';
export { Tenant, type TenantProps, type NewTenantInput } from './Tenant';
export { Lease, type LeaseProps, type NewLeaseInput } from './Lease';
export { Transaction, type TransactionProps, type NewTransactionInput } from './Transaction';
export {
  MaintenanceTicket,
  type MaintenanceTicketProps,
  type NewMaintenanceTicketInput,
} from './MaintenanceTicket';
