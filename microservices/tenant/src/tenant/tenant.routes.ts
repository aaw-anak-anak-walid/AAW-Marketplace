import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./tenant.handler";
import { verifyAdminJWT } from "@src/middleware/verifyAdminJWT";

const router = express.Router();

router.get(
  "/:tenant_id",
  validate(Validation.getTenantSchema),
  verifyAdminJWT,
  Handler.getTenantHandler
);
router.post(
  "",
  validate(Validation.createTenantSchema),
  verifyAdminJWT,
  Handler.createTenantHandler
);
router.put(
  "/:old_tenant_id",
  validate(Validation.editTenantSchema),
  verifyAdminJWT,
  Handler.editTenantHandler
);
router.delete(
  "",
  validate(Validation.deleteTenantSchema),
  verifyAdminJWT,
  Handler.deleteTenantHandler
);

export default router;
