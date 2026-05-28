import { z } from 'zod';

const optionalPropertyId = z
  .string()
  .min(1, 'Property id cannot be empty')
  .optional();

const optionalDate = (field: string) =>
  z.coerce.date({ message: `${field} is invalid` }).optional();

export const rentRollQuerySchema = z.object({
  propertyId: optionalPropertyId,
  asOf: optionalDate('asOf'),
});

export const pnlQuerySchema = z.object({
  propertyId: optionalPropertyId,
  dateFrom: optionalDate('dateFrom'),
  dateTo: optionalDate('dateTo'),
});

export const occupancyQuerySchema = z.object({
  propertyId: optionalPropertyId,
  asOf: optionalDate('asOf'),
});

export const maintenanceAgingQuerySchema = z.object({
  propertyId: optionalPropertyId,
  asOf: optionalDate('asOf'),
});

export type RentRollQuery = z.infer<typeof rentRollQuerySchema>;
export type PnLQuery = z.infer<typeof pnlQuerySchema>;
export type OccupancyQuery = z.infer<typeof occupancyQuerySchema>;
export type MaintenanceAgingQuery = z.infer<typeof maintenanceAgingQuerySchema>;
