// src/services/placeOrder.service.ts
import {
  BadRequestResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "@src/commons/patterns";
import axios, { AxiosResponse } from "axios";
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
    const cartResponse = await getAllCartItemsService(user, 1, 1_000_000);
    if (cartResponse.status !== 200) {
      // Propagate service‐level errors (e.g. Tenant ID missing)
      return cartResponse;
    }

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

    // 5) Now map out the product IDs (annotate `item` so it's not an implicit `any`)
    const productIds = cartItems.map((item: any) => item.product_id);

    // 6) Fetch product details
    const products: AxiosResponse<Product[]> = await axios.post(
      `${process.env.PRODUCT_MS_URL}/product/many`,
      { productIds }
    );
    if (products.status !== 200) {
      return new InternalServerErrorResponse(
        "Failed to get products"
      ).generate();
    }

    // 7) Finally create the order
    const order = await createOrder(
      SERVER_TENANT_ID,
      user.id,
      cartItems,
      products.data,
      shipping_provider as
        | "JNE"
        | "TIKI"
        | "SICEPAT"
        | "GOSEND"
        | "GRAB_EXPRESS"
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
