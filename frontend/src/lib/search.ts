import { api } from './apiClient';

export interface PropertyHit {
  type: 'property';
  id: string;
  name: string;
  fullAddress: string;
  propertyType: string;
}

export interface TenantHit {
  type: 'tenant';
  id: string;
  fullName: string;
  email: string;
}

export interface TransactionHit {
  type: 'transaction';
  id: string;
  description: string;
  amount: number;
  signedAmount: number;
  isIncome: boolean;
  date: string;
  propertyId: string;
  propertyName: string;
}

export type SearchHit = PropertyHit | TenantHit | TransactionHit;

export interface SearchResponse {
  query: string;
  totalHits: number;
  counts: {
    property: number;
    tenant: number;
    transaction: number;
  };
  results: SearchHit[];
}

export function search(query: string): Promise<SearchResponse> {
  return api.get<SearchResponse>('/search', { q: query });
}
