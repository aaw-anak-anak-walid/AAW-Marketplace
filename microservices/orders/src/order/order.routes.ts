import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./order.handler";
import { verifyJWT } from "@src/middleware/verifyJWT";

const router = express.Router();

router.get(
  "",
  validate(Validation.paginationQuerySchema),
  verifyJWT,
  Handler.getAllOrdersHandler
);
router.get(
  "/:orderId",
  validate(Validation.getOrderDetailSchema),
  verifyJWT,
  Handler.getOrderDetailHandler
);
router.post(
  "",
  validate(Validation.placeOrderSchema),
  verifyJWT,
  Handler.placeOrderHandler
);
router.post(
  "/:orderId/pay",
  validate(Validation.payOrderSchema),
  Handler.payOrderHandler
);
router.post(
  "/:orderId/cancel",
  validate(Validation.cancelOrderSchema),
  verifyJWT,
  Handler.cancelOrderHandler
);

export default router;
