import { prisma } from '../../shared/prisma/client';
import { eventBus, EVENTS, EventPayload } from '../../shared/events/eventBus';
import { logger } from '../../shared/logger/winston';

/**
 * NotificationService — subscribes to all EventBus events
 * and creates Notification + ActivityLog records.
 *
 * Business logic is fully decoupled from event emitters.
 * Future: replace eventBus with Kafka consumer without changing this service.
 */
export class NotificationService {
  init() {
    eventBus.subscribe(EVENTS.ASSET_ALLOCATED, this.handleAssetAllocated.bind(this));
    eventBus.subscribe(EVENTS.ASSET_RETURNED, this.handleAssetReturned.bind(this));
    eventBus.subscribe(EVENTS.ASSET_OVERDUE, this.handleAssetOverdue.bind(this));
    eventBus.subscribe(EVENTS.TRANSFER_REQUESTED, this.handleTransferRequested.bind(this));
    eventBus.subscribe(EVENTS.TRANSFER_APPROVED, this.handleTransferApproved.bind(this));
    eventBus.subscribe(EVENTS.TRANSFER_REJECTED, this.handleTransferRejected.bind(this));
    eventBus.subscribe(EVENTS.MAINTENANCE_RAISED, this.handleMaintenanceRaised.bind(this));
    eventBus.subscribe(EVENTS.MAINTENANCE_APPROVED, this.handleMaintenanceApproved.bind(this));
    eventBus.subscribe(EVENTS.MAINTENANCE_REJECTED, this.handleMaintenanceRejected.bind(this));
    eventBus.subscribe(EVENTS.MAINTENANCE_RESOLVED, this.handleMaintenanceResolved.bind(this));
    eventBus.subscribe(EVENTS.BOOKING_CONFIRMED, this.handleBookingConfirmed.bind(this));
    eventBus.subscribe(EVENTS.BOOKING_CANCELLED, this.handleBookingCancelled.bind(this));
    eventBus.subscribe(EVENTS.BOOKING_REMINDER, this.handleBookingReminder.bind(this));
    eventBus.subscribe(EVENTS.AUDIT_DISCREPANCY, this.handleAuditDiscrepancy.bind(this));
    eventBus.subscribe(EVENTS.ROLE_PROMOTED, this.handleRolePromoted.bind(this));

    logger.info('[NotificationService] All event handlers registered');
  }

  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    meta?: Record<string, unknown>
  ) {
    try {
      await prisma.notification.create({
        data: { userId, type: type as any, title, message, meta: meta as any },
      });
    } catch (err) {
      logger.error('[NotificationService] Failed to create notification', { err });
    }
  }

  private async logActivity(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    meta?: Record<string, unknown>
  ) {
    try {
      await prisma.activityLog.create({
        data: { actorId, action, entityType, entityId, meta: meta as any },
      });
    } catch (err) {
      logger.error('[NotificationService] Failed to create activity log', { err });
    }
  }

  private async handleAssetAllocated(payload: EventPayload) {
    const { assetId, assetName, assetTag, userId, allocatedById, allocationId } = payload;
    if (userId) {
      await this.createNotification(
        userId as string,
        'ASSET_ALLOCATED',
        'Asset Assigned to You',
        `Asset ${assetTag} (${assetName}) has been allocated to you.`,
        { assetId, allocationId }
      );
    }
    await this.logActivity(
      allocatedById as string,
      'ASSET_ALLOCATED',
      'Allocation',
      allocationId as string,
      payload
    );
  }

  private async handleAssetReturned(payload: EventPayload) {
    const { assetTag, assetName, returnedById, allocationId } = payload;
    await this.logActivity(
      returnedById as string,
      'ASSET_RETURNED',
      'Allocation',
      allocationId as string,
      { message: `Asset ${assetTag} (${assetName}) returned`, ...payload }
    );
  }

  private async handleAssetOverdue(payload: EventPayload) {
    const { assetId, assetTag, assetName, userId, allocationId } = payload;
    if (userId) {
      await this.createNotification(
        userId as string,
        'ASSET_OVERDUE',
        'Overdue Return',
        `Asset ${assetTag} (${assetName}) return is overdue. Please return it immediately.`,
        { assetId, allocationId }
      );
    }
  }

  private async handleTransferRequested(payload: EventPayload) {
    const { assetTag, requestedById, transferId, managerId } = payload;
    if (managerId) {
      await this.createNotification(
        managerId as string,
        'TRANSFER_REQUESTED',
        'Transfer Request',
        `A transfer request for asset ${assetTag} requires your approval.`,
        { transferId }
      );
    }
    await this.logActivity(
      requestedById as string,
      'TRANSFER_REQUESTED',
      'Transfer',
      transferId as string,
      payload
    );
  }

  private async handleTransferApproved(payload: EventPayload) {
    const { assetTag, requestedById, approvedById, transferId } = payload;
    await this.createNotification(
      requestedById as string,
      'TRANSFER_APPROVED',
      'Transfer Approved',
      `Your transfer request for asset ${assetTag} has been approved.`,
      { transferId }
    );
    await this.logActivity(
      approvedById as string,
      'TRANSFER_APPROVED',
      'Transfer',
      transferId as string,
      payload
    );
  }

  private async handleTransferRejected(payload: EventPayload) {
    const { assetTag, requestedById, rejectedById, transferId } = payload;
    await this.createNotification(
      requestedById as string,
      'TRANSFER_REJECTED',
      'Transfer Rejected',
      `Your transfer request for asset ${assetTag} has been rejected.`,
      { transferId }
    );
    await this.logActivity(
      rejectedById as string,
      'TRANSFER_REJECTED',
      'Transfer',
      transferId as string,
      payload
    );
  }

  private async handleMaintenanceRaised(payload: EventPayload) {
    const { assetTag, raisedById, requestId, managerId } = payload;
    if (managerId) {
      await this.createNotification(
        managerId as string,
        'MAINTENANCE_RAISED',
        'Maintenance Request Pending',
        `A maintenance request for asset ${assetTag} requires your approval.`,
        { requestId }
      );
    }
    await this.logActivity(
      raisedById as string,
      'MAINTENANCE_RAISED',
      'MaintenanceReq',
      requestId as string,
      payload
    );
  }

  private async handleMaintenanceApproved(payload: EventPayload) {
    const { assetTag, raisedById, approvedById, requestId } = payload;
    await this.createNotification(
      raisedById as string,
      'MAINTENANCE_APPROVED',
      'Maintenance Approved',
      `Your maintenance request for asset ${assetTag} has been approved.`,
      { requestId }
    );
    await this.logActivity(
      approvedById as string,
      'MAINTENANCE_APPROVED',
      'MaintenanceReq',
      requestId as string,
      payload
    );
  }

  private async handleMaintenanceRejected(payload: EventPayload) {
    const { assetTag, raisedById, rejectedById, requestId } = payload;
    await this.createNotification(
      raisedById as string,
      'MAINTENANCE_REJECTED',
      'Maintenance Rejected',
      `Your maintenance request for asset ${assetTag} has been rejected.`,
      { requestId }
    );
    await this.logActivity(
      rejectedById as string,
      'MAINTENANCE_REJECTED',
      'MaintenanceReq',
      requestId as string,
      payload
    );
  }

  private async handleMaintenanceResolved(payload: EventPayload) {
    const { assetTag, raisedById, resolvedById, requestId } = payload;
    await this.createNotification(
      raisedById as string,
      'MAINTENANCE_RESOLVED',
      'Maintenance Resolved',
      `Asset ${assetTag} maintenance has been resolved and is now available.`,
      { requestId }
    );
    await this.logActivity(
      resolvedById as string,
      'MAINTENANCE_RESOLVED',
      'MaintenanceReq',
      requestId as string,
      payload
    );
  }

  private async handleBookingConfirmed(payload: EventPayload) {
    const { assetName, userId, bookingId, startTime, endTime } = payload;
    await this.createNotification(
      userId as string,
      'BOOKING_CONFIRMED',
      'Booking Confirmed',
      `Your booking for ${assetName} from ${startTime} to ${endTime} is confirmed.`,
      { bookingId }
    );
    await this.logActivity(
      userId as string,
      'BOOKING_CONFIRMED',
      'Booking',
      bookingId as string,
      payload
    );
  }

  private async handleBookingCancelled(payload: EventPayload) {
    const { assetName, userId, bookingId } = payload;
    await this.createNotification(
      userId as string,
      'BOOKING_CANCELLED',
      'Booking Cancelled',
      `Your booking for ${assetName} has been cancelled.`,
      { bookingId }
    );
    await this.logActivity(
      userId as string,
      'BOOKING_CANCELLED',
      'Booking',
      bookingId as string,
      payload
    );
  }

  private async handleBookingReminder(payload: EventPayload) {
    const { assetName, userId, bookingId, startTime } = payload;
    await this.createNotification(
      userId as string,
      'BOOKING_REMINDER',
      'Booking Reminder',
      `Reminder: Your booking for ${assetName} starts at ${startTime}.`,
      { bookingId }
    );
  }

  private async handleAuditDiscrepancy(payload: EventPayload) {
    const { cycleTitle, assetTag, result, auditorId, cycleId } = payload;
    await this.logActivity(
      auditorId as string,
      'AUDIT_DISCREPANCY',
      'AuditItem',
      cycleId as string,
      { message: `Asset ${assetTag} marked as ${result} in cycle "${cycleTitle}"`, ...payload }
    );
  }

  private async handleRolePromoted(payload: EventPayload) {
    const { userId, newRole, promotedBy } = payload;
    await this.createNotification(
      userId as string,
      'ROLE_PROMOTED',
      'Role Updated',
      `Your role has been updated to ${(newRole as string).replace(/_/g, ' ')}.`,
      { newRole }
    );
    await this.logActivity(
      promotedBy as string,
      'ROLE_PROMOTED',
      'User',
      userId as string,
      payload
    );
  }
}

export const notificationService = new NotificationService();
