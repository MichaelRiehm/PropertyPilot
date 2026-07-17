import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import {
  createUnit,
  updateUnit,
  type Unit,
  type UnitCreateInput,
  type UnitUpdateInput,
} from '../lib/units';
import type { Property } from '../lib/properties';
import { unitFormSchema, type UnitFormValues } from '../schemas/unit';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: Unit | null;
  properties: Property[];
  defaultPropertyId?: string;
  onClose: () => void;
  onSaved: (unit: Unit) => void;
}

function buildDefaults(
  existing: Unit | null | undefined,
  defaultPropertyId: string | undefined,
  properties: Property[],
): UnitFormValues {
  if (existing) {
    return {
      propertyId: existing.propertyId,
      label: existing.label,
      bedrooms: existing.bedrooms,
      bathrooms: existing.bathrooms,
      squareFeet: existing.squareFeet,
      marketRent: existing.marketRent,
    };
  }
  return {
    propertyId: defaultPropertyId ?? properties[0]?.id ?? '',
    label: '',
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: null,
    marketRent: 0,
  };
}

export default function UnitFormModal({
  mode,
  existing,
  properties,
  defaultPropertyId,
  onClose,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: buildDefaults(existing, defaultPropertyId, properties),
  });

  async function onSubmit(values: UnitFormValues): Promise<void> {
    try {
      if (mode === 'create') {
        const payload: UnitCreateInput = {
          propertyId: values.propertyId,
          label: values.label,
          bedrooms: values.bedrooms,
          bathrooms: values.bathrooms,
          squareFeet: values.squareFeet,
          marketRent: values.marketRent,
        };
        const saved = await createUnit(payload);
        onSaved(saved);
      } else {
        const payload: UnitUpdateInput = {
          label: values.label,
          bedrooms: values.bedrooms,
          bathrooms: values.bathrooms,
          squareFeet: values.squareFeet,
          marketRent: values.marketRent,
        };
        const saved = await updateUnit(existing!.id, payload);
        onSaved(saved);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save the unit.';
      setError('root', { message });
    }
  }

  return (
    <Modal
      title={mode === 'create' ? 'Add unit' : 'Edit unit'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium text-slate-700">
            Property
          </label>
          <select
            id="propertyId"
            disabled={mode === 'edit'}
            {...register('propertyId')}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
          >
            {properties.length === 0 && <option value="">No properties available</option>}
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-slate-400">
              A unit cannot be moved between properties.
            </p>
          )}
          {errors.propertyId?.message && (
            <p className="mt-1 text-sm text-red-600">{errors.propertyId.message}</p>
          )}
        </div>

        <Field
          id="label"
          label="Label"
          placeholder="Apt 1"
          {...register('label')}
          error={errors.label?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="bedrooms"
            label="Bedrooms"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('bedrooms', { valueAsNumber: true })}
            error={errors.bedrooms?.message}
          />
          <Field
            id="bathrooms"
            label="Bathrooms"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            {...register('bathrooms', { valueAsNumber: true })}
            error={errors.bathrooms?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="squareFeet"
            label="Square feet"
            optional
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('squareFeet', {
              setValueAs: (value) => {
                if (value === '' || value === null || value === undefined) return null;
                const n = Number(value);
                return Number.isNaN(n) ? null : n;
              },
            })}
            error={errors.squareFeet?.message}
          />
          <Field
            id="marketRent"
            label="Market rent (monthly)"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            {...register('marketRent', { valueAsNumber: true })}
            error={errors.marketRent?.message}
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
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
