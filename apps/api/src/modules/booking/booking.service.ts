import { BookingStatus, Role } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import { bookingRepository, BookingFilters } from './booking.repository';
import { CreateBookingInput, UpdateBookingInput } from './booking.dto';

const formatConflictDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date) + ' (GMT+5:30)';
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const bookingService = {
  /**
   * Create a booking.
   * 1. Verify asset exists and isBookable = true.
   * 2. Check for overlapping bookings.
   * 3. Persist and emit BOOKING_CONFIRMED.
   */
  async createBooking(data: CreateBookingInput, userId: string) {
    // 1. Verify asset
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      select: { id: true, name: true, tag: true, isBookable: true, status: true },
    });

    if (!asset) {
      throw new NotFoundError(`Asset with ID "${data.assetId}" not found`);
    }

    if (!asset.isBookable) {
      throw new ConflictError(
        `Asset "${asset.name}" (${asset.tag}) is not available for booking`,
      );
    }

    if (asset.status === 'ALLOCATED') {
      throw new ConflictError(
        `Asset "${asset.name}" (${asset.tag}) is currently allocated and cannot be booked`,
      );
    }

    // 2. Overlap check
    const overlapping = await bookingRepository.findOverlapping(
      data.assetId,
      data.startTime,
      data.endTime,
    );

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new ConflictError(
        `Asset is already booked from ${formatConflictDate(conflict.startTime)} ` +
          `to ${formatConflictDate(conflict.endTime)}`
      );
    }

    // 3. Create booking
    const booking = await bookingRepository.create({
      asset: { connect: { id: data.assetId } },
      user: { connect: { id: userId } },
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      notes: data.notes,
      status: BookingStatus.UPCOMING,
    });

    // 4. Emit event
    eventBus.emit(EVENTS.BOOKING_CONFIRMED, { booking, asset });

    return booking;
  },

  /**
   * Return all non-cancelled bookings for a given asset — used for calendar view.
   */
  async getCalendar(assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, name: true, tag: true },
    });

    if (!asset) {
      throw new NotFoundError(`Asset with ID "${assetId}" not found`);
    }

    const bookings = await bookingRepository.findByAsset(assetId);

    return { asset, bookings };
  },

  /**
   * Cancel a booking.
   * Only the booking owner or a MANAGER / ADMIN may cancel.
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: Role,
  ) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(`Booking with ID "${bookingId}" not found`);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError('Cannot cancel a completed booking');
    }

    const isOwner = booking.user.id === userId;
    const isPrivileged =
      userRole === Role.ADMIN || userRole === Role.ASSET_MANAGER;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to cancel this booking',
      );
    }

    const cancelled = await bookingRepository.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
    );

    eventBus.emit(EVENTS.BOOKING_CANCELLED, { booking: cancelled });

    return cancelled;
  },

  /** Paginated list of bookings with optional filters. */
  async getAll(
    filters: BookingFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    return bookingRepository.findAll(filters, page, limit);
  },

  /** Get a single booking by ID, throwing 404 if not found. */
  async getById(id: string) {
    const booking = await bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundError(`Booking with ID "${id}" not found`);
    }

    return booking;
  },

  /**
   * Find all UPCOMING bookings starting in the next 30 minutes and emit
   * a BOOKING_REMINDER event for each one.
   */
  async sendReminders() {
    const upcoming = await bookingRepository.findUpcomingForReminder();

    for (const booking of upcoming) {
      eventBus.emit(EVENTS.BOOKING_REMINDER, { booking });
    }

    return { reminders: upcoming.length };
  },

  /** Update a booking (time / purpose / notes). Re-validates overlap. */
  async updateBooking(
    bookingId: string,
    data: UpdateBookingInput,
    userId: string,
    userRole: Role,
  ) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(`Booking with ID "${bookingId}" not found`);
    }

    const isOwner = booking.user.id === userId;
    const isPrivileged =
      userRole === Role.ADMIN || userRole === Role.ASSET_MANAGER;

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenError(
        'You do not have permission to update this booking',
      );
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ConflictError(
        `Cannot update a booking with status "${booking.status}"`,
      );
    }

    const newStart = data.startTime ?? booking.startTime;
    const newEnd = data.endTime ?? booking.endTime;

    if (data.startTime || data.endTime) {
      const overlapping = await bookingRepository.findOverlapping(
        booking.asset.id,
        newStart,
        newEnd,
        bookingId,
      );

      if (overlapping.length > 0) {
        const conflict = overlapping[0];
        throw new ConflictError(
          `Asset is already booked from ${formatConflictDate(conflict.startTime)} ` +
            `to ${formatConflictDate(conflict.endTime)}`
        );
      }
    }

    return bookingRepository.update(bookingId, {
      startTime: data.startTime,
      endTime: data.endTime,
      purpose: data.purpose,
      notes: data.notes,
    });
  },
};
