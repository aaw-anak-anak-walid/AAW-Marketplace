import { db } from "@src/db";
import { eq, sql } from "drizzle-orm";
import * as schema from "@db/schema/products";

export const getAllProductsByTenantId = async (
  tenantId: string,
  limit: number,
  offset: number
) => {
  // 1) fetch the paged rows
  const items = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.tenant_id, tenantId))
    .limit(limit)
    .offset(offset);

  // 2) fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.products)
    .where(eq(schema.products.tenant_id, tenantId));

  return { items, total: count };
};
