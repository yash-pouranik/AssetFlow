import { Prisma, MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';

// ─── Reusable select shapes ───────────────────────────────────────────────────

const assetSelect = {
  id: true,
  tag: true,
  name: true,
  status: true,
} satisfies Prisma.AssetSelect;

const raisedBySelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

const approvedBySelect = {
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const technicianSelect = {
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaintenanceFilters = {
  assetId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const maintenanceRepository = {
  /** Find a single maintenance request with full nested details. */
  async findById(id: string) {
    return prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: { select: assetSelect },
        raisedBy: { select: raisedBySelect },
        approvedBy: { select: approvedBySelect },
        technician: { select: technicianSelect },
      },
    });
  },

  /** Paginated list with optional filters. */
  async findAll(
    filters: MaintenanceFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: Prisma.MaintenanceRequestWhereInput = {};

    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: assetSelect },
          raisedBy: { select: raisedBySelect },
          technician: { select: technicianSelect },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  /** Create a new maintenance request. */
  async create(data: Prisma.MaintenanceRequestCreateInput) {
    return prisma.maintenanceRequest.create({ data });
  },

  /** Update maintenance request fields by ID. */
  async update(id: string, data: Prisma.MaintenanceRequestUpdateInput) {
    return prisma.maintenanceRequest.update({
      where: { id },
      data,
      include: {
        asset: { select: assetSelect },
        raisedBy: { select: raisedBySelect },
        approvedBy: { select: approvedBySelect },
        technician: { select: technicianSelect },
      },
    });
  },

  /**
   * Find any active maintenance for an asset (PENDING / APPROVED / IN_PROGRESS).
   * Used to prevent duplicate requests.
   */
  async findActiveForAsset(assetId: string) {
    return prisma.maintenanceRequest.findFirst({
      where: {
        assetId,
        status: {
          in: [
            MaintenanceStatus.PENDING,
            MaintenanceStatus.APPROVED,
            MaintenanceStatus.TECHNICIAN_ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
          ],
        },
      },
    });
  },
};
