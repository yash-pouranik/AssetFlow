import { z } from 'zod';
import { MaintenancePriority, MaintenanceStatus, AssetCondition } from '@prisma/client';

// ─── Create Maintenance Request ───────────────────────────────────────────────

export const CreateMaintenanceDto = z.object({
  assetId: z.string().uuid({ message: 'assetId must be a valid UUID' }),

  issue: z
    .string()
    .trim()
    .min(10, { message: 'Issue description must be at least 10 characters' }),

  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
});

export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceDto>;

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export const ApproveMaintenanceDto = z.object({
  approved: z.boolean({ required_error: 'approved field is required' }),

  notes: z.string().trim().optional(),

  /** Optionally assign a technician immediately on approval */
  technicianId: z.string().uuid().optional(),
});

export type ApproveMaintenanceInput = z.infer<typeof ApproveMaintenanceDto>;

// ─── Assign Technician ────────────────────────────────────────────────────────

export const AssignTechnicianDto = z.object({
  technicianId: z.string().uuid({ message: 'technicianId must be a valid UUID' }),
});

export type AssignTechnicianInput = z.infer<typeof AssignTechnicianDto>;

// ─── Resolve Request ──────────────────────────────────────────────────────────

export const ResolveMaintenanceDto = z.object({
  resolution: z
    .string()
    .trim()
    .min(10, { message: 'Resolution description must be at least 10 characters' }),

  condition: z.nativeEnum(AssetCondition).optional(),
});

export type ResolveMaintenanceInput = z.infer<typeof ResolveMaintenanceDto>;

// ─── Filter ───────────────────────────────────────────────────────────────────

export const MaintenanceFilterDto = z.object({
  assetId: z.string().uuid().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
});

export type MaintenanceFilterInput = z.infer<typeof MaintenanceFilterDto>;
