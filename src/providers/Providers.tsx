'use client';

import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';
import { ThemeProviderEnhanced } from '@/lib/theme/ThemeContextEnhanced';
import { RouteThemeProvider } from '@/components/theme/RouteThemeProvider';
import { QueryProvider } from '@/lib/query';

/**
 * Inner provider that has access to auth context
 */
function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  // Only use auth context if Firebase is configured
  let userId: string | null = null;
  let enableSync = false;

  try {
    const { user } = useAuth();
    userId = user?.uid || null;
    enableSync = !!user;
  } catch {
    // useAuth not available (no AuthProvider wrapper)
  }
  
  return (
    <ThemeProviderEnhanced 
      userId={userId}
      defaultTheme="dark"
      enableSync={enableSync}
    >
      <RouteThemeProvider />
      {children}
    </ThemeProviderEnhanced>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {auth ? (
        <AuthProvider>
          <ThemeProviderWrapper>
            {children}
          </ThemeProviderWrapper>
        </AuthProvider>
      ) : (
        <ThemeProviderEnhanced 
          userId={null}
          defaultTheme="dark"
          enableSync={false}
        >
          <RouteThemeProvider />
          {children}
          <div className="fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm z-[9999]">
            ⚠️ Firebase not configured. Add environment variables to enable auth.
          </div>
        </ThemeProviderEnhanced>
      )}
    </QueryProvider>
  );
}
