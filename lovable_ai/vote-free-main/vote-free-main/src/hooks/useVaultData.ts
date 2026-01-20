import { useReadContract } from 'wagmi';
import { ABIS } from '@/config/abis';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

/**
 * Hook to get SponsorVault balance and settings
 */
export function useVaultData(vaultAddress?: `0x${string}`) {
    const address = vaultAddress || CONTRACT_ADDRESSES.SponsorVault;

    // Get ETH balance
    const { data: balance } = useReadContract({
        address,
        abi: ABIS.SponsorVault,
        functionName: 'getBalance',
    });

    // Get registration fee
    const { data: registrationFeeWei } = useReadContract({
        address,
        abi: ABIS.SponsorVault,
        functionName: 'registrationFeeWei',
    });

    // Get platform fee
    const { data: platformFeeBps } = useReadContract({
        address,
        abi: ABIS.SponsorVault,
        functionName: 'platformFeeBps',
    });

    // Get overhead
    const { data: overheadBps } = useReadContract({
        address,
        abi: ABIS.SponsorVault,
        functionName: 'overheadBps',
    });

    return {
        balance: balance as bigint | undefined,
        registrationFeeWei: registrationFeeWei as bigint | undefined,
        platformFeeBps: platformFeeBps as bigint | undefined,
        overheadBps: overheadBps as bigint | undefined,
    };
}
