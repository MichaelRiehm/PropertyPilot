import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../lib/apiClient';
import {
  createTenant,
  updateTenant,
  type Tenant,
} from '../lib/tenants';
import { tenantFormSchema, type TenantFormValues } from '../schemas/tenant';
import Modal from './Modal';

interface Props {
  mode: 'create' | 'edit';
  existing?: Tenant | null;
  onClose: () => void;
  onSaved: (tenant: Tenant) => void;
}

function buildDefaults(existing: Tenant | null | undefined): TenantFormValues {
  if (!existing) {
    return { firstName: '', lastName: '', email: '', phone: '' };
  }
  return {
    firstName: existing.firstName,
    lastName: existing.lastName,
    email: existing.email,
    phone: existing.phone ?? '',
  };
}

export default function TenantFormModal({ mode, existing, onClose, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: buildDefaults(existing),
  });

  async function onSubmit(values: TenantFormValues): Promise<void> {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone ? values.phone : null,
    };
    try {
      const saved =
        mode === 'create'
          ? await createTenant(payload)
          : await updateTenant(existing!.id, payload);
      onSaved(saved);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save the tenant.';
      setError('root', { message });
    }
  }

  return (
    <Modal
      title={mode === 'create' ? 'Add tenant' : 'Edit tenant'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="firstName"
            label="First name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <Field
            id="lastName"
            label="Last name"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>
        <Field
          id="email"
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Field
          id="phone"
          label="Phone"
          optional
          type="tel"
          placeholder="555-555-1212"
          {...register('phone')}
          error={errors.phone?.message}
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
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
