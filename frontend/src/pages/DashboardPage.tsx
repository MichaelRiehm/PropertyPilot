import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleSlash,
  Clock,
  DoorOpen,
  FileText,
  Home,
  Loader2,
  Receipt,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApiQuery } from '../lib/useApi';
import { fetchDashboard, type MaintenanceStatus } from '../lib/dashboard';

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

const STATUS_META: Record<
  MaintenanceStatus,
  { label: string; icon: typeof Wrench; tone: string }
> = {
  OPEN: { label: 'Open', icon: AlertCircle, tone: 'bg-amber-100 text-amber-800' },
  IN_PROGRESS: { label: 'In progress', icon: Loader2, tone: 'bg-blue-100 text-blue-800' },
  CLOSED: { label: 'Closed', icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-800' },
  CANCELED: { label: 'Canceled', icon: CircleSlash, tone: 'bg-slate-100 text-slate-700' },
};

const STATUS_ORDER: MaintenanceStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELED'];

export default function DashboardPage() {
  const { user } = useAuth();
  const query = useApiQuery(() => fetchDashboard(), []);

  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Welcome back{user?.email ? `, ${user.email}` : ''}.
        </p>
      </div>

      {query.loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading dashboard...
        </div>
      )}

      {query.error && !query.loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load the dashboard.</p>
          <p className="mt-1 text-sm text-red-700">{query.error.message}</p>
          <button
            type="button"
            onClick={() => void query.refresh()}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {data && !query.loading && !query.error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label="Total properties"
              value={data.totalProperties.toLocaleString()}
              icon={<Home className="h-5 w-5" />}
              href="/properties"
            />
            <SummaryCard
              label="Total units"
              value={data.totalUnits.toLocaleString()}
              icon={<Building2 className="h-5 w-5" />}
              href="/units"
            />
            <SummaryCard
              label="Occupied units"
              value={data.occupiedUnits.toLocaleString()}
              hint={
                data.totalUnits > 0
                  ? `${Math.round((data.occupiedUnits / data.totalUnits) * 100)}% occupancy`
                  : 'No units yet'
              }
              icon={<DoorOpen className="h-5 w-5" />}
              href="/reports"
            />
            <SummaryCard
              label="Active leases"
              value={data.totalActiveLeases.toLocaleString()}
              icon={<FileText className="h-5 w-5" />}
              href="/leases"
            />
            <SummaryCard
              label="YTD rent collected"
              value={compactCurrencyFormatter.format(data.ytdRentCollected)}
              tone="positive"
              icon={<Wallet className="h-5 w-5" />}
              href="/transactions"
            />
            <SummaryCard
              label="YTD expenses"
              value={compactCurrencyFormatter.format(data.ytdExpenses)}
              tone="negative"
              icon={<Receipt className="h-5 w-5" />}
              href="/transactions"
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">
                Maintenance tickets by status
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const count = data.maintenanceTicketsByStatus[status] ?? 0;
                return (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{meta.label}</span>
                    <span className="ml-1 rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold">
                      {count}
                    </span>
                  </span>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-900">Recent transactions</h2>
              </div>
              <Link
                to="/transactions"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                View all
              </Link>
            </div>
            {data.recentTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Date</Th>
                      <Th>Property</Th>
                      <Th>Description</Th>
                      <Th>Type</Th>
                      <Th align="right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.recentTransactions.map((t) => (
                      <tr key={t.id}>
                        <Td>{new Date(t.date).toLocaleDateString()}</Td>
                        <Td>
                          <span className="text-slate-700">{t.propertyName}</span>
                        </Td>
                        <Td>
                          <span className="font-medium text-slate-900">{t.description}</span>
                          {t.category && (
                            <span className="ml-2 text-xs text-slate-500">· {t.category}</span>
                          )}
                        </Td>
                        <Td>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {t.type.replace('_', ' ').toLowerCase()}
                          </span>
                        </Td>
                        <Td align="right">
                          <span
                            className={`font-medium ${
                              t.isIncome ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {currencyFormatter.format(t.signedAmount)}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-slate-400">
            Snapshot from {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'positive' | 'negative' | 'neutral';
  href?: string;
}

function SummaryCard({ label, value, hint, icon, tone = 'neutral', href }: SummaryCardProps) {
  const valueTone =
    tone === 'positive'
      ? 'text-emerald-700'
      : tone === 'negative'
        ? 'text-red-700'
        : 'text-slate-900';
  const card = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-semibold ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? (
    <Link to={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

function Th({ children, align }: { children: ReactNode; align?: 'right' }) {
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

function Td({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </td>
  );
}
