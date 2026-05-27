import { api } from './apiClient';

export type ReportCellValue = string | number | boolean | null;

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'currency' | 'date' | 'number';
}

export type ReportRow = Record<string, ReportCellValue>;

export interface Report {
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface RentRollParams {
  propertyId?: string;
  asOf?: string;
}

export interface PnLParams {
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OccupancyParams {
  propertyId?: string;
  asOf?: string;
}

export interface MaintenanceAgingParams {
  propertyId?: string;
  asOf?: string;
}

function asQuery(record: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
}

export function fetchRentRoll(params: RentRollParams = {}): Promise<Report> {
  return api.get<Report>(
    '/reports/rent-roll',
    asQuery({ propertyId: params.propertyId, asOf: params.asOf }),
  );
}

export function fetchPnL(params: PnLParams = {}): Promise<Report> {
  return api.get<Report>(
    '/reports/pnl',
    asQuery({
      propertyId: params.propertyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
  );
}

export function fetchOccupancy(params: OccupancyParams = {}): Promise<Report> {
  return api.get<Report>(
    '/reports/occupancy',
    asQuery({ propertyId: params.propertyId, asOf: params.asOf }),
  );
}

export function fetchMaintenanceAging(
  params: MaintenanceAgingParams = {},
): Promise<Report> {
  return api.get<Report>(
    '/reports/maintenance-aging',
    asQuery({ propertyId: params.propertyId, asOf: params.asOf }),
  );
}
