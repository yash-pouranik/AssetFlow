import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { eventBus, EVENTS } from '../events/eventBus';
import { logger } from '../logger/winston';

/**
 * Overdue Check — runs every hour
 * Finds allocations past expectedReturn date and marks them OVERDUE
 */
const overdueCheckJob = cron.schedule('0 * * * *', async () => {
  logger.info('[Cron] Running overdue allocation check...');
  try {
    const overdueAllocations = await prisma.allocation.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { lt: new Date() },
      },
      include: {
        asset: { select: { id: true, tag: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    for (const allocation of overdueAllocations) {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { status: 'OVERDUE' },
      });

      if (allocation.userId) {
        eventBus.publish(EVENTS.ASSET_OVERDUE, {
          assetId: allocation.asset.id,
          assetTag: allocation.asset.tag,
          assetName: allocation.asset.name,
          userId: allocation.userId,
          allocationId: allocation.id,
          expectedReturn: allocation.expectedReturn?.toISOString(),
        });
      }
    }

    if (overdueAllocations.length > 0) {
      logger.info(`[Cron] Marked ${overdueAllocations.length} allocations as overdue`);
    }
  } catch (err) {
    logger.error('[Cron] Overdue check failed', { err });
  }
}, { scheduled: false });

/**
 * Booking Status Update — runs every 15 minutes
 * Updates UPCOMING → ONGOING → COMPLETED based on current time
 */
const bookingStatusJob = cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();

    // UPCOMING → ONGOING
    await prisma.booking.updateMany({
      where: {
        status: 'UPCOMING',
        startTime: { lte: now },
        endTime: { gt: now },
      },
      data: { status: 'ONGOING' },
    });

    // ONGOING → COMPLETED
    await prisma.booking.updateMany({
      where: {
        status: 'ONGOING',
        endTime: { lte: now },
      },
      data: { status: 'COMPLETED' },
    });
  } catch (err) {
    logger.error('[Cron] Booking status update failed', { err });
  }
}, { scheduled: false });

/**
 * Booking Reminder — runs every 5 minutes
 * Sends reminders for bookings starting in the next 30 minutes
 */
const bookingReminderJob = cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);
    const twentyFiveMinLater = new Date(now.getTime() + 25 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'UPCOMING',
        startTime: {
          gte: twentyFiveMinLater,
          lte: thirtyMinLater,
        },
      },
      include: {
        asset: { select: { id: true, tag: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    for (const booking of upcomingBookings) {
      eventBus.publish(EVENTS.BOOKING_REMINDER, {
        bookingId: booking.id,
        assetName: booking.asset.name,
        assetTag: booking.asset.tag,
        userId: booking.userId,
        startTime: booking.startTime.toISOString(),
      });
    }
  } catch (err) {
    logger.error('[Cron] Booking reminder job failed', { err });
  }
}, { scheduled: false });

export function startCronJobs() {
  overdueCheckJob.start();
  bookingStatusJob.start();
  bookingReminderJob.start();
  logger.info('[Cron] All cron jobs started');
}

export function stopCronJobs() {
  overdueCheckJob.stop();
  bookingStatusJob.stop();
  bookingReminderJob.stop();
}
