import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./product.handler";
import { verifyAdminJWT } from "@src/middleware/verifyAdminJWT";
import { verifyTenant } from "@src/middleware/verifyTenant";

const router = express.Router();

// GET routes (using service-level caching)
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

// POST, PUT, DELETE endpoints (with cache invalidation in services)
router.post(
  "",
  validate(Validation.createProductSchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.createProductHandler
);

router.post(
  "/category",
  validate(Validation.createCategorySchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.createCategoryHandler
);

router.put(
  "/:id",
  validate(Validation.editProductSchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.editProductHandler
);

router.put(
  "/category/:category_id",
  validate(Validation.editCategorySchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.editCategoryHandler
);

router.delete(
  "/:id",
  validate(Validation.deleteProductSchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.deleteProductHandler
);

router.delete(
  "/category/:category_id",
  validate(Validation.deleteCategorySchema),
  verifyAdminJWT,
  verifyTenant,
  Handler.deleteCategoryHandler
);

export default router;
