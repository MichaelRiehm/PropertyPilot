import { z } from 'zod';
import { TRANSACTION_TYPES } from '../lib/transactions';

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES, {
  message: 'Pick a valid transaction type',
});

export const transactionFormSchema = z
  .object({
    propertyId: z.string().min(1, 'Property is required'),
    unitId: z.string().nullable(),
    leaseId: z.string().nullable(),
    type: transactionTypeSchema,
    category: z
      .string()
      .max(80, 'Category must be 80 characters or fewer')
      .nullable(),
    amount: z
      .number({ message: 'Amount must be a number' })
      .refine((value) => value !== 0, { message: 'Amount must not be zero' }),
    date: z.string().min(1, 'Date is required'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be 500 characters or fewer'),
  })
  .refine(
    (value) =>
      value.type !== 'RENT_INCOME' || (value.leaseId !== null && value.leaseId !== ''),
    {
      message: 'Rent income must reference a lease',
      path: ['leaseId'],
    },
  );

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
