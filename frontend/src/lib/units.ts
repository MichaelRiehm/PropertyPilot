import { api } from './apiClient';
import type { PaginatedResponse, PaginationParams } from './pagination';

export interface Unit {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  marketRent: number;
  createdAt: string;
  updatedAt: string;
}

export type UnitListResponse = PaginatedResponse<Unit>;

export interface UnitListParams extends PaginationParams {
  propertyId?: string;
}

export interface UnitCreateInput {
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number | null;
  marketRent: number;
}

export type UnitUpdateInput = Partial<Omit<UnitCreateInput, 'propertyId'>>;

export function listUnits(params: UnitListParams = {}): Promise<UnitListResponse> {
  return api.get<UnitListResponse>('/units', {
    page: params.page,
    pageSize: params.pageSize,
    propertyId: params.propertyId,
  });
}

export function createUnit(input: UnitCreateInput): Promise<Unit> {
  return api.post<Unit>('/units', input);
}

export function updateUnit(id: string, input: UnitUpdateInput): Promise<Unit> {
  return api.patch<Unit>(`/units/${id}`, input);
}

export function deleteUnit(id: string): Promise<void> {
  return api.delete<void>(`/units/${id}`);
}
