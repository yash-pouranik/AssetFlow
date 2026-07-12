import { AssetStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';
import { AppError, NotFoundError, ConflictError } from '../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import { AssetRepository } from './asset.repository';
import { CreateAssetDto, UpdateAssetDto, AssetSearchDto, AssetStatusPatchDto } from './asset.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Atomically generate the next asset tag (AF-0001, AF-0002, …).
 * Uses an upsert on AssetTagCounter so concurrent requests can't produce
 * duplicates even without a distributed lock.
 */
async function generateAssetTag(): Promise<string> {
  const counter = await prisma.assetTagCounter.upsert({
    where: { id: 1 },
    update: { current: { increment: 1 } },
    create: { id: 1, current: 1 },
  });
  return `AF-${String(counter.current).padStart(4, '0')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const AssetService = {
  /**
   * Paginated asset list with optional filters.
   */
  async getAll(filters: AssetSearchDto) {
    return AssetRepository.findAll(filters);
  },

  /**
   * Retrieve a single asset by its primary key.
   * Throws NotFoundError when the ID does not exist.
   */
  async getById(id: string) {
    const asset = await AssetRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID "${id}" was not found`);
    }
    return asset;
  },

  /**
   * Register a brand-new asset in the system.
   *
   * Business rules enforced:
   *   1. The referenced category must exist.
   *   2. If a serial number is provided it must be unique across all assets.
   *   3. A unique AF-XXXX tag is auto-generated atomically.
   *   4. An ASSET_REGISTERED event is emitted after creation.
   */
  async register(data: CreateAssetDto, photoPath?: string) {
    // 1. Validate category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new NotFoundError(`Category with ID "${data.categoryId}" was not found`);
    }

    // 2. Serial number uniqueness check
    if (data.serialNumber) {
      const existing = await AssetRepository.findBySerialNumber(data.serialNumber);
      if (existing) {
        throw new ConflictError(
          `An asset with serial number "${data.serialNumber}" already exists (tag: ${existing.tag})`,
        );
      }
    }

    // 3. Validate optional departmentId
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) {
        throw new NotFoundError(`Department with ID "${data.departmentId}" was not found`);
      }
    }

    // 4. Generate unique tag
    const tag = await generateAssetTag();

    // 5. Build the create payload
    const asset = await AssetRepository.create({
      tag,
      name: data.name,
      category: { connect: { id: data.categoryId } },
      serialNumber: data.serialNumber,
      condition: data.condition,
      location: data.location,
      isBookable: data.isBookable,
      acquisitionDate: data.acquisitionDate,
      acquisitionCost: data.acquisitionCost,
      notes: data.notes,
      photo: photoPath,
      ...(data.departmentId && { department: { connect: { id: data.departmentId } } }),
    });

    // 6. Emit domain event
    eventBus.emit(EVENTS.ASSET_REGISTERED, { asset });

    return asset;
  },

  /**
   * Update mutable fields on an existing asset.
   * Validates category & department references and serial number uniqueness
   * before persisting changes.
   */
  async update(id: string, data: UpdateAssetDto, photoPath?: string) {
    // Ensure asset exists
    const existing = await AssetRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Asset with ID "${id}" was not found`);
    }

    // Validate new categoryId if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new NotFoundError(`Category with ID "${data.categoryId}" was not found`);
      }
    }

    // Validate new departmentId if provided (null clears the relation)
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) {
        throw new NotFoundError(`Department with ID "${data.departmentId}" was not found`);
      }
    }

    // Serial number uniqueness – skip check if unchanged
    if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
      const collision = await AssetRepository.findBySerialNumber(data.serialNumber);
      if (collision && collision.id !== id) {
        throw new ConflictError(
          `An asset with serial number "${data.serialNumber}" already exists (tag: ${collision.tag})`,
        );
      }
    }

    const updated = await AssetRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.categoryId !== undefined && { category: { connect: { id: data.categoryId } } }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
      ...(data.condition !== undefined && { condition: data.condition }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.isBookable !== undefined && { isBookable: data.isBookable }),
      ...(data.acquisitionDate !== undefined && { acquisitionDate: data.acquisitionDate }),
      ...(data.acquisitionCost !== undefined && { acquisitionCost: data.acquisitionCost }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(photoPath !== undefined && { photo: photoPath }),
      ...(data.departmentId !== undefined &&
        (data.departmentId
          ? { department: { connect: { id: data.departmentId } } }
          : { department: { disconnect: true } })),
    });

    eventBus.emit(EVENTS.ASSET_UPDATED, { asset: updated });

    return updated;
  },

  /**
   * Patch only the status of an asset (e.g. AVAILABLE → UNDER_MAINTENANCE).
   * Emits a status-change event so listeners (notifications, audit log) react.
   */
  async updateStatus(id: string, payload: AssetStatusPatchDto) {
    const existing = await AssetRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Asset with ID "${id}" was not found`);
    }

    if (existing.status === payload.status) {
      throw new AppError(
        `Asset is already in "${payload.status}" status`,
        400,
        'SAME_STATUS',
      );
    }

    const updated = await AssetRepository.updateStatus(id, payload.status as AssetStatus);

    eventBus.emit(EVENTS.ASSET_STATUS_CHANGED, {
      assetId: id,
      previousStatus: existing.status,
      newStatus: payload.status,
      notes: payload.notes,
    });

    return updated;
  },

  /**
   * Permanently delete an asset.
   * Throws ConflictError if the asset has an ACTIVE allocation (APPROVED or PENDING).
   */
  async delete(id: string) {
    const existing = await AssetRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Asset with ID "${id}" was not found`);
    }

    const hasActive = await AssetRepository.hasActiveAllocation(id);
    if (hasActive) {
      throw new ConflictError(
        `Asset "${existing.tag}" cannot be deleted because it has an active allocation. ` +
          'Return or revoke the allocation first.',
      );
    }

    await AssetRepository.delete(id);

    eventBus.emit(EVENTS.ASSET_DELETED, { assetId: id, tag: existing.tag });

    return { message: `Asset "${existing.tag}" has been permanently deleted` };
  },

  /**
   * Return per-status counts for dashboard KPI cards.
   */
  async getStatusCounts() {
    return AssetRepository.countByStatus();
  },
};
