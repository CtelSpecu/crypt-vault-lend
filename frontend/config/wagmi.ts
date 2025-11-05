'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia } from 'wagmi/chains';

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

// Only use WalletConnect if project ID is provided
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = getDefaultConfig({
  appName: 'CryptVault Lending Pool',
  projectId: projectId && projectId !== 'YOUR_PROJECT_ID_HERE' 
    ? projectId 
    : 'demo_project_id_replace_with_your_own',
  chains: [localhost, sepolia],
  ssr: false, // Disable SSR to avoid indexedDB errors
});
