import { z } from 'zod';
import { paginationSchema } from './common';

export const tenantCreateSchema = z.object({
  ownerId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().min(7).max(40).nullable().optional(),
});

export const tenantUpdateSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email(),
    phone: z.string().min(7).max(40).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const tenantListQuerySchema = paginationSchema.extend({
  ownerId: z.string().min(1).optional(),
});

export type TenantCreateBody = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateBody = z.infer<typeof tenantUpdateSchema>;
export type TenantListQuery = z.infer<typeof tenantListQuerySchema>;
