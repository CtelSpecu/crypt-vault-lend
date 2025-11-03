import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Set workspace root for monorepo
  outputFileTracingRoot: path.join(__dirname, '../'),

  turbopack: {
    resolveAlias: {
      '@react-native-async-storage/async-storage': './shims/asyncStorage',
    },
  },

  // WSL compatibility: watch for file changes
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Fix MetaMask SDK React Native dependency issue by aliasing to a local shim
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@react-native-async-storage/async-storage': path.join(__dirname, 'shims/asyncStorage.ts'),
    };

    return config;
  },
  
  headers() {
    // Required by FHEVM with relaxed COOP for wallet compatibility
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]);
  },
};

export default nextConfig;
