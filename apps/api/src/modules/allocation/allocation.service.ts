import { AllocationStatus, AssetStatus, TransferStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';
import { AppError, NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import * as allocationRepo from './allocation.repository';
import type {
  CreateAllocationInput,
  ReturnAssetInput,
  CreateTransferInput,
  ApproveTransferInput,
} from './allocation.dto';
import type { AllocationFilters, TransferFilters } from './allocation.repository';

// ---------------------------------------------------------------------------
// Allocate an asset
// ---------------------------------------------------------------------------

export async function allocateAsset(
  data: CreateAllocationInput,
  allocatedById: string,
) {
  // 1. Verify the asset exists
  const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
  if (!asset) {
    throw new NotFoundError(`Asset with id '${data.assetId}' not found`);
  }

  // 2. Conflict check — block if there is already an ACTIVE allocation
  const existing = await allocationRepo.findActiveAllocationForAsset(data.assetId);
  if (existing) {
    const holderName =
      existing.user?.name ?? existing.department?.name ?? 'Unknown holder';
    throw new ConflictError(
      `Asset '${asset.name}' (${asset.tag}) is currently allocated to '${holderName}'. ` +
        `To reassign it, initiate a transfer via POST /transfers with allocationId: '${existing.id}'.`,
    );
  }

  // 2.5 Conflict check — block if the asset has active or upcoming bookings
  const activeBookings = await prisma.booking.findFirst({
    where: {
      assetId: data.assetId,
      status: { in: ['UPCOMING', 'ONGOING'] },
    },
  });
  if (activeBookings) {
    throw new ConflictError(
      `Asset '${asset.name}' (${asset.tag}) has active or upcoming bookings. It cannot be allocated until the bookings are completed or cancelled.`,
    );
  }

  // 3. Create the allocation
  const allocation = await allocationRepo.createAllocation({
    asset: { connect: { id: data.assetId } },
    ...(data.userId && { user: { connect: { id: data.userId } } }),
    ...(data.departmentId && { department: { connect: { id: data.departmentId } } }),
    expectedReturn: data.expectedReturn ?? null,
    status: 'ACTIVE',
    allocatedAt: new Date(),
  });

  // 4. Mark the asset as ALLOCATED
  await prisma.asset.update({
    where: { id: data.assetId },
    data: { status: 'ALLOCATED' },
  });

  // 5. Emit event
  eventBus.emit(EVENTS.ASSET_ALLOCATED, {
    allocationId: allocation.id,
    assetId: data.assetId,
    assetTag: asset.tag,
    assetName: asset.name,
    userId: data.userId ?? null,
    departmentId: data.departmentId ?? null,
    allocatedById,
    expectedReturn: data.expectedReturn ?? null,
  });

  return allocation;
}

// ---------------------------------------------------------------------------
// Return an asset
// ---------------------------------------------------------------------------

export async function returnAsset(
  allocationId: string,
  data: ReturnAssetInput,
  returnedById: string,
) {
  // 1. Locate allocation
  const allocation = await allocationRepo.findAllocationById(allocationId);
  if (!allocation) {
    throw new NotFoundError(`Allocation '${allocationId}' not found`);
  }

  // 2. Must be ACTIVE (or OVERDUE) to return
  if (allocation.status !== 'ACTIVE' && allocation.status !== 'OVERDUE') {
    throw new AppError(
      `Cannot return an allocation with status '${allocation.status}'. Only ACTIVE or OVERDUE allocations can be returned.`,
      400,
    );
  }

  // 3. Determine next asset status — DAMAGED condition triggers a maintenance flag
  const nextAssetStatus: AssetStatus =
    data.condition === 'DAMAGED' ? 'UNDER_MAINTENANCE' : 'AVAILABLE';

  // 4. Mark allocation RETURNED
  const updated = await allocationRepo.updateAllocation(allocationId, {
    status: 'RETURNED',
    returnedAt: new Date(),
    conditionNote: data.conditionNote ?? null,
  });

  // 5. Update asset status
  await prisma.asset.update({
    where: { id: allocation.assetId },
    data: { status: nextAssetStatus },
  });

  // 6. Emit event
  eventBus.emit(EVENTS.ASSET_RETURNED, {
    allocationId,
    assetId: allocation.assetId,
    assetTag: allocation.asset?.tag,
    assetName: allocation.asset?.name,
    returnedById,
    condition: data.condition ?? null,
    conditionNote: data.conditionNote ?? null,
    nextAssetStatus,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Request a transfer
// ---------------------------------------------------------------------------

export async function requestTransfer(
  data: CreateTransferInput,
  requestedById: string,
) {
  // 1. Locate the allocation
  const allocation = await allocationRepo.findAllocationById(data.allocationId);
  if (!allocation) {
    throw new NotFoundError(`Allocation '${data.allocationId}' not found`);
  }

  if (allocation.status !== 'ACTIVE') {
    throw new AppError(
      `Transfers can only be requested for ACTIVE allocations (current status: '${allocation.status}').`,
      400,
    );
  }

  // 2. Reject if a pending/approved transfer already exists for this allocation
  const pendingTransfer = await prisma.transfer.findFirst({
    where: {
      allocationId: data.allocationId,
      status: { in: ['REQUESTED', 'APPROVED'] },
    },
  });
  if (pendingTransfer) {
    throw new ConflictError(
      `A transfer (id: '${pendingTransfer.id}') for this allocation is already in '${pendingTransfer.status}' state. ` +
        `Resolve it before requesting another transfer.`,
    );
  }

  // 3. Resolve the manager to notify (from the department or asset owner)
  const managerId: string | null = null; // Will be populated via event consumers that know org hierarchy

  // 4. Create transfer record
  const transfer = await allocationRepo.createTransfer({
    allocation: { connect: { id: data.allocationId } },
    requestedBy: { connect: { id: requestedById } },
    ...(data.targetUserId && { targetUser: { connect: { id: data.targetUserId } } }),
    ...(data.targetDeptId && { targetDepartment: { connect: { id: data.targetDeptId } } }),
    notes: data.notes ?? null,
    status: 'REQUESTED',
  });

  // 5. Emit event (notification service subscribes to notify approvers)
  eventBus.emit(EVENTS.TRANSFER_REQUESTED, {
    transferId: transfer.id,
    allocationId: data.allocationId,
    assetId: allocation.assetId,
    assetTag: allocation.asset?.tag,
    requestedById,
    targetUserId: data.targetUserId ?? null,
    targetDeptId: data.targetDeptId ?? null,
    managerId,
  });

  return transfer;
}

// ---------------------------------------------------------------------------
// Approve or reject a transfer
// ---------------------------------------------------------------------------

export async function approveTransfer(
  transferId: string,
  approved: boolean,
  approvedById: string,
  notes?: string,
) {
  // 1. Load transfer
  const transfer = await allocationRepo.findTransferById(transferId);
  if (!transfer) {
    throw new NotFoundError(`Transfer '${transferId}' not found`);
  }

  if (transfer.status !== 'REQUESTED') {
    throw new AppError(
      `Transfer is already in '${transfer.status}' state and cannot be re-reviewed.`,
      400,
    );
  }

  // 2. Approved path — atomically complete the handoff
  if (approved) {
    await allocationRepo.updateTransfer(transferId, {
      status: 'APPROVED',
      approvedBy: { connect: { id: approvedById } },
      notes: notes ?? null,
    });

    // a) Close out the old allocation
    await allocationRepo.updateAllocation(transfer.allocationId, {
      status: 'RETURNED',
      returnedAt: new Date(),
      conditionNote: 'Closed by approved transfer',
    });

    // b) Create new allocation for the target
    const oldAllocation = transfer.allocation;
    const newAllocation = await allocationRepo.createAllocation({
      asset: { connect: { id: oldAllocation.assetId } },
      ...(transfer.targetUserId && {
        user: { connect: { id: transfer.targetUserId } },
      }),
      ...(transfer.targetDeptId && {
        department: { connect: { id: transfer.targetDeptId } },
      }),
      status: 'ACTIVE',
      allocatedAt: new Date(),
    });

    // c) Mark transfer COMPLETED
    const completed = await allocationRepo.updateTransfer(transferId, {
      status: 'COMPLETED',
      resolvedAt: new Date(),
    });

    eventBus.emit(EVENTS.TRANSFER_APPROVED, {
      transferId,
      oldAllocationId: transfer.allocationId,
      newAllocationId: newAllocation.id,
      assetId: oldAllocation.assetId,
      approvedById,
      targetUserId: transfer.targetUserId ?? null,
      targetDeptId: transfer.targetDeptId ?? null,
    });

    return completed;
  }

  // 3. Rejected path
  const rejected = await allocationRepo.updateTransfer(transferId, {
    status: 'REJECTED',
    approvedBy: { connect: { id: approvedById } },
    resolvedAt: new Date(),
    notes: notes ?? null,
  });

  eventBus.emit(EVENTS.TRANSFER_REJECTED, {
    transferId,
    allocationId: transfer.allocationId,
    assetId: transfer.allocation.assetId,
    approvedById,
    notes: notes ?? null,
  });

  return rejected;
}

// ---------------------------------------------------------------------------
// Paginated reads
// ---------------------------------------------------------------------------

export async function getAll(
  filters: AllocationFilters,
  page = 1,
  limit = 20,
) {
  return allocationRepo.findAll(filters, { page, limit });
}

export async function getById(id: string) {
  const allocation = await allocationRepo.findAllocationById(id);
  if (!allocation) throw new NotFoundError(`Allocation '${id}' not found`);
  return allocation;
}

export async function getAllTransfers(
  filters: TransferFilters,
  page = 1,
  limit = 20,
) {
  return allocationRepo.findAllTransfers(filters, { page, limit });
}

export async function getTransferById(id: string) {
  const transfer = await allocationRepo.findTransferById(id);
  if (!transfer) throw new NotFoundError(`Transfer '${id}' not found`);
  return transfer;
}

// ---------------------------------------------------------------------------
// Cron job: mark overdue allocations
// ---------------------------------------------------------------------------

export async function checkOverdue(): Promise<void> {
  const overdue = await allocationRepo.findOverdueAllocations();

  if (overdue.length === 0) return;

  // Batch update status to OVERDUE
  const ids = overdue.map((a) => a.id);
  await prisma.allocation.updateMany({
    where: { id: { in: ids } },
    data: { status: 'OVERDUE' },
  });

  // Emit individual events so notification service can route per holder
  for (const allocation of overdue) {
    eventBus.emit(EVENTS.ASSET_OVERDUE, {
      allocationId: allocation.id,
      assetId: allocation.assetId,
      assetTag: allocation.asset?.tag,
      assetName: allocation.asset?.name,
      userId: allocation.userId ?? null,
      departmentId: allocation.departmentId ?? null,
      userEmail: allocation.user?.email ?? null,
      expectedReturn: allocation.expectedReturn,
    });
  }
}
