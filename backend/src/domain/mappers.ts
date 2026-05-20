import type {
  Property as PrismaProperty,
  Unit as PrismaUnit,
  Tenant as PrismaTenant,
  Lease as PrismaLease,
  Transaction as PrismaTransaction,
  MaintenanceTicket as PrismaMaintenanceTicket,
  Prisma,
} from '@prisma/client';

import { Property } from './Property';
import { Unit } from './Unit';
import { Tenant } from './Tenant';
import { Lease } from './Lease';
import { Transaction } from './Transaction';
import { MaintenanceTicket } from './MaintenanceTicket';
import type {
  PropertyType,
  LeaseStatus,
  TransactionType,
  MaintenanceStatus,
  MaintenancePriority,
} from './enums';

// Prisma's Decimal type round-trip helper. Prisma returns Decimal objects for
// @db.Decimal columns; the domain layer holds amounts as plain numbers so that
// validation and arithmetic stay simple. Persistence rebuilds Decimal at the
// boundary.
function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value);
  return value.toNumber();
}

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

export function propertyFromPrisma(row: PrismaProperty): Property {
  return new Property({
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    propertyType: row.propertyType as PropertyType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function propertyToCreateInput(entity: Property): Prisma.PropertyUncheckedCreateInput {
  return {
    id: entity.id,
    ownerId: entity.ownerId,
    name: entity.name,
    addressLine1: entity.addressLine1,
    addressLine2: entity.addressLine2,
    city: entity.city,
    state: entity.state,
    postalCode: entity.postalCode,
    propertyType: entity.propertyType,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function propertyToUpdateInput(entity: Property): Prisma.PropertyUncheckedUpdateInput {
  return {
    name: entity.name,
    addressLine1: entity.addressLine1,
    addressLine2: entity.addressLine2,
    city: entity.city,
    state: entity.state,
    postalCode: entity.postalCode,
    propertyType: entity.propertyType,
    updatedAt: entity.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export function unitFromPrisma(row: PrismaUnit): Unit {
  return new Unit({
    id: row.id,
    propertyId: row.propertyId,
    label: row.label,
    bedrooms: row.bedrooms,
    bathrooms: decimalToNumber(row.bathrooms),
    squareFeet: row.squareFeet,
    marketRent: decimalToNumber(row.marketRent),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function unitToCreateInput(entity: Unit): Prisma.UnitUncheckedCreateInput {
  return {
    id: entity.id,
    propertyId: entity.propertyId,
    label: entity.label,
    bedrooms: entity.bedrooms,
    bathrooms: entity.bathrooms,
    squareFeet: entity.squareFeet,
    marketRent: entity.marketRent,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function unitToUpdateInput(entity: Unit): Prisma.UnitUncheckedUpdateInput {
  return {
    label: entity.label,
    bedrooms: entity.bedrooms,
    bathrooms: entity.bathrooms,
    squareFeet: entity.squareFeet,
    marketRent: entity.marketRent,
    updatedAt: entity.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export function tenantFromPrisma(row: PrismaTenant): Tenant {
  return new Tenant({
    id: row.id,
    ownerId: row.ownerId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function tenantToCreateInput(entity: Tenant): Prisma.TenantUncheckedCreateInput {
  return {
    id: entity.id,
    ownerId: entity.ownerId,
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email,
    phone: entity.phone,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function tenantToUpdateInput(entity: Tenant): Prisma.TenantUncheckedUpdateInput {
  return {
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email,
    phone: entity.phone,
    updatedAt: entity.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Lease
// ---------------------------------------------------------------------------

export function leaseFromPrisma(row: PrismaLease): Lease {
  return new Lease({
    id: row.id,
    unitId: row.unitId,
    tenantId: row.tenantId,
    startDate: row.startDate,
    endDate: row.endDate,
    monthlyRent: decimalToNumber(row.monthlyRent),
    securityDeposit: decimalToNumber(row.securityDeposit),
    status: row.status as LeaseStatus,
    documentLink: row.documentLink,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function leaseToCreateInput(entity: Lease): Prisma.LeaseUncheckedCreateInput {
  return {
    id: entity.id,
    unitId: entity.unitId,
    tenantId: entity.tenantId,
    startDate: entity.startDate,
    endDate: entity.endDate,
    monthlyRent: entity.monthlyRent,
    securityDeposit: entity.securityDeposit,
    status: entity.status,
    documentLink: entity.documentLink,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function leaseToUpdateInput(entity: Lease): Prisma.LeaseUncheckedUpdateInput {
  return {
    endDate: entity.endDate,
    monthlyRent: entity.monthlyRent,
    securityDeposit: entity.securityDeposit,
    status: entity.status,
    documentLink: entity.documentLink,
    updatedAt: entity.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export function transactionFromPrisma(row: PrismaTransaction): Transaction {
  return new Transaction({
    id: row.id,
    propertyId: row.propertyId,
    unitId: row.unitId,
    leaseId: row.leaseId,
    type: row.type as TransactionType,
    category: row.category,
    amount: decimalToNumber(row.amount),
    date: row.date,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function transactionToCreateInput(
  entity: Transaction,
): Prisma.TransactionUncheckedCreateInput {
  return {
    id: entity.id,
    propertyId: entity.propertyId,
    unitId: entity.unitId,
    leaseId: entity.leaseId,
    type: entity.type,
    category: entity.category,
    amount: entity.amount,
    date: entity.date,
    description: entity.description,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function transactionToUpdateInput(
  entity: Transaction,
): Prisma.TransactionUncheckedUpdateInput {
  return {
    category: entity.category,
    amount: entity.amount,
    description: entity.description,
    updatedAt: entity.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// MaintenanceTicket
// ---------------------------------------------------------------------------

export function maintenanceTicketFromPrisma(row: PrismaMaintenanceTicket): MaintenanceTicket {
  return new MaintenanceTicket({
    id: row.id,
    propertyId: row.propertyId,
    unitId: row.unitId,
    title: row.title,
    description: row.description,
    status: row.status as MaintenanceStatus,
    priority: row.priority as MaintenancePriority,
    reportedAt: row.reportedAt,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function maintenanceTicketToCreateInput(
  entity: MaintenanceTicket,
): Prisma.MaintenanceTicketUncheckedCreateInput {
  return {
    id: entity.id,
    propertyId: entity.propertyId,
    unitId: entity.unitId,
    title: entity.title,
    description: entity.description,
    status: entity.status,
    priority: entity.priority,
    reportedAt: entity.reportedAt,
    resolvedAt: entity.resolvedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function maintenanceTicketToUpdateInput(
  entity: MaintenanceTicket,
): Prisma.MaintenanceTicketUncheckedUpdateInput {
  return {
    title: entity.title,
    description: entity.description,
    status: entity.status,
    priority: entity.priority,
    resolvedAt: entity.resolvedAt,
    updatedAt: entity.updatedAt,
  };
}
