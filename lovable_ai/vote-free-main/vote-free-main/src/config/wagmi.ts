import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';
import { http } from 'wagmi';

// Get env variables
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
const network = import.meta.env.VITE_NETWORK || 'sepolia';
const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY;

// Configure chains based on network
const chains = network === 'mainnet' ? [mainnet] : [sepolia];

// Configure transports with Alchemy RPC
const transports = network === 'mainnet'
    ? { [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`) }
    : { [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`) };

export const config = getDefaultConfig({
    appName: 'SecureVote - Gasless Voting',
    projectId: walletConnectProjectId,
    chains,
    transports,
    ssr: false, // We're using Vite, not Next.js SSR
});

// Export current chain for easy access
export const activeChain = chains[0];
export const isTestnet = network !== 'mainnet';
