import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties, type Property } from '../lib/properties';
import { listUnits, type Unit } from '../lib/units';
import { listTenants, type Tenant } from '../lib/tenants';
import {
  deleteLease,
  listLeases,
  LEASE_STATUS_LABELS,
  type Lease,
  type LeaseStatus,
} from '../lib/leases';
import LeaseFormModal from '../components/LeaseFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; lease: Lease };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const STATUS_STYLES: Record<LeaseStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-slate-100 text-slate-700',
  TERMINATED: 'bg-red-100 text-red-800',
};

export default function LeasesPage() {
  const leasesQuery = useApiQuery(() => listLeases(), []);
  const propertiesQuery = useApiQuery(() => listProperties(), []);
  const unitsQuery = useApiQuery(() => listUnits(), []);
  const tenantsQuery = useApiQuery(() => listTenants(), []);

  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Lease | null>(null);

  const properties = propertiesQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const tenants = tenantsQuery.data?.data ?? [];
  const leases = leasesQuery.data?.data ?? [];

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const tenantById = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) map.set(t.id, t);
    return map;
  }, [tenants]);

  const loading =
    leasesQuery.loading ||
    propertiesQuery.loading ||
    unitsQuery.loading ||
    tenantsQuery.loading;
  const error =
    leasesQuery.error ??
    propertiesQuery.error ??
    unitsQuery.error ??
    tenantsQuery.error;

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void leasesQuery.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteLease(deleteTarget.id);
    setDeleteTarget(null);
    void leasesQuery.refresh();
  }

  function refreshAll(): void {
    void leasesQuery.refresh();
    void propertiesQuery.refresh();
    void unitsQuery.refresh();
    void tenantsQuery.refresh();
  }

  const canCreate = units.length > 0 && tenants.length > 0;
  let blockedReason: string | null = null;
  if (units.length === 0) blockedReason = 'Add a unit before creating a lease.';
  else if (tenants.length === 0) blockedReason = 'Add a tenant before creating a lease.';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leases</h1>
          <p className="mt-1 text-sm text-slate-500">
            Active and historical leases linking tenants to units.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ kind: 'create' })}
          disabled={!canCreate}
          title={blockedReason ?? undefined}
          className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add lease
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading leases...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load leases.</p>
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

      {!loading && !error && leases.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {blockedReason ? blockedReason : 'No leases yet'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {blockedReason
              ? 'Add the missing record on its own page, then come back here.'
              : 'Link a tenant to a unit to start collecting rent.'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setForm({ kind: 'create' })}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add lease
            </button>
          )}
        </div>
      )}

      {!loading && !error && leases.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Tenant</Th>
                <Th>Unit</Th>
                <Th>Term</Th>
                <Th align="right">Rent</Th>
                <Th align="right">Deposit</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leases.map((lease) => {
                const tenant = tenantById.get(lease.tenantId);
                const unit = unitById.get(lease.unitId);
                const property = unit ? propertyById.get(unit.propertyId) : undefined;
                return (
                  <tr key={lease.id}>
                    <Td>
                      <div className="font-medium text-slate-900">
                        {tenant?.fullName ?? '—'}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">
                        {property?.name ?? '—'}
                        {unit?.label ? (
                          <span className="text-slate-400"> · {unit.label}</span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-slate-700">
                        {new Date(lease.startDate).toLocaleDateString()} -{' '}
                        {new Date(lease.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {lease.termInMonths} month{lease.termInMonths === 1 ? '' : 's'}
                      </div>
                    </Td>
                    <Td align="right">{currencyFormatter.format(lease.monthlyRent)}</Td>
                    <Td align="right">
                      {currencyFormatter.format(lease.securityDeposit)}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status]}`}
                      >
                        {LEASE_STATUS_LABELS[lease.status]}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setForm({ kind: 'edit', lease })}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Edit lease"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lease)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          aria-label="Delete lease"
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
        <LeaseFormModal
          mode={form.kind}
          existing={form.kind === 'edit' ? form.lease : null}
          properties={properties}
          units={units}
          tenants={tenants}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete lease?"
          message="This will permanently delete the lease and every transaction attached to it. This cannot be undone."
          confirmLabel="Delete lease"
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
