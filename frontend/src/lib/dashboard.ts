import { api } from './apiClient';
import type { TransactionType } from './transactions';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED';

export interface RecentTransaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string | null;
  amount: number;
  signedAmount: number;
  isIncome: boolean;
  description: string;
  propertyId: string;
  propertyName: string;
}

export interface DashboardSummary {
  generatedAt: string;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  totalActiveLeases: number;
  ytdRentCollected: number;
  ytdExpenses: number;
  recentTransactions: RecentTransaction[];
  maintenanceTicketsByStatus: Record<MaintenanceStatus, number>;
}

export function fetchDashboard(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/dashboard');
}
