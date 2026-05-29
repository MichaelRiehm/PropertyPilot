import { api } from './apiClient';
import type { PaginatedResponse, PaginationParams } from './pagination';

export interface Tenant {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TenantListResponse = PaginatedResponse<Tenant>;

export interface TenantCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export type TenantUpdateInput = Partial<TenantCreateInput>;

export function listTenants(params: PaginationParams = {}): Promise<TenantListResponse> {
  return api.get<TenantListResponse>('/tenants', {
    page: params.page,
    pageSize: params.pageSize,
  });
}

export function createTenant(input: TenantCreateInput): Promise<Tenant> {
  return api.post<Tenant>('/tenants', input);
}

export function updateTenant(id: string, input: TenantUpdateInput): Promise<Tenant> {
  return api.patch<Tenant>(`/tenants/${id}`, input);
}

export function deleteTenant(id: string): Promise<void> {
  return api.delete<void>(`/tenants/${id}`);
}
