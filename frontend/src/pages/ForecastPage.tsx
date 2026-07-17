import { useCallback, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, LineChart as LineChartIcon, RefreshCw } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties } from '../lib/properties';
import { fetchForecast, type MonthlyProjection } from '../lib/forecast';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatMonth(monthStr: string): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthNumStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return monthStr;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function ForecastPage() {
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const [propertyId, setPropertyId] = useState<string>('');

  const properties = propertiesQuery.data?.data ?? [];

  // Default the selector to the first property once they load.
  const effectivePropertyId =
    propertyId || properties[0]?.id || '';

  const forecastFetcher = useCallback(
    () => (effectivePropertyId ? fetchForecast(effectivePropertyId) : Promise.resolve(null)),
    [effectivePropertyId],
  );
  const forecastQuery = useApiQuery(forecastFetcher, [effectivePropertyId]);

  const chartData = useMemo(() => {
    const projections = forecastQuery.data?.projections ?? [];
    return projections.map((p) => ({
      month: formatMonth(p.month),
      income: Math.round(p.income),
      expenses: Math.round(p.expenses),
      net: Math.round(p.net),
    }));
  }, [forecastQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">12-month cash flow forecast</h1>
        <p className="mt-1 text-sm text-slate-500">
          Projected income from active leases and a trailing six-month average of expenses, applied
          forward to each upcoming month.
        </p>
      </div>

      {propertiesQuery.loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading properties...
        </div>
      )}

      {!propertiesQuery.loading && properties.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <LineChartIcon className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Add a property first</h2>
          <p className="mt-1 text-sm text-slate-500">
            The forecast is per-property. Create one on the Properties page before coming back here.
          </p>
        </div>
      )}

      {properties.length > 0 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label
                htmlFor="forecast-property"
                className="block text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Property
              </label>
              <select
                id="forecast-property"
                value={effectivePropertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void forecastQuery.refresh()}
              disabled={forecastQuery.loading}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>

          {forecastQuery.loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Building forecast...
            </div>
          )}

          {forecastQuery.error && !forecastQuery.loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-medium text-red-800">Could not load the forecast.</p>
              <p className="mt-1 text-sm text-red-700">{forecastQuery.error.message}</p>
              <button
                type="button"
                onClick={() => void forecastQuery.refresh()}
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}

          {forecastQuery.data && !forecastQuery.loading && !forecastQuery.error && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {forecastQuery.data.propertyName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Generated {new Date(forecastQuery.data.generatedAt).toLocaleString()} ·
                  baseline monthly expense{' '}
                  {currencyFormatter.format(forecastQuery.data.baselineMonthlyExpense)} (
                  {forecastQuery.data.trailingMonthsForExpenses}-month average)
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#475569' }}
                      tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === 'number' ? currencyFormatter.format(value) : String(value)
                      }
                      contentStyle={{ borderRadius: 6, border: '1px solid #e2e8f0' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#0f172a"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Month</Th>
                      <Th align="right">Income</Th>
                      <Th align="right">Expenses</Th>
                      <Th align="right">Net</Th>
                      <Th>Flag</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {forecastQuery.data.projections.map((p) => (
                      <ProjectionRow key={p.month} projection={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectionRow({ projection }: { projection: MonthlyProjection }) {
  const netClass = projection.net < 0 ? 'text-red-700' : 'text-slate-700';
  return (
    <tr className={projection.expensesExceedIncome ? 'bg-red-50/50' : undefined}>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
        {formatMonth(projection.month)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-emerald-700">
        {currencyFormatter.format(projection.income)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-red-700">
        {currencyFormatter.format(projection.expenses)}
      </td>
      <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${netClass}`}>
        {currencyFormatter.format(projection.net)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        {projection.expensesExceedIncome ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Expenses exceed income
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

function Th({ children, align }: { children: string; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
