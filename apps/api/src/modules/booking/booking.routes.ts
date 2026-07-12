import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { allRoles } from '../../shared/middleware/rbac.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { CreateBookingDto, UpdateBookingDto } from './booking.dto';
import { bookingController } from './booking.controller';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /bookings
 * List all bookings (paginated). Accepts query params:
 *   assetId, userId, status, date, page, limit
 */
router.get('/', allRoles, bookingController.getAll);

/**
 * POST /bookings
 * Create a new booking.
 */
router.post('/', allRoles, validate(CreateBookingDto), bookingController.create);

/**
 * GET /bookings/calendar/:assetId
 * Calendar feed — all non-cancelled bookings for a given asset.
 * Must be declared BEFORE /:id to avoid "calendar" being treated as an ID.
 */
router.get('/calendar/:assetId', allRoles, bookingController.getCalendar);

/**
 * GET /bookings/:id
 * Get a booking by ID.
 */
router.get('/:id', allRoles, bookingController.getById);

/**
 * PUT /bookings/:id
 * Update a booking (time / purpose / notes).
 */
router.put('/:id', allRoles, validate(UpdateBookingDto), bookingController.update);

/**
 * PATCH /bookings/:id/cancel
 * Cancel a booking (owner or manager/admin only — enforced in service).
 */
router.patch('/:id/cancel', allRoles, bookingController.cancel);

export default router;
