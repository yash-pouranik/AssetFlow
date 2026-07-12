import { z } from 'zod';

// ─── CreateAuditCycleDto ──────────────────────────────────────────────────────

export const CreateAuditCycleDtoSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(3, 'Title must be at least 3 characters'),

    scope: z.enum(['DEPARTMENT', 'LOCATION'], {
      required_error: 'Scope is required',
      invalid_type_error: "Scope must be 'DEPARTMENT' or 'LOCATION'",
    }),

    scopeValue: z
      .string({ required_error: 'Scope value is required' })
      .min(1, 'Scope value cannot be empty'),

    departmentId: z.string().uuid('Invalid department ID').optional(),

    startDate: z.coerce.date({
      required_error: 'Start date is required',
      invalid_type_error: 'Invalid start date',
    }),

    endDate: z.coerce.date({
      required_error: 'End date is required',
      invalid_type_error: 'Invalid end date',
    }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type CreateAuditCycleDto = z.infer<typeof CreateAuditCycleDtoSchema>;

// ─── AssignAuditorsDto ────────────────────────────────────────────────────────

export const AssignAuditorsDtoSchema = z.object({
  auditorIds: z
    .array(z.string().uuid('Each auditor ID must be a valid UUID'), {
      required_error: 'Auditor IDs are required',
      invalid_type_error: 'Auditor IDs must be an array',
    })
    .min(1, 'At least one auditor ID is required'),
});

export type AssignAuditorsDto = z.infer<typeof AssignAuditorsDtoSchema>;

// ─── UpdateAuditItemDto ───────────────────────────────────────────────────────

export const UpdateAuditItemDtoSchema = z.object({
  assetId: z.string().uuid('Asset ID must be a valid UUID'),

  result: z.enum(['VERIFIED', 'MISSING', 'DAMAGED'], {
    required_error: 'Result is required',
    invalid_type_error: "Result must be 'VERIFIED', 'MISSING', or 'DAMAGED'",
  }),

  notes: z.string().optional(),
});

export type UpdateAuditItemDto = z.infer<typeof UpdateAuditItemDtoSchema>;

// ─── AuditFilterDto ───────────────────────────────────────────────────────────

export const AuditFilterDtoSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  auditorId: z.string().uuid('Invalid auditor ID').optional(),
});

export type AuditFilterDto = z.infer<typeof AuditFilterDtoSchema>;
