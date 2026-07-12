import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { adminOnly, managerOrAdmin, deptHeadOrAbove } from '../../../shared/middleware/rbac.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { employeeController } from './employee.controller';
import { UpdateEmployeeDto, UpdateEmployeeStatusDto } from './employee.dto';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

/**
 * GET /api/employees
 * List all employees with optional filters: role, status, departmentId
 * Access: manager or admin
 */
router.get('/', managerOrAdmin, employeeController.getAll);

/**
 * GET /api/employees/:id
 * Get a single employee's full profile including active allocations
 * Access: department head or above
 */
router.get('/:id', deptHeadOrAbove, employeeController.getById);

/**
 * PUT /api/employees/:id
 * Update employee profile fields (name, phone, departmentId)
 * Access: admin only
 */
router.put(
  '/:id',
  adminOnly,
  validate(UpdateEmployeeDto),
  employeeController.update,
);

/**
 * PATCH /api/employees/:id/status
 * Activate or deactivate an employee account
 * Access: admin only
 */
router.patch(
  '/:id/status',
  adminOnly,
  validate(UpdateEmployeeStatusDto),
  employeeController.updateStatus,
);

export default router;
