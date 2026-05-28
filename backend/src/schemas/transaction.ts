import { z } from 'zod';
import { paginationSchema, transactionTypeSchema } from './common';

export const transactionCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit id cannot be empty').nullable().optional(),
  leaseId: z.string().min(1, 'Lease id cannot be empty').nullable().optional(),
  type: transactionTypeSchema,
  category: z
    .string()
    .max(80, 'Category must be 80 characters or fewer')
    .nullable()
    .optional(),
  amount: z
    .number({ message: 'Amount must be a number' })
    .refine((value) => value !== 0, { message: 'Amount must not be zero' }),
  date: z.coerce.date({ message: 'Date is invalid' }),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or fewer'),
});

export const transactionUpdateSchema = z
  .object({
    category: z
      .string()
      .max(80, 'Category must be 80 characters or fewer')
      .nullable(),
    amount: z
      .number({ message: 'Amount must be a number' })
      .refine((value) => value !== 0, { message: 'Amount must not be zero' }),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be 500 characters or fewer'),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const transactionListQuerySchema = paginationSchema.extend({
  propertyId: z.string().min(1, 'Property id cannot be empty').optional(),
  unitId: z.string().min(1, 'Unit id cannot be empty').optional(),
  leaseId: z.string().min(1, 'Lease id cannot be empty').optional(),
  type: transactionTypeSchema.optional(),
  dateFrom: z.coerce.date({ message: 'dateFrom is invalid' }).optional(),
  dateTo: z.coerce.date({ message: 'dateTo is invalid' }).optional(),
});

export type TransactionCreateBody = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateBody = z.infer<typeof transactionUpdateSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
