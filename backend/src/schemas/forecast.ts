import { z } from 'zod';

export const forecastParamsSchema = z.object({
  propertyId: z.string().min(1, 'propertyId is required'),
});

export const forecastQuerySchema = z.object({
  monthsAhead: z.coerce.number().int().min(1).max(36).optional(),
  trailingMonths: z.coerce.number().int().min(1).max(24).optional(),
});

export type ForecastParams = z.infer<typeof forecastParamsSchema>;
export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
