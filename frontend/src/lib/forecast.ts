import { api } from './apiClient';

export interface MonthlyProjection {
  month: string;
  income: number;
  expenses: number;
  net: number;
  expensesExceedIncome: boolean;
}

export interface ForecastResult {
  propertyId: string;
  propertyName: string;
  generatedAt: string;
  monthsAhead: number;
  trailingMonthsForExpenses: number;
  baselineMonthlyExpense: number;
  projections: MonthlyProjection[];
}

export function fetchForecast(propertyId: string): Promise<ForecastResult> {
  return api.get<ForecastResult>(`/forecast/${encodeURIComponent(propertyId)}`);
}
