import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const DEV_USER_ID = 'dev-user';
const DEV_USER_EMAIL = 'dev@propertypilot.local';
const DEV_USER_PASSWORD = 'dev1234';
const BCRYPT_COST = 12;

// All seeded records share the `dev-` ID prefix so they're easy to spot and so
// re-running the seed never duplicates rows (every write is upsert-by-id).
// Records created through the UI use UUIDs and are left alone.

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysAgo(n: number): Date {
  const d = today();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function monthsAgo(n: number, day = 1): Date {
  const now = today();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day));
}

function monthsFromNow(n: number, day = 1): Date {
  const now = today();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, day));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface PropertySeed {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  propertyType: Prisma.PropertyCreateInput['propertyType'];
}

interface UnitSeed {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRent: number;
}

interface TenantSeed {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface LeaseSeed {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: Prisma.LeaseCreateInput['status'];
}

interface TransactionSeed {
  id: string;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  type: Prisma.TransactionCreateInput['type'];
  category: string | null;
  amount: number;
  date: Date;
  description: string;
}

interface MaintenanceTicketSeed {
  id: string;
  propertyId: string;
  unitId: string | null;
  title: string;
  description: string;
  status: Prisma.MaintenanceTicketCreateInput['status'];
  priority: Prisma.MaintenanceTicketCreateInput['priority'];
  reportedAt: Date;
  resolvedAt: Date | null;
}

const PROPERTIES: PropertySeed[] = [
  {
    id: 'dev-prop-maple',
    name: 'Maple Court Duplex',
    addressLine1: '128 Maple Court',
    city: 'Madison',
    state: 'WI',
    postalCode: '53703',
    propertyType: 'DUPLEX',
  },
  {
    id: 'dev-prop-pine',
    name: 'Pine Avenue Condo',
    addressLine1: '702 Pine Avenue',
    city: 'Madison',
    state: 'WI',
    postalCode: '53704',
    propertyType: 'CONDO',
  },
  {
    id: 'dev-prop-sunset',
    name: 'Sunset Apartments',
    addressLine1: '15 Sunset Way',
    city: 'Madison',
    state: 'WI',
    postalCode: '53715',
    propertyType: 'FOURPLEX',
  },
];

const UNITS: UnitSeed[] = [
  { id: 'dev-unit-maple-1', propertyId: 'dev-prop-maple', label: 'Apt 1', bedrooms: 2, bathrooms: 1, squareFeet: 950, marketRent: 1500 },
  { id: 'dev-unit-maple-2', propertyId: 'dev-prop-maple', label: 'Apt 2', bedrooms: 2, bathrooms: 1, squareFeet: 950, marketRent: 1500 },
  { id: 'dev-unit-pine-a', propertyId: 'dev-prop-pine', label: 'Suite A', bedrooms: 3, bathrooms: 2, squareFeet: 1400, marketRent: 1850 },
  { id: 'dev-unit-sunset-1', propertyId: 'dev-prop-sunset', label: 'Unit 1', bedrooms: 1, bathrooms: 1, squareFeet: 650, marketRent: 1100 },
  { id: 'dev-unit-sunset-2', propertyId: 'dev-prop-sunset', label: 'Unit 2', bedrooms: 1, bathrooms: 1, squareFeet: 650, marketRent: 1150 },
  { id: 'dev-unit-sunset-3', propertyId: 'dev-prop-sunset', label: 'Unit 3', bedrooms: 2, bathrooms: 1, squareFeet: 850, marketRent: 1350 },
  { id: 'dev-unit-sunset-4', propertyId: 'dev-prop-sunset', label: 'Unit 4', bedrooms: 2, bathrooms: 1.5, squareFeet: 900, marketRent: 1450 },
];

const TENANTS: TenantSeed[] = [
  { id: 'dev-tenant-riley', firstName: 'Riley', lastName: 'Chen', email: 'riley.chen@example.com', phone: '608-555-0101' },
  { id: 'dev-tenant-jordan', firstName: 'Jordan', lastName: 'Wells', email: 'jordan.wells@example.com', phone: '608-555-0102' },
  { id: 'dev-tenant-pat', firstName: 'Pat', lastName: 'Romero', email: 'pat.romero@example.com', phone: '608-555-0103' },
  { id: 'dev-tenant-avery', firstName: 'Avery', lastName: 'Park', email: 'avery.park@example.com', phone: null },
  { id: 'dev-tenant-kai', firstName: 'Kai', lastName: 'Nakamura', email: 'kai.nakamura@example.com', phone: '608-555-0104' },
];

function buildLeases(): LeaseSeed[] {
  return [
    {
      id: 'dev-lease-1',
      unitId: 'dev-unit-maple-1',
      tenantId: 'dev-tenant-riley',
      startDate: monthsAgo(6),
      endDate: monthsFromNow(6),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
    },
    {
      id: 'dev-lease-2',
      unitId: 'dev-unit-maple-2',
      tenantId: 'dev-tenant-jordan',
      startDate: monthsAgo(3),
      endDate: monthsFromNow(9),
      monthlyRent: 1500,
      securityDeposit: 1500,
      status: 'ACTIVE',
    },
    {
      id: 'dev-lease-3',
      unitId: 'dev-unit-pine-a',
      tenantId: 'dev-tenant-pat',
      startDate: monthsAgo(9),
      endDate: monthsFromNow(3),
      monthlyRent: 1850,
      securityDeposit: 1850,
      status: 'ACTIVE',
    },
    {
      id: 'dev-lease-4',
      unitId: 'dev-unit-sunset-1',
      tenantId: 'dev-tenant-avery',
      startDate: monthsFromNow(1),
      endDate: monthsFromNow(13),
      monthlyRent: 1100,
      securityDeposit: 1100,
      status: 'PENDING',
    },
    {
      id: 'dev-lease-5',
      unitId: 'dev-unit-sunset-2',
      tenantId: 'dev-tenant-riley',
      startDate: monthsAgo(18),
      endDate: monthsAgo(6),
      monthlyRent: 1150,
      securityDeposit: 1150,
      status: 'EXPIRED',
    },
    {
      id: 'dev-lease-6',
      unitId: 'dev-unit-sunset-3',
      tenantId: 'dev-tenant-kai',
      startDate: monthsAgo(4),
      endDate: monthsFromNow(8),
      monthlyRent: 1350,
      securityDeposit: 1350,
      status: 'ACTIVE',
    },
  ];
}

function buildTransactions(leases: LeaseSeed[]): TransactionSeed[] {
  const txns: TransactionSeed[] = [];

  // Monthly rent payments for each active lease, from the lease start through
  // last month (the current month's rent has not "landed" yet).
  for (const lease of leases) {
    if (lease.status !== 'ACTIVE') continue;
    const startMonth = new Date(Date.UTC(lease.startDate.getUTCFullYear(), lease.startDate.getUTCMonth(), 1));
    const lastClosedMonth = new Date(Date.UTC(today().getUTCFullYear(), today().getUTCMonth() - 1, 1));
    const cursor = new Date(startMonth);
    while (cursor <= lastClosedMonth) {
      const monthYear = monthKey(cursor);
      txns.push({
        id: `dev-txn-rent-${lease.id}-${monthYear}`,
        propertyId: UNITS.find((u) => u.id === lease.unitId)!.propertyId,
        unitId: lease.unitId,
        leaseId: lease.id,
        type: 'RENT_INCOME',
        category: 'rent',
        amount: lease.monthlyRent,
        date: new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1)),
        description: `Rent for ${cursor.toISOString().slice(0, 7)}`,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    // Security deposit at lease start.
    txns.push({
      id: `dev-txn-deposit-${lease.id}`,
      propertyId: UNITS.find((u) => u.id === lease.unitId)!.propertyId,
      unitId: lease.unitId,
      leaseId: lease.id,
      type: 'DEPOSIT_INCOME',
      category: 'security deposit',
      amount: lease.securityDeposit,
      date: lease.startDate,
      description: 'Security deposit collected at move-in',
    });
  }

  // Recurring expenses spread across the last 6-12 months so the forecast has
  // a real moving-average baseline and the P&L shows meaningful expense lines.
  const expenseSeeds: Array<{
    key: string;
    propertyId: string;
    monthsBack: number;
    type: 'EXPENSE';
    category: string;
    amount: number;
    description: string;
  }> = [
    { key: 'plumb-maple', propertyId: 'dev-prop-maple', monthsBack: 3, type: 'EXPENSE', category: 'repairs', amount: 250, description: 'Plumbing repair, Apt 1 kitchen' },
    { key: 'roof-maple', propertyId: 'dev-prop-maple', monthsBack: 5, type: 'EXPENSE', category: 'repairs', amount: 1200, description: 'Roof patch after wind storm' },
    { key: 'hvac-pine', propertyId: 'dev-prop-pine', monthsBack: 2, type: 'EXPENSE', category: 'maintenance', amount: 450, description: 'Annual HVAC service' },
    { key: 'tax-pine', propertyId: 'dev-prop-pine', monthsBack: 4, type: 'EXPENSE', category: 'tax', amount: 2000, description: 'Quarterly property tax' },
    { key: 'insur-sunset', propertyId: 'dev-prop-sunset', monthsBack: 1, type: 'EXPENSE', category: 'insurance', amount: 600, description: 'Property insurance premium' },
    { key: 'pest-sunset', propertyId: 'dev-prop-sunset', monthsBack: 2, type: 'EXPENSE', category: 'maintenance', amount: 180, description: 'Pest control treatment' },
    { key: 'appraisal-maple', propertyId: 'dev-prop-maple', monthsBack: 8, type: 'EXPENSE', category: 'professional services', amount: 450, description: 'Property appraisal for refinance' },
    { key: 'water-sewer-maple-q1', propertyId: 'dev-prop-maple', monthsBack: 6, type: 'EXPENSE', category: 'utilities', amount: 285, description: 'Water and sewer (quarterly)' },
    { key: 'water-sewer-maple-q2', propertyId: 'dev-prop-maple', monthsBack: 3, type: 'EXPENSE', category: 'utilities', amount: 312, description: 'Water and sewer (quarterly)' },
    { key: 'cleaning-sunset', propertyId: 'dev-prop-sunset', monthsBack: 7, type: 'EXPENSE', category: 'cleaning', amount: 220, description: 'Move-out cleaning, Unit 2' },
    { key: 'snow-maple', propertyId: 'dev-prop-maple', monthsBack: 4, type: 'EXPENSE', category: 'maintenance', amount: 340, description: 'Snow removal, seasonal contract' },
  ];
  for (const e of expenseSeeds) {
    txns.push({
      id: `dev-txn-${e.key}`,
      propertyId: e.propertyId,
      unitId: null,
      leaseId: null,
      type: e.type,
      category: e.category,
      amount: e.amount,
      date: monthsAgo(e.monthsBack, 15),
      description: e.description,
    });
  }

  // Lawn care every month for the last 4 months on each property.
  for (const property of PROPERTIES) {
    for (let i = 1; i <= 4; i += 1) {
      const date = monthsAgo(i, 10);
      txns.push({
        id: `dev-txn-lawn-${property.id}-${monthKey(date)}`,
        propertyId: property.id,
        unitId: null,
        leaseId: null,
        type: 'EXPENSE',
        category: 'lawn care',
        amount: 120,
        date,
        description: 'Monthly lawn care',
      });
    }
  }

  return txns;
}

function buildMaintenanceTickets(): MaintenanceTicketSeed[] {
  return [
    {
      id: 'dev-mt-1',
      propertyId: 'dev-prop-maple',
      unitId: 'dev-unit-maple-1',
      title: 'Kitchen sink slow drain',
      description: 'Tenant reports slow drain in kitchen sink. Likely hair clog further down line.',
      status: 'OPEN',
      priority: 'MEDIUM',
      reportedAt: daysAgo(3),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-2',
      propertyId: 'dev-prop-pine',
      unitId: 'dev-unit-pine-a',
      title: 'Broken bedroom window pane',
      description: 'Cracked inner pane on the master bedroom window. Cold air leaking.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      reportedAt: daysAgo(15),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-3',
      propertyId: 'dev-prop-sunset',
      unitId: 'dev-unit-sunset-3',
      title: 'HVAC making rattling noise',
      description: 'Tenant says the HVAC rattles when it kicks on. Could be a loose blower wheel.',
      status: 'OPEN',
      priority: 'LOW',
      reportedAt: daysAgo(45),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-4',
      propertyId: 'dev-prop-maple',
      unitId: 'dev-unit-maple-2',
      title: 'Water damage under bathroom vanity',
      description: 'Soft spot under bathroom vanity. Plumber needs to check supply line.',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      reportedAt: daysAgo(75),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-5',
      propertyId: 'dev-prop-sunset',
      unitId: 'dev-unit-sunset-4',
      title: 'Pest control follow-up',
      description: 'Second visit for pest control. Initial bait stations placed last month.',
      status: 'CLOSED',
      priority: 'MEDIUM',
      reportedAt: daysAgo(30),
      resolvedAt: daysAgo(10),
    },
    {
      id: 'dev-mt-6',
      propertyId: 'dev-prop-sunset',
      unitId: 'dev-unit-sunset-1',
      title: 'Ceiling stain in unit',
      description: 'Brownish ceiling stain spreading. Tenant in Unit 2 may have a leak.',
      status: 'OPEN',
      priority: 'HIGH',
      reportedAt: daysAgo(5),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-7',
      propertyId: 'dev-prop-pine',
      unitId: 'dev-unit-pine-a',
      title: 'Garage door opener intermittent',
      description: 'Tenant reports the remote works maybe 1 in 3 tries. Motor may be aging out.',
      status: 'OPEN',
      priority: 'MEDIUM',
      reportedAt: daysAgo(120),
      resolvedAt: null,
    },
    {
      id: 'dev-mt-8',
      propertyId: 'dev-prop-maple',
      unitId: 'dev-unit-maple-1',
      title: 'Tenant-requested wallpaper change',
      description: 'Cosmetic wallpaper request. Declined per lease terms.',
      status: 'CANCELED',
      priority: 'LOW',
      reportedAt: daysAgo(20),
      resolvedAt: daysAgo(18),
    },
  ];
}

async function seedUser(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEV_USER_PASSWORD, BCRYPT_COST);
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: { passwordHash },
    create: { id: DEV_USER_ID, email: DEV_USER_EMAIL, passwordHash },
  });
}

