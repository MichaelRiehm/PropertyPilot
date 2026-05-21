import { z } from 'zod';

// Mirrors backend/src/schemas/auth.ts. Keep these in sync — server-side
// validation is the source of truth (see commit 6ae72c6 for server schemas).

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address').max(255),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
