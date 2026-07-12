import { z } from 'zod';

// ---------------------------------------------------------------------------
// CreateAllocationDto
// ---------------------------------------------------------------------------
export const CreateAllocationDto = z
  .object({
    assetId: z.string().uuid({ message: 'assetId must be a valid UUID' }),
    userId: z
      .string()
      .uuid({ message: 'userId must be a valid UUID' })
      .optional(),
    departmentId: z
      .string()
      .uuid({ message: 'departmentId must be a valid UUID' })
      .optional(),
    expectedReturn: z.coerce
      .date({ invalid_type_error: 'expectedReturn must be a valid date string' })
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.userId !== undefined || data.departmentId !== undefined, {
    message: 'At least one of userId or departmentId must be provided',
    path: ['userId'],
  });

export type CreateAllocationInput = z.infer<typeof CreateAllocationDto>;

// ---------------------------------------------------------------------------
// ReturnAssetDto
// ---------------------------------------------------------------------------
export const AssetConditionEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], {
  errorMap: () => ({
    message: 'condition must be one of EXCELLENT, GOOD, FAIR, POOR, DAMAGED',
  }),
});

export const ReturnAssetDto = z.object({
  conditionNote: z.string().trim().max(1000).optional(),
  condition: AssetConditionEnum.optional(),
});

export type ReturnAssetInput = z.infer<typeof ReturnAssetDto>;

// ---------------------------------------------------------------------------
// CreateTransferDto
// ---------------------------------------------------------------------------
export const CreateTransferDto = z
  .object({
    allocationId: z.string().uuid({ message: 'allocationId must be a valid UUID' }),
    targetUserId: z
      .string()
      .uuid({ message: 'targetUserId must be a valid UUID' })
      .optional(),
    targetDeptId: z
      .string()
      .uuid({ message: 'targetDeptId must be a valid UUID' })
      .optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => data.targetUserId !== undefined || data.targetDeptId !== undefined,
    {
      message: 'At least one of targetUserId or targetDeptId must be provided',
      path: ['targetUserId'],
    },
  );

export type CreateTransferInput = z.infer<typeof CreateTransferDto>;

// ---------------------------------------------------------------------------
// ApproveTransferDto
// ---------------------------------------------------------------------------
export const ApproveTransferDto = z.object({
  approved: z.boolean({ required_error: 'approved (boolean) is required' }),
  notes: z.string().trim().max(1000).optional(),
});

export type ApproveTransferInput = z.infer<typeof ApproveTransferDto>;
