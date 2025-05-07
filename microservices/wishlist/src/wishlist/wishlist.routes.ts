import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./wishlist.handler";
import { verifyJWT } from "@src/middleware/verifyJWT";
const router = express.Router();

router.get(
  "/",
  verifyJWT,
  validate(Validation.paginationQuerySchema),
  Handler.getAllUserWishlistHandler
);
router.get(
  "/:id",
  verifyJWT,
  validate(Validation.getWishlistByIdSchema),
  Handler.getWishlistByIdHandler
);
router.post(
  "/",
  verifyJWT,
  validate(Validation.createWishlistSchema),
  Handler.createWishlistHandler
);
router.put(
  "/:id",
  verifyJWT,
  validate(Validation.updateWishlistSchema),
  Handler.updateWishlistHandler
);
router.delete(
  "/remove",
  verifyJWT,
  validate(Validation.removeProductFromWishlistSchema),
  Handler.removeProductFromWishlistHandler
);
router.delete(
  "/:id",
  verifyJWT,
  validate(Validation.deleteWishlistSchema),
  Handler.deleteWishlistHandler
);
router.post(
  "/add",
  verifyJWT,
  validate(Validation.addProductToWishlistSchema),
  Handler.addProductToWishlistHandler
);

export default router;