async function seedProperties(prisma: PrismaClient): Promise<void> {
  for (const p of PROPERTIES) {
    await prisma.property.upsert({
      where: { id: p.id },
      update: {
        ownerId: DEV_USER_ID,
        name: p.name,
        addressLine1: p.addressLine1,
        city: p.city,
        state: p.state,
        postalCode: p.postalCode,
        propertyType: p.propertyType,
      },
      create: {
        id: p.id,
        ownerId: DEV_USER_ID,
        name: p.name,
        addressLine1: p.addressLine1,
        city: p.city,
        state: p.state,
        postalCode: p.postalCode,
        propertyType: p.propertyType,
      },
    });
  }
}

async function seedUnits(prisma: PrismaClient): Promise<void> {
  for (const u of UNITS) {
    await prisma.unit.upsert({
      where: { id: u.id },
      update: {
        propertyId: u.propertyId,
        label: u.label,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        squareFeet: u.squareFeet,
        marketRent: u.marketRent,
      },
      create: {
        id: u.id,
        propertyId: u.propertyId,
        label: u.label,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        squareFeet: u.squareFeet,
        marketRent: u.marketRent,
      },
    });
  }
}

async function seedTenants(prisma: PrismaClient): Promise<void> {
  for (const t of TENANTS) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: {
        ownerId: DEV_USER_ID,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phone: t.phone,
      },
      create: {
        id: t.id,
        ownerId: DEV_USER_ID,
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phone: t.phone,
      },
    });
  }
}

