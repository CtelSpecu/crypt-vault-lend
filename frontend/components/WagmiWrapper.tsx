"use client";

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type Config } from 'wagmi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

interface WagmiWrapperProps {
  children: ReactNode;
}

export function WagmiWrapper({ children }: WagmiWrapperProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only load config on client side
    import('../config/wagmi-client')
      .then((module) => {
        if (!module.isWalletConnectReady) {
          setErrorMessage(
            'WalletConnect project ID missing. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local before running the app.'
          );
          return;
        }
        const cfg = module.createWagmiConfig();
        setConfig(cfg);
      })
      .catch((error) => {
        console.error('Failed to load wagmi config', error);
        setErrorMessage((error as Error).message || 'Failed to load wallet configuration.');
      })
      .finally(() => setMounted(true));
  }, []);

  // Avoid rendering children until Wagmi is ready to prevent hooks from running outside provider
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Initializing wallet providers...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Wallet configuration required</p>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <div className="text-xs text-secondary">
            You can obtain a WalletConnect Project ID at cloud.walletconnect.com and add it to your environment file.
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Wallet configuration unavailable.
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
