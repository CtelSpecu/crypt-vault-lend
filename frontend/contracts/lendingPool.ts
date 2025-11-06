// CryptVaultLend Contract Configuration
import { Address } from 'viem';
import abi from './CryptVaultLend.abi.json';

// Contract addresses for different networks
export const LENDING_POOL_ADDRESSES: Record<number, Address> = {
  31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Localhost
  11155111: '0x32b84976585134D4e1e74c4AaaB25F314d255F82', // Sepolia
} as const;

export const LENDING_POOL_ABI = abi;

// Helper to get contract address for current chain
export function getLendingPoolAddress(chainId: number): Address {
  return LENDING_POOL_ADDRESSES[chainId] || LENDING_POOL_ADDRESSES[31337];
}