async function seedLeases(prisma: PrismaClient, leases: LeaseSeed[]): Promise<void> {
  for (const l of leases) {
    await prisma.lease.upsert({
      where: { id: l.id },
      update: {
        unitId: l.unitId,
        tenantId: l.tenantId,
        startDate: l.startDate,
        endDate: l.endDate,
        monthlyRent: l.monthlyRent,
        securityDeposit: l.securityDeposit,
        status: l.status,
      },
      create: {
        id: l.id,
        unitId: l.unitId,
        tenantId: l.tenantId,
        startDate: l.startDate,
        endDate: l.endDate,
        monthlyRent: l.monthlyRent,
        securityDeposit: l.securityDeposit,
        status: l.status,
      },
    });
  }
}

async function seedTransactions(prisma: PrismaClient, txns: TransactionSeed[]): Promise<void> {
  for (const t of txns) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {
        propertyId: t.propertyId,
        unitId: t.unitId,
        leaseId: t.leaseId,
        type: t.type,
        category: t.category,
        amount: t.amount,
        date: t.date,
        description: t.description,
      },
      create: {
        id: t.id,
        propertyId: t.propertyId,
        unitId: t.unitId,
        leaseId: t.leaseId,
        type: t.type,
        category: t.category,
        amount: t.amount,
        date: t.date,
        description: t.description,
      },
    });
  }
}

