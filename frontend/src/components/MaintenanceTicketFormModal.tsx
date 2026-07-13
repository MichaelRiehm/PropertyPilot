import type { InputHTMLAttributes } from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import type { Property } from '../lib/properties';
import type { Unit } from '../lib/units';
import {
  createMaintenanceTicket,
  updateMaintenanceTicket,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  type MaintenanceTicket,
  type MaintenanceTicketCreateInput,
  type MaintenanceTicketUpdateInput,
} from '../lib/maintenance-tickets';
import {
  maintenanceTicketFormSchema,
  type MaintenanceTicketFormValues,
} from '../schemas/maintenance-ticket';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: MaintenanceTicket | null;
  properties: Property[];
  units: Unit[];
  onClose: () => void;
  onSaved: (ticket: MaintenanceTicket) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaults(
  existing: MaintenanceTicket | null | undefined,
  properties: Property[],
): MaintenanceTicketFormValues {
  if (existing) {
    return {
      propertyId: existing.propertyId,
      unitId: existing.unitId,
      title: existing.title,
      description: existing.description,
      status: existing.status,
      priority: existing.priority,
      reportedAt: existing.reportedAt.slice(0, 10),
    };
  }
  return {
    propertyId: properties[0]?.id ?? '',
    unitId: null,
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    reportedAt: todayIso(),
  };
}

export default function MaintenanceTicketFormModal({
  mode,
  existing,
  properties,
  units,
  onClose,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceTicketFormValues>({
    resolver: zodResolver(maintenanceTicketFormSchema),
    defaultValues: buildDefaults(existing, properties),
  });

  const selectedPropertyId = watch('propertyId');

  const unitsForProperty = useMemo(
    () => units.filter((u) => u.propertyId === selectedPropertyId),
    [units, selectedPropertyId],
  );

  async function onSubmit(values: MaintenanceTicketFormValues): Promise<void> {
    try {
      if (mode === 'create') {
        const payload: MaintenanceTicketCreateInput = {
          propertyId: values.propertyId,
          unitId: values.unitId ? values.unitId : null,
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          reportedAt: values.reportedAt,
        };
        const saved = await createMaintenanceTicket(payload);
        onSaved(saved);
      } else {
        const payload: MaintenanceTicketUpdateInput = {
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
        };
        const saved = await updateMaintenanceTicket(existing!.id, payload);
        onSaved(saved);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save the ticket.';
      setError('root', { message });
    }
  }

  const lockedFields = mode === 'edit';

  return (
    <Modal
      title={mode === 'create' ? 'Add maintenance ticket' : 'Edit maintenance ticket'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-slate-700">
              Property
            </label>
            <select
              id="propertyId"
              disabled={lockedFields}
              {...register('propertyId')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {properties.length === 0 && <option value="">No properties</option>}
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.propertyId?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.propertyId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="unitId" className="block text-sm font-medium text-slate-700">
              Unit <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <select
              id="unitId"
              disabled={lockedFields}
              {...register('unitId', {
                setValueAs: (value) => (value === '' ? null : value),
              })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">—</option>
              {unitsForProperty.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            {errors.unitId?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
            )}
          </div>
        </div>

        <Field
          id="title"
          label="Title"
          placeholder="Short summary (e.g. Kitchen sink slow drain)"
          {...register('title')}
          error={errors.title?.message}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="What happened, what you know so far, what needs to be done"
            {...register('description')}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {errors.description?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              id="priority"
              {...register('priority')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {MAINTENANCE_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {MAINTENANCE_PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.priority?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {MAINTENANCE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {MAINTENANCE_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.status?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <Field
            id="reportedAt"
            label="Reported"
            type="date"
            disabled={lockedFields}
            {...register('reportedAt')}
            error={errors.reportedAt?.message}
          />
        </div>

        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || properties.length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create ticket' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

const Field = (props: FieldProps) => {
  const { id, label, error, ...rest } = props;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
