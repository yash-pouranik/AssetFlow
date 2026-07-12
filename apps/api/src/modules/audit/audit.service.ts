import { prisma } from '../../shared/prisma/client';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import { CreateAuditCycleDto, AssignAuditorsDto, UpdateAuditItemDto, AuditFilterDto } from './audit.dto';
import * as AuditRepository from './audit.repository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIVILEGED_ROLES = ['ADMIN', 'ASSET_MANAGER'] as const;

/**
 * Assert the cycle exists; throw NotFoundError otherwise.
 */
async function requireCycle(cycleId: string) {
  const cycle = await AuditRepository.findCycleById(cycleId);
  if (!cycle) {
    throw new NotFoundError(`Audit cycle '${cycleId}' not found`);
  }
  return cycle;
}

/**
 * Assert the cycle is OPEN; throw AppError otherwise.
 */
function requireOpenCycle(cycle: { status: string; id: string }) {
  if (cycle.status !== 'OPEN') {
    throw new AppError(
      `Audit cycle '${cycle.id}' is already closed. No further updates are allowed.`,
      400,
    );
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Create a new audit cycle.
 * Only ADMINs may call this (enforced at the route level via adminOnly).
 */
export async function createAuditCycle(
  data: CreateAuditCycleDto,
  createdById: string,
) {
  const cycle = await AuditRepository.createCycle({
    title: data.title,
    scope: data.scope,
    scopeValue: data.scopeValue,
    departmentId: data.departmentId,
    startDate: data.startDate,
    endDate: data.endDate,
    createdById,
  });

  return cycle;
}

/**
 * Assign auditors to every asset in the cycle's scope.
 * Creates one AuditItem per (asset × auditor) combination.
 * Only ADMINs may call this (enforced at the route level).
 */
export async function assignAuditors(
  cycleId: string,
  dto: AssignAuditorsDto,
  _requesterId: string,
) {
  const cycle = await requireCycle(cycleId);
  requireOpenCycle(cycle);

  // Verify all auditor IDs exist and have eligible roles
  const auditors = await prisma.user.findMany({
    where: {
      id: { in: dto.auditorIds },
      role: { in: ['ASSET_MANAGER', 'DEPARTMENT_HEAD'] },
    },
    select: { id: true, name: true, role: true },
  });

  if (auditors.length !== dto.auditorIds.length) {
    const foundIds = new Set(auditors.map((a) => a.id));
    const missing = dto.auditorIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      `The following user IDs are invalid or do not have an eligible role (ASSET_MANAGER / DEPARTMENT_HEAD): ${missing.join(', ')}`,
      422,
    );
  }

  // Discover all assets in the cycle's scope
  const assets = await AuditRepository.findAssetsInScope(
    cycle.scope as 'DEPARTMENT' | 'LOCATION',
    cycle.scopeValue,
    cycle.departmentId ?? undefined,
  );

  if (assets.length === 0) {
    throw new AppError(
      `No active assets found in the cycle's scope (${cycle.scope}: ${cycle.scopeValue}).`,
      422,
    );
  }

  // Build the cross-product: every asset × every auditor
  const items: AuditRepository.AuditItemInput[] = [];
  for (const asset of assets) {
    for (const auditor of auditors) {
      items.push({ cycleId, assetId: asset.id, auditorId: auditor.id });
    }
  }

  await AuditRepository.createAuditItems(items);

  // Return the refreshed cycle with item count
  return AuditRepository.findCycleById(cycleId);
}

/**
 * Auditor marks a specific asset as VERIFIED, MISSING, or DAMAGED.
 * The caller must either be:
 *   (a) the assigned auditor for this item, OR
 *   (b) an ADMIN or ASSET_MANAGER (privileged override).
 */
export async function markAuditItem(
  cycleId: string,
  dto: UpdateAuditItemDto,
  actorId: string,
  actorRole: string,
) {
  const cycle = await requireCycle(cycleId);
  requireOpenCycle(cycle);

  const item = await AuditRepository.findAuditItem(cycleId, dto.assetId);
  if (!item) {
    throw new NotFoundError(
      `No audit item found for asset '${dto.assetId}' in cycle '${cycleId}'.`,
    );
  }

  // Authorization check
  const isPrivileged = (PRIVILEGED_ROLES as readonly string[]).includes(actorRole);
  const isAssignedAuditor = item.auditorId === actorId;

  if (!isPrivileged && !isAssignedAuditor) {
    throw new ForbiddenError(
      'You are not the assigned auditor for this item and lack sufficient privileges.',
    );
  }

  const updatedItem = await AuditRepository.updateAuditItem(item.id, {
    result: dto.result,
    notes: dto.notes ?? null,
    verifiedAt: new Date(),
  });

  // Emit event for discrepancies so other subsystems can react
  if (dto.result === 'MISSING' || dto.result === 'DAMAGED') {
    eventBus.emit(EVENTS.AUDIT_DISCREPANCY, {
      cycleId,
      assetId: dto.assetId,
      result: dto.result,
      auditorId: actorId,
      notes: dto.notes,
      timestamp: new Date().toISOString(),
    });
  }

  return updatedItem;
}

/**
 * Close an audit cycle.
 * Business rules applied atomically (Prisma interactive transaction):
 *  1. All still-PENDING items → VERIFIED
 *  2. All MISSING items → parent asset status = LOST
 *  3. All DAMAGED items → parent asset condition = DAMAGED
 *  4. Cycle status → CLOSED, closedAt = now()
 */
export async function closeAuditCycle(cycleId: string, closedById: string) {
  const cycle = await requireCycle(cycleId);
  requireOpenCycle(cycle);

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Auto-verify all remaining PENDING items
    await tx.auditItem.updateMany({
      where: { cycleId, result: 'PENDING' },
      data: { result: 'VERIFIED', verifiedAt: now },
    });

    // 2. Mark MISSING assets as LOST
    const missingItems = await tx.auditItem.findMany({
      where: { cycleId, result: 'MISSING' },
      select: { assetId: true },
    });
    if (missingItems.length > 0) {
      await tx.asset.updateMany({
        where: { id: { in: missingItems.map((i) => i.assetId) } },
        data: { status: 'LOST' },
      });
    }

    // 3. Mark DAMAGED assets with condition = DAMAGED
    const damagedItems = await tx.auditItem.findMany({
      where: { cycleId, result: 'DAMAGED' },
      select: { assetId: true },
    });
    if (damagedItems.length > 0) {
      await tx.asset.updateMany({
        where: { id: { in: damagedItems.map((i) => i.assetId) } },
        data: { condition: 'DAMAGED' },
      });
    }

    // 4. Close the cycle
    await tx.auditCycle.update({
      where: { id: cycleId },
      data: {
        status: 'CLOSED',
        closedAt: now,
      },
    });
  });

  // Build and return the discrepancy report for the closed cycle
  const discrepancies = await AuditRepository.getDiscrepancyReport(cycleId);
  const closedCycle = await AuditRepository.findCycleById(cycleId);

  return {
    cycle: closedCycle,
    discrepancyReport: discrepancies,
    summary: {
      total: discrepancies.length,
      missing: discrepancies.filter((d) => d.result === 'MISSING').length,
      damaged: discrepancies.filter((d) => d.result === 'DAMAGED').length,
    },
  };
}

/**
 * Return the discrepancy report (all non-VERIFIED items) for a cycle.
 */
export async function getDiscrepancyReport(cycleId: string) {
  await requireCycle(cycleId); // ensures cycle exists
  return AuditRepository.getDiscrepancyReport(cycleId);
}

/**
 * Paginated list of audit cycles with optional filtering.
 */
export async function getAllCycles(
  filters: AuditFilterDto,
  page: number,
  limit: number,
) {
  return AuditRepository.findAllCycles(filters, page, limit);
}

/**
 * Retrieve a single cycle by ID; throws NotFoundError if absent.
 */
export async function getCycleById(id: string) {
  const cycle = await AuditRepository.findCycleById(id);
  if (!cycle) {
    throw new NotFoundError(`Audit cycle '${id}' not found`);
  }
  return cycle;
}
