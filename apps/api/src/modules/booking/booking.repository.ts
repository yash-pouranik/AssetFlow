import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../../shared/prisma/client';

// ─── Reusable select shapes ───────────────────────────────────────────────────

const assetSelect = {
  id: true,
  tag: true,
  name: true,
  isBookable: true,
} satisfies Prisma.AssetSelect;

const userSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingFilters = {
  assetId?: string;
  userId?: string;
  status?: BookingStatus;
  date?: string; // ISO date string e.g. "2024-12-25"
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const bookingRepository = {
  /**
   * Find bookings that overlap with [startTime, endTime) for a given asset.
   * Excludes CANCELLED and COMPLETED bookings.
   * Optionally excludes a booking by ID (for update scenarios).
   */
  async findOverlapping(
    assetId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ) {
    return prisma.booking.findMany({
      where: {
        assetId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
        },
        // Overlap: startTime < existingEndTime AND endTime > existingStartTime
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        user: { select: userSelect },
      },
    });
  },

  /** Find a single booking with nested asset and user details. */
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        asset: { select: assetSelect },
        user: { select: userSelect },
      },
    });
  },

  /** Paginated list with optional filters. */
  async findAll(
    filters: BookingFilters,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: Prisma.BookingWhereInput = {};

    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    // Date-range filter: bookings that overlap with the given calendar day
    if (filters.date) {
      const dayStart = new Date(filters.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(filters.date);
      dayEnd.setHours(23, 59, 59, 999);

      // A booking overlaps the day if startTime < dayEnd AND endTime > dayStart
      where.startTime = { lt: dayEnd };
      where.endTime = { gt: dayStart };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          asset: { select: assetSelect },
          user: { select: userSelect },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  /** Create a new booking. */
  async create(data: Prisma.BookingCreateInput) {
    return prisma.booking.create({ data });
  },

  /** Update booking fields by ID. */
  async update(id: string, data: Prisma.BookingUpdateInput) {
    return prisma.booking.update({ where: { id }, data });
  },

  /**
   * Find bookings starting within the next 30 minutes with UPCOMING status.
   * Used for reminder notifications.
   */
  async findUpcomingForReminder() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);

    return prisma.booking.findMany({
      where: {
        status: BookingStatus.UPCOMING,
        startTime: {
          gte: now,
          lte: in30,
        },
      },
      include: {
        asset: { select: assetSelect },
        user: { select: userSelect },
      },
    });
  },

  /** Update only the status of a booking. */
  async updateStatus(id: string, status: BookingStatus) {
    return prisma.booking.update({
      where: { id },
      data: { status },
    });
  },

  /**
   * Calendar feed — return all non-cancelled bookings for an asset.
   * Ordered by startTime ascending.
   */
  async findByAsset(assetId: string) {
    return prisma.booking.findMany({
      where: {
        assetId,
        status: { not: BookingStatus.CANCELLED },
      },
      orderBy: { startTime: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  },
};
