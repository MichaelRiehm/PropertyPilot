import type { InputHTMLAttributes } from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import {
  createLease,
  updateLease,
  LEASE_STATUSES,
  LEASE_STATUS_LABELS,
  type Lease,
  type LeaseCreateInput,
  type LeaseUpdateInput,
} from '../lib/leases';
import type { Property } from '../lib/properties';
import type { Unit } from '../lib/units';
import type { Tenant } from '../lib/tenants';
import { leaseFormSchema, type LeaseFormValues } from '../schemas/lease';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: Lease | null;
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  onClose: () => void;
  onSaved: (lease: Lease) => void;
}

function toDateInput(iso: string): string {
  // ISO datetime -> yyyy-mm-dd for <input type="date">
  return iso.slice(0, 10);
}

function buildDefaults(
  existing: Lease | null | undefined,
  units: Unit[],
  tenants: Tenant[],
): LeaseFormValues {
  if (existing) {
    return {
      unitId: existing.unitId,
      tenantId: existing.tenantId,
      startDate: toDateInput(existing.startDate),
      endDate: toDateInput(existing.endDate),
      monthlyRent: existing.monthlyRent,
      securityDeposit: existing.securityDeposit,
      status: existing.status,
      documentLink: existing.documentLink ?? '',
    };
  }
  return {
    unitId: units[0]?.id ?? '',
    tenantId: tenants[0]?.id ?? '',
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    status: 'PENDING',
    documentLink: '',
  };
}

export default function LeaseFormModal({
  mode,
  existing,
  properties,
  units,
  tenants,
  onClose,
  onSaved,
}: Props) {
  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const unitsByProperty = useMemo(() => {
    const groups = new Map<string, Unit[]>();
    for (const u of units) {
      const arr = groups.get(u.propertyId) ?? [];
      arr.push(u);
      groups.set(u.propertyId, arr);
    }
    return groups;
  }, [units]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: buildDefaults(existing, units, tenants),
  });

  async function onSubmit(values: LeaseFormValues): Promise<void> {
    try {
      if (mode === 'create') {
        const payload: LeaseCreateInput = {
          unitId: values.unitId,
          tenantId: values.tenantId,
          startDate: values.startDate,
          endDate: values.endDate,
          monthlyRent: values.monthlyRent,
          securityDeposit: values.securityDeposit,
          status: values.status,
          documentLink: values.documentLink ? values.documentLink : null,
        };
        const saved = await createLease(payload);
        onSaved(saved);
      } else {
        const payload: LeaseUpdateInput = {
          endDate: values.endDate,
          monthlyRent: values.monthlyRent,
          securityDeposit: values.securityDeposit,
          status: values.status,
          documentLink: values.documentLink ? values.documentLink : null,
        };
        const saved = await updateLease(existing!.id, payload);
        onSaved(saved);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save the lease.';
      setError('root', { message });
    }
  }

  const canSubmit = units.length > 0 && tenants.length > 0;

  return (
    <Modal
      title={mode === 'create' ? 'Add lease' : 'Edit lease'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="unitId" className="block text-sm font-medium text-slate-700">
              Unit
            </label>
            <select
              id="unitId"
              disabled={mode === 'edit'}
              {...register('unitId')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {units.length === 0 && <option value="">No units available</option>}
              {properties.map((property) => {
                const propertyUnits = unitsByProperty.get(property.id) ?? [];
                if (propertyUnits.length === 0) return null;
                return (
                  <optgroup key={property.id} label={property.name}>
                    {propertyUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              {units.some((u) => !propertyById.has(u.propertyId)) && (
                <optgroup label="Other">
                  {units
                    .filter((u) => !propertyById.has(u.propertyId))
                    .map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-slate-400">
                A lease cannot be moved between units.
              </p>
            )}
            {errors.unitId?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="tenantId" className="block text-sm font-medium text-slate-700">
              Tenant
            </label>
            <select
              id="tenantId"
              disabled={mode === 'edit'}
              {...register('tenantId')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {tenants.length === 0 && <option value="">No tenants available</option>}
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.fullName}
                </option>
              ))}
            </select>
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-slate-400">
                A lease cannot be reassigned to a different tenant.
              </p>
            )}
            {errors.tenantId?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="startDate"
            label="Start date"
            type="date"
            disabled={mode === 'edit'}
            {...register('startDate')}
            error={errors.startDate?.message}
          />
          <Field
            id="endDate"
            label="End date"
            type="date"
            {...register('endDate')}
            error={errors.endDate?.message}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="monthlyRent"
            label="Monthly rent"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            {...register('monthlyRent', { valueAsNumber: true })}
            error={errors.monthlyRent?.message}
          />
          <Field
            id="securityDeposit"
            label="Security deposit"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            {...register('securityDeposit', { valueAsNumber: true })}
            error={errors.securityDeposit?.message}
          />
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
            {LEASE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEASE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          {errors.status?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        <Field
          id="documentLink"
          label="Document link"
          optional
          type="url"
          placeholder="https://..."
          {...register('documentLink')}
          error={errors.documentLink?.message}
        />

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
            disabled={isSubmitting || !canSubmit}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save changes'}
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
  optional?: boolean;
}

const Field = (props: FieldProps) => {
  const { id, label, error, optional, ...rest } = props;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}
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
