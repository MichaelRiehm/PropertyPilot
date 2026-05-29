import { api } from './apiClient';
import type { PaginatedResponse, PaginationParams } from './pagination';

export const LEASE_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const;

export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
};

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  documentLink: string | null;
  termInMonths: number;
  createdAt: string;
  updatedAt: string;
}

export type LeaseListResponse = PaginatedResponse<Lease>;

export interface LeaseCreateInput {
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status?: LeaseStatus;
  documentLink?: string | null;
}

export interface LeaseUpdateInput {
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  status?: LeaseStatus;
  documentLink?: string | null;
}

export function listLeases(params: PaginationParams = {}): Promise<LeaseListResponse> {
  return api.get<LeaseListResponse>('/leases', {
    page: params.page,
    pageSize: params.pageSize,
  });
}

export function createLease(input: LeaseCreateInput): Promise<Lease> {
  return api.post<Lease>('/leases', input);
}

export function updateLease(id: string, input: LeaseUpdateInput): Promise<Lease> {
  return api.patch<Lease>(`/leases/${id}`, input);
}

export function deleteLease(id: string): Promise<void> {
  return api.delete<void>(`/leases/${id}`);
}
