import { z } from 'zod';

export const CreateDepartmentDto = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  parentId: z.string().uuid('Invalid parent department ID').optional(),
  headId: z.string().uuid('Invalid head user ID').optional(),
});

export const UpdateDepartmentDto = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  parentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  headId: z.string().uuid('Invalid head user ID').optional().nullable(),
});

export const AssignHeadDto = z.object({
  headId: z.string().uuid('Invalid head user ID'),
});

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentDto>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentDto>;
export type AssignHeadInput = z.infer<typeof AssignHeadDto>;
