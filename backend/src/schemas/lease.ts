import { z } from 'zod';
import { leaseStatusSchema, paginationSchema } from './common';

export const leaseCreateSchema = z
  .object({
    unitId: z.string().min(1, 'Unit is required'),
    tenantId: z.string().min(1, 'Tenant is required'),
    startDate: z.coerce.date({ message: 'Start date is invalid' }),
    endDate: z.coerce.date({ message: 'End date is invalid' }),
    monthlyRent: z
      .number({ message: 'Monthly rent must be a number' })
      .positive('Monthly rent must be greater than zero'),
    securityDeposit: z
      .number({ message: 'Security deposit must be a number' })
      .min(0, 'Security deposit cannot be negative')
      .default(0),
    status: leaseStatusSchema.optional(),
    documentLink: z
      .string()
      .url('Document link must be a valid URL')
      .nullable()
      .optional(),
  })
  .refine((value) => value.startDate < value.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

export const leaseUpdateSchema = z
  .object({
    endDate: z.coerce.date({ message: 'End date is invalid' }),
    monthlyRent: z
      .number({ message: 'Monthly rent must be a number' })
      .positive('Monthly rent must be greater than zero'),
    securityDeposit: z
      .number({ message: 'Security deposit must be a number' })
      .min(0, 'Security deposit cannot be negative'),
    status: leaseStatusSchema,
    documentLink: z
      .string()
      .url('Document link must be a valid URL')
      .nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const leaseListQuerySchema = paginationSchema.extend({
  unitId: z.string().min(1, 'Unit id cannot be empty').optional(),
  tenantId: z.string().min(1, 'Tenant id cannot be empty').optional(),
  status: leaseStatusSchema.optional(),
});

export type LeaseCreateBody = z.infer<typeof leaseCreateSchema>;
export type LeaseUpdateBody = z.infer<typeof leaseUpdateSchema>;
export type LeaseListQuery = z.infer<typeof leaseListQuerySchema>;
