import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./product.handler";
import { verifyJWT } from "@src/middleware/verifyJWT";

const router = express.Router();

router.get(
  "",
  validate(Validation.paginationProductSchema),
  Handler.getAllProductsHandler
);
router.get(
  "/category",
  validate(Validation.paginationProductSchema),
  Handler.getAllCategoryHandler
);
router.get(
  "/:id",
  validate(Validation.getProductByIdSchema),
  Handler.getProductByIdHandler
);
router.post(
  "/many",
  validate(Validation.getManyProductDatasByIdSchema),
  Handler.getManyProductDatasByIdHandler
);
router.get(
  "/category/:category_id",
  validate(Validation.getProductByCategorySchema),
  Handler.getProductByCategoryHandler
);
router.post(
  "",
  verifyJWT,
  validate(Validation.createProductSchema),
  Handler.createProductHandler
);
router.post(
  "/category",
  verifyJWT,
  validate(Validation.createCategorySchema),
  Handler.createCategoryHandler
);
router.put(
  "/:id",
  verifyJWT,
  validate(Validation.editProductSchema),
  Handler.editProductHandler
);
router.put(
  "/category/:category_id",
  verifyJWT,
  validate(Validation.editCategorySchema),
  Handler.editCategoryHandler
);
router.delete(
  "/:id",
  verifyJWT,
  validate(Validation.deleteProductSchema),
  Handler.deleteProductHandler
);
router.delete(
  "/category/:category_id",
  verifyJWT,
  validate(Validation.deleteCategorySchema),
  Handler.deleteCategoryHandler
);

export default router;
