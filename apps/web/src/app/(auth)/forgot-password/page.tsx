'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Box, Lock, Mail, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RequestOtpForm = z.infer<typeof requestOtpSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<RequestOtpForm>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', password: '' },
  });

  const onRequestOtp = async (data: RequestOtpForm) => {
    setError(null);
    try {
      await api.post('/auth/forgot-password', data);
      setEmail(data.email);
      setStep(2);
      toast.success('OTP sent! Check the console.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const onResetPassword = async (data: ResetPasswordForm) => {
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: data.otp,
        password: data.password,
      });
      toast.success('Password reset successfully!');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/login" className="flex items-center gap-2 text-primary">
            <Box size={40} className="stroke-[1.5]" />
            <h1 className="text-3xl font-bold tracking-tight">AssetFlow</h1>
          </Link>
        </div>

        <Card className="shadow-lg border-0 ring-1 ring-black/5 dark:ring-white/10">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {step === 1 ? 'Reset Password' : 'Enter OTP'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'Enter your email to receive a reset OTP' 
                : `Enter the 6-digit OTP sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={requestForm.handleSubmit(onRequestOtp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input 
                      id="email" 
                      placeholder="admin@assetflow.com" 
                      {...requestForm.register('email')} 
                    />
                    <Mail className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  {requestForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{requestForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={requestForm.formState.isSubmitting}
                >
                  {requestForm.formState.isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">6-Digit OTP</Label>
                  <div className="relative">
                    <Input 
                      id="otp" 
                      placeholder="123456" 
                      maxLength={6}
                      {...resetForm.register('otp')} 
                    />
                    <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  {resetForm.formState.errors.otp && (
                    <p className="text-sm text-red-500">{resetForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="new-password"
                      type="password" 
                      placeholder="••••••••" 
                      {...resetForm.register('password')} 
                    />
                    <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  
                  {/* Password Validation Checklist */}
                  <div className="pt-1 text-sm space-y-1">
                    <p className="text-gray-500 mb-1">Password must contain:</p>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${resetForm.watch('password')?.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={resetForm.watch('password')?.length >= 8 ? 'text-green-600' : 'text-gray-500'}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(resetForm.watch('password') || '') ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={/[A-Z]/.test(resetForm.watch('password') || '') ? 'text-green-600' : 'text-gray-500'}>One uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(resetForm.watch('password') || '') ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={/[0-9]/.test(resetForm.watch('password') || '') ? 'text-green-600' : 'text-gray-500'}>One number</span>
                    </div>
                  </div>

                  {resetForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{resetForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={resetForm.formState.isSubmitting}
                >
                  {resetForm.formState.isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="text-sm text-center text-gray-500 justify-center">
            <Link href="/login" className="hover:text-primary transition-colors">
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
