import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./cart.handler";
import { verifyJWT } from "@src/middleware/verifyJWT";

const router = express.Router();

router.get(
  "",
  validate(Validation.paginationQuerySchema),
  verifyJWT,
  Handler.getAllCartItemsHandler
);
router.post(
  "",
  validate(Validation.addItemToCartSchema),
  verifyJWT,
  Handler.addItemToCartHandler
);
router.put(
  "",
  validate(Validation.editCartItemSchema),
  verifyJWT,
  Handler.editCartItemHandler
);
router.delete(
  "",
  validate(Validation.deleteCartItemSchema),
  verifyJWT,
  Handler.deleteCartItemHandler
);

export default router;
