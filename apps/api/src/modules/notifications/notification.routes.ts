import { Router } from 'express';
import { prisma } from '../../shared/prisma/client';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

// GET /notifications — current user's notifications (paginated, optional unreadOnly filter)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = '1', limit = '20', unreadOnly } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { userId: req.user!.id };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      total,
      unreadCount,
      page: parseInt(page as string),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/read-all — mark all unread notifications as read for the current user
// NOTE: This route MUST be declared before /:id/read to avoid Express matching "read-all" as an :id
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: `${count} notification(s) marked as read` });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read — mark a single notification as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    if (result.count === 0) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

// DELETE /notifications/:id — delete a single notification belonging to the current user
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (result.count === 0) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
