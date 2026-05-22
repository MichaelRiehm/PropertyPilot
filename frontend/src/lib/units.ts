import { api } from './apiClient';

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

export interface UnitListResponse {
  data: Unit[];
  total: number;
  limit: number;
  offset: number;
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

export function listUnits(propertyId?: string): Promise<UnitListResponse> {
  return api.get<UnitListResponse>('/units', propertyId ? { propertyId } : undefined);
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
