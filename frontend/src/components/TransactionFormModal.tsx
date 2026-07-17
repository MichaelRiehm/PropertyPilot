import type { InputHTMLAttributes } from 'react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import type { Property } from '../lib/properties';
import type { Unit } from '../lib/units';
import type { Lease } from '../lib/leases';
import type { Tenant } from '../lib/tenants';
import {
  createTransaction,
  updateTransaction,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionCreateInput,
  type TransactionUpdateInput,
} from '../lib/transactions';
import {
  transactionFormSchema,
  type TransactionFormValues,
} from '../schemas/transaction';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: Transaction | null;
  properties: Property[];
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
  onClose: () => void;
  onSaved: (transaction: Transaction) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaults(
  existing: Transaction | null | undefined,
  properties: Property[],
): TransactionFormValues {
  if (existing) {
    return {
      propertyId: existing.propertyId,
      unitId: existing.unitId,
      leaseId: existing.leaseId,
      type: existing.type,
      category: existing.category ?? '',
      amount: existing.amount,
      date: existing.date.slice(0, 10),
      description: existing.description,
    };
  }
  return {
    propertyId: properties[0]?.id ?? '',
    unitId: null,
    leaseId: null,
    type: 'EXPENSE',
    category: '',
    amount: 0,
    date: todayIso(),
    description: '',
  };
}

export default function TransactionFormModal({
  mode,
  existing,
  properties,
  units,
  leases,
  tenants,
  onClose,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: buildDefaults(existing, properties),
  });

  const selectedPropertyId = watch('propertyId');

  const unitsForProperty = useMemo(
    () => units.filter((u) => u.propertyId === selectedPropertyId),
    [units, selectedPropertyId],
  );

  const tenantById = useMemo(() => {
    const map = new Map<string, Tenant>();
    for (const t of tenants) map.set(t.id, t);
    return map;
  }, [tenants]);

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of units) map.set(u.id, u);
    return map;
  }, [units]);

  const leasesForProperty = useMemo(
    () =>
      leases.filter((lease) => {
        const unit = unitById.get(lease.unitId);
        return unit?.propertyId === selectedPropertyId;
      }),
    [leases, selectedPropertyId, unitById],
  );

  async function onSubmit(values: TransactionFormValues): Promise<void> {
    try {
      if (mode === 'create') {
        const payload: TransactionCreateInput = {
          propertyId: values.propertyId,
          unitId: values.unitId ? values.unitId : null,
          leaseId: values.leaseId ? values.leaseId : null,
          type: values.type,
          category: values.category ? values.category : null,
          amount: values.amount,
          date: values.date,
          description: values.description,
        };
        const saved = await createTransaction(payload);
        onSaved(saved);
      } else {
        const payload: TransactionUpdateInput = {
          category: values.category ? values.category : null,
          amount: values.amount,
          description: values.description,
        };
        const saved = await updateTransaction(existing!.id, payload);
        onSaved(saved);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save the transaction.';
      setError('root', { message });
    }
  }

  const lockedFields = mode === 'edit';

  return (
    <Modal
      title={mode === 'create' ? 'Add transaction' : 'Edit transaction'}
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
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
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
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="type"
              disabled={lockedFields}
              {...register('type')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {TRANSACTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TRANSACTION_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.type?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
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

          <div>
            <label htmlFor="leaseId" className="block text-sm font-medium text-slate-700">
              Lease <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <select
              id="leaseId"
              disabled={lockedFields}
              {...register('leaseId', {
                setValueAs: (value) => (value === '' ? null : value),
              })}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">—</option>
              {leasesForProperty.map((lease) => {
                const tenant = tenantById.get(lease.tenantId);
                const unit = unitById.get(lease.unitId);
                return (
                  <option key={lease.id} value={lease.id}>
                    {tenant?.fullName ?? '?'} · {unit?.label ?? '?'}
                  </option>
                );
              })}
            </select>
            {errors.leaseId?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.leaseId.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="amount"
            label="Amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />
          <Field
            id="date"
            label="Date"
            type="date"
            disabled={lockedFields}
            {...register('date')}
            error={errors.date?.message}
          />
        </div>

        <Field
          id="category"
          label="Category"
          optional
          placeholder="rent, utilities, repairs, ..."
          {...register('category', {
            setValueAs: (value) => (value === '' ? null : value),
          })}
          error={errors.category?.message}
        />

        <Field
          id="description"
          label="Description"
          placeholder="What was this for?"
          {...register('description')}
          error={errors.description?.message}
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
            disabled={isSubmitting || properties.length === 0}
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
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
