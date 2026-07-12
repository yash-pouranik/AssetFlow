import { prisma } from '../../shared/prisma/client';
import { AuditFilterDto } from './audit.dto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateAuditCycleData {
  title: string;
  scope: 'DEPARTMENT' | 'LOCATION';
  scopeValue: string;
  departmentId?: string;
  startDate: Date;
  endDate: Date;
  createdById: string;
}

export interface AuditItemInput {
  cycleId: string;
  assetId: string;
  auditorId: string;
}

export interface UpdateAuditItemData {
  result?: 'VERIFIED' | 'MISSING' | 'DAMAGED';
  notes?: string | null;
  verifiedAt?: Date | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Retrieve a single audit cycle by its ID with full relational data:
 * items → asset (tag, name, status) + auditor (id, name),
 * createdBy (id, name), department (id, name).
 */
export async function findCycleById(id: string) {
  return prisma.auditCycle.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          asset: {
            select: { id: true, tag: true, name: true, status: true },
          },
          auditor: {
            select: { id: true, name: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Retrieve all audit cycles with optional filters.
 * Results are paginated and include item counts.
 */
export async function findAllCycles(
  filters: AuditFilterDto,
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters.auditorId) {
    where.items = {
      some: { auditorId: filters.auditorId },
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.auditCycle.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.auditCycle.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Create a new audit cycle record.
 */
export async function createCycle(data: CreateAuditCycleData) {
  return prisma.auditCycle.create({
    data: {
      title: data.title,
      scope: data.scope,
      scopeValue: data.scopeValue,
      departmentId: data.departmentId ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
      createdById: data.createdById,
      status: 'OPEN',
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });
}

/**
 * Update arbitrary fields on an audit cycle.
 */
export async function updateCycle(id: string, data: Record<string, unknown>) {
  return prisma.auditCycle.update({
    where: { id },
    data,
  });
}

/**
 * Find all active assets that fall within the given scope:
 * - DEPARTMENT: assets whose departmentId matches scopeValue (or the explicit departmentId)
 * - LOCATION:   assets whose location matches scopeValue
 */
export async function findAssetsInScope(
  scope: 'DEPARTMENT' | 'LOCATION',
  scopeValue: string,
  departmentId?: string,
) {
  if (scope === 'DEPARTMENT') {
    return prisma.asset.findMany({
      where: {
        departmentId: departmentId ?? scopeValue,
        status: { not: 'DISPOSED' },
      },
      select: { id: true, tag: true, name: true, status: true },
    });
  }

  // LOCATION scope
  return prisma.asset.findMany({
    where: {
      location: scopeValue,
      status: { not: 'DISPOSED' },
    },
    select: { id: true, tag: true, name: true, status: true },
  });
}

/**
 * Bulk-create audit items. Skips duplicates (same cycleId + assetId).
 */
export async function createAuditItems(items: AuditItemInput[]) {
  return prisma.auditItem.createMany({
    data: items.map((item) => ({
      cycleId: item.cycleId,
      assetId: item.assetId,
      auditorId: item.auditorId,
      result: 'PENDING' as const,
    })),
    skipDuplicates: true,
  });
}

/**
 * Find a specific audit item within a cycle for a given asset.
 */
export async function findAuditItem(cycleId: string, assetId: string) {
  return prisma.auditItem.findFirst({
    where: { cycleId, assetId },
    include: {
      cycle: { select: { id: true, status: true } },
      asset: { select: { id: true, tag: true, name: true, status: true } },
      auditor: { select: { id: true, name: true } },
    },
  });
}

/**
 * Update a single audit item's result, notes, and verifiedAt timestamp.
 */
export async function updateAuditItem(
  id: string,
  data: UpdateAuditItemData,
) {
  return prisma.auditItem.update({
    where: { id },
    data,
    include: {
      asset: { select: { id: true, tag: true, name: true } },
      auditor: { select: { id: true, name: true } },
    },
  });
}

/**
 * Return all non-VERIFIED items for a cycle (discrepancy report).
 * Includes asset details (tag, name, status) and the assigned auditor name.
 */
export async function getDiscrepancyReport(cycleId: string) {
  return prisma.auditItem.findMany({
    where: {
      cycleId,
      result: { not: 'VERIFIED' },
    },
    include: {
      asset: { select: { id: true, tag: true, name: true, status: true } },
      auditor: { select: { id: true, name: true } },
    },
    orderBy: { result: 'asc' },
  });
}
