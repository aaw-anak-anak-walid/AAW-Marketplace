import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./wishlist.handler";
import { verifyJWT } from "@src/middleware/verifyJWT";
const router = express.Router();

router.get(
  "/",
  validate(Validation.paginationQuerySchema),
  verifyJWT,
  Handler.getAllUserWishlistHandler
);
router.get(
  "/:id",
  validate(Validation.getWishlistByIdSchema),
  verifyJWT,
  Handler.getWishlistByIdHandler
);
router.post(
  "/",
  validate(Validation.createWishlistSchema),
  verifyJWT,
  Handler.createWishlistHandler
);
router.put(
  "/:id",
  validate(Validation.updateWishlistSchema),
  verifyJWT,
  Handler.updateWishlistHandler
);
router.delete(
  "/remove",
  validate(Validation.removeProductFromWishlistSchema),
  verifyJWT,
  Handler.removeProductFromWishlistHandler
);
router.delete(
  "/:id",
  validate(Validation.deleteWishlistSchema),
  verifyJWT,
  Handler.deleteWishlistHandler
);
router.post(
  "/add",
  validate(Validation.addProductToWishlistSchema),
  verifyJWT,
  Handler.addProductToWishlistHandler
);

export default router;
