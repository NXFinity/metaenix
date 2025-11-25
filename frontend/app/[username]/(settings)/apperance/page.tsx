'use client';

import { useAuth } from '@/core/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/theme/ui/card';
import { Button } from '@/theme/ui/button';
import { Label } from '@/theme/ui/label';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemeToggle } from '@/theme/components/ThemeToggle';
import { Moon, Sun, Monitor, Palette, ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AppearancePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const primaryColorRef = useRef<string | null>(null);

  // Predefined color presets
  const colorPresets = [
    { name: 'Brand Orange', value: '#ff3c00', label: 'Default' },
    { name: 'Electric Green', value: '#08fa00', label: 'Green' },
    { name: 'Crimson', value: '#ff0d00', label: 'Red' },
    { name: 'Aqua', value: '#00fff2', label: 'Cyan' },
    { name: 'Sunshine', value: '#ffe600', label: 'Yellow' },
    { name: 'Royal Blue', value: '#0008ff', label: 'Blue' },
    { name: 'Violet', value: '#8800ff', label: 'Purple' },
    { name: 'Pink', value: '#ff00d4', label: 'Pink' },
  ];

  // Convert hex to OKLCH with proper light/dark mode adjustments
  const hexToOklch = (hex: string, isDark: boolean = false, isAccent: boolean = false): string => {
    const hexLower = hex.toLowerCase();
    
    // For brand orange #ff3c00, use the exact correct OKLCH value
    if (hexLower === '#ff3c00') {
      if (isAccent) {
        // Accent should be lighter than primary
        return isDark 
          ? 'oklch(0.8527 0.2654 33.88)'  // Dark mode accent: lighter
          : 'oklch(0.7527 0.2354 33.88)'; // Light mode accent: lighter
      }
      return isDark 
        ? 'oklch(0.7527 0.2654 33.88)'  // Dark mode: slightly brighter
        : 'oklch(0.6527 0.2354 33.88)'; // Light mode: exact brand orange
    }
    
    // For Royal Blue #0008ff, use the exact correct OKLCH value
    if (hexLower === '#0008ff') {
      if (isAccent) {
        // Accent should be lighter than primary
        return isDark 
          ? 'oklch(0.652 0.313214 264.052)'  // Dark mode accent: lighter
          : 'oklch(0.552 0.313214 264.052)'; // Light mode accent: lighter
      }
      return isDark 
        ? 'oklch(0.552 0.313214 264.052)'  // Dark mode: slightly brighter
        : 'oklch(0.452 0.313214 264.052)'; // Light mode: exact Royal Blue
    }
    
    // For Pink #ff00d4, use the exact correct OKLCH value
    if (hexLower === '#ff00d4') {
      if (isAccent) {
        // Accent should be lighter than primary
        return isDark 
          ? 'oklch(0.8784 0.296978 338.3272)'  // Dark mode accent: lighter
          : 'oklch(0.7784 0.296978 338.3272)'; // Light mode accent: lighter
      }
      return isDark 
        ? 'oklch(0.7784 0.296978 338.3272)'  // Dark mode: slightly brighter
        : 'oklch(0.6784 0.296978 338.3272)'; // Light mode: exact Pink
    }
    
    // Parse hex to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    // Convert RGB to Linear RGB
    const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const rL = toLinear(r);
    const gL = toLinear(g);
    const bL = toLinear(b);
    
    // Convert to XYZ (D65)
    const x = rL * 0.4124564 + gL * 0.3575761 + bL * 0.1804375;
    const y = rL * 0.2126729 + gL * 0.7151522 + bL * 0.0721750;
    const z = rL * 0.0193339 + gL * 0.1191920 + bL * 0.9503041;
    
    // Convert XYZ to OKLab
    const x1 = x / 0.95047;
    const z1 = z / 1.08883;
    
    const fx = x1 > 0.008856 ? Math.pow(x1, 1/3) : (7.787 * x1 + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z1 > 0.008856 ? Math.pow(z1, 1/3) : (7.787 * z1 + 16/116);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);
    
    // Convert to LCH
    const C = Math.sqrt(a * a + bLab * bLab);
    let h = Math.atan2(bLab, a) * (180 / Math.PI);
    if (h < 0) h += 360;
    
    // Convert to OKLCH (approximate)
    const lightness = L / 100;
    const chroma = C / 200;
    
    // Adjust for light/dark mode to ensure proper contrast
    // For accent colors, make them lighter (higher lightness value) for hover states
    // All colors should have lighter accents, not just specific ones
    const lightnessAdjustment = isAccent ? 0.10 : 0; // Accent should be noticeably lighter
    const chromaAdjustment = isAccent ? 0.02 : 0;
    
    const finalL = isDark 
      ? Math.min(0.85, Math.max(0.60, lightness + 0.10 + lightnessAdjustment))  // Brighter in dark mode, even brighter for accent
      : Math.max(0.55, Math.min(0.80, lightness + lightnessAdjustment)); // Lighter in light mode for accent
    
    const finalC = Math.max(0.15, Math.min(0.30, chroma + chromaAdjustment));
    
    return `oklch(${finalL.toFixed(4)} ${finalC.toFixed(4)} ${h.toFixed(2)})`;
  };

  // Apply primary color to the document
  const applyPrimaryColor = (color: string) => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    
    // Convert to OKLCH for both light and dark modes
    const lightOklch = hexToOklch(color, false);
    const darkOklch = hexToOklch(color, true);
    
    // Update CSS variables - inline styles have highest specificity
    root.style.setProperty('--primary', isDark ? darkOklch : lightOklch);
    root.style.setProperty('--ring', isDark ? darkOklch : lightOklch);
    root.style.setProperty('--sidebar-primary', isDark ? darkOklch : lightOklch);
    root.style.setProperty('--sidebar-ring', isDark ? darkOklch : lightOklch);
    
    // Update accent color to match primary (used in hover states)
    // Accent should be slightly lighter/more saturated than primary
    const accentLight = hexToOklch(color, false, true); // true = accent variant
    const accentDark = hexToOklch(color, true, true);
    root.style.setProperty('--accent', isDark ? accentDark : accentLight);
    
    // Also update chart colors to match
    root.style.setProperty('--chart-1', isDark ? darkOklch : lightOklch);
    root.style.setProperty('--chart-3', isDark ? darkOklch : lightOklch);
    
    // Store preference
    localStorage.setItem('enix-primary-color', color);
    
    // Force a reflow to ensure styles are applied
    void root.offsetHeight;
  };

  // Load saved color preference or use default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultColor = '#ff3c00'; // Brand Orange - default
      const validPresets = colorPresets.map(p => p.value);
      const savedColor = localStorage.getItem('enix-primary-color');
      
      // Force clear any invalid colors (including red #ff0d00, #ef4444, or any other invalid values)
      let colorToUse = defaultColor;
      if (savedColor && validPresets.includes(savedColor.toLowerCase())) {
        colorToUse = savedColor.toLowerCase();
      } else {
        // Clear invalid color and force default
        localStorage.setItem('enix-primary-color', defaultColor);
        colorToUse = defaultColor;
      }
      
      setPrimaryColor(colorToUse);
      primaryColorRef.current = colorToUse;
      // Apply immediately on load - force apply brand orange
      applyPrimaryColor(colorToUse);
      
      // Double-check after a brief delay to ensure it's applied
      setTimeout(() => {
        applyPrimaryColor(colorToUse);
      }, 100);
      
      // Also apply on theme change to ensure it sticks
      const observer = new MutationObserver(() => {
        // Get the current color from ref or localStorage
        const currentColor = primaryColorRef.current || localStorage.getItem('enix-primary-color') || defaultColor;
        applyPrimaryColor(currentColor);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      return () => observer.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply color when it changes or theme changes
  useEffect(() => {
    if (primaryColor && typeof window !== 'undefined') {
      applyPrimaryColor(primaryColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryColor, resolvedTheme]);

  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    primaryColorRef.current = color;
    applyPrimaryColor(color);
    setNotification({ type: 'success', message: 'Color preference saved' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setNotification({ type: 'success', message: 'Theme preference saved' });
    setTimeout(() => setNotification(null), 3000);
  };

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Require authentication - redirect if not authenticated
  if (!isInitializing && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // If authenticated but wrong user, redirect to their own appearance page
  if (!isInitializing && isAuthenticated && user && user.username !== username) {
    router.push(`/${user.username}/apperance`);
    return null;
  }

  // Show loading if still initializing or user doesn't match
  if (isInitializing || !user || user.username !== username) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${username}/settings`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </Button>
        </div>

        <div className="mb-8 space-y-2">
          <h1 className="h1">
            Appearance Settings
          </h1>
          <p className="text-lead">
            Customize the look and feel of your interface
          </p>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              notification.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 leading-none">
                <Moon className="h-5 w-5 flex-shrink-0" />
                <span>Theme</span>
              </CardTitle>
              <CardDescription>
                Choose your preferred color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Color Scheme</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      "hover:shadow-md hover:scale-[1.02]",
                      theme === 'light'
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        theme === 'light' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Sun className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">Light</div>
                        <div className="text-xs text-muted-foreground">Bright and clean</div>
                      </div>
                      {theme === 'light' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs text-primary-foreground">✓</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      "hover:shadow-md hover:scale-[1.02]",
                      theme === 'dark'
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        theme === 'dark' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Moon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">Dark</div>
                        <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                      </div>
                      {theme === 'dark' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs text-primary-foreground">✓</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange('system')}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      "hover:shadow-md hover:scale-[1.02]",
                      theme === 'system'
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        theme === 'system' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">System</div>
                        <div className="text-xs text-muted-foreground">Follows OS setting</div>
                      </div>
                      {theme === 'system' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs text-primary-foreground">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  Current theme: <span className="font-medium capitalize text-foreground">{resolvedTheme}</span>
                  {theme === 'system' && ' (following system preference)'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Color Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 leading-none">
                <Palette className="h-5 w-5 flex-shrink-0" />
                <span>Colors</span>
              </CardTitle>
              <CardDescription>
                Customize the primary color used throughout the interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Color Presets */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Color Presets</Label>
                <div className="grid grid-cols-4 gap-4">
                  {colorPresets.map((preset) => (
                    <div key={preset.value} className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => handleColorChange(preset.value)}
                        className={cn(
                          "relative aspect-square w-full rounded-xl border-2 transition-all duration-200",
                          "hover:shadow-lg",
                          primaryColor === preset.value
                            ? "border-primary ring-4 ring-primary/20 shadow-lg"
                            : "border-border hover:border-primary/50"
                        )}
                        style={{ backgroundColor: preset.value }}
                        aria-label={`Select ${preset.name} color`}
                        title={preset.name}
                      >
                        {primaryColor === preset.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-white/95 dark:bg-black/80 shadow-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-foreground">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                      <span className="text-sm font-medium text-center text-foreground">
                        {preset.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

