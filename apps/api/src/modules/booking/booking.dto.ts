import { z } from 'zod';
import { BookingStatus } from '@prisma/client';

// ─── Create Booking ───────────────────────────────────────────────────────────

export const CreateBookingDto = z
  .object({
    assetId: z.string().uuid({ message: 'assetId must be a valid UUID' }),

    startTime: z.coerce.date({
      errorMap: () => ({ message: 'startTime must be a valid date' }),
    }),

    endTime: z.coerce.date({
      errorMap: () => ({ message: 'endTime must be a valid date' }),
    }),

    purpose: z.string().trim().optional(),

    notes: z.string().trim().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine(
    (data) =>
      data.endTime.getTime() - data.startTime.getTime() >= 15 * 60 * 1000,
    {
      message: 'Minimum booking duration is 15 minutes',
      path: ['endTime'],
    },
  );

export type CreateBookingInput = z.infer<typeof CreateBookingDto>;

// ─── Update Booking ───────────────────────────────────────────────────────────

export const UpdateBookingDto = z
  .object({
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    purpose: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    },
  )
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return (
          data.endTime.getTime() - data.startTime.getTime() >= 15 * 60 * 1000
        );
      }
      return true;
    },
    {
      message: 'Minimum booking duration is 15 minutes',
      path: ['endTime'],
    },
  );

export type UpdateBookingInput = z.infer<typeof UpdateBookingDto>;

// ─── Booking Filter ───────────────────────────────────────────────────────────

export const BookingFilterDto = z.object({
  assetId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  /** ISO date string e.g. "2024-12-25" — filters bookings that span this calendar day */
  date: z.string().optional(),
});

export type BookingFilterInput = z.infer<typeof BookingFilterDto>;
