import { z } from 'zod';
import { leaseStatusSchema, paginationSchema } from './common';

export const leaseCreateSchema = z
  .object({
    unitId: z.string().min(1),
    tenantId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    monthlyRent: z.number().positive(),
    securityDeposit: z.number().min(0).default(0),
    status: leaseStatusSchema.optional(),
    documentLink: z.string().url().nullable().optional(),
  })
  .refine((value) => value.startDate < value.endDate, {
    message: 'startDate must be before endDate',
    path: ['endDate'],
  });

export const leaseUpdateSchema = z
  .object({
    endDate: z.coerce.date(),
    monthlyRent: z.number().positive(),
    securityDeposit: z.number().min(0),
    status: leaseStatusSchema,
    documentLink: z.string().url().nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const leaseListQuerySchema = paginationSchema.extend({
  unitId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  status: leaseStatusSchema.optional(),
});

export type LeaseCreateBody = z.infer<typeof leaseCreateSchema>;
export type LeaseUpdateBody = z.infer<typeof leaseUpdateSchema>;
export type LeaseListQuery = z.infer<typeof leaseListQuerySchema>;
