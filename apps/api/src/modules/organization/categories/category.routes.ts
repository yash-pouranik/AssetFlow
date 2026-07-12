import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { adminOnly, allRoles } from '../../../shared/middleware/rbac.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { categoryController } from './category.controller';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

const router = Router();

// All category routes require authentication
router.use(authenticate);

/**
 * GET /api/categories
 * List all asset categories with asset counts
 * Access: all authenticated roles
 */
router.get('/', allRoles, categoryController.getAll);

/**
 * POST /api/categories
 * Create a new asset category
 * Access: admin only
 */
router.post(
  '/',
  adminOnly,
  validate(CreateCategoryDto),
  categoryController.create,
);

/**
 * GET /api/categories/:id
 * Get a single category by ID
 * Access: all authenticated roles
 */
router.get('/:id', allRoles, categoryController.getById);

/**
 * PUT /api/categories/:id
 * Update an asset category
 * Access: admin only
 */
router.put(
  '/:id',
  adminOnly,
  validate(UpdateCategoryDto),
  categoryController.update,
);

/**
 * DELETE /api/categories/:id
 * Delete a category (only if no assets are associated)
 * Access: admin only
 */
router.delete('/:id', adminOnly, categoryController.delete);

export default router;
