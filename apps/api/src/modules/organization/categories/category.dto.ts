import { z } from 'zod';

export const CreateCategoryDto = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
  extraFields: z.record(z.unknown()).optional(),
});

export const UpdateCategoryDto = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
  extraFields: z.record(z.unknown()).optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryDto>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryDto>;
