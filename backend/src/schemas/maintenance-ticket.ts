import { z } from 'zod';
import {
  maintenancePrioritySchema,
  maintenanceStatusSchema,
  paginationSchema,
} from './common';

export const maintenanceTicketCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit id cannot be empty').nullable().optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  status: maintenanceStatusSchema.default('OPEN'),
  priority: maintenancePrioritySchema.default('MEDIUM'),
  reportedAt: z.coerce.date({ message: 'reportedAt is invalid' }).optional(),
  resolvedAt: z.coerce.date({ message: 'resolvedAt is invalid' }).nullable().optional(),
});

export const maintenanceTicketUpdateSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(120, 'Title must be 120 characters or fewer'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(2000, 'Description must be 2000 characters or fewer'),
    priority: maintenancePrioritySchema,
    status: maintenanceStatusSchema,
    resolvedAt: z.coerce.date({ message: 'resolvedAt is invalid' }).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const maintenanceTicketListQuerySchema = paginationSchema.extend({
  propertyId: z.string().min(1, 'Property id cannot be empty').optional(),
  status: maintenanceStatusSchema.optional(),
  openOnly: z.coerce.boolean().optional(),
});

export type MaintenanceTicketCreateBody = z.infer<typeof maintenanceTicketCreateSchema>;
export type MaintenanceTicketUpdateBody = z.infer<typeof maintenanceTicketUpdateSchema>;
export type MaintenanceTicketListQuery = z.infer<typeof maintenanceTicketListQuerySchema>;
