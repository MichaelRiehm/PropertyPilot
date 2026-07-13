import { api } from './apiClient';
import type { PaginatedResponse, PaginationParams } from './pagination';

export const MAINTENANCE_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'CLOSED',
  'CANCELED',
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  CLOSED: 'Closed',
  CANCELED: 'Canceled',
};

export const MAINTENANCE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  unitId: string | null;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reportedAt: string;
  resolvedAt: string | null;
  ageInDays: number;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceTicketListResponse = PaginatedResponse<MaintenanceTicket>;

export interface MaintenanceTicketCreateInput {
  propertyId: string;
  unitId?: string | null;
  title: string;
  description: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  reportedAt?: string;
}

export interface MaintenanceTicketUpdateInput {
  title?: string;
  description?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  resolvedAt?: string | null;
}

export interface MaintenanceTicketListParams extends PaginationParams {
  propertyId?: string;
  status?: MaintenanceStatus;
  openOnly?: boolean;
}

export function listMaintenanceTickets(
  params: MaintenanceTicketListParams = {},
): Promise<MaintenanceTicketListResponse> {
  return api.get<MaintenanceTicketListResponse>('/maintenance-tickets', {
    page: params.page,
    pageSize: params.pageSize,
    propertyId: params.propertyId,
    status: params.status,
    openOnly: params.openOnly ? 'true' : undefined,
  });
}

export function createMaintenanceTicket(
  input: MaintenanceTicketCreateInput,
): Promise<MaintenanceTicket> {
  return api.post<MaintenanceTicket>('/maintenance-tickets', input);
}

export function updateMaintenanceTicket(
  id: string,
  input: MaintenanceTicketUpdateInput,
): Promise<MaintenanceTicket> {
  return api.patch<MaintenanceTicket>(`/maintenance-tickets/${id}`, input);
}

export function deleteMaintenanceTicket(id: string): Promise<void> {
  return api.delete<void>(`/maintenance-tickets/${id}`);
}
