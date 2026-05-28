import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be 100 characters or fewer'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
