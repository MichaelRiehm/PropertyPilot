import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce
    .number({ message: 'Page must be a number' })
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .optional(),
  pageSize: z.coerce
    .number({ message: 'Page size must be a number' })
    .int('Page size must be a whole number')
    .min(1, 'Page size must be at least 1')
    .max(200, 'Page size must be 200 or fewer')
    .optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'Resource id is required'),
});

export const stateCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, 'State must be a 2-letter US state code in uppercase');

export const postalCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP must be 5 digits or ZIP+4');

export const propertyTypeSchema = z.enum(
  [
    'SINGLE_FAMILY',
    'MULTI_FAMILY',
    'DUPLEX',
    'TRIPLEX',
    'FOURPLEX',
    'CONDO',
    'TOWNHOUSE',
    'OTHER',
  ],
  { message: 'Pick a valid property type' },
);

export const leaseStatusSchema = z.enum(
  ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
  { message: 'Pick a valid lease status' },
);

export const transactionTypeSchema = z.enum(
  ['RENT_INCOME', 'DEPOSIT_INCOME', 'OTHER_INCOME', 'EXPENSE', 'REFUND'],
  { message: 'Pick a valid transaction type' },
);

export const maintenanceStatusSchema = z.enum(
  ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELED'],
  { message: 'Pick a valid maintenance status' },
);

export const maintenancePrioritySchema = z.enum(
  ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  { message: 'Pick a valid maintenance priority' },
);
