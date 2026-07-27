'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {auth ? (
        <AuthProvider>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      ) : (
        <>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
          <div className="fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm">
            ⚠️ Firebase not configured. Add environment variables to enable auth.
          </div>
        </>
      )}
    </QueryClientProvider>
  );
}
