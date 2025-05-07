import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./tenant.handler";
import { verifyAdminJWT } from "@src/middleware/verifyAdminJWT";

const router = express.Router();

router.get(
  "/:tenant_id",
  verifyAdminJWT,
  validate(Validation.getTenantSchema),
  Handler.getTenantHandler
);
router.post(
  "",
  verifyAdminJWT,
  validate(Validation.createTenantSchema),
  Handler.createTenantHandler
);
router.put(
  "/:old_tenant_id",
  verifyAdminJWT,
  validate(Validation.editTenantSchema),
  Handler.editTenantHandler
);
router.delete(
  "",
  verifyAdminJWT,
  validate(Validation.deleteTenantSchema),
  Handler.deleteTenantHandler
);

export default router;
