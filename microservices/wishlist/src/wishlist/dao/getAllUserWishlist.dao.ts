// src/dao/getAllUserWishlist.dao.ts
import { db } from "@src/db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@db/schema/wishlist";

export const getAllUserWishlist = async (
  tenant_id: string,
  user_id: string,
  limit: number,
  offset: number
) => {
  // 1) fetch the paged rows
  const items = await db
    .select()
    .from(schema.wishlist)
    .where(
      and(
        eq(schema.wishlist.tenant_id, tenant_id),
        eq(schema.wishlist.user_id, user_id)
      )
    )
    .limit(limit)
    .offset(offset);

  // 2) fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.wishlist)
    .where(
      and(
        eq(schema.wishlist.tenant_id, tenant_id),
        eq(schema.wishlist.user_id, user_id)
      )
    );

  return { items, total: count };
};
