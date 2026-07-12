import { Request, Response, NextFunction } from 'express';
import * as AuditService from './audit.service';
import { AuditFilterDtoSchema } from './audit.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePagination(query: Request['query']) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20),
  );
  return { page, limit };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /audit-cycles
 * Create a new audit cycle. Admin only.
 */
export async function createCycle(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const createdById = req.user!.id;
    const cycle = await AuditService.createAuditCycle(req.body, createdById);

    res.status(201).json({
      success: true,
      message: 'Audit cycle created successfully.',
      data: cycle,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit-cycles
 * List all audit cycles with optional filters. Manager or Admin.
 */
export async function getAllCycles(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit } = parsePagination(req.query);

    // Parse & validate filter params (non-strict — unknown keys are stripped)
    const filterResult = AuditFilterDtoSchema.safeParse(req.query);
    const filters = filterResult.success ? filterResult.data : {};

    // Role-based scoping for regular employees
    if (req.user!.role === 'EMPLOYEE') {
      filters.auditorId = req.user!.id;
    }

    const result = await AuditService.getAllCycles(filters, page, limit);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit-cycles/:id
 * Retrieve a single audit cycle. Manager or Admin.
 */
export async function getCycleById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cycle = await AuditService.getCycleById(req.params.id);

    res.status(200).json({
      success: true,
      data: cycle,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /audit-cycles/:id/assign-auditors
 * Assign auditors to every asset in the cycle's scope. Admin only.
 */
export async function assignAuditors(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const requesterId = req.user!.id;
    const updatedCycle = await AuditService.assignAuditors(
      req.params.id,
      req.body,
      requesterId,
    );

    res.status(200).json({
      success: true,
      message: 'Auditors assigned successfully.',
      data: updatedCycle,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /audit-cycles/:id/items
 * Auditor marks a specific asset in the cycle as VERIFIED, MISSING, or DAMAGED.
 */
export async function markItem(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const actorId = req.user!.id;
    const actorRole = req.user!.role;

    const updatedItem = await AuditService.markAuditItem(
      req.params.id,
      req.body,
      actorId,
      actorRole,
    );

    res.status(200).json({
      success: true,
      message: 'Audit item updated successfully.',
      data: updatedItem,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /audit-cycles/:id/close
 * Close an audit cycle, auto-resolve pending items, propagate asset statuses,
 * and return the discrepancy report. Admin only.
 */
export async function closeCycle(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const closedById = req.user!.id;
    const result = await AuditService.closeAuditCycle(req.params.id, closedById);

    res.status(200).json({
      success: true,
      message: 'Audit cycle closed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit-cycles/:id/report
 * Retrieve the discrepancy report (non-VERIFIED items) for a cycle.
 * Manager or Admin.
 */
export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const discrepancies = await AuditService.getDiscrepancyReport(req.params.id);

    res.status(200).json({
      success: true,
      data: discrepancies,
      meta: {
        total: discrepancies.length,
        missing: discrepancies.filter((d) => d.result === 'MISSING').length,
        damaged: discrepancies.filter((d) => d.result === 'DAMAGED').length,
      },
    });
  } catch (err) {
    next(err);
  }
}
