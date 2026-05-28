import { z } from 'zod';
import { paginationSchema, postalCodeSchema, propertyTypeSchema, stateCodeSchema } from './common';

export const propertyCreateSchema = z.object({
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
  state: stateCodeSchema,
  postalCode: postalCodeSchema,
  propertyType: propertyTypeSchema.optional(),
});

export const propertyUpdateSchema = z
  .object({
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
      .nullable(),
    city: z
      .string()
      .min(1, 'City is required')
      .max(120, 'City must be 120 characters or fewer'),
    state: stateCodeSchema,
    postalCode: postalCodeSchema,
    propertyType: propertyTypeSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const propertyListQuerySchema = paginationSchema;

export type PropertyCreateBody = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateBody = z.infer<typeof propertyUpdateSchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
