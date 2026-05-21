import { z } from 'zod';
import { paginationSchema, transactionTypeSchema } from './common';

export const transactionCreateSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1).nullable().optional(),
  leaseId: z.string().min(1).nullable().optional(),
  type: transactionTypeSchema,
  category: z.string().max(80).nullable().optional(),
  amount: z.number().refine((v) => v !== 0, { message: 'amount must not be zero' }),
  date: z.coerce.date(),
  description: z.string().min(1).max(500),
});

export const transactionUpdateSchema = z
  .object({
    category: z.string().max(80).nullable(),
    amount: z.number().refine((v) => v !== 0, { message: 'amount must not be zero' }),
    description: z.string().min(1).max(500),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const transactionListQuerySchema = paginationSchema.extend({
  propertyId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  leaseId: z.string().min(1).optional(),
  type: transactionTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type TransactionCreateBody = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateBody = z.infer<typeof transactionUpdateSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
