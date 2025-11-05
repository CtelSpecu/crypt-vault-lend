"use client";

import { createContext, useContext, ReactNode } from 'react';

interface WagmiContextType {
  isReady: boolean;
}

const WagmiContext = createContext<WagmiContextType>({
  isReady: false,
});

export function useWagmiReady() {
  return useContext(WagmiContext);
}

interface WagmiProviderWrapperProps {
  children: ReactNode;
  isReady: boolean;
}

export function WagmiProviderWrapper({ children, isReady }: WagmiProviderWrapperProps) {
  return (
    <WagmiContext.Provider value={{ isReady }}>
      {children}
    </WagmiContext.Provider>
  );
}
