// src/dao/getAllCategoriesByTenantId.dao.ts
import { db } from "@src/db";
import { eq, sql } from "drizzle-orm";
import * as schema from "@db/schema/categories";

export const getAllCategoriesByTenantId = async (
  tenantId: string,
  limit: number,
  offset: number
) => {
  // 1) fetch the page of rows
  const items = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.tenant_id, tenantId))
    .limit(limit)
    .offset(offset);

  // 2) fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.categories)
    .where(eq(schema.categories.tenant_id, tenantId));

  return { items, total: count };
};
