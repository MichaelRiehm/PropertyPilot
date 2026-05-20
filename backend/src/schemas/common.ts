import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export const stateCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, 'state must be 2 uppercase letters');

export const postalCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'postalCode must be 5 digits or ZIP+4');

export const propertyTypeSchema = z.enum([
  'SINGLE_FAMILY',
  'MULTI_FAMILY',
  'DUPLEX',
  'TRIPLEX',
  'FOURPLEX',
  'CONDO',
  'TOWNHOUSE',
  'OTHER',
]);
