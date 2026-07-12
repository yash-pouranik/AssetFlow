import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  adminOnly,
  managerOrAdmin,
  allRoles,
} from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  CreateAuditCycleDtoSchema,
  AssignAuditorsDtoSchema,
  UpdateAuditItemDtoSchema,
} from './audit.dto';
import * as AuditController from './audit.controller';

const router = Router();

// ─── All routes require an authenticated session ──────────────────────────────
router.use(authenticate);

// ─── Cycle Collection ─────────────────────────────────────────────────────────

/**
 * GET /audit-cycles
 * List all audit cycles (paginated, filterable).
 * Access: MANAGER, ADMIN
 */
router.get('/', managerOrAdmin, AuditController.getAllCycles);

/**
 * POST /audit-cycles
 * Create a new audit cycle.
 * Access: ADMIN only
 */
router.post(
  '/',
  adminOnly,
  validate(CreateAuditCycleDtoSchema),
  AuditController.createCycle,
);

// ─── Cycle Instance ───────────────────────────────────────────────────────────

/**
 * GET /audit-cycles/:id
 * Retrieve a single audit cycle with its items.
 * Access: MANAGER, ADMIN
 */
router.get('/:id', managerOrAdmin, AuditController.getCycleById);

/**
 * POST /audit-cycles/:id/assign-auditors
 * Assign eligible users as auditors to all assets in the cycle's scope.
 * Access: ADMIN only
 */
router.post(
  '/:id/assign-auditors',
  adminOnly,
  validate(AssignAuditorsDtoSchema),
  AuditController.assignAuditors,
);

/**
 * PATCH /audit-cycles/:id/items
 * Auditor marks a specific asset's audit item (VERIFIED / MISSING / DAMAGED).
 * Access: All authenticated roles (authorization to the specific item is
 *         checked inside the service layer).
 */
router.patch(
  '/:id/items',
  allRoles,
  validate(UpdateAuditItemDtoSchema),
  AuditController.markItem,
);

/**
 * GET /audit-cycles/:id/report
 * Retrieve the discrepancy report (non-VERIFIED items) for a cycle.
 * Access: MANAGER, ADMIN
 */
router.get('/:id/report', managerOrAdmin, AuditController.getReport);

/**
 * PATCH /audit-cycles/:id/close
 * Close an audit cycle and finalize all item statuses.
 * Access: ADMIN only
 */
router.patch('/:id/close', adminOnly, AuditController.closeCycle);

export default router;
