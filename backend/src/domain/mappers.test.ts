import { describe, expect, it } from 'vitest';
import {
  leaseFromPrisma,
  leaseToCreateInput,
  maintenanceTicketFromPrisma,
  maintenanceTicketToCreateInput,
  propertyFromPrisma,
  propertyToCreateInput,
  tenantFromPrisma,
  tenantToCreateInput,
  transactionFromPrisma,
  transactionToCreateInput,
  unitFromPrisma,
  unitToCreateInput,
} from './mappers';
import { Property } from './Property';
import { Unit } from './Unit';
import { Tenant } from './Tenant';
import { Lease } from './Lease';
import { Transaction } from './Transaction';
import { MaintenanceTicket } from './MaintenanceTicket';

// Helper: build a fake Prisma row from a domain entity by walking it through
// the toCreateInput mapper. This lets us assert that fromPrisma reconstructs an
// equivalent domain instance without hitting the database. Decimal-typed
// columns are exercised with plain numbers since the mapper accepts number,
// string, or Prisma.Decimal.
function asRow<T extends object>(input: T): T {
  return { ...input };
}

describe('propertyFromPrisma / propertyToCreateInput', () => {
  it('round-trips through the mappers preserving every field', () => {
    const original = Property.create({
      ownerId: 'owner-1',
      name: 'Maple Court',
      addressLine1: '128 Maple Ct',
      addressLine2: 'Apt 2',
      city: 'Madison',
      state: 'WI',
      postalCode: '53703',
      propertyType: 'DUPLEX',
    });
    const input = propertyToCreateInput(original);
    const row = asRow(input);
    const back = propertyFromPrisma(row as Parameters<typeof propertyFromPrisma>[0]);
    expect(back.id).toBe(original.id);
    expect(back.ownerId).toBe(original.ownerId);
    expect(back.name).toBe(original.name);
    expect(back.addressLine1).toBe(original.addressLine1);
    expect(back.addressLine2).toBe(original.addressLine2);
    expect(back.city).toBe(original.city);
    expect(back.state).toBe(original.state);
    expect(back.postalCode).toBe(original.postalCode);
    expect(back.propertyType).toBe(original.propertyType);
  });

  it('preserves null addressLine2', () => {
    const original = Property.create({
      ownerId: 'owner-2',
      name: 'Pine Condo',
      addressLine1: '702 Pine',
      addressLine2: null,
      city: 'Madison',
      state: 'WI',
      postalCode: '53704',
      propertyType: 'CONDO',
    });
    const row = asRow(propertyToCreateInput(original));
    const back = propertyFromPrisma(row as Parameters<typeof propertyFromPrisma>[0]);
    expect(back.addressLine2).toBeNull();
  });
});

describe('unitFromPrisma / unitToCreateInput', () => {
  it('round-trips numeric fields cleanly', () => {
    const original = Unit.create({
      propertyId: 'prop-1',
      label: 'Apt 1',
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 900,
      marketRent: 1500,
    });
    const row = asRow(unitToCreateInput(original));
    const back = unitFromPrisma(row as Parameters<typeof unitFromPrisma>[0]);
    expect(back.label).toBe('Apt 1');
    expect(back.bedrooms).toBe(2);
    expect(back.bathrooms).toBe(1.5);
    expect(back.squareFeet).toBe(900);
    expect(back.marketRent).toBe(1500);
  });

  it('preserves null squareFeet', () => {
    const original = Unit.create({
      propertyId: 'prop-1',
      label: 'Apt 2',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: null,
      marketRent: 1100,
    });
    const row = asRow(unitToCreateInput(original));
    const back = unitFromPrisma(row as Parameters<typeof unitFromPrisma>[0]);
    expect(back.squareFeet).toBeNull();
  });
});

describe('tenantFromPrisma / tenantToCreateInput', () => {
  it('round-trips name, email, and phone', () => {
    const original = Tenant.create({
      ownerId: 'owner-1',
      firstName: 'Sam',
      lastName: 'Smith',
      email: 'sam@example.com',
      phone: '6085551212',
    });
    const row = asRow(tenantToCreateInput(original));
    const back = tenantFromPrisma(row as Parameters<typeof tenantFromPrisma>[0]);
    expect(back.firstName).toBe('Sam');
    expect(back.lastName).toBe('Smith');
    expect(back.email).toBe('sam@example.com');
    expect(back.phone).toBe('6085551212');
  });
});

