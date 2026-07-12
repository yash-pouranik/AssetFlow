import { AssetStatus, MaintenanceStatus, Role } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import { maintenanceRepository, MaintenanceFilters } from './maintenance.repository';
import {
  CreateMaintenanceInput,
  ApproveMaintenanceInput,
  AssignTechnicianInput,
  ResolveMaintenanceInput,
} from './maintenance.dto';

// ─── Service ──────────────────────────────────────────────────────────────────

export const maintenanceService = {
  /**
   * Raise a new maintenance request.
   * 1. Verify asset exists.
   * 2. Check no active maintenance already exists.
   * 3. Create request.
   * 4. Find an ASSET_MANAGER to notify, emit MAINTENANCE_RAISED.
   */
  async raiseRequest(
    data: CreateMaintenanceInput,
    photo: string | undefined,
    raisedById: string,
  ) {
    // 1. Verify asset
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      select: { id: true, name: true, tag: true, status: true },
    });

    if (!asset) {
      throw new NotFoundError(`Asset with ID "${data.assetId}" not found`);
    }

    // 2. Check for existing active maintenance
    const existing = await maintenanceRepository.findActiveForAsset(data.assetId);

    if (existing) {
      throw new ConflictError(
        `Asset already has an active maintenance request (ID: ${existing.id}, Status: ${existing.status})`,
      );
    }

    // 3. Create request
    const request = await maintenanceRepository.create({
      asset: { connect: { id: data.assetId } },
      raisedBy: { connect: { id: raisedById } },
      issue: data.issue,
      priority: data.priority,
      photoUrl: photo ?? null,
      status: MaintenanceStatus.PENDING,
    });

    // 4. Find an ASSET_MANAGER to notify
    const manager = await prisma.user.findFirst({
      where: { role: Role.ASSET_MANAGER, status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
    });

    eventBus.emit(EVENTS.MAINTENANCE_RAISED, { request, asset, manager });

    return request;
  },

  /**
   * Approve or reject a maintenance request.
   * - Approved → status: APPROVED, asset status: UNDER_MAINTENANCE.
   * - Rejected → status: REJECTED.
   */
  async approveRequest(
    id: string,
    data: ApproveMaintenanceInput,
    approverId: string,
  ) {
    const request = await maintenanceRepository.findById(id);

    if (!request) {
      throw new NotFoundError(`Maintenance request with ID "${id}" not found`);
    }

    if (request.status !== MaintenanceStatus.PENDING) {
      throw new ConflictError(
        `Only PENDING requests can be approved/rejected. Current status: ${request.status}`,
      );
    }

    if (data.approved) {
      // Determine new status: if technician assigned immediately, skip to TECHNICIAN_ASSIGNED
      const newStatus = data.technicianId
        ? MaintenanceStatus.TECHNICIAN_ASSIGNED
        : MaintenanceStatus.APPROVED;

      const updated = await maintenanceRepository.update(id, {
        status: newStatus,
        approvedBy: { connect: { id: approverId } },
        approvedAt: new Date(),
        notes: data.notes,
        ...(data.technicianId
          ? { technician: { connect: { id: data.technicianId } } }
          : {}),
      });

      // Update asset status to UNDER_MAINTENANCE
      await prisma.asset.update({
        where: { id: request.asset.id },
        data: { status: AssetStatus.UNDER_MAINTENANCE },
      });

      eventBus.emit(EVENTS.MAINTENANCE_APPROVED, { request: updated });

      return updated;
    } else {
      // Reject
      const updated = await maintenanceRepository.update(id, {
        status: MaintenanceStatus.REJECTED,
        approvedBy: { connect: { id: approverId } },
        approvedAt: new Date(),
        notes: data.notes,
      });

      eventBus.emit(EVENTS.MAINTENANCE_REJECTED, { request: updated });

      return updated;
    }
  },

  /**
   * Assign a technician to an APPROVED maintenance request.
   */
  async assignTechnician(
    id: string,
    data: AssignTechnicianInput,
    assignedById: string,
  ) {
    const request = await maintenanceRepository.findById(id);

    if (!request) {
      throw new NotFoundError(`Maintenance request with ID "${id}" not found`);
    }

    if (request.status !== MaintenanceStatus.APPROVED) {
      throw new ConflictError(
        `Technician can only be assigned to APPROVED requests. Current status: ${request.status}`,
      );
    }

    // Verify technician exists
    const technician = await prisma.user.findUnique({
      where: { id: data.technicianId },
      select: { id: true, name: true, role: true, status: true },
    });

    if (!technician || technician.status !== 'ACTIVE') {
      throw new NotFoundError(`Technician with ID "${data.technicianId}" not found or inactive`);
    }

    return maintenanceRepository.update(id, {
      technician: { connect: { id: data.technicianId } },
      status: MaintenanceStatus.TECHNICIAN_ASSIGNED,
    });
  },

  /**
   * Technician starts work on an assigned request.
   * Only the assigned technician may call this.
   */
  async startWork(id: string, technicianId: string) {
    const request = await maintenanceRepository.findById(id);

    if (!request) {
      throw new NotFoundError(`Maintenance request with ID "${id}" not found`);
    }

    if (request.status !== MaintenanceStatus.TECHNICIAN_ASSIGNED) {
      throw new ConflictError(
        `Work can only be started on TECHNICIAN_ASSIGNED requests. Current status: ${request.status}`,
      );
    }

    if (request.technician?.id !== technicianId) {
      throw new ForbiddenError(
        'Only the assigned technician can start work on this request',
      );
    }

    return maintenanceRepository.update(id, {
      status: MaintenanceStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
  },

  /**
   * Resolve a maintenance request.
   * 1. Verify status = IN_PROGRESS.
   * 2. Set status → RESOLVED, record resolution + resolvedAt.
   * 3. Update asset status → AVAILABLE (and condition if provided).
   * 4. Emit MAINTENANCE_RESOLVED.
   */
  async resolveRequest(
    id: string,
    data: ResolveMaintenanceInput,
    resolvedById: string,
  ) {
    const request = await maintenanceRepository.findById(id);

    if (!request) {
      throw new NotFoundError(`Maintenance request with ID "${id}" not found`);
    }

    if (request.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new ConflictError(
        `Only IN_PROGRESS requests can be resolved. Current status: ${request.status}`,
      );
    }

    const resolved = await maintenanceRepository.update(id, {
      status: MaintenanceStatus.RESOLVED,
      resolution: data.resolution,
      resolvedAt: new Date(),
    });

    // Update asset: status → AVAILABLE, optionally update condition
    await prisma.asset.update({
      where: { id: request.asset.id },
      data: {
        status: AssetStatus.AVAILABLE,
        ...(data.condition ? { condition: data.condition } : {}),
      },
    });

    eventBus.emit(EVENTS.MAINTENANCE_RESOLVED, {
      request: resolved,
      resolvedById,
    });

    return resolved;
  },

  /** Paginated list of maintenance requests with optional filters. */
  async getAll(
    filters: MaintenanceFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    return maintenanceRepository.findAll(filters, page, limit);
  },

  /** Get a single maintenance request by ID, throwing 404 if not found. */
  async getById(id: string) {
    const request = await maintenanceRepository.findById(id);

    if (!request) {
      throw new NotFoundError(`Maintenance request with ID "${id}" not found`);
    }

    return request;
  },
};
