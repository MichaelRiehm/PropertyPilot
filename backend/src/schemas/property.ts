import { z } from 'zod';
import { paginationSchema, postalCodeSchema, propertyTypeSchema, stateCodeSchema } from './common';

export const propertyCreateSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1).max(120),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(120),
  state: stateCodeSchema,
  postalCode: postalCodeSchema,
  propertyType: propertyTypeSchema.optional(),
});

export const propertyUpdateSchema = z
  .object({
    name: z.string().min(1).max(120),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).nullable(),
    city: z.string().min(1).max(120),
    state: stateCodeSchema,
    postalCode: postalCodeSchema,
    propertyType: propertyTypeSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const propertyListQuerySchema = paginationSchema.extend({
  ownerId: z.string().min(1).optional(),
});

export type PropertyCreateBody = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateBody = z.infer<typeof propertyUpdateSchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
