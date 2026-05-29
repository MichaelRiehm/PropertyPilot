import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { deleteTenant, listTenants, type Tenant } from '../lib/tenants';
import { DEFAULT_PAGE_SIZE } from '../lib/pagination';
import TenantFormModal from '../components/TenantFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; tenant: Tenant };

export default function TenantsPage() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const fetcher = useCallback(() => listTenants({ page, pageSize }), [page, pageSize]);
  const query = useApiQuery(fetcher, [page, pageSize]);
  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);

  const items = query.data?.data ?? [];

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void query.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteTenant(deleteTarget.id);
    setDeleteTarget(null);
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
          <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
          <p className="mt-1 text-sm text-slate-500">
            People who lease units from you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ kind: 'create' })}
          className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add tenant
        </button>
      </div>

      {query.loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading tenants...
        </div>
      )}

      {query.error && !query.loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load tenants.</p>
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
            <Users className="h-6 w-6 text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No tenants yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add your first tenant so you can put them on a lease.
          </p>
          <button
            type="button"
            onClick={() => setForm({ kind: 'create' })}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add tenant
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
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Added</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((t) => (
                <tr key={t.id}>
                  <Td>
                    <div className="font-medium text-slate-900">{t.fullName}</div>
                  </Td>
                  <Td>
                    <a
                      href={`mailto:${t.email}`}
                      className="text-slate-700 hover:underline"
                    >
                      {t.email}
                    </a>
                  </Td>
                  <Td>
                    {t.phone ? (
                      <span className="text-slate-700">{t.phone}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ kind: 'edit', tenant: t })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={`Edit ${t.fullName}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${t.fullName}`}
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
        <TenantFormModal
          mode="create"
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}
      {form.kind === 'edit' && (
        <TenantFormModal
          mode="edit"
          existing={form.tenant}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete tenant?"
          message={`This will permanently delete "${deleteTarget.fullName}" and every lease and transaction attached to them. This cannot be undone.`}
          confirmLabel="Delete tenant"
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
