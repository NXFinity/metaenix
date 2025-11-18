'use client';

import { MainLayout } from '@/theme/layout/MainLayout';
import Link from 'next/link';
import { Button } from '@/theme/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import {
  ImageIcon,
  UsersIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  CodeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  ZapIcon,
  GlobeIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

// Scroll-triggered animation hook
function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const statsRef = useScrollAnimation();
  const featuresRef = useScrollAnimation();
  const howItWorksRef = useScrollAnimation();
  const keyFeaturesRef = useScrollAnimation();
  const ctaRef = useScrollAnimation();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 30,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 30,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Hero Section - Full Viewport */}
      <section 
        ref={heroRef}
        className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/20"
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#ff3c00]/10 rounded-full blur-3xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
            }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#ff3c00]/5 rounded-full blur-3xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(${-mousePosition.x * 0.2}px, ${-mousePosition.y * 0.2}px)`,
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff3c00]/10 border border-[#ff3c00]/20 text-[#ff3c00] text-sm font-medium backdrop-blur-sm">
              <SparklesIcon className="h-4 w-4" />
              <span>Join the Creator Revolution</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight">
                <span className="inline-block">Create.</span>{' '}
                <span className="inline-block">Share.</span>{' '}
                <span className="inline-block bg-gradient-to-r from-[#ff3c00] via-[#ff6c33] to-[#ff3c00] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Grow.
                </span>
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
                Meta EN|IX is the platform where creators share their work, build their audience, and connect with their community.
              </p>
              <p className="text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto">
                Share your content. Build your following. Engage with your audience.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                asChild
              >
                <Link href="/register" className="flex items-center gap-2 relative z-10">
                  <span className="relative z-10">Get Started Free</span>
                  <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 border-2 hover:bg-muted transition-all duration-300 hover:border-[#ff3c00]/50"
                asChild
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              {[
                { icon: CheckCircleIcon, text: 'Free Forever' },
                { icon: CheckCircleIcon, text: 'No Credit Card' },
                { icon: CheckCircleIcon, text: 'Enterprise Security' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
                >
                  <item.icon className="h-5 w-5 text-[#ff3c00]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Features Section - Full Viewport */}
      <section 
        ref={featuresRef.ref as React.RefObject<HTMLElement>}
        className={`relative h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/10 transition-opacity duration-1000 ${featuresRef.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
              Everything You Need to{' '}
              <span className="text-[#ff3c00]">Succeed</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for creators who want to share, engage, and grow
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ImageIcon, title: 'Share Your Content', desc: 'Post text, images, videos, and documents. Schedule posts, organize with collections, and reach your audience with powerful content tools.' },
              { icon: UsersIcon, title: 'Build Your Audience', desc: 'Grow your following, connect with fans, and build a community around your work. Real-time analytics help you understand your audience.' },
              { icon: MessageCircleIcon, title: 'Engage & Interact', desc: 'Comments, reactions, shares, and bookmarks. Real-time notifications and WebSocket support keep you connected with your community.' },
              { icon: ShieldCheckIcon, title: 'Privacy Control', desc: 'Control who sees your content with privacy settings, follower-only posts, and subscriber options. Two-factor authentication keeps your account secure.' },
              { icon: TrendingUpIcon, title: 'Analytics & Insights', desc: 'Track your post performance, audience growth, and engagement metrics. Detailed analytics help you understand what works and optimize your strategy.' },
              { icon: CodeIcon, title: 'Developer Tools', desc: 'Build apps and integrations with our OAuth 2.0 API. Create custom experiences for your audience with comprehensive developer documentation.' },
            ].map((feature, i) => (
              <Card 
                key={i}
                className={`border-2 hover:border-[#ff3c00]/50 transition-all duration-500 hover:shadow-2xl group cursor-pointer relative overflow-hidden ${featuresRef.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardHeader className="space-y-4 relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff3c00]/10 to-[#ff3c00]/5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <feature.icon className="h-7 w-7 text-[#ff3c00] transition-transform duration-500" />
                  </div>
                  <CardTitle className="text-2xl group-hover:text-[#ff3c00] transition-colors duration-300">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Full Viewport */}
      <section 
        ref={howItWorksRef.ref as React.RefObject<HTMLElement>}
        className={`relative h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 border-y border-border bg-background transition-opacity duration-1000 ${howItWorksRef.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
              How It <span className="text-[#ff3c00]">Works</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and start building your community today
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { num: 1, title: 'Create Your Account', desc: 'Sign up in seconds with just your email. No credit card required. Start building your profile and customize it to reflect your brand.' },
              { num: 2, title: 'Share Your Content', desc: 'Post your work, share your thoughts, and engage with your audience. Use our powerful tools to schedule posts and organize your content.' },
              { num: 3, title: 'Grow Your Community', desc: 'Connect with like-minded creators, build your following, and watch your community grow. Use analytics to understand what resonates.' },
            ].map((step, i) => (
              <div 
                key={i}
                className={`text-center space-y-4 group transition-all duration-700 ${howItWorksRef.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#ff3c00] to-[#ff6c33] text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-all duration-500 relative">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-[#ff3c00] transition-colors duration-300">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Highlight - Full Viewport */}
      <section 
        ref={keyFeaturesRef.ref as React.RefObject<HTMLElement>}
        className={`relative h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-muted/20 via-background to-muted/20 transition-opacity duration-1000 ${keyFeaturesRef.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff3c00]/10 border border-[#ff3c00]/20 text-[#ff3c00] text-sm font-medium w-fit">
                <ZapIcon className="h-4 w-4" />
                <span>Powerful Features</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                Built for <span className="text-[#ff3c00]">Creators</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Everything you need to succeed as a creator, all in one platform. From content creation to community building, we've got you covered.
              </p>
              <div className="space-y-4 pt-4">
                {[
                  { title: 'Real-time Engagement', desc: 'WebSocket support for instant notifications and live interactions' },
                  { title: 'Advanced Analytics', desc: 'Track your growth with detailed insights and performance metrics' },
                  { title: 'Enterprise Security', desc: 'Two-factor authentication, OAuth 2.0, and role-based access control' },
                  { title: 'Developer API', desc: 'Build custom integrations with our comprehensive OAuth 2.0 API' },
                ].map((feature, i) => (
                  <div 
                    key={i}
                    className={`flex items-start gap-3 group transition-all duration-500 hover:translate-x-2 ${keyFeaturesRef.isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#ff3c00]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircleIcon className="h-4 w-4 text-[#ff3c00]" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-[#ff3c00] transition-colors duration-300">{feature.title}</div>
                      <div className="text-sm text-muted-foreground">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: HeartIcon, title: 'Likes & Reactions', desc: 'Engage with content' },
                { icon: ShareIcon, title: 'Share & Repost', desc: 'Spread your content' },
                { icon: BookmarkIcon, title: 'Bookmarks', desc: 'Save for later' },
                { icon: GlobeIcon, title: 'Public & Private', desc: 'Control visibility' },
              ].map((item, i) => (
                <Card 
                  key={i}
                  className={`p-6 border-2 hover:border-[#ff3c00]/50 transition-all duration-500 hover:shadow-xl group cursor-pointer relative overflow-hidden ${keyFeaturesRef.isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff3c00]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex flex-col items-center text-center space-y-3 relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-[#ff3c00]/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <item.icon className="h-6 w-6 text-[#ff3c00] transition-transform duration-500" />
                    </div>
                    <div className="font-semibold text-foreground group-hover:text-[#ff3c00] transition-colors duration-300">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Full Viewport */}
      <section 
        ref={ctaRef.ref as React.RefObject<HTMLElement>}
        className={`relative h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 border-t border-border bg-gradient-to-br from-[#ff3c00]/5 via-background to-background transition-opacity duration-1000 ${ctaRef.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-4xl mx-auto text-center space-y-8 w-full">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
              Ready to Start{' '}
              <span className="text-[#ff3c00]">Creating?</span>
            </h2>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of creators sharing their work and building their communities on Meta EN|IX.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-[#ff3c00] hover:bg-[#ff4d1a] text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
              asChild
            >
              <Link href="/register" className="flex items-center gap-2 relative z-10">
                <span className="relative z-10">Create Your Account</span>
                <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-6 border-2 hover:bg-muted transition-all duration-300 hover:border-[#ff3c00]/50"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          <div className="pt-8 text-sm text-muted-foreground flex items-center justify-center gap-6 flex-wrap">
            {['Free forever', 'No credit card required', 'Enterprise security'].map((text, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
              >
                <CheckCircleIcon className="h-4 w-4 text-[#ff3c00]" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
