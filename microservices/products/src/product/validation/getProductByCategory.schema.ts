import { z } from "zod";

export const getProductByCategorySchema = z.object({
  params: z.object({
    category_id: z.string({ required_error: "Category ID is required" }).uuid(),
  }),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  }),
});
