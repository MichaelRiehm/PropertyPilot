import { api } from './apiClient';

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

export interface LeaseListResponse {
  data: Lease[];
  total: number;
  limit: number;
  offset: number;
}

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

export function listLeases(): Promise<LeaseListResponse> {
  return api.get<LeaseListResponse>('/leases');
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
