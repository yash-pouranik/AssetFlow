import { EventEmitter } from 'events';
import { logger } from '../logger/winston';

export type EventPayload = Record<string, unknown>;

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  publish(event: string, payload: EventPayload): void {
    logger.debug(`[EventBus] Publishing: ${event}`, { payload });
    this.emit(event, payload);
  }

  subscribe(event: string, handler: (payload: EventPayload) => void | Promise<void>): void {
    this.on(event, async (payload: EventPayload) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(`[EventBus] Handler error for event "${event}"`, { err });
      }
    });
  }
}

// Singleton
export const eventBus = new EventBus();

// ─────────────────────────────────────────────
// Typed Event Constants
// Future: replace eventBus with Kafka/RabbitMQ
// without changing any business logic
// ─────────────────────────────────────────────
export const EVENTS = {
  // Asset
  ASSET_ALLOCATED: 'asset.allocated',
  ASSET_RETURNED: 'asset.returned',
  ASSET_OVERDUE: 'asset.overdue',

  // Transfer
  TRANSFER_REQUESTED: 'transfer.requested',
  TRANSFER_APPROVED: 'transfer.approved',
  TRANSFER_REJECTED: 'transfer.rejected',

  // Maintenance
  MAINTENANCE_RAISED: 'maintenance.raised',
  MAINTENANCE_APPROVED: 'maintenance.approved',
  MAINTENANCE_REJECTED: 'maintenance.rejected',
  MAINTENANCE_RESOLVED: 'maintenance.resolved',

  // Booking
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_REMINDER: 'booking.reminder',

  // Audit
  AUDIT_DISCREPANCY: 'audit.discrepancy',
  AUDIT_CLOSED: 'audit.closed',

  // Role
  ROLE_PROMOTED: 'role.promoted',

  // Organization
  DEPARTMENT_CREATED: 'department.created',
  DEPARTMENT_UPDATED: 'department.updated',
  DEPARTMENT_DELETED: 'department.deleted',
  DEPARTMENT_HEAD_ASSIGNED: 'department.head_assigned',
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_DEACTIVATED: 'employee.deactivated',

  // Asset
  ASSET_REGISTERED: 'asset.registered',
  ASSET_UPDATED: 'asset.updated',
  ASSET_STATUS_CHANGED: 'asset.status_changed',
  ASSET_DELETED: 'asset.deleted',
} as const;
