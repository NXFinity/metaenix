'use client';

import { Header } from './assets/header';
import { Footer } from './assets/footer';

interface MainLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showSidebars?: boolean;
}

export function MainLayout({
  children,
  showHeader = true,
  showFooter = true,
  showSidebars = false,
}: MainLayoutProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {showHeader && <Header />}
      <main className="flex flex-1 flex-col overflow-auto">
        {showSidebars ? (
          <div className="flex flex-1 gap-4 px-4 py-6 overflow-hidden">
            {/* Left Sidebar - can be added later */}
            <div className="hidden lg:block lg:w-64 overflow-auto">
              {/* Left sidebar content */}
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-auto">{children}</div>
            
            {/* Right Sidebar - can be added later */}
            <div className="hidden xl:block xl:w-64 overflow-auto">
              {/* Right sidebar content */}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">{children}</div>
        )}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

