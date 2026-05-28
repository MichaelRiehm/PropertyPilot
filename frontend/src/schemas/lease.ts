import { z } from 'zod';
import { LEASE_STATUSES } from '../lib/leases';

export const leaseStatusSchema = z.enum(LEASE_STATUSES, {
  message: 'Pick a valid lease status',
});

export const leaseFormSchema = z
  .object({
    unitId: z.string().min(1, 'Unit is required'),
    tenantId: z.string().min(1, 'Tenant is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z
      .number({ message: 'Monthly rent must be a number' })
      .positive('Monthly rent must be greater than zero'),
    securityDeposit: z
      .number({ message: 'Security deposit must be a number' })
      .min(0, 'Security deposit cannot be negative'),
    status: leaseStatusSchema,
    documentLink: z
      .string()
      .max(2048, 'Document link is too long')
      .refine(
        (value) => {
          if (value === '') return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Enter a valid URL' },
      )
      .nullable(),
  })
  .refine((value) => new Date(value.startDate) < new Date(value.endDate), {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

export type LeaseFormValues = z.infer<typeof leaseFormSchema>;
