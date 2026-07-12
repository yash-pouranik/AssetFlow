import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  authorize,
  adminOnly,
  managerOrAdmin,
  allRoles,
} from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { upload } from '../../shared/middleware/upload.middleware';
import { AssetController } from './asset.controller';
import { CreateAssetDto, UpdateAssetDto, AssetStatusPatchDto, AssetSearchDto } from './asset.dto';

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

/**
 * All asset routes require a valid JWT session.
 * Role checks are applied per-route via the RBAC middleware.
 */
router.use(authenticate);

// ── Collection routes ─────────────────────────────────────────────────────────

/**
 * GET /assets
 * Returns paginated, filtered asset list.
 * Accessible to all authenticated roles.
 */
router.get(
  '/',
  allRoles,
  validate(AssetSearchDto, 'query'),
  AssetController.getAll,
);

/**
 * POST /assets
 * Register a new asset (multipart/form-data for optional photo upload).
 * Restricted to managers and admins.
 */
router.post(
  '/',
  managerOrAdmin,
  upload.single('photo'),
  validate(CreateAssetDto),
  AssetController.register,
);

// ── Named sub-resource routes (must come before /:id) ─────────────────────────

/**
 * GET /assets/stats
 * Returns per-status asset counts for the dashboard KPI section.
 * Accessible to all authenticated roles.
 */
router.get('/stats', allRoles, AssetController.getStats);

// ── Single-resource routes ────────────────────────────────────────────────────

/**
 * GET /assets/:id
 * Returns full asset detail including recent allocations and maintenances.
 * Accessible to all authenticated roles.
 */
router.get('/:id', allRoles, AssetController.getById);

/**
 * PUT /assets/:id
 * Update mutable fields. Accepts an optional replacement photo.
 * Restricted to managers and admins.
 */
router.put(
  '/:id',
  managerOrAdmin,
  upload.single('photo'),
  validate(UpdateAssetDto),
  AssetController.update,
);

/**
 * PATCH /assets/:id/status
 * Transition asset lifecycle status (e.g. AVAILABLE → UNDER_MAINTENANCE).
 * Restricted to managers and admins.
 */
router.patch(
  '/:id/status',
  managerOrAdmin,
  validate(AssetStatusPatchDto),
  AssetController.patchStatus,
);

/**
 * DELETE /assets/:id
 * Permanently remove an asset. Blocked when an active allocation exists.
 * Restricted to admins only.
 */
router.delete('/:id', adminOnly, AssetController.remove);

export default router;
