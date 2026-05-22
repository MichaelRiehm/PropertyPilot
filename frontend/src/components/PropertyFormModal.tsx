import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import {
  createProperty,
  updateProperty,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  type Property,
} from '../lib/properties';
import { propertyFormSchema, type PropertyFormValues } from '../schemas/property';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: Property | null;
  onClose: () => void;
  onSaved: (property: Property) => void;
}

function buildDefaults(existing: Property | null | undefined): PropertyFormValues {
  if (!existing) {
    return {
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      propertyType: 'SINGLE_FAMILY',
    };
  }
  return {
    name: existing.name,
    addressLine1: existing.addressLine1,
    addressLine2: existing.addressLine2 ?? '',
    city: existing.city,
    state: existing.state,
    postalCode: existing.postalCode,
    propertyType: existing.propertyType,
  };
}

export default function PropertyFormModal({ mode, existing, onClose, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: buildDefaults(existing),
  });

  async function onSubmit(values: PropertyFormValues): Promise<void> {
    const payload = {
      name: values.name,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2 ? values.addressLine2 : null,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      propertyType: values.propertyType,
    };
    try {
      const saved =
        mode === 'create'
          ? await createProperty(payload)
          : await updateProperty(existing!.id, payload);
      onSaved(saved);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save the property.';
      setError('root', { message });
    }
  }

  return (
    <Modal
      title={mode === 'create' ? 'Add property' : 'Edit property'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field
          id="name"
          label="Name"
          {...register('name')}
          error={errors.name?.message}
        />
        <Field
          id="addressLine1"
          label="Address line 1"
          {...register('addressLine1')}
          error={errors.addressLine1?.message}
        />
        <Field
          id="addressLine2"
          label="Address line 2"
          optional
          {...register('addressLine2')}
          error={errors.addressLine2?.message}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="city"
            label="City"
            {...register('city')}
            error={errors.city?.message}
          />
          <Field
            id="state"
            label="State"
            placeholder="WI"
            maxLength={2}
            {...register('state')}
            error={errors.state?.message}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="postalCode"
            label="ZIP"
            placeholder="53703"
            {...register('postalCode')}
            error={errors.postalCode?.message}
          />
          <div>
            <label
              htmlFor="propertyType"
              className="block text-sm font-medium text-slate-700"
            >
              Type
            </label>
            <select
              id="propertyType"
              {...register('propertyType')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {PROPERTY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {PROPERTY_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.propertyType?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.propertyType.message}</p>
            )}
          </div>
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
            disabled={isSubmitting}
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
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
