// src/services/placeOrder.service.ts
import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import axios from "@src/utils/axios";
import type { AxiosResponse } from "axios";
import { withRetry } from "@src/utils/retry";
import { Product } from "@type/product";
import { User } from "@type/user";

// 1) Import the cart *service*, not the DAO
import { getAllCartItemsService } from "../../cart/services/getAllCartItems.service";
import { createOrder } from "../dao/createOrder.dao";

export const placeOrderService = async (
  user: User,
  shipping_provider: string
) => {
  try {
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return new InternalServerErrorResponse(
        "Server tenant id not found"
      ).generate();
    }

    if (
      !["JNE", "TIKI", "SICEPAT", "GOSEND", "GRAB_EXPRESS"].includes(
        shipping_provider
      )
    ) {
      return new NotFoundResponse("Shipping provider not found").generate();
    }

    if (!user.id) {
      return new InternalServerErrorResponse("User id not found").generate();
    }

    // 2) Fetch *all* cart items in one go by asking for a huge limit
    const cartResponse = await withRetry(() =>
      getAllCartItemsService(user, 1, 1_000_000)
    );
    if (cartResponse.status !== 200) return cartResponse;

    // 3) Narrow the union so TS knows you have cartItems[]
    const data = cartResponse.data;
    if (!("cartItems" in data)) {
      // Shouldn't happen in the 200 case, but guard defensively
      return new BadRequestResponse("Unable to load cart items").generate();
    }
    const cartItems = data.cartItems;

    // 4) Check for empty cart
    if (cartItems.length === 0) {
      return new BadRequestResponse("Cart is empty").generate();
    }

    const products: AxiosResponse<Product[]> = await axios.post(
      `${process.env.PRODUCT_MS_URL}/product/many`,
      { productIds: cartItems.map((item) => item.product_id) }
    );
    if (products.status !== 200) {
      return new InternalServerErrorResponse(
        "Failed to get products"
      ).generate();
    }
    const userId = user.id;

    console.log("ini user.id: ", user.id);
    // 7) Finally create the order
    const order = await withRetry(() =>
      createOrder(
        SERVER_TENANT_ID,
        userId,
        cartItems,
        products.data,
        shipping_provider as
          | "JNE"
          | "TIKI"
          | "SICEPAT"
          | "GOSEND"
          | "GRAB_EXPRESS"
      )
    );

    return {
      status: 201,
      data: order,
    };
  } catch (err: any) {
    console.error(err);
    return new InternalServerErrorResponse(err).generate();
  }
};
