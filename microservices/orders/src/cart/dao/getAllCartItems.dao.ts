// src/dao/getAllCartItems.dao.ts
import { db } from "@src/db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@db/schema/cart";

export const getAllCartItems = async (
  tenant_id: string,
  user_id: string,
  limit: number,
  offset: number
) => {
  // 1) fetch the page of cart rows
  const items = await db
    .select()
    .from(schema.cart)
    .where(
      and(
        eq(schema.cart.tenant_id, tenant_id),
        eq(schema.cart.user_id, user_id)
      )
    )
    .limit(limit)
    .offset(offset);

  // 2) fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.cart)
    .where(
      and(
        eq(schema.cart.tenant_id, tenant_id),
        eq(schema.cart.user_id, user_id)
      )
    );

  return { items, total: count };
};
