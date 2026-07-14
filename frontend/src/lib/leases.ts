import { api, ApiError } from './apiClient';
import { getToken } from './storage';
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

export interface LeaseDocumentUploadResponse {
  documentKey: string;
  documentUrl: string;
  lease: { id: string; documentLink: string | null };
}

/**
 * Multipart upload — apiClient's JSON helpers can't send FormData without the
 * browser setting the multipart boundary itself, so we go through fetch()
 * directly for this one endpoint.
 */
export async function uploadLeaseDocument(
  id: string,
  file: File,
): Promise<LeaseDocumentUploadResponse> {
  const form = new FormData();
  form.append('document', file);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/leases/${id}/document`, {
    method: 'POST',
    headers,
    body: form,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as Record<string, unknown>).message)
        : `Upload failed with status ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  return body as LeaseDocumentUploadResponse;
}

export interface LeaseDocumentViewResponse {
  url: string;
  external: boolean;
  expiresInSeconds?: number;
}

export function getLeaseDocumentUrl(id: string): Promise<LeaseDocumentViewResponse> {
  return api.get<LeaseDocumentViewResponse>(`/leases/${id}/document`);
}

export function deleteLeaseDocument(id: string): Promise<void> {
  return api.delete<void>(`/leases/${id}/document`);
}
