import { api } from './apiClient';

export const PROPERTY_TYPES = [
  'SINGLE_FAMILY',
  'MULTI_FAMILY',
  'DUPLEX',
  'TRIPLEX',
  'FOURPLEX',
  'CONDO',
  'TOWNHOUSE',
  'OTHER',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  SINGLE_FAMILY: 'Single Family',
  MULTI_FAMILY: 'Multi-Family',
  DUPLEX: 'Duplex',
  TRIPLEX: 'Triplex',
  FOURPLEX: 'Fourplex',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  OTHER: 'Other',
};

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  propertyType: PropertyType;
  fullAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListResponse {
  data: Property[];
  total: number;
  limit: number;
  offset: number;
}

export interface PropertyCreateInput {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  propertyType?: PropertyType;
}

export type PropertyUpdateInput = Partial<PropertyCreateInput>;

export function listProperties(): Promise<PropertyListResponse> {
  return api.get<PropertyListResponse>('/properties');
}

export function createProperty(input: PropertyCreateInput): Promise<Property> {
  return api.post<Property>('/properties', input);
}

export function updateProperty(id: string, input: PropertyUpdateInput): Promise<Property> {
  return api.patch<Property>(`/properties/${id}`, input);
}

export function deleteProperty(id: string): Promise<void> {
  return api.delete<void>(`/properties/${id}`);
}
