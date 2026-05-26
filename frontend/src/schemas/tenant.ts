import { z } from 'zod';

export const tenantFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Enter a valid email').max(255),
  phone: z
    .string()
    .max(40)
    .refine(
      (value) => value === '' || value.replace(/\D/g, '').length >= 7,
      { message: 'Phone must contain at least 7 digits' },
    )
    .nullable(),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;
