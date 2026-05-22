import { z } from 'zod';
import { PROPERTY_TYPES } from '../lib/properties';

const stateCode = z
  .string()
  .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters');

const postalCode = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'ZIP must be 5 digits or ZIP+4');

export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

export const propertyFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().min(1, 'City is required').max(120),
  state: stateCode,
  postalCode,
  propertyType: propertyTypeSchema,
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
