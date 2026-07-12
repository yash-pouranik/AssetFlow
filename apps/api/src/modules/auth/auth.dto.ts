import { z } from 'zod';

export const SignupDto = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().optional(),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ForgotPasswordDto = z.object({
  email: z.string().email(),
});

export const ResetPasswordDto = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
});

export const PromoteRoleDto = z.object({
  role: z.enum(['ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']),
});

export type SignupInput = z.infer<typeof SignupDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
export type PromoteRoleInput = z.infer<typeof PromoteRoleDto>;
