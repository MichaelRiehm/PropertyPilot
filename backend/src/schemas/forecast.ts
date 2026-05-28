import { z } from 'zod';

export const forecastParamsSchema = z.object({
  propertyId: z.string().min(1, 'Property id is required'),
});

export const forecastQuerySchema = z.object({
  monthsAhead: z.coerce
    .number({ message: 'monthsAhead must be a number' })
    .int('monthsAhead must be a whole number')
    .min(1, 'monthsAhead must be at least 1')
    .max(36, 'monthsAhead must be 36 or fewer')
    .optional(),
  trailingMonths: z.coerce
    .number({ message: 'trailingMonths must be a number' })
    .int('trailingMonths must be a whole number')
    .min(1, 'trailingMonths must be at least 1')
    .max(24, 'trailingMonths must be 24 or fewer')
    .optional(),
});

export type ForecastParams = z.infer<typeof forecastParamsSchema>;
export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
