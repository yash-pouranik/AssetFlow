import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { authorize, adminOnly, allRoles } from '../../../shared/middleware/rbac.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { departmentController } from './department.controller';
import { CreateDepartmentDto, UpdateDepartmentDto, AssignHeadDto } from './department.dto';

const router = Router();

// All department routes require authentication
router.use(authenticate);

/**
 * GET /api/departments
 * List all departments with optional status filter
 * Access: all authenticated roles
 */
router.get('/', allRoles, departmentController.getAll);

/**
 * POST /api/departments
 * Create a new department
 * Access: admin only
 */
router.post(
  '/',
  adminOnly,
  validate(CreateDepartmentDto),
  departmentController.create,
);

/**
 * GET /api/departments/:id
 * Get a single department by ID
 * Access: all authenticated roles
 */
router.get('/:id', allRoles, departmentController.getById);

/**
 * PUT /api/departments/:id
 * Update a department
 * Access: admin only
 */
router.put(
  '/:id',
  adminOnly,
  validate(UpdateDepartmentDto),
  departmentController.update,
);

/**
 * DELETE /api/departments/:id
 * Delete a department (only if no active employees)
 * Access: admin only
 */
router.delete('/:id', adminOnly, departmentController.delete);

/**
 * PATCH /api/departments/:id/assign-head
 * Assign a head to a department
 * Access: admin only
 */
router.patch(
  '/:id/assign-head',
  adminOnly,
  validate(AssignHeadDto),
  departmentController.assignHead,
);

export default router;
