import { Router } from 'express';
import { prisma } from '../../shared/prisma/client';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * GET /api/dashboard/kpis
 * Returns KPI cards data for the dashboard — role-aware
 */
router.get('/kpis', authenticate, async (req, res, next) => {
  try {
    const user = req.user!;
    const now = new Date();

    // Department filter for dept heads
    const deptFilter =
      user.role === 'DEPARTMENT_HEAD' && user.departmentId
        ? { departmentId: user.departmentId }
        : {};

    const [
      assetsAvailable,
      assetsAllocated,
      assetsUnderMaintenance,
      activeBookings,
      overdueAllocations,
      maintenanceToday,
      pendingTransfers,
      pendingMaintenance,
      upcomingReturns,
      totalAssets,
      activeAllocations,
      activeAudits,
    ] = await Promise.all([
      prisma.asset.count({ where: { status: 'AVAILABLE', ...deptFilter } }),
      prisma.asset.count({ where: { status: 'ALLOCATED', ...deptFilter } }),
      prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE', ...deptFilter } }),
      prisma.booking.count({
        where: { status: { in: ['UPCOMING', 'ONGOING'] } },
      }),
      prisma.allocation.count({
        where: { status: 'OVERDUE', ...deptFilter },
      }),
      prisma.maintenanceReq.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      }),
      prisma.transfer.count({ where: { status: 'REQUESTED' } }),
      prisma.maintenanceReq.count({ where: { status: 'PENDING' } }),
      prisma.allocation.count({
        where: {
          status: 'ACTIVE',
          expectedReturn: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // next 7 days
          },
          ...deptFilter,
        },
      }),
      prisma.asset.count({ where: { ...deptFilter } }), // totalAssets
      prisma.allocation.count({ where: { status: 'ACTIVE', ...deptFilter } }), // activeAllocations
      prisma.auditCycle.count({ where: { status: 'OPEN', ...deptFilter } }), // activeAudits
    ]);

    // Overdue allocations detail
    const overdueDetails = await prisma.allocation.findMany({
      where: { status: 'OVERDUE', ...deptFilter },
      take: 5,
      orderBy: { expectedReturn: 'asc' },
      include: {
        asset: { select: { id: true, tag: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Recent activity
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          assetsAvailable,
          assetsAllocated,
          assetsUnderMaintenance,
          activeBookings,
          overdueAllocations,
          maintenanceToday,
          pendingTransfers,
          pendingMaintenance,
          upcomingReturns,
        },
        totalAssets,
        activeAllocations,
        pendingMaintenance,
        activeAudits,
        overdueDetails,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
