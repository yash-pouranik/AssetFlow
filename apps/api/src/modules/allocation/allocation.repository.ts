import { AllocationStatus, Prisma, TransferStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AllocationFilters {
  assetId?: string;
  userId?: string;
  departmentId?: string;
  status?: AllocationStatus;
}

export interface TransferFilters {
  allocationId?: string;
  requestedById?: string;
  status?: TransferStatus;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Allocation queries
// ---------------------------------------------------------------------------

/**
 * Returns the single ACTIVE allocation for an asset, or null if none exists.
 * Used to enforce the allocation conflict rule.
 */
export async function findActiveAllocationForAsset(assetId: string) {
  return prisma.allocation.findFirst({
    where: { assetId, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
      asset: { select: { id: true, tag: true, name: true } },
    },
  });
}

/**
 * Fetches a single allocation by PK with full relational data.
 */
export async function findAllocationById(id: string) {
  return prisma.allocation.findUnique({
    where: { id },
    include: {
      asset: {
        select: { id: true, tag: true, name: true, status: true, category: true },
      },
      user: { select: { id: true, name: true, email: true, role: true } },
      department: { select: { id: true, name: true } },
      transfers: {
        orderBy: { requestedAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

/**
 * Paginated list of allocations with optional filters.
 */
export async function findAll(
  filters: AllocationFilters,
  { page = 1, limit = 20 }: PaginationOptions,
) {
  const where: Prisma.AllocationWhereInput = {
    ...(filters.assetId && { assetId: filters.assetId }),
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.departmentId && { departmentId: filters.departmentId }),
    ...(filters.status && { status: filters.status }),
  };

  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.allocation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { allocatedAt: 'desc' },
      include: {
        asset: { select: { id: true, tag: true, name: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.allocation.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Inserts a new allocation record.
 */
export async function createAllocation(data: Prisma.AllocationCreateInput) {
  return prisma.allocation.create({
    data,
    include: {
      asset: { select: { id: true, tag: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
    },
  });
}

/**
 * Partially updates an allocation by PK.
 */
export async function updateAllocation(
  id: string,
  data: Prisma.AllocationUpdateInput,
) {
  return prisma.allocation.update({ where: { id }, data });
}

/**
 * Returns all ACTIVE allocations whose expectedReturn date is in the past.
 */
export async function findOverdueAllocations() {
  return prisma.allocation.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturn: { lt: new Date() },
    },
    include: {
      asset: { select: { id: true, tag: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Transfer queries
// ---------------------------------------------------------------------------

/**
 * Fetches a single transfer by PK with full relational data.
 */
export async function findTransferById(id: string) {
  return prisma.transfer.findUnique({
    where: { id },
    include: {
      allocation: {
        include: {
          asset: { select: { id: true, tag: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
      targetDepartment: { select: { id: true, name: true } },
    },
  });
}

/**
 * Paginated list of transfers with optional filters.
 */
export async function findAllTransfers(
  filters: TransferFilters,
  { page = 1, limit = 20 }: PaginationOptions,
) {
  const where: Prisma.TransferWhereInput = {
    ...(filters.allocationId && { allocationId: filters.allocationId }),
    ...(filters.requestedById && { requestedById: filters.requestedById }),
    ...(filters.status && { status: filters.status }),
  };

  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.transfer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { requestedAt: 'desc' },
      include: {
        allocation: {
          include: {
            asset: { select: { id: true, tag: true, name: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
        targetDepartment: { select: { id: true, name: true } },
      },
    }),
    prisma.transfer.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Inserts a new transfer record.
 */
export async function createTransfer(data: Prisma.TransferCreateInput) {
  return prisma.transfer.create({
    data,
    include: {
      allocation: { select: { id: true, assetId: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
      targetDepartment: { select: { id: true, name: true } },
    },
  });
}

/**
 * Partially updates a transfer by PK.
 */
export async function updateTransfer(
  id: string,
  data: Prisma.TransferUpdateInput,
) {
  return prisma.transfer.update({ where: { id }, data });
}
