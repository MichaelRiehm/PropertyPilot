import { z } from 'zod';
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from '../lib/maintenance-tickets';

export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES, {
  message: 'Pick a valid maintenance status',
});

export const maintenancePrioritySchema = z.enum(MAINTENANCE_PRIORITIES, {
  message: 'Pick a valid maintenance priority',
});

export const maintenanceTicketFormSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().nullable(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  status: maintenanceStatusSchema,
  priority: maintenancePrioritySchema,
  reportedAt: z.string().min(1, 'Reported date is required'),
});

export type MaintenanceTicketFormValues = z.infer<typeof maintenanceTicketFormSchema>;
