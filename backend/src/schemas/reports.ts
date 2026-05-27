import { z } from 'zod';

export const rentRollQuerySchema = z.object({
  propertyId: z.string().min(1).optional(),
  asOf: z.coerce.date().optional(),
});

export const pnlQuerySchema = z.object({
  propertyId: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type RentRollQuery = z.infer<typeof rentRollQuerySchema>;
export type PnLQuery = z.infer<typeof pnlQuerySchema>;
