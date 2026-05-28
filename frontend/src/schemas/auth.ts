import { z } from 'zod';

// Mirrors backend/src/schemas/auth.ts. Keep these in sync — server-side
// validation is the source of truth.

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(255, 'Email must be 255 characters or fewer'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be 128 characters or fewer'),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(255, 'Email must be 255 characters or fewer'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or fewer'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
