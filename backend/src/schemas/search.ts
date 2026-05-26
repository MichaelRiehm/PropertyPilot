import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(100),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
