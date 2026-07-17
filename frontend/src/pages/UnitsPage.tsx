import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { DoorOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties, type Property } from '../lib/properties';
import { deleteUnit, listUnits, type Unit } from '../lib/units';
import { DEFAULT_PAGE_SIZE } from '../lib/pagination';
import UnitFormModal from '../components/UnitFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; unit: Unit };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function UnitsPage() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [filterPropertyId, setFilterPropertyId] = useState<string>('all');

  const unitsFetcher = useCallback(
    () =>
      listUnits({
        page,
        pageSize,
        propertyId: filterPropertyId === 'all' ? undefined : filterPropertyId,
      }),
    [page, pageSize, filterPropertyId],
  );
  const unitsQuery = useApiQuery(unitsFetcher, [page, pageSize, filterPropertyId]);
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );

  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  const properties = propertiesQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const loading = unitsQuery.loading || propertiesQuery.loading;
  const error = unitsQuery.error ?? propertiesQuery.error;

  function changeFilter(value: string): void {
    setFilterPropertyId(value);
    setPage(1);
  }

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void unitsQuery.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteUnit(deleteTarget.id);
    setDeleteTarget(null);
    if (units.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      void unitsQuery.refresh();
    }
  }

  const canCreate = properties.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Units</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rentable units across your properties.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <div>
              <label htmlFor="filter-property" className="sr-only">
                Filter by property
              </label>
              <select
                id="filter-property"
                value={filterPropertyId}
                onChange={(e) => changeFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setForm({ kind: 'create' })}
            disabled={!canCreate}
            className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            title={canCreate ? undefined : 'Add a property first'}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add unit
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading units...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load units.</p>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          <button
            type="button"
            onClick={() => {
              void unitsQuery.refresh();
              void propertiesQuery.refresh();
            }}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && properties.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <DoorOpen className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Add a property first</h2>
          <p className="mt-1 text-sm text-slate-500">
            Units belong to properties. Create a property on the Properties page before
            adding units here.
          </p>
        </div>
      )}

      {!loading && !error && properties.length > 0 && units.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <DoorOpen className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {filterPropertyId === 'all' ? 'No units yet' : 'No units for this property'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {filterPropertyId === 'all'
              ? 'Add a unit to start tracking leases and rent.'
              : 'Pick a different property or add a unit to this one.'}
          </p>
          {filterPropertyId !== 'all' && (
            <button
              type="button"
              onClick={() => setForm({ kind: 'create' })}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add unit
            </button>
          )}
        </div>
      )}

      {!loading && !error && units.length > 0 && unitsQuery.data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Property</Th>
                  <Th>Label</Th>
                  <Th align="right">Bedrooms</Th>
                  <Th align="right">Bathrooms</Th>
                  <Th align="right">Sq ft</Th>
                  <Th align="right">Market rent</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {units.map((u) => {
                  const property = propertyById.get(u.propertyId);
                  return (
                    <tr key={u.id}>
                      <Td>
                        <div className="font-medium text-slate-900">
                          {property?.name ?? '—'}
                        </div>
                      </Td>
                      <Td>{u.label}</Td>
                      <Td align="right">{u.bedrooms}</Td>
                      <Td align="right">{u.bathrooms}</Td>
                      <Td align="right">{u.squareFeet ?? '—'}</Td>
                      <Td align="right">{currencyFormatter.format(u.marketRent)}</Td>
                      <Td align="right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setForm({ kind: 'edit', unit: u })}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Edit ${u.label}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Delete ${u.label}`}
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
          <Pagination
            page={unitsQuery.data.page}
            pageSize={unitsQuery.data.pageSize}
            total={unitsQuery.data.total}
            totalPages={unitsQuery.data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {form.kind === 'create' && (
        <UnitFormModal
          mode="create"
          properties={properties}
          defaultPropertyId={filterPropertyId === 'all' ? undefined : filterPropertyId}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}
      {form.kind === 'edit' && (
        <UnitFormModal
          mode="edit"
          existing={form.unit}
          properties={properties}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete unit?"
          message={`This will permanently delete "${deleteTarget.label}" and any leases and transactions attached to it. This cannot be undone.`}
          confirmLabel="Delete unit"
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
