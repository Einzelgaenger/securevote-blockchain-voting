import MinimalForwarderABI from '../contracts/MinimalForwarder.json';
import SponsorVaultABI from '../contracts/SponsorVault.json';
import VotingRoomABI from '../contracts/VotingRoom.json';
import RoomFactoryABI from '../contracts/RoomFactory.json';

/**
 * Contract ABIs
 * Imported from JSON files
 */
export const ABIS = {
    MinimalForwarder: MinimalForwarderABI,
    SponsorVault: SponsorVaultABI,
    VotingRoom: VotingRoomABI,
    RoomFactory: RoomFactoryABI,
} as const;

// TypeScript types for better autocomplete
export type ContractName = keyof typeof ABIS;
