import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ABIS } from '@/config/abis';

/**
 * Hook to get total number of rooms created
 */
export function useRoomCount() {
    return useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'getRoomCount',
    });
}

/**
 * Hook to get room address by index
 */
export function useRoomAddress(index: number) {
    return useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'getRoomAt',
        args: [BigInt(index)],
    });
}

/**
 * Hook to get all rooms created by admin
 */
export function useRoomsByAdmin(adminAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACT_ADDRESSES.RoomFactory,
        abi: ABIS.RoomFactory,
        functionName: 'getRoomsByAdmin',
        args: adminAddress ? [adminAddress] : undefined,
        query: {
            enabled: !!adminAddress,
        },
    });
}

/**
 * Hook to get SponsorVault registration fee
 */
export function useRegistrationFee() {
    return useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: ABIS.SponsorVault,
        functionName: 'registrationFeeWei',
    });
}

/**
 * Hook to get room balance in SponsorVault
 */
export function useRoomBalance(roomAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACT_ADDRESSES.SponsorVault,
        abi: ABIS.SponsorVault,
        functionName: 'roomBalance',
        args: roomAddress ? [roomAddress] : undefined,
        query: {
            enabled: !!roomAddress,
        },
    });
}
