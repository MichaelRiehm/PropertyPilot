import { z } from 'zod';
import { LEASE_STATUSES } from '../lib/leases';

export const leaseStatusSchema = z.enum(LEASE_STATUSES);

export const leaseFormSchema = z
  .object({
    unitId: z.string().min(1, 'Unit is required'),
    tenantId: z.string().min(1, 'Tenant is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z
      .number({ message: 'Rent must be a number' })
      .positive('Rent must be greater than zero'),
    securityDeposit: z
      .number({ message: 'Deposit must be a number' })
      .min(0, 'Deposit cannot be negative'),
    status: leaseStatusSchema,
    documentLink: z
      .string()
      .max(2048)
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
        { message: 'Must be a valid URL' },
      )
      .nullable(),
  })
  .refine((value) => new Date(value.startDate) < new Date(value.endDate), {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

export type LeaseFormValues = z.infer<typeof leaseFormSchema>;
