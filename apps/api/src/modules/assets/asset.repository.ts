import { Prisma, AssetStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';
import { AssetSearchDto } from './asset.dto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginatedAssets {
  data: Awaited<ReturnType<typeof AssetRepository.findAll>>['data'];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const AssetRepository = {
  /**
   * Paginated asset list with optional filters.
   */
  async findAll(filters: AssetSearchDto) {
    const { tag, serialNumber, categoryId, status, departmentId, location, search, page, limit } =
      filters;

    const safeLimit = Math.min(limit ?? 20, 100);
    const safePage = Math.max(page ?? 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.AssetWhereInput = {
      ...(tag && { tag: { contains: tag } }),
      ...(serialNumber && { serialNumber: { contains: serialNumber } }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(departmentId && { departmentId }),
      ...(location && { location: { contains: location } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { tag: { contains: search } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  },

  /**
   * Full asset detail with category, department, latest allocations, and maintenances.
   */
  async findById(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        allocations: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenances: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  },

  /**
   * Find an asset by its unique generated tag (e.g. AF-0001).
   */
  async findByTag(tag: string) {
    return prisma.asset.findUnique({ where: { tag } });
  },

  /**
   * Find an asset by serial number (case-insensitive exact match).
   */
  async findBySerialNumber(serialNumber: string) {
    return prisma.asset.findFirst({
      where: { serialNumber },
    });
  },

  /**
   * Create a new asset record.
   */
  async create(data: Prisma.AssetCreateInput) {
    return prisma.asset.create({
      data,
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Update arbitrary fields on an asset.
   */
  async update(id: string, data: Prisma.AssetUpdateInput) {
    return prisma.asset.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Patch only the status field of an asset.
   */
  async updateStatus(id: string, status: AssetStatus) {
    return prisma.asset.update({
      where: { id },
      data: { status },
      select: { id: true, tag: true, name: true, status: true, updatedAt: true },
    });
  },

  /**
   * Hard-delete an asset by its primary key.
   */
  async delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  },

  /**
   * Return a count per status value – used for dashboard KPI cards.
   */
  async countByStatus(): Promise<Record<AssetStatus, number>> {
    const rows = await prisma.asset.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Seed all statuses with 0 so callers always receive a complete object
    const defaults: Record<string, number> = {
      AVAILABLE: 0,
      ALLOCATED: 0,
      UNDER_MAINTENANCE: 0,
      RETIRED: 0,
      LOST: 0,
      DISPOSED: 0,
    };

    for (const row of rows) {
      defaults[row.status] = row._count.status;
    }

    return defaults as Record<AssetStatus, number>;
  },

  /**
   * Check whether an asset has at least one active (ACTIVE / OVERDUE) allocation.
   */
  async hasActiveAllocation(assetId: string): Promise<boolean> {
    const count = await prisma.allocation.count({
      where: {
        assetId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
    });
    return count > 0;
  },
};
