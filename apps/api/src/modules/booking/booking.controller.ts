import { Request, Response, NextFunction } from 'express';
import { bookingService } from './booking.service';
import { BookingFilterInput } from './booking.dto';

// ─── Controller ───────────────────────────────────────────────────────────────

export const bookingController = {
  /** GET / — paginated list of bookings */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: BookingFilterInput = {
        assetId: req.query.assetId as string | undefined,
        userId: req.query.userId as string | undefined,
        status: req.query.status as any,
        date: req.query.date as string | undefined,
      };

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await bookingService.getAll(filters, page, limit);

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  /** POST / — create a new booking */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const booking = await bookingService.createBooking(req.body, userId);
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  /** GET /calendar/:assetId — calendar feed for an asset */
  async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId } = req.params;
      const result = await bookingService.getCalendar(assetId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /** GET /:id — get booking by ID */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.getById(req.params.id);
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  /** PUT /:id — update booking */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const booking = await bookingService.updateBooking(
        req.params.id,
        req.body,
        userId,
        userRole as any,
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /:id/cancel — cancel a booking */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const booking = await bookingService.cancelBooking(
        req.params.id,
        userId,
        userRole as any,
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },
};
