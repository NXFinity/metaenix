'use client';

import { MainLayout } from '@/theme/layout/MainLayout';
import Link from 'next/link';
import { Button } from '@/theme/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';

export default function Home() {
  // Homepage is public - everyone can view it
  // No redirects, no blocking - just show the homepage

  return (
    <MainLayout showFooter={true}>
      {/* Hero Section - Full Height */}
      <section className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-bold text-foreground leading-tight">
              Create. Share.{' '}
              <span className="text-[#ff3c00] bg-gradient-to-r from-[#ff3c00] to-[#ff6c33] bg-clip-text text-transparent">
                Grow.
              </span>
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
              Meta EN|IX is the platform where creators share their work, build their audience, and connect with their community.
            </p>
            <p className="text-xl text-muted-foreground/80">
              Share your content. Build your following. Engage with your audience.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row justify-center pt-8">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white border-0 shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <Link href="/register">Start Creating</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-6 border-2 hover:bg-muted transition-all"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section - Full Height */}
      <section className="min-h-screen py-20 px-4 border-t border-border bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground">
              Everything You Need to{' '}
              <span className="text-[#ff3c00]">Succeed</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for creators who want to share, engage, and grow
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Share Your Content</CardTitle>
                <CardDescription className="text-base">
                  Post text, images, videos, and documents. Schedule posts, organize with collections, and reach your audience.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Build Your Audience</CardTitle>
                <CardDescription className="text-base">
                  Grow your following, connect with fans, and build a community around your work.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Engage & Interact</CardTitle>
                <CardDescription className="text-base">
                  Comments, reactions, shares, and bookmarks. Real-time notifications keep you connected.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Privacy Control</CardTitle>
                <CardDescription className="text-base">
                  Control who sees your content with privacy settings, follower-only posts, and subscriber options.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Analytics & Insights</CardTitle>
                <CardDescription className="text-base">
                  Track your post performance, audience growth, and engagement metrics to understand what works.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-[#ff3c00]/50 transition-all hover:shadow-lg group">
              <CardHeader className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:bg-[#ff3c00]/20 transition-colors">
                  <svg className="w-6 h-6 text-[#ff3c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <CardTitle className="text-2xl">Developer Tools</CardTitle>
                <CardDescription className="text-base">
                  Build apps and integrations with our OAuth 2.0 API. Create custom experiences for your audience.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Full Height */}
      <section className="min-h-[80vh] flex items-center justify-center py-20 px-4 border-t border-border bg-gradient-to-br from-[#ff3c00]/5 via-background to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff3c00]/10 via-transparent to-[#ff3c00]/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Card className="border-2 border-[#ff3c00]/30 bg-background/95 backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-6 p-12">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Ready to Start{' '}
                <span className="text-[#ff3c00]">Creating?</span>
              </h2>
              <CardDescription className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of creators sharing their work and building their communities on Meta EN|IX.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <div className="flex flex-col gap-4 sm:flex-row justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-12 py-6 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white border-0 shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href="/register">Create Your Account</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-12 py-6 border-2 hover:bg-muted transition-all"
                  asChild
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
