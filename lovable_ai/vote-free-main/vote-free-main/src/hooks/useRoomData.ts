import { useReadContract } from 'wagmi';
import { ABIS } from '@/config/abis';

/**
 * Hook to read VotingRoom contract state
 * Returns roomAdmin, state, currentRound, and other room details
 */
export function useRoomData(roomAddress: `0x${string}` | undefined) {
    // Get room admin
    const { data: roomAdmin } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'roomAdmin',
        query: {
            enabled: !!roomAddress,
        },
    });

    // Get room state
    const { data: state } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'state',
        query: {
            enabled: !!roomAddress,
        },
    });

    // Get current round
    const { data: currentRound } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'currentRound',
        query: {
            enabled: !!roomAddress,
        },
    });

    // Get total credits in system
    const { data: totalCreditsInSystem } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'totalCreditsInSystem',
        query: {
            enabled: !!roomAddress,
        },
    });

    // Get available credits pool
    const { data: availableCreditsPool } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'availableCreditsPool',
        query: {
            enabled: !!roomAddress,
        },
    });

    // Get max cost per vote
    const { data: maxCostPerVoteWei } = useReadContract({
        address: roomAddress,
        abi: ABIS.VotingRoom,
        functionName: 'maxCostPerVoteWei',
        query: {
            enabled: !!roomAddress,
        },
    });

    return {
        roomAdmin: roomAdmin as `0x${string}` | undefined,
        state: state as 0 | 1 | 2 | 3 | undefined, // Inactive, Active, Ended, Closed
        currentRound: currentRound as bigint | undefined,
        totalCreditsInSystem: totalCreditsInSystem as bigint | undefined,
        availableCreditsPool: availableCreditsPool as bigint | undefined,
        maxCostPerVoteWei: maxCostPerVoteWei as bigint | undefined,
    };
}

/**
 * Helper to convert state enum to string
 */
export function getStateLabel(state: number | undefined): string {
    if (state === undefined) return 'Loading...';
    switch (state) {
        case 0: return 'Inactive';
        case 1: return 'Active';
        case 2: return 'Ended';
        case 3: return 'Closed';
        default: return 'Unknown';
    }
}
