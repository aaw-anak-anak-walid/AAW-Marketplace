// src/routes/product.validation.ts
import { z } from "zod";

export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .transform((val) => (val > 100 ? 100 : val))
      .default(10),
  }),
});
