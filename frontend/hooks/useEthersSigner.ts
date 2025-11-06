"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWalletClient } from "wagmi";

/**
 * Hook to get an ethers.js JsonRpcSigner from wagmi's wallet client
 */
export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);

  useEffect(() => {
    if (!walletClient) {
      setSigner(undefined);
      return;
    }

    const provider = new ethers.BrowserProvider(walletClient.transport);
    provider
      .getSigner()
      .then((s) => setSigner(s))
      .catch(() => setSigner(undefined));
  }, [walletClient]);

  return signer;
}
