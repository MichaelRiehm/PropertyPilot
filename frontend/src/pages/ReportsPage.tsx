import { useCallback, useState } from 'react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties } from '../lib/properties';
import {
  fetchMaintenanceAging,
  fetchOccupancy,
  fetchPnL,
  fetchRentRoll,
  type Report,
  type ReportCellValue,
  type ReportColumn,
} from '../lib/reports';

type TabKey = 'rent-roll' | 'pnl' | 'occupancy' | 'maintenance-aging';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function renderCell(value: ReportCellValue | undefined, format?: ReportColumn['format']): string {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'currency' && typeof value === 'number') {
    return currencyFormatter.format(value);
  }
  if (format === 'date' && typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }
  return String(value);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadReportCsv(report: Report): void {
  const lines: string[] = [];
  lines.push(report.columns.map((c) => csvEscape(c.label)).join(','));
  for (const row of report.rows) {
    lines.push(
      report.columns
        .map((c) => {
          const raw = row[c.key];
          if (raw === null || raw === undefined) return '';
          return csvEscape(String(raw));
        })
        .join(','),
    );
  }
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `${report.title.replace(/\s+/g, '-').toLowerCase()}-${report.generatedAt.slice(
    0,
    10,
  )}.csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('rent-roll');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Standard reports across your portfolio.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap gap-6">
          <TabButton active={tab === 'rent-roll'} onClick={() => setTab('rent-roll')}>
            Rent Roll
          </TabButton>
          <TabButton active={tab === 'pnl'} onClick={() => setTab('pnl')}>
            Profit &amp; Loss (YTD)
          </TabButton>
          <TabButton active={tab === 'occupancy'} onClick={() => setTab('occupancy')}>
            Occupancy
          </TabButton>
          <TabButton
            active={tab === 'maintenance-aging'}
            onClick={() => setTab('maintenance-aging')}
          >
            Maintenance Aging
          </TabButton>
        </nav>
      </div>

      {tab === 'rent-roll' && <RentRollTab />}
      {tab === 'pnl' && <PnLTab />}
      {tab === 'occupancy' && <OccupancyTab />}
      {tab === 'maintenance-aging' && <MaintenanceAgingTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function RentRollTab() {
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const [propertyId, setPropertyId] = useState<string>('');

  const reportFetcher = useCallback(
    () => fetchRentRoll(propertyId ? { propertyId } : {}),
    [propertyId],
  );
  const reportQuery = useApiQuery(reportFetcher, [propertyId]);

  return (
    <ReportView
      report={reportQuery.data}
      loading={reportQuery.loading}
      error={reportQuery.error}
      onRefresh={() => void reportQuery.refresh()}
      properties={propertiesQuery.data?.data ?? []}
      propertyId={propertyId}
      onPropertyChange={setPropertyId}
    />
  );
}

function PnLTab() {
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const [propertyId, setPropertyId] = useState<string>('');

  const reportFetcher = useCallback(
    () => fetchPnL(propertyId ? { propertyId } : {}),
    [propertyId],
  );
  const reportQuery = useApiQuery(reportFetcher, [propertyId]);

  return (
    <ReportView
      report={reportQuery.data}
      loading={reportQuery.loading}
      error={reportQuery.error}
      onRefresh={() => void reportQuery.refresh()}
      properties={propertiesQuery.data?.data ?? []}
      propertyId={propertyId}
      onPropertyChange={setPropertyId}
    />
  );
}

function OccupancyTab() {
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const [propertyId, setPropertyId] = useState<string>('');

  const reportFetcher = useCallback(
    () => fetchOccupancy(propertyId ? { propertyId } : {}),
    [propertyId],
  );
  const reportQuery = useApiQuery(reportFetcher, [propertyId]);

  return (
    <ReportView
      report={reportQuery.data}
      loading={reportQuery.loading}
      error={reportQuery.error}
      onRefresh={() => void reportQuery.refresh()}
      properties={propertiesQuery.data?.data ?? []}
      propertyId={propertyId}
      onPropertyChange={setPropertyId}
    />
  );
}

function MaintenanceAgingTab() {
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const [propertyId, setPropertyId] = useState<string>('');

  const reportFetcher = useCallback(
    () => fetchMaintenanceAging(propertyId ? { propertyId } : {}),
    [propertyId],
  );
  const reportQuery = useApiQuery(reportFetcher, [propertyId]);

  return (
    <ReportView
      report={reportQuery.data}
      loading={reportQuery.loading}
      error={reportQuery.error}
      onRefresh={() => void reportQuery.refresh()}
      properties={propertiesQuery.data?.data ?? []}
      propertyId={propertyId}
      onPropertyChange={setPropertyId}
    />
  );
}

interface ReportViewProps {
  report: Report | null;
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  properties: { id: string; name: string }[];
  propertyId: string;
  onPropertyChange: (value: string) => void;
}

function ReportView({
  report,
  loading,
  error,
  onRefresh,
  properties,
  propertyId,
  onPropertyChange,
}: ReportViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <div>
              <label
                htmlFor="report-property"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Property
              </label>
              <select
                id="report-property"
                value={propertyId}
                onChange={(e) => onPropertyChange(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => report && downloadReportCsv(report)}
            disabled={!report || report.rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Generating report...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not generate report.</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {report && !loading && !error && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          {report.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <BarChart3 className="h-6 w-6 text-slate-500" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No data</h3>
              <p className="mt-1 text-sm text-slate-500">
                Nothing to report for the selected filters.
              </p>
            </div>
          ) : (
            <>
              {/* Table view (>=768px) */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {report.columns.map((c) => (
                        <th
                          key={c.key}
                          scope="col"
                          className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                            c.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.rows.map((row, i) => {
                      const isTotal = row.period === 'Total';
                      return (
                        <tr
                          key={i}
                          className={isTotal ? 'bg-slate-50 font-medium' : undefined}
                        >
                          {report.columns.map((c) => (
                            <td
                              key={c.key}
                              className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 ${
                                c.align === 'right' ? 'text-right' : ''
                              }`}
                            >
                              {renderCell(row[c.key], c.format)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card view (<768px) */}
              <ul className="space-y-3 md:hidden" aria-label={`${report.title} rows`}>
                {report.rows.map((row, i) => (
                  <ReportRowCard key={i} row={row} columns={report.columns} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReportRowCard({
  row,
  columns,
}: {
  row: Report['rows'][number];
  columns: ReportColumn[];
}) {
  const isTotal = row.period === 'Total';
  return (
    <li
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
        isTotal ? 'bg-slate-50 font-medium' : ''
      }`}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {columns.map((c) => (
          <div
            key={c.key}
            className="col-span-2 grid grid-cols-subgrid items-baseline gap-x-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {c.label}
            </dt>
            <dd
              className={`text-sm text-slate-700 ${
                c.align === 'right' ? 'text-right' : ''
              }`}
            >
              {renderCell(row[c.key], c.format) || (
                <span className="text-slate-400">—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
