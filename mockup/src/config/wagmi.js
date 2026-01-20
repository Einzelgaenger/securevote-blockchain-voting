import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
    appName: 'Voting App Mockup',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    chains: [sepolia],
    transports: {
        [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`)
    },
    ssr: false,
});
