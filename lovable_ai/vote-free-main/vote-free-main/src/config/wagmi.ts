import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

// Get env variables
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
const network = import.meta.env.VITE_NETWORK || 'sepolia';

// Configure chains based on network
const chains = network === 'mainnet' ? [mainnet] : [sepolia];

export const config = getDefaultConfig({
  appName: 'SecureVote - Gasless Voting',
  projectId: walletConnectProjectId,
  chains,
  ssr: false, // We're using Vite, not Next.js SSR
});

// Export current chain for easy access
export const activeChain = chains[0];
export const isTestnet = network !== 'mainnet';
