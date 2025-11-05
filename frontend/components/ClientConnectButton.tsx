"use client";

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ClientConnectButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render on client side to avoid SSR issues
  if (!mounted) {
    return (
      <div className="h-10 w-36 bg-muted rounded-lg animate-pulse" />
    );
  }

  return <ConnectButton />;
}
