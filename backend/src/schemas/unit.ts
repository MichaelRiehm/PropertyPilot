import { z } from 'zod';
import { paginationSchema } from './common';

export const unitCreateSchema = z.object({
  propertyId: z.string().min(1),
  label: z.string().min(1).max(60),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().min(0).default(0),
  squareFeet: z.number().int().min(0).nullable().optional(),
  marketRent: z.number().min(0).default(0),
});

export const unitUpdateSchema = z
  .object({
    label: z.string().min(1).max(60),
    bedrooms: z.number().int().min(0),
    bathrooms: z.number().min(0),
    squareFeet: z.number().int().min(0).nullable(),
    marketRent: z.number().min(0),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const unitListQuerySchema = paginationSchema.extend({
  propertyId: z.string().min(1).optional(),
});

export type UnitCreateBody = z.infer<typeof unitCreateSchema>;
export type UnitUpdateBody = z.infer<typeof unitUpdateSchema>;
export type UnitListQuery = z.infer<typeof unitListQuerySchema>;
