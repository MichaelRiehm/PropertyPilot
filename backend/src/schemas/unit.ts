import { z } from 'zod';
import { paginationSchema } from './common';

export const unitCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(60, 'Label must be 60 characters or fewer'),
  bedrooms: z
    .number({ message: 'Bedrooms must be a number' })
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative')
    .default(0),
  bathrooms: z
    .number({ message: 'Bathrooms must be a number' })
    .min(0, 'Bathrooms cannot be negative')
    .default(0),
  squareFeet: z
    .number({ message: 'Square feet must be a number' })
    .int('Square feet must be a whole number')
    .min(0, 'Square feet cannot be negative')
    .nullable()
    .optional(),
  marketRent: z
    .number({ message: 'Market rent must be a number' })
    .min(0, 'Market rent cannot be negative')
    .default(0),
});

export const unitUpdateSchema = z
  .object({
    label: z
      .string()
      .min(1, 'Label is required')
      .max(60, 'Label must be 60 characters or fewer'),
    bedrooms: z
      .number({ message: 'Bedrooms must be a number' })
      .int('Bedrooms must be a whole number')
      .min(0, 'Bedrooms cannot be negative'),
    bathrooms: z
      .number({ message: 'Bathrooms must be a number' })
      .min(0, 'Bathrooms cannot be negative'),
    squareFeet: z
      .number({ message: 'Square feet must be a number' })
      .int('Square feet must be a whole number')
      .min(0, 'Square feet cannot be negative')
      .nullable(),
    marketRent: z
      .number({ message: 'Market rent must be a number' })
      .min(0, 'Market rent cannot be negative'),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const unitListQuerySchema = paginationSchema.extend({
  propertyId: z.string().min(1, 'Property id cannot be empty').optional(),
});

export type UnitCreateBody = z.infer<typeof unitCreateSchema>;
export type UnitUpdateBody = z.infer<typeof unitUpdateSchema>;
export type UnitListQuery = z.infer<typeof unitListQuerySchema>;
