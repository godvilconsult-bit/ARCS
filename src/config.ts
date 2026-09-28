/**
 * wagmi configuration — ArcStable
 * Primary chain: Arc Mainnet (chain ID 5042)
 * WalletConnect Project ID loaded from VITE_WALLETCONNECT_PROJECT_ID
 */

import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { registerChain } from './tracing';

// Arc Mainnet — USDC is the native gas token
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
});

// Arc Testnet — kept as fallback
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Testnet Explorer', url: 'https://explorer.testnet.arc.io' },
  },
  testnet: true,
});

// Register for trace labelling
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0]);
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0]);

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

export const config = createConfig({
  chains: [arcMainnet, arcTestnet, mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'ArcStable',
        description: 'The Liquidity Backbone of Arc — Stable AMM, veToken governance, real USDC yield.',
        url: 'https://gleaming-biscuit-a2fc60.netlify.app',
        icons: ['https://gleaming-biscuit-a2fc60.netlify.app/arcstable-logo.svg'],
      },
    }),
    coinbaseWallet({
      appName: 'ArcStable',
      appLogoUrl: 'https://gleaming-biscuit-a2fc60.netlify.app/arcstable-logo.svg',
    }),
  ],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
    [mainnet.id]: http(),
  },
});
