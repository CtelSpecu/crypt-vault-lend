'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia } from 'wagmi/chains';
import { cookieStorage, createStorage, type Config } from 'wagmi';

// Define localhost chain
const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const;

const PLACEHOLDER_IDS = new Set([
  'demo_project_id_replace_with_your_own',
  'YOUR_PROJECT_ID_HERE',
]);
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const isWalletConnectReady = Boolean(projectId && !PLACEHOLDER_IDS.has(projectId));

let cachedConfig: Config | null = null;

export function createWagmiConfig() {
  if (!isWalletConnectReady || !projectId) {
    throw new Error(
      'WalletConnect project ID missing. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your environment.'
    );
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = getDefaultConfig({
    appName: 'CryptVault Lending Pool',
    projectId,
    chains: [localhost, sepolia],
    ssr: true,
    storage: createStorage({
      storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
    }),
  });

  return cachedConfig;
}
