import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { allRoles, managerOrAdmin, deptHeadOrAbove } from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { upload } from '../../shared/middleware/upload.middleware';
import {
  CreateMaintenanceDto,
  ApproveMaintenanceDto,
  AssignTechnicianDto,
  ResolveMaintenanceDto,
} from './maintenance.dto';
import { maintenanceController } from './maintenance.controller';

const router = Router();

// All maintenance routes require authentication
router.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /maintenance
 * List all maintenance requests (paginated). Restricted to dept heads and above.
 * Accepts query params: assetId, status, priority, page, limit
 */
router.get('/', deptHeadOrAbove, maintenanceController.getAll);

/**
 * POST /maintenance
 * Raise a new maintenance request. Accepts an optional photo upload.
 */
router.post(
  '/',
  allRoles,
  upload.single('photo'),
  validate(CreateMaintenanceDto),
  maintenanceController.create,
);

/**
 * GET /maintenance/:id
 * Get a single maintenance request by ID.
 */
router.get('/:id', allRoles, maintenanceController.getById);

/**
 * PATCH /maintenance/:id/approve
 * Approve or reject a PENDING maintenance request.
 */
router.patch(
  '/:id/approve',
  managerOrAdmin,
  validate(ApproveMaintenanceDto),
  maintenanceController.approve,
);

/**
 * PATCH /maintenance/:id/assign-technician
 * Assign a technician to an APPROVED maintenance request.
 */
router.patch(
  '/:id/assign-technician',
  managerOrAdmin,
  validate(AssignTechnicianDto),
  maintenanceController.assignTechnician,
);

/**
 * PATCH /maintenance/:id/start
 * Technician marks work as IN_PROGRESS (enforced in service: must be assigned technician).
 */
router.patch('/:id/start', allRoles, maintenanceController.startWork);

/**
 * PATCH /maintenance/:id/resolve
 * Resolve an IN_PROGRESS maintenance request.
 */
router.patch(
  '/:id/resolve',
  allRoles,
  validate(ResolveMaintenanceDto),
  maintenanceController.resolve,
);

export default router;
