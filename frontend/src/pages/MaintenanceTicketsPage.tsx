import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { useApiQuery } from '../lib/useApi';
import { listProperties, type Property } from '../lib/properties';
import { listUnits, type Unit } from '../lib/units';
import {
  deleteMaintenanceTicket,
  listMaintenanceTickets,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type MaintenancePriority,
  type MaintenanceStatus,
  type MaintenanceTicket,
} from '../lib/maintenance-tickets';
import { DEFAULT_PAGE_SIZE } from '../lib/pagination';
import MaintenanceTicketFormModal from '../components/MaintenanceTicketFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

type FormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; ticket: MaintenanceTicket };

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-slate-100 text-slate-700',
};

const PRIORITY_STYLES: Record<MaintenancePriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-sky-100 text-sky-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export default function MaintenanceTicketsPage() {
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [filterPropertyId, setFilterPropertyId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | MaintenanceStatus>('all');

  const ticketsFetcher = useCallback(
    () =>
      listMaintenanceTickets({
        page,
        pageSize,
        propertyId: filterPropertyId === 'all' ? undefined : filterPropertyId,
        status: filterStatus === 'all' ? undefined : filterStatus,
      }),
    [page, pageSize, filterPropertyId, filterStatus],
  );
  const ticketsQuery = useApiQuery(ticketsFetcher, [
    page,
    pageSize,
    filterPropertyId,
    filterStatus,
  ]);
  const propertiesQuery = useApiQuery(
    () => listProperties({ page: 1, pageSize: 200 }),
    [],
  );
  const unitsQuery = useApiQuery(() => listUnits({ page: 1, pageSize: 200 }), []);

  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceTicket | null>(null);

  const tickets = ticketsQuery.data?.data ?? [];
  const properties = propertiesQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];

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

  function changePropertyFilter(value: string): void {
    setFilterPropertyId(value);
    setPage(1);
  }

  function changeStatusFilter(value: string): void {
    setFilterStatus(value as 'all' | MaintenanceStatus);
    setPage(1);
  }

  const loading = ticketsQuery.loading || propertiesQuery.loading || unitsQuery.loading;
  const error = ticketsQuery.error ?? propertiesQuery.error ?? unitsQuery.error;

  function handleSaved(): void {
    setForm({ kind: 'closed' });
    void ticketsQuery.refresh();
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    await deleteMaintenanceTicket(deleteTarget.id);
    setDeleteTarget(null);
    if (tickets.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      void ticketsQuery.refresh();
    }
  }

  function refreshAll(): void {
    void ticketsQuery.refresh();
    void propertiesQuery.refresh();
    void unitsQuery.refresh();
  }

  const canCreate = properties.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tickets, priorities, and how long they've been open.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {properties.length > 0 && (
            <>
              <select
                value={filterPropertyId}
                onChange={(e) => changePropertyFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                aria-label="Filter by property"
              >
                <option value="all">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => changeStatusFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </>
          )}
          <button
            type="button"
            onClick={() => setForm({ kind: 'create' })}
            disabled={!canCreate}
            title={canCreate ? undefined : 'Add a property first'}
            className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add ticket
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading tickets...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-800">Could not load tickets.</p>
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
        <EmptyState
          title="Add a property first"
          message="Maintenance tickets belong to properties. Add one on the Properties page before opening tickets."
        />
      )}

      {!loading && !error && properties.length > 0 && tickets.length === 0 && (
        <EmptyState
          title={
            filterPropertyId === 'all' && filterStatus === 'all'
              ? 'No tickets yet'
              : 'No tickets match the current filters'
          }
          message="Open a ticket when a tenant reports something or you notice work that needs doing."
        />
      )}

      {!loading && !error && tickets.length > 0 && ticketsQuery.data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Property</Th>
                  <Th>Unit</Th>
                  <Th>Title</Th>
                  <Th>Priority</Th>
                  <Th>Status</Th>
                  <Th>Reported</Th>
                  <Th align="right">Age</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.map((t) => {
                  const property = propertyById.get(t.propertyId);
                  const unit = t.unitId ? unitById.get(t.unitId) : null;
                  return (
                    <tr key={t.id}>
                      <Td>
                        <span className="text-slate-700">{property?.name ?? '—'}</span>
                      </Td>
                      <Td>
                        <span className="text-slate-700">
                          {unit?.label ?? <span className="text-slate-400">—</span>}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-medium text-slate-900">{t.title}</span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[t.priority]}`}
                        >
                          {MAINTENANCE_PRIORITY_LABELS[t.priority]}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}
                        >
                          {MAINTENANCE_STATUS_LABELS[t.status]}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-slate-700">
                          {new Date(t.reportedAt).toLocaleDateString()}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="text-slate-700">
                          {t.ageInDays === 1 ? '1 day' : `${t.ageInDays} days`}
                        </span>
                      </Td>
                      <Td align="right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setForm({ kind: 'edit', ticket: t })}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label="Edit ticket"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete ticket"
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
            page={ticketsQuery.data.page}
            pageSize={ticketsQuery.data.pageSize}
            total={ticketsQuery.data.total}
            totalPages={ticketsQuery.data.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {form.kind !== 'closed' && (
        <MaintenanceTicketFormModal
          mode={form.kind}
          existing={form.kind === 'edit' ? form.ticket : null}
          properties={properties}
          units={units}
          onClose={() => setForm({ kind: 'closed' })}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete ticket?"
          message={`This will permanently delete "${deleteTarget.title}". This cannot be undone.`}
          confirmLabel="Delete ticket"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Wrench className="h-6 w-6 text-slate-500" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
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
