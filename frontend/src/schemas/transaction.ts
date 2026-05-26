import { z } from 'zod';
import { TRANSACTION_TYPES } from '../lib/transactions';

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export const transactionFormSchema = z
  .object({
    propertyId: z.string().min(1, 'Property is required'),
    unitId: z.string().nullable(),
    leaseId: z.string().nullable(),
    type: transactionTypeSchema,
    category: z.string().max(80).nullable(),
    amount: z
      .number({ message: 'Amount must be a number' })
      .refine((v) => v !== 0, { message: 'Amount must not be zero' }),
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required').max(500),
  })
  .refine(
    (value) => value.type !== 'RENT_INCOME' || (value.leaseId !== null && value.leaseId !== ''),
    {
      message: 'Rent income must reference a lease',
      path: ['leaseId'],
    },
  );

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
