import MinimalForwarderABI from '../contracts/MinimalForwarder.abi';
import SponsorVaultABI from '../contracts/SponsorVault.abi';
import VotingRoomABI from '../contracts/VotingRoom.abi';
import RoomFactoryABI from '../contracts/RoomFactory.abi';

/**
 * Contract ABIs
 * Automatically imported from /ABI/v2 folder
 */
export const ABIS = {
  MinimalForwarder: MinimalForwarderABI,
  SponsorVault: SponsorVaultABI,
  VotingRoom: VotingRoomABI,
  RoomFactory: RoomFactoryABI,
} as const;

// TypeScript types for better autocomplete
export type ContractName = keyof typeof ABIS;
