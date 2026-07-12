import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/prisma/client';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { managerOrAdmin } from '../../shared/middleware/rbac.middleware';

const router = Router();

// ─── CSV Helper ────────────────────────────────────────────────────────────────

/**
 * Serialises an array of flat objects to CSV.
 * Only handles primitive values (string / number / boolean / null / Date).
 */
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = val instanceof Date ? val.toISOString() : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function sendCSV(res: Response, filename: string, rows: Record<string, unknown>[]): void {
  const csv = toCSV(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// ─── 1. GET /reports/asset-utilization ─────────────────────────────────────────
router.get('/asset-utilization', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Aggregate allocation counts and days allocated per asset
    const allocations = await prisma.allocation.groupBy({
      by: ['assetId'],
      _count: { id: true },
      _max: { allocatedAt: true },
    });

    const allocationMap = new Map(
      allocations.map((a) => ({
        assetId: a.assetId,
        count: a._count.id,
        lastAllocated: a._max.allocatedAt,
      })).map((a) => [a.assetId, a]),
    );

    // Compute total days allocated per asset
    const allAllocs = await prisma.allocation.findMany({
      select: {
        assetId: true,
        allocatedAt: true,
        returnedAt: true,
        expectedReturn: true,
      },
    });

    const daysMap = new Map<string, number>();
    for (const a of allAllocs) {
      const end = a.returnedAt ?? a.expectedReturn ?? new Date();
      const days = Math.max(
        0,
        Math.ceil((end.getTime() - a.allocatedAt.getTime()) / 86_400_000),
      );
      daysMap.set(a.assetId, (daysMap.get(a.assetId) ?? 0) + days);
    }

    const assets = await prisma.asset.findMany({
      select: {
        id: true,
        assetTag: true,
        name: true,
        category: { select: { name: true } },
        condition: true,
        status: true,
      },
    });

    const rows = assets.map((asset) => {
      const info = allocationMap.get(asset.id);
      return {
        assetId: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category?.name ?? 'Uncategorised',
        condition: asset.condition,
        status: asset.status,
        allocationCount: info?.count ?? 0,
        totalDaysAllocated: daysMap.get(asset.id) ?? 0,
        lastAllocatedDate: info?.lastAllocated ?? null,
      };
    });

    const mostUsed   = rows.filter((r) => r.allocationCount > 5);
    const idle       = rows.filter((r) => r.allocationCount === 0);
    const moderate   = rows.filter((r) => r.allocationCount > 0 && r.allocationCount <= 5);

    if (req.query.export === 'csv') {
      return sendCSV(res, 'asset-utilization.csv', rows);
    }

    res.json({ success: true, data: { mostUsed, moderate, idle } });
  } catch (err) {
    next(err);
  }
});

// ─── 2. GET /reports/maintenance-frequency ─────────────────────────────────────
router.get('/maintenance-frequency', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      select: {
        assetId: true,
        status: true,
        asset: {
          select: {
            assetTag: true,
            name: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    // Aggregate per asset
    const assetMap = new Map<
      string,
      {
        assetId: string;
        assetTag: string;
        assetName: string;
        category: string;
        totalRequests: number;
        resolvedCount: number;
        pendingCount: number;
      }
    >();

    for (const req_ of requests) {
      if (!assetMap.has(req_.assetId)) {
        assetMap.set(req_.assetId, {
          assetId: req_.assetId,
          assetTag: req_.asset.assetTag,
          assetName: req_.asset.name,
          category: req_.asset.category?.name ?? 'Uncategorised',
          totalRequests: 0,
          resolvedCount: 0,
          pendingCount: 0,
        });
      }
      const entry = assetMap.get(req_.assetId)!;
      entry.totalRequests += 1;
      if (req_.status === 'RESOLVED' || req_.status === 'COMPLETED') {
        entry.resolvedCount += 1;
      } else {
        entry.pendingCount += 1;
      }
    }

    const byAsset = [...assetMap.values()].sort(
      (a, b) => b.totalRequests - a.totalRequests,
    );

    // Aggregate per category
    const catMap = new Map<string, { category: string; totalRequests: number; resolvedCount: number; pendingCount: number }>();
    for (const entry of byAsset) {
      if (!catMap.has(entry.category)) {
        catMap.set(entry.category, { category: entry.category, totalRequests: 0, resolvedCount: 0, pendingCount: 0 });
      }
      const c = catMap.get(entry.category)!;
      c.totalRequests += entry.totalRequests;
      c.resolvedCount += entry.resolvedCount;
      c.pendingCount  += entry.pendingCount;
    }
    const byCategory = [...catMap.values()].sort((a, b) => b.totalRequests - a.totalRequests);

    if (req.query.export === 'csv') {
      return sendCSV(res, 'maintenance-frequency.csv', byAsset);
    }

    res.json({ success: true, data: { byAsset, byCategory } });
  } catch (err) {
    next(err);
  }
});

// ─── 3. GET /reports/department-summary ────────────────────────────────────────
router.get('/department-summary', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });

    const now = new Date();

    const rows = await Promise.all(
      departments.map(async (dept) => {
        const [totalAllocated, activeAllocations, overdueCount] = await Promise.all([
          // Distinct assets ever allocated to users in this department
          prisma.allocation.count({
            where: {
              user: { departmentId: dept.id },
            },
          }),
          // Currently active (returned is null and not overdue)
          prisma.allocation.count({
            where: {
              user: { departmentId: dept.id },
              returnedAt: null,
              status: 'ACTIVE',
            },
          }),
          // Overdue
          prisma.allocation.count({
            where: {
              user: { departmentId: dept.id },
              status: 'OVERDUE',
            },
          }),
        ]);

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalAllocated,
          activeAllocations,
          overdueCount,
        };
      }),
    );

    if (req.query.export === 'csv') {
      return sendCSV(res, 'department-summary.csv', rows);
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── 4. GET /reports/booking-heatmap ───────────────────────────────────────────
router.get('/booking-heatmap', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // MySQL: DAYOFWEEK returns 1=Sunday … 7=Saturday, convert to 0-6 (Sun=0)
    type HeatmapRow = { dayOfWeek: number; hour: number; count: bigint };

    const raw = await prisma.$queryRaw<HeatmapRow[]>`
      SELECT
        (DAYOFWEEK(createdAt) - 1)  AS dayOfWeek,
        HOUR(createdAt)             AS hour,
        COUNT(*)                    AS count
      FROM Booking
      GROUP BY dayOfWeek, hour
      ORDER BY dayOfWeek, hour
    `;

    const heatmap = raw.map((row) => ({
      dayOfWeek: Number(row.dayOfWeek),
      hour: Number(row.hour),
      count: Number(row.count),
    }));

    if (req.query.export === 'csv') {
      return sendCSV(res, 'booking-heatmap.csv', heatmap);
    }

    res.json({ success: true, data: heatmap });
  } catch (err) {
    next(err);
  }
});

