import { useAccount } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

/**
 * Check if connected wallet is the Factory Owner
 * Factory Owner has special privileges to configure platform settings
 */
export function useIsFactoryOwner() {
    const { address } = useAccount();
    
    if (!address || !CONTRACT_ADDRESSES.FactoryOwner) {
        return false;
    }
    
    return address.toLowerCase() === CONTRACT_ADDRESSES.FactoryOwner.toLowerCase();
}
