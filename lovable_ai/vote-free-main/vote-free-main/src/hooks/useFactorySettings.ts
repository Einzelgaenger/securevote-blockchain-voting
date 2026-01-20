import { useReadContract } from 'wagmi';
import { ABIS } from '@/config/abis';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

/**
 * Hook to get RoomFactory settings
 */
export function useFactorySettings() {
    // Get registration fee
    const { data: registrationFeeWei } = useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'registrationFeeWei',
    });

    // Get platform fee bps
    const { data: platformFeeBps } = useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'platformFeeBps',
    });

    // Get overhead bps
    const { data: overheadBps } = useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'overheadBps',
    });

    // Get total rooms created
    const { data: roomCount } = useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'roomCount',
    });

    return {
        registrationFeeWei: registrationFeeWei as bigint | undefined,
        platformFeeBps: platformFeeBps as bigint | undefined,
        overheadBps: overheadBps as bigint | undefined,
        roomCount: roomCount as bigint | undefined,
    };
}
