import { z } from 'zod';
import { PROPERTY_TYPES } from '../lib/properties';

const stateCode = z
  .string()
  .regex(/^[A-Z]{2}$/, 'State must be a 2-letter US state code in uppercase');

const postalCode = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP must be 5 digits or ZIP+4');

export const propertyTypeSchema = z.enum(PROPERTY_TYPES, {
  message: 'Pick a valid property type',
});

export const propertyFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
  addressLine1: z
    .string()
    .min(1, 'Street address is required')
    .max(200, 'Street address must be 200 characters or fewer'),
  addressLine2: z
    .string()
    .max(200, 'Address line 2 must be 200 characters or fewer')
    .nullable()
    .optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(120, 'City must be 120 characters or fewer'),
  state: stateCode,
  postalCode,
  propertyType: propertyTypeSchema,
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
