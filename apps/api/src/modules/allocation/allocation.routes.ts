import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  managerOrAdmin,
  deptHeadOrAbove,
  allRoles,
} from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  CreateAllocationDto,
  ReturnAssetDto,
  CreateTransferDto,
  ApproveTransferDto,
} from './allocation.dto';
import * as allocationController from './allocation.controller';

const router = Router();

// ---------------------------------------------------------------------------
// All routes in this module require a valid JWT
// ---------------------------------------------------------------------------
router.use(authenticate);

// ---------------------------------------------------------------------------
// Allocation routes
// ---------------------------------------------------------------------------

/**
 * GET /allocations
 * List all allocations (department head and above).
 */
router.get(
  '/allocations',
  deptHeadOrAbove,
  allocationController.getAll,
);

/**
 * POST /allocations
 * Create a new allocation (manager or admin only).
 */
router.post(
  '/allocations',
  managerOrAdmin,
  validate(CreateAllocationDto),
  allocationController.allocate,
);



/**
 * GET /transfers
 * List all transfer requests (department head and above).
 */
router.get(
  '/transfers',
  deptHeadOrAbove,
  allocationController.getAllTransfers,
);

/**
 * POST /transfers
 * Request a transfer of an active allocation (any authenticated user).
 */
router.post(
  '/transfers',
  allRoles,
  validate(CreateTransferDto),
  allocationController.requestTransfer,
);

/**
 * GET /transfers/:id
 * Retrieve a single transfer by ID (any authenticated user).
 */
router.get(
  '/transfers/:id',
  allRoles,
  allocationController.getTransferById,
);

/**
 * PATCH /transfers/:id/approve
 * Approve or reject a pending transfer (manager or admin only).
 */
router.patch(
  '/transfers/:id/approve',
  managerOrAdmin,
  validate(ApproveTransferDto),
  allocationController.approveTransfer,
);

// ---------------------------------------------------------------------------
// Parameterized Allocation routes (must be at the bottom)
// ---------------------------------------------------------------------------

/**
 * GET /allocations/:id
 * Retrieve a single allocation by ID (department head and above).
 */
router.get(
  '/allocations/:id',
  deptHeadOrAbove,
  allocationController.getById,
);

/**
 * POST /allocations/:id/return
 * Return an allocated asset (department head and above).
 */
router.post(
  '/allocations/:id/return',
  deptHeadOrAbove,
  validate(ReturnAssetDto),
  allocationController.returnAsset,
);

export default router;