async function seedMaintenanceTickets(
  prisma: PrismaClient,
  tickets: MaintenanceTicketSeed[],
): Promise<void> {
  for (const m of tickets) {
    await prisma.maintenanceTicket.upsert({
      where: { id: m.id },
      update: {
        propertyId: m.propertyId,
        unitId: m.unitId,
        title: m.title,
        description: m.description,
        status: m.status,
        priority: m.priority,
        reportedAt: m.reportedAt,
        resolvedAt: m.resolvedAt,
      },
      create: {
        id: m.id,
        propertyId: m.propertyId,
        unitId: m.unitId,
        title: m.title,
        description: m.description,
        status: m.status,
        priority: m.priority,
        reportedAt: m.reportedAt,
        resolvedAt: m.resolvedAt,
      },
    });
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedUser(prisma);
    await seedProperties(prisma);
    await seedUnits(prisma);
    await seedTenants(prisma);
    const leases = buildLeases();
    await seedLeases(prisma, leases);
    const transactions = buildTransactions(leases);
    await seedTransactions(prisma, transactions);
    const tickets = buildMaintenanceTickets();
    await seedMaintenanceTickets(prisma, tickets);

    console.log(
      [
        `[seed] dev user ${DEV_USER_EMAIL} (password ${DEV_USER_PASSWORD})`,
        `[seed] ${PROPERTIES.length} properties, ${UNITS.length} units, ${TENANTS.length} tenants`,
        `[seed] ${leases.length} leases, ${transactions.length} transactions, ${tickets.length} maintenance tickets`,
        '[seed] re-running this script is safe; every record uses a deterministic dev-* id and is upserted.',
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
