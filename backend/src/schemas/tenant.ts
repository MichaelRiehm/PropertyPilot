import { z } from 'zod';
import { paginationSchema } from './common';

export const tenantCreateSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(80, 'First name must be 80 characters or fewer'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(80, 'Last name must be 80 characters or fewer'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email must be 255 characters or fewer'),
  phone: z
    .string()
    .min(7, 'Phone must be at least 7 characters')
    .max(40, 'Phone must be 40 characters or fewer')
    .nullable()
    .optional(),
});

export const tenantUpdateSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(80, 'First name must be 80 characters or fewer'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(80, 'Last name must be 80 characters or fewer'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(255, 'Email must be 255 characters or fewer'),
    phone: z
      .string()
      .min(7, 'Phone must be at least 7 characters')
      .max(40, 'Phone must be 40 characters or fewer')
      .nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const tenantListQuerySchema = paginationSchema;

export type TenantCreateBody = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateBody = z.infer<typeof tenantUpdateSchema>;
export type TenantListQuery = z.infer<typeof tenantListQuerySchema>;
