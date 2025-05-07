import { z } from "zod";

export const paginationProductSchema = z.object({
  query: z.object({
    // z.coerce will turn the incoming string (e.g. "2") into a number
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
