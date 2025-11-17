'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/core/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/theme/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/theme/ui/form';

// Password reset form schema
const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, isResettingPassword, resetPasswordError } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      form.setError('root', {
        message: 'Reset token is missing. Please use the link from your email.',
      });
      return;
    }

    try {
      await resetPassword({
        token,
        newPassword: data.password,
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      // Error handled by useAuth hook
    }
  };

  // If no token, show forgot password form
  if (!token) {
    return <ForgotPasswordForm />;
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/5 via-transparent to-transparent pointer-events-none" />
        <Card className="w-full max-w-md relative z-10 border-2 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
            <CardDescription className="text-base">
              Your password has been reset. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/logos/logo.png"
              alt="Meta EN|IX"
              width={180}
              height={60}
              className="h-12 w-auto mx-auto"
              priority
            />
          </Link>
          <p className="text-muted-foreground text-sm">
            Enter your new password below
          </p>
        </div>

        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Create a new password for your account
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isResettingPassword}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isResettingPassword}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {resetPasswordError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {resetPasswordError instanceof Error
                        ? resetPasswordError.message
                        : 'Invalid or expired reset token'}
                    </p>
                  </div>
                )}
                {form.formState.errors.root && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {form.formState.errors.root.message}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white text-base font-medium shadow-lg hover:shadow-xl transition-all"
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Resetting password...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link
                    href="/login"
                    className="text-[#ff3c00] hover:text-[#ff4d1a] font-medium hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Forgot Password Form Component
function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPassword, isSendingForgotPassword, forgotPasswordError } =
    useAuth();
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await forgotPassword({ email });
      setIsSuccess(true);
    } catch (error) {
      // Error handled by useAuth hook
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/5 via-transparent to-transparent pointer-events-none" />
        <Card className="w-full max-w-md relative z-10 border-2 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#ff3c00]/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-[#ff3c00]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              If an account with that email exists, a password reset link has been sent.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white"
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/logos/logo.png"
              alt="Meta EN|IX"
              width={180}
              height={60}
              className="h-12 w-auto mx-auto"
              priority
            />
          </Link>
          <p className="text-muted-foreground text-sm">
            Reset your password
          </p>
        </div>

        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSendingForgotPassword}
                  required
                  className="h-11"
                />
              </div>
              {forgotPasswordError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {forgotPasswordError instanceof Error
                      ? forgotPasswordError.message
                      : 'Failed to send reset email'}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button
                type="submit"
                className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white text-base font-medium shadow-lg hover:shadow-xl transition-all"
                disabled={isSendingForgotPassword || !email}
              >
                {isSendingForgotPassword ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="text-[#ff3c00] hover:text-[#ff4d1a] font-medium hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
