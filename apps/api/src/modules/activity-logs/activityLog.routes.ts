import { Router } from 'express';
import { prisma } from '../../shared/prisma/client';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { managerOrAdmin } from '../../shared/middleware/rbac.middleware';

const router = Router();

// GET /activity-logs — paginated audit trail; restricted to managers and admins
router.get('/', authenticate, managerOrAdmin, async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      entityType,
      entityId,
      actorId,
      action,
      from,
      to,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (entityType) where.entityType = entityType as string;
    if (entityId)   where.entityId   = entityId as string;
    if (actorId)    where.actorId    = actorId as string;
    if (action)     where.action     = { contains: action as string, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to)   where.createdAt.lte = new Date(to as string);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /activity-logs/entity/:entityType/:entityId — fetch logs for a specific entity
router.get('/entity/:entityType/:entityId', authenticate, managerOrAdmin, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.activityLog.count({ where: { entityType, entityId } }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
