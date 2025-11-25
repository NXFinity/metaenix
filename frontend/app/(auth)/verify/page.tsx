'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const { verifyEmail, isVerifyingEmail, verifyEmailError, resendVerifyEmail, isResendingVerifyEmail } =
    useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [resendEmail, setResendEmail] = useState(email || '');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResent, setIsResent] = useState(false);

  // Auto-verify if token is in URL
  useEffect(() => {
    if (token && !isSuccess && !isVerifyingEmail) {
      handleVerify(token);
    }
  }, [token]);

  // Sync resendEmail when email from URL changes
  useEffect(() => {
    if (email) {
      setResendEmail(email);
    }
  }, [email]);

  const handleVerify = async (verifyToken?: string) => {
    const tokenToUse = verifyToken || verificationCode;
    if (!tokenToUse) return;

    try {
      await verifyEmail({ token: tokenToUse });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      // Error handled by useAuth hook
    }
  };

  const handleResend = async () => {
    const emailToUse = email || resendEmail;
    if (!emailToUse) {
      return;
    }

    try {
      await resendVerifyEmail({ email: emailToUse });
      setIsResent(true);
      // Clear the resend success message after 5 seconds
      setTimeout(() => setIsResent(false), 5000);
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
            <CardTitle className="text-2xl font-bold">Email Verified</CardTitle>
            <CardDescription className="text-base">
              Your email has been successfully verified. Redirecting to login...
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
              style={{ width: 'auto' }}
              priority
            />
          </Link>
          <p className="text-muted-foreground text-sm">
            Verify your email address to continue
          </p>
        </div>

        <Card className="border-2 shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              {email
                ? `We've sent a verification link to ${email}. Enter the code below or click the link in your email.`
                : 'Enter the verification code sent to your email address'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isVerifyingEmail}
                className="h-11"
              />
            </div>
            {verifyEmailError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {verifyEmailError instanceof Error
                    ? verifyEmailError.message
                    : 'Invalid or expired verification code'}
                </p>
              </div>
            )}
            {isResent && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Verification email has been resent. Please check your email.
                </p>
              </div>
            )}
            {!email && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label htmlFor="resend-email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={isResendingVerifyEmail}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your email to resend the verification code
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pt-6">
            <Button
              onClick={() => handleVerify()}
              className="w-full h-11 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white"
              disabled={isVerifyingEmail || !verificationCode}
            >
              {isVerifyingEmail ? (
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
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </Button>
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={isResendingVerifyEmail || (!email && !resendEmail)}
            >
              {isResendingVerifyEmail ? (
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
                  Resending...
                </span>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already verified?{' '}
              <Link
                href="/login"
                className="text-[#ff3c00] hover:text-[#ff4d1a] font-medium hover:underline transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
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
