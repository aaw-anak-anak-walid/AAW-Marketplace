import express from 'express';
import { validate } from '@src/middleware/validate';
import * as Validation from './validation';
import * as Handler from './product.handler';
import { verifyAdminJWT } from '@src/middleware/verifyAdminJWT';
import { verifyTenant } from '@src/middleware/verifyTenant';

const router = express.Router();

router.get('', Handler.getAllProductsHandler);
router.get('/category', Handler.getAllCategoryHandler);
router.get('/:id', validate(Validation.getProductByIdSchema), Handler.getProductByIdHandler);
router.post('/many', validate(Validation.getManyProductDatasByIdSchema), Handler.getManyProductDatasByIdHandler);
router.get('/category/:category_id', validate(Validation.getProductByCategorySchema), Handler.getProductByCategoryHandler);
router.post('', verifyAdminJWT, verifyTenant, validate(Validation.createProductSchema), Handler.createProductHandler);
router.post('/category', verifyAdminJWT, verifyTenant, validate(Validation.createCategorySchema), Handler.createCategoryHandler);
router.put('/:id', verifyAdminJWT, verifyTenant, validate(Validation.editProductSchema), Handler.editProductHandler);
router.put('/category/:category_id', verifyAdminJWT, verifyTenant, validate(Validation.editCategorySchema), Handler.editCategoryHandler);
router.delete('/:id', verifyAdminJWT, verifyTenant, validate(Validation.deleteProductSchema), Handler.deleteProductHandler);
router.delete('/category/:category_id', verifyAdminJWT, verifyTenant, validate(Validation.deleteCategorySchema), Handler.deleteCategoryHandler);

export default router;