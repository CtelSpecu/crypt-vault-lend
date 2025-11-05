"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import ConnectButton with no SSR
const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
  {
    ssr: false,
    loading: () => (
      <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium animate-pulse">
        Loading...
      </button>
    ),
  }
);

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
        Connect Wallet
      </button>
    );
  }

  return <ConnectButton />;
}
