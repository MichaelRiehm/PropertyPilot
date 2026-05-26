import { api } from './apiClient';

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

export interface TenantListResponse {
  data: Tenant[];
  total: number;
  limit: number;
  offset: number;
}

export interface TenantCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export type TenantUpdateInput = Partial<TenantCreateInput>;

export function listTenants(): Promise<TenantListResponse> {
  return api.get<TenantListResponse>('/tenants');
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
