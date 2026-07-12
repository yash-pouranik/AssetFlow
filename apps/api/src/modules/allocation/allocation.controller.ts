import { Request, Response, NextFunction } from 'express';
import * as allocationService from './allocation.service';
import type { AllocationFilters, TransferFilters } from './allocation.repository';
import { AllocationStatus, TransferStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helper — consistent success envelope
// ---------------------------------------------------------------------------
function ok(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

// ---------------------------------------------------------------------------
// Allocation controllers
// ---------------------------------------------------------------------------

/**
 * POST /allocations
 * Allocates an asset to a user or department.
 */
export async function allocate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allocation = await allocationService.allocateAsset(
      req.body,
      req.user!.id,
    );
    ok(res, allocation, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /allocations/:id/return
 * Marks an allocation as returned and reverts asset status.
 */
export async function returnAsset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allocation = await allocationService.returnAsset(
      req.params.id,
      req.body,
      req.user!.id,
    );
    ok(res, allocation);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /allocations
 * Returns a paginated list of allocations with optional filters.
 */
export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { assetId, userId, departmentId, status, page, limit } = req.query as Record<
      string,
      string | undefined
    >;

    const filters: AllocationFilters = {
      ...(assetId && { assetId }),
      ...(userId && { userId }),
      ...(departmentId && { departmentId }),
      ...(status && { status: status as AllocationStatus }),
    };

    const result = await allocationService.getAll(
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );

    ok(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /allocations/:id
 * Returns a single allocation with full detail.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allocation = await allocationService.getById(req.params.id);
    ok(res, allocation);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Transfer controllers
// ---------------------------------------------------------------------------

/**
 * POST /transfers
 * Requests a transfer of an active allocation to another user or department.
 */
export async function requestTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const transfer = await allocationService.requestTransfer(
      req.body,
      req.user!.id,
    );
    ok(res, transfer, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /transfers/:id/approve
 * Approves or rejects a pending transfer request.
 */
export async function approveTransfer(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { approved, notes } = req.body as { approved: boolean; notes?: string };
    const transfer = await allocationService.approveTransfer(
      req.params.id,
      approved,
      req.user!.id,
      notes,
    );
    ok(res, transfer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /transfers
 * Returns a paginated list of transfers with optional filters.
 */
export async function getAllTransfers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { allocationId, requestedById, status, page, limit } = req.query as Record<
      string,
      string | undefined
    >;

    const filters: TransferFilters = {
      ...(allocationId && { allocationId }),
      ...(requestedById && { requestedById }),
      ...(status && { status: status as TransferStatus }),
    };

    const result = await allocationService.getAllTransfers(
      filters,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );

    ok(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /transfers/:id
 * Returns a single transfer with full relational detail.
 */
export async function getTransferById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const transfer = await allocationService.getTransferById(req.params.id);
    ok(res, transfer);
  } catch (err) {
    next(err);
  }
}
