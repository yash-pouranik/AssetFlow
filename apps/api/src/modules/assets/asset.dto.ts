import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const AssetConditionEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
export const AssetStatusEnum = z.enum([
  'AVAILABLE',
  'ALLOCATED',
  'UNDER_MAINTENANCE',
  'RETIRED',
  'LOST',
  'STOLEN',
  'DISPOSED',
]);

// ─── CreateAssetDto ───────────────────────────────────────────────────────────

export const CreateAssetDto = z.object({
  name: z
    .string({ required_error: 'Asset name is required' })
    .min(2, 'Asset name must be at least 2 characters'),

  categoryId: z
    .string({ required_error: 'Category ID is required' })
    .uuid('Category ID must be a valid UUID'),

  serialNumber: z.string().optional(),

  condition: AssetConditionEnum.default('GOOD'),

  location: z.string().optional(),

  isBookable: z.boolean().default(false),

  acquisitionDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),

  acquisitionCost: z
    .number()
    .positive('Acquisition cost must be a positive number')
    .optional(),

  departmentId: z.string().uuid('Department ID must be a valid UUID').optional(),

  notes: z.string().optional(),
});

export type CreateAssetDto = z.infer<typeof CreateAssetDto>;

// ─── UpdateAssetDto ───────────────────────────────────────────────────────────

export const UpdateAssetDto = z.object({
  name: z.string().min(2, 'Asset name must be at least 2 characters').optional(),

  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),

  serialNumber: z.string().optional().nullable(),

  condition: AssetConditionEnum.optional(),

  status: AssetStatusEnum.optional(),

  location: z.string().optional().nullable(),

  isBookable: z.boolean().optional(),

  acquisitionDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),

  acquisitionCost: z
    .number()
    .positive('Acquisition cost must be a positive number')
    .optional()
    .nullable(),

  departmentId: z.string().uuid('Department ID must be a valid UUID').optional().nullable(),

  notes: z.string().optional().nullable(),
});

export type UpdateAssetDto = z.infer<typeof UpdateAssetDto>;

// ─── AssetStatusPatchDto ──────────────────────────────────────────────────────

export const AssetStatusPatchDto = z.object({
  status: AssetStatusEnum,
  notes: z.string().optional(),
});

export type AssetStatusPatchDto = z.infer<typeof AssetStatusPatchDto>;

// ─── AssetSearchDto ───────────────────────────────────────────────────────────

export const AssetSearchDto = z.object({
  tag: z.string().optional(),
  serialNumber: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: AssetStatusEnum.optional(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  /** Free-text search across asset name and asset tag */
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type AssetSearchDto = z.infer<typeof AssetSearchDto>;
