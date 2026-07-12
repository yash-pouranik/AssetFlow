import { z } from 'zod';

export const UpdateEmployeeDto = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().nullable(),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const UpdateEmployeeStatusDto = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export interface EmployeeFilters {
  role?: string;
  status?: string;
  departmentId?: string;
}

export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeDto>;
export type UpdateEmployeeStatusInput = z.infer<typeof UpdateEmployeeStatusDto>;
