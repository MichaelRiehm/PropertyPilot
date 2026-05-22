import { z } from 'zod';

export const unitFormSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  label: z.string().min(1, 'Label is required').max(60),
  bedrooms: z
    .number({ message: 'Bedrooms must be a number' })
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative'),
  bathrooms: z
    .number({ message: 'Bathrooms must be a number' })
    .min(0, 'Bathrooms cannot be negative'),
  squareFeet: z
    .number({ message: 'Square feet must be a number' })
    .int('Square feet must be a whole number')
    .min(0, 'Square feet cannot be negative')
    .nullable(),
  marketRent: z
    .number({ message: 'Market rent must be a number' })
    .min(0, 'Market rent cannot be negative'),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;
