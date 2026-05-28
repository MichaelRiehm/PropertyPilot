import { z } from 'zod';

export const tenantFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(80, 'First name must be 80 characters or fewer'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(80, 'Last name must be 80 characters or fewer'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email must be 255 characters or fewer'),
  phone: z
    .string()
    .max(40, 'Phone must be 40 characters or fewer')
    .refine((value) => value === '' || value.replace(/\D/g, '').length >= 7, {
      message: 'Phone must contain at least 7 digits',
    })
    .nullable(),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;
