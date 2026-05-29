import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import {
  PROPERTY_TYPE_LABELS,
  deleteProperty,
  listProperties,
  type Property,
} from '../lib/properties';
import { DEFAULT_PAGE_SIZE } from '../lib/pagination';
import PropertyFormModal from '../components/PropertyFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; property: Property };

export default function PropertiesPage() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const fetcher = useCallback(() => listProperties({ page, pageSize }), [page, pageSize]);
  const query = useApiQuery(fetcher, [page, pageSize]);
  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const items = query.data?.data ?? [];

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void query.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteProperty(deleteTarget.id);
    setDeleteTarget(null);
    // If we just emptied the current page, step back one.
    if (items.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      void query.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Properties</h1>
          <p className="mt-1 text-sm text-slate-500">
            Buildings or addresses you own. Each property holds one or more units.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ kind: 'create' })}
          className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add property
        </button>
      </div>

      {query.loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading properties...
        </div>
      )}

      {query.error && !query.loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">
            Could not load properties.
          </p>
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

      {!query.loading && !query.error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No properties yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add your first property to start tracking units, leases, and transactions.
          </p>
          <button
            type="button"
            onClick={() => setForm({ kind: 'create' })}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add property
          </button>
        </div>
      )}

      {!query.loading && !query.error && items.length > 0 && query.data && (
        <>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Address</Th>
                <Th>Type</Th>
                <Th>Added</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <div className="font-medium text-slate-900">{p.name}</div>
                  </Td>
                  <Td>
                    <div className="text-slate-700">{p.fullAddress}</div>
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {PROPERTY_TYPE_LABELS[p.propertyType]}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ kind: 'edit', property: p })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          totalPages={query.data.totalPages}
          onPageChange={setPage}
        />
        </>
      )}

      {form.kind === 'create' && (
        <PropertyFormModal
          mode="create"
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}
      {form.kind === 'edit' && (
        <PropertyFormModal
          mode="edit"
          existing={form.property}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete property?"
          message={`This will permanently delete "${deleteTarget.name}" and every unit, lease, and transaction attached to it. This cannot be undone.`}
          confirmLabel="Delete property"
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
