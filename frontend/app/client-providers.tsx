"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WagmiProvider, type Config } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { Toaster } from "sonner";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
      networkMode: "offlineFirst",
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only load config on client side
    import("@/config/wagmi-client").then((module) => {
      setConfig(module.createWagmiConfig());
      setMounted(true);
    });
  }, []);

  // During SSR and initial load, render without wagmi
  if (!mounted || !config) {
    return (
      <InMemoryStorageProvider>
        {children}
        <Toaster position="top-right" />
      </InMemoryStorageProvider>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <InMemoryStorageProvider>
            {children}
          </InMemoryStorageProvider>
          <Toaster position="top-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
