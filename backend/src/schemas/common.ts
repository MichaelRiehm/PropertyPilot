import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.coerce
    .number({ message: 'Limit must be a number' })
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(200, 'Limit must be 200 or fewer')
    .optional(),
  offset: z.coerce
    .number({ message: 'Offset must be a number' })
    .int('Offset must be a whole number')
    .min(0, 'Offset cannot be negative')
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
