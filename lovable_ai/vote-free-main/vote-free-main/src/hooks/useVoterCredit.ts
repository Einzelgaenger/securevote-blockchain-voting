import { useReadContract } from 'wagmi';
import { ABIS } from '@/config/abis';

/**
 * Hook to get voter's credit balance in a room
 */
export function useVoterCredit(roomAddress: `0x${string}` | undefined, voterAddress: `0x${string}` | undefined) {
    const { data: credit, isLoading, error } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'voterCredit',
        args: voterAddress ? [voterAddress] : undefined,
        query: {
            enabled: !!roomAddress && !!voterAddress,
        },
    });

    return {
        credit: credit as bigint | undefined,
        isLoading,
        error,
        hasCredit: credit !== undefined && credit > 0n,
    };
}