describe('leaseFromPrisma / leaseToCreateInput', () => {
  it('round-trips dates and currency fields', () => {
    const original = Lease.create({
      unitId: 'unit-1',
      tenantId: 'tenant-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
      documentLink: null,
    });
    const row = asRow(leaseToCreateInput(original));
    const back = leaseFromPrisma(row as Parameters<typeof leaseFromPrisma>[0]);
    expect(back.unitId).toBe('unit-1');
    expect(back.tenantId).toBe('tenant-1');
    expect(back.startDate.toISOString()).toBe(new Date('2026-01-01').toISOString());
    expect(back.endDate.toISOString()).toBe(new Date('2027-01-01').toISOString());
    expect(back.monthlyRent).toBe(1500);
    expect(back.securityDeposit).toBe(1500);
    expect(back.status).toBe('ACTIVE');
    expect(back.documentLink).toBeNull();
  });
});

describe('transactionFromPrisma / transactionToCreateInput', () => {
  it('round-trips a rent income transaction with lease/unit links', () => {
    const original = Transaction.create({
      propertyId: 'prop-1',
      unitId: 'unit-1',
      leaseId: 'lease-1',
      type: 'RENT_INCOME',
      category: 'rent',
      amount: 1500,
      date: new Date('2026-05-01'),
      description: 'Rent for May',
    });
    const row = asRow(transactionToCreateInput(original));
    const back = transactionFromPrisma(row as Parameters<typeof transactionFromPrisma>[0]);
    expect(back.propertyId).toBe('prop-1');
    expect(back.unitId).toBe('unit-1');
    expect(back.leaseId).toBe('lease-1');
    expect(back.type).toBe('RENT_INCOME');
    expect(back.category).toBe('rent');
    expect(back.amount).toBe(1500);
    expect(back.description).toBe('Rent for May');
  });

  it('round-trips an expense without unit/lease', () => {
    const original = Transaction.create({
      propertyId: 'prop-1',
      unitId: null,
      leaseId: null,
      type: 'EXPENSE',
      category: 'repairs',
      amount: 250,
      date: new Date('2026-05-15'),
      description: 'Plumbing',
    });
    const row = asRow(transactionToCreateInput(original));
    const back = transactionFromPrisma(row as Parameters<typeof transactionFromPrisma>[0]);
    expect(back.unitId).toBeNull();
    expect(back.leaseId).toBeNull();
    expect(back.signedAmount()).toBe(-250);
  });
});

describe('maintenanceTicketFromPrisma / maintenanceTicketToCreateInput', () => {
  it('round-trips with a null resolvedAt', () => {
    const original = MaintenanceTicket.create({
      propertyId: 'prop-1',
      unitId: 'unit-1',
      title: 'Leaky faucet',
      description: 'Tenant reports drip',
      status: 'OPEN',
      priority: 'MEDIUM',
      reportedAt: new Date('2026-05-01'),
      resolvedAt: null,
    });
    const row = asRow(maintenanceTicketToCreateInput(original));
    const back = maintenanceTicketFromPrisma(
      row as Parameters<typeof maintenanceTicketFromPrisma>[0],
    );
    expect(back.title).toBe('Leaky faucet');
    expect(back.status).toBe('OPEN');
    expect(back.priority).toBe('MEDIUM');
    expect(back.resolvedAt).toBeNull();
  });

  it('round-trips a closed ticket with resolvedAt', () => {
    const original = MaintenanceTicket.create({
      propertyId: 'prop-1',
      unitId: null,
      title: 'Pest control',
      description: 'Quarterly visit',
      status: 'CLOSED',
      priority: 'LOW',
      reportedAt: new Date('2026-04-01'),
      resolvedAt: new Date('2026-04-05'),
    });
    const row = asRow(maintenanceTicketToCreateInput(original));
    const back = maintenanceTicketFromPrisma(
      row as Parameters<typeof maintenanceTicketFromPrisma>[0],
    );
    expect(back.resolvedAt?.toISOString()).toBe(new Date('2026-04-05').toISOString());
    expect(back.unitId).toBeNull();
  });
});
