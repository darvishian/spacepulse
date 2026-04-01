/**
 * Root providers wrapper for the entire application
 * TODO: Wrap with Context providers, Query client, Theme provider, etc.
 */

'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevent refetch storms on tab switch
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
