"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

// This component safely renders ConnectButton only when wagmi is ready
export function SafeConnectButton() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
        Connect Wallet
      </button>
    );
  }

  // Wrap in try-catch to handle any potential errors
  try {
    return <ConnectButton />;
  } catch (error) {
    console.error('ConnectButton error:', error);
    return (
      <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">
        Connect Wallet
      </button>
    );
  }
}