// ─── 5. GET /reports/upcoming-maintenance ──────────────────────────────────────
router.get('/upcoming-maintenance', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get date of last resolved/completed maintenance per asset
    const lastMaintenance = await prisma.maintenanceRequest.groupBy({
      by: ['assetId'],
      where: {
        status: { in: ['RESOLVED', 'COMPLETED'] },
      },
      _max: { resolvedAt: true },
    });

    const lastMaintenanceMap = new Map(
      lastMaintenance.map((m) => [m.assetId, m._max.resolvedAt]),
    );

    // Fetch assets in at-risk conditions
    const atRiskAssets = await prisma.asset.findMany({
      where: {
        condition: { in: ['FAIR', 'POOR', 'DAMAGED'] },
        status: { not: 'DECOMMISSIONED' },
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        condition: true,
        category: { select: { name: true } },
      },
    });

    const rows = atRiskAssets
      .map((asset) => {
        const lastMaint = lastMaintenanceMap.get(asset.id) ?? null;
        const isOverdue = lastMaint === null || lastMaint < sixMonthsAgo;
        return {
          assetId: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          category: asset.category?.name ?? 'Uncategorised',
          condition: asset.condition,
          lastMaintenance: lastMaint,
          daysSinceLastMaintenance:
            lastMaint === null
              ? null
              : Math.floor((Date.now() - lastMaint.getTime()) / 86_400_000),
          isOverdue,
        };
      })
      .filter((r) => r.isOverdue)
      .sort((a, b) => {
        // Sort nulls (never maintained) first, then by oldest maintenance
        if (a.lastMaintenance === null) return -1;
        if (b.lastMaintenance === null) return 1;
        return a.lastMaintenance.getTime() - b.lastMaintenance.getTime();
      });

    if (req.query.export === 'csv') {
      return sendCSV(res, 'upcoming-maintenance.csv', rows);
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── 6. GET /reports/overdue-returns ───────────────────────────────────────────
router.get('/overdue-returns', authenticate, managerOrAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();

    const overdueAllocations = await prisma.allocation.findMany({
      where: { status: 'OVERDUE' },
      orderBy: { expectedReturn: 'asc' }, // most overdue first (earliest expected date)
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            category: { select: { name: true } },
            condition: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    const rows = overdueAllocations.map((alloc) => {
      const daysOverdue = alloc.expectedReturn
        ? Math.max(0, Math.floor((now.getTime() - alloc.expectedReturn.getTime()) / 86_400_000))
        : null;

      return {
        allocationId: alloc.id,
        assetId: alloc.asset.id,
        assetTag: alloc.asset.assetTag,
        assetName: alloc.asset.name,
        category: alloc.asset.category?.name ?? 'Uncategorised',
        condition: alloc.asset.condition,
        userId: alloc.user.id,
        userName: alloc.user.name,
        userEmail: alloc.user.email,
        department: alloc.user.department?.name ?? 'N/A',
        allocatedAt: alloc.allocatedAt,
        expectedReturn: alloc.expectedReturn,
        daysOverdue,
      };
    });

    if (req.query.export === 'csv') {
      return sendCSV(res, 'overdue-returns.csv', rows);
    }

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

export default router;
