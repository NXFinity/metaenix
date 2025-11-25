'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/core/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/theme/ui/button';
import { Input } from '@/theme/ui/input';
import { Label } from '@/theme/ui/label';
import { Checkbox } from '@/theme/ui/checkbox';
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

// Login form schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    login,
    isLoggingIn,
    loginError,
    requiresTwoFactor,
    isAuthenticated,
    user,
    verifyLogin2faAsync,
    verify2faError,
  } = useAuth();
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2fa, setIsVerifying2fa] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Don't redirect - let authenticated users view login page if they want

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // Only send email and password to backend (rememberMe is frontend-only)
      await login({
        email: data.email,
        password: data.password,
      });
      // If 2FA is required, login mutation will handle it
      // Otherwise, redirect happens in useAuth hook
    } catch (error) {
      // Error handled by useAuth hook
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      return;
    }

    setIsVerifying2fa(true);
    try {
      await verifyLogin2faAsync({
        email: form.getValues('email'),
        code: twoFactorCode,
      });
      // Redirect happens in useAuth hook
    } catch (error) {
      // Error handled by useAuth hook
    } finally {
      setIsVerifying2fa(false);
    }
  };

  // Show 2FA form if required
  if (requiresTwoFactor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-base">
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <form onSubmit={handle2faSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={10}
                  disabled={isVerifying2fa}
                  autoFocus
                  className="h-12 text-center text-2xl tracking-widest font-mono"
                />
              </div>
              {(verify2faError || loginError) && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {verify2faError instanceof Error
                      ? verify2faError.message
                      : loginError instanceof Error
                        ? loginError.message
                        : 'Invalid verification code'}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-6">
              <Button
                type="submit"
                className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white"
                disabled={isVerifying2fa || twoFactorCode.length < 6}
              >
                {isVerifying2fa ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset();
                  setTwoFactorCode('');
                  window.location.reload();
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
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
              style={{ width: 'auto' }}
              priority
            />
          </Link>
          <p className="text-muted-foreground text-sm">
            Welcome back! Sign in to continue
          </p>
        </div>

        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          disabled={isLoggingIn}
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="text-sm font-medium">Password</FormLabel>
                        <Link
                          href="/reset"
                          className="text-sm text-[#ff3c00] hover:text-[#ff4d1a] hover:underline font-medium transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoggingIn}
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
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoggingIn}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Remember me
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {loginError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {loginError instanceof Error
                        ? loginError.message
                        : 'Invalid email or password'}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white text-base font-medium shadow-lg hover:shadow-xl transition-all"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
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
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    className="text-[#ff3c00] hover:text-[#ff4d1a] font-medium hover:underline transition-colors"
                  >
                    Create an account
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
