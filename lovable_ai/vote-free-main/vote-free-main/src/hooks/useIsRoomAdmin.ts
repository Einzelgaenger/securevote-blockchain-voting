import { useAccount } from 'wagmi';
import { useRoomData } from './useRoomData';

/**
 * Check if connected wallet is the admin of a specific room
 */
export function useIsRoomAdmin(roomAddress: `0x${string}` | undefined) {
    const { address } = useAccount();
    const { roomAdmin } = useRoomData(roomAddress);

    if (!address || !roomAdmin) {
        return false;
    }

    return address.toLowerCase() === roomAdmin.toLowerCase();
}
