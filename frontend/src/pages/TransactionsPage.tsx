import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties, type Property } from '../lib/properties';
import { listUnits, type Unit } from '../lib/units';
import { listLeases, type Lease } from '../lib/leases';
import { listTenants, type Tenant } from '../lib/tenants';
import {
  deleteTransaction,
  listTransactions,
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionType,
} from '../lib/transactions';
import TransactionFormModal from '../components/TransactionFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; transaction: Transaction };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TYPE_STYLES: Record<TransactionType, string> = {
  RENT_INCOME: 'bg-emerald-100 text-emerald-800',
  DEPOSIT_INCOME: 'bg-emerald-100 text-emerald-800',
  OTHER_INCOME: 'bg-emerald-100 text-emerald-800',
  EXPENSE: 'bg-red-100 text-red-800',
  REFUND: 'bg-amber-100 text-amber-800',
};

export default function TransactionsPage() {
  const transactionsQuery = useApiQuery(() => listTransactions(), []);
  const propertiesQuery = useApiQuery(() => listProperties(), []);
  const unitsQuery = useApiQuery(() => listUnits(), []);
  const leasesQuery = useApiQuery(() => listLeases(), []);
  const tenantsQuery = useApiQuery(() => listTenants(), []);

  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [filterPropertyId, setFilterPropertyId] = useState<string>('all');

  const transactions = transactionsQuery.data?.data ?? [];
  const properties = propertiesQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const leases = leasesQuery.data?.data ?? [];
  const tenants = tenantsQuery.data?.data ?? [];

  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const filteredTransactions = useMemo(() => {
    if (filterPropertyId === 'all') return transactions;
    return transactions.filter((t) => t.propertyId === filterPropertyId);
  }, [transactions, filterPropertyId]);

  const loading =
    transactionsQuery.loading ||
    propertiesQuery.loading ||
    unitsQuery.loading ||
    leasesQuery.loading ||
    tenantsQuery.loading;

  const error =
    transactionsQuery.error ??
    propertiesQuery.error ??
    unitsQuery.error ??
    leasesQuery.error ??
    tenantsQuery.error;

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void transactionsQuery.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteTransaction(deleteTarget.id);
    setDeleteTarget(null);
    void transactionsQuery.refresh();
  }

  function refreshAll(): void {
    void transactionsQuery.refresh();
    void propertiesQuery.refresh();
    void unitsQuery.refresh();
    void leasesQuery.refresh();
    void tenantsQuery.refresh();
  }

  const canCreate = properties.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rent payments, expenses, and other money in and out.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <select
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              aria-label="Filter by property"
            >
              <option value="all">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setForm({ kind: 'create' })}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Add a property first'}
            className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add transaction
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading transactions...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load transactions.</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          <button
            type="button"
            onClick={refreshAll}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && properties.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Receipt className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Add a property first</h2>
          <p className="mt-1 text-sm text-slate-500">
            Transactions belong to properties. Add one on the Properties page before
            recording transactions.
          </p>
        </div>
      )}

      {!loading && !error && properties.length > 0 && filteredTransactions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Receipt className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {filterPropertyId === 'all' ? 'No transactions yet' : 'No transactions for this property'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Record a rent payment or expense to get started.
          </p>
        </div>
      )}

      {!loading && !error && filteredTransactions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Date</Th>
                <Th>Property</Th>
                <Th>Unit</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTransactions.map((t) => {
                const property = propertyById.get(t.propertyId);
                const unit = t.unitId ? unitById.get(t.unitId) : null;
                return (
                  <tr key={t.id}>
                    <Td>{new Date(t.date).toLocaleDateString()}</Td>
                    <Td>
                      <div className="text-slate-700">{property?.name ?? '—'}</div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">
                        {unit?.label ?? <span className="text-slate-400">—</span>}
                      </div>
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[t.type]}`}
                      >
                        {TRANSACTION_TYPE_LABELS[t.type]}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-slate-700">{t.description}</div>
                    </Td>
                    <Td>
                      {t.category ? (
                        <span className="text-slate-700">{t.category}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
                    <Td align="right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setForm({ kind: 'edit', transaction: t })}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Edit transaction"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form.kind !== 'closed' && (
        <TransactionFormModal
          mode={form.kind}
          existing={form.kind === 'edit' ? form.transaction : null}
          properties={properties}
          units={units}
          leases={leases}
          tenants={tenants}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`This will permanently delete "${deleteTarget.description}". This cannot be undone.`}
          confirmLabel="Delete transaction"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

const Th = ({ children, align }: { children: ReactNode; align?: 'right' }) => (
  <th
    scope="col"
    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
      align === 'right' ? 'text-right' : 'text-left'
    }`}
  >
    {children}
  </th>
);

const Td = ({ children, align }: { children: ReactNode; align?: 'right' }) => (
  <td className={`whitespace-nowrap px-4 py-3 text-sm ${align === 'right' ? 'text-right' : ''}`}>
    {children}
  </td>
);
