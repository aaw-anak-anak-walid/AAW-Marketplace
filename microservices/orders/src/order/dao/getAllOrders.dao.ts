// src/dao/getAllOrders.dao.ts
import { db } from "@src/db";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@db/schema/order";

export const getAllOrders = async (
  tenant_id: string,
  user_id: string,
  limit: number,
  offset: number
) => {
  // 1) fetch the paged orders
  const items = await db
    .select()
    .from(schema.order)
    .where(
      and(
        eq(schema.order.tenant_id, tenant_id),
        eq(schema.order.user_id, user_id)
      )
    )
    .limit(limit)
    .offset(offset);

  // 2) fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.order)
    .where(
      and(
        eq(schema.order.tenant_id, tenant_id),
        eq(schema.order.user_id, user_id)
      )
    );

  return { items, total: count };
};
