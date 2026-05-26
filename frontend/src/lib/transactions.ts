import { api } from './apiClient';

export const TRANSACTION_TYPES = [
  'RENT_INCOME',
  'DEPOSIT_INCOME',
  'OTHER_INCOME',
  'EXPENSE',
  'REFUND',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  RENT_INCOME: 'Rent income',
  DEPOSIT_INCOME: 'Deposit income',
  OTHER_INCOME: 'Other income',
  EXPENSE: 'Expense',
  REFUND: 'Refund',
};

export interface Transaction {
  id: string;
  propertyId: string;
  unitId: string | null;
  leaseId: string | null;
  type: TransactionType;
  category: string | null;
  amount: number;
  signedAmount: number;
  isIncome: boolean;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface TransactionCreateInput {
  propertyId: string;
  unitId?: string | null;
  leaseId?: string | null;
  type: TransactionType;
  category?: string | null;
  amount: number;
  date: string;
  description: string;
}

export interface TransactionUpdateInput {
  category?: string | null;
  amount?: number;
  description?: string;
}

export function listTransactions(): Promise<TransactionListResponse> {
  return api.get<TransactionListResponse>('/transactions');
}

export function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  return api.post<Transaction>('/transactions', input);
}

export function updateTransaction(
  id: string,
  input: TransactionUpdateInput,
): Promise<Transaction> {
  return api.patch<Transaction>(`/transactions/${id}`, input);
}

export function deleteTransaction(id: string): Promise<void> {
  return api.delete<void>(`/transactions/${id}`);
}
