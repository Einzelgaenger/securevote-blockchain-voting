// frontend/src/config/contracts.js
// ============================================================
// SecureVote v2 direct-vote configuration.
//
// VotingRoom.address is the implementation/template contract. For voting room
// operations, paste the room clone address returned by RoomFactory.createRoom().
// ============================================================

import RoomFactoryAbi from "../abi/RoomFactory.json";
import VotingRoomAbi from "../abi/VotingRoom.json";
import VotingResultCenterAbi from "../abi/VotingResultCenter.json";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";
export const RPC_URL = import.meta.env.VITE_RPC_URL || import.meta.env.VITE_SEPOLIA_RPC_URL;

export const CONTRACTS = {
    RoomFactory: {
        address: "0x3193f1F6CfD766c1F4808F8C5EaFc0F2a20D6B13",
        abi: RoomFactoryAbi,
    },
    VotingRoom: {
        address: "0xe25952daBb125cE1BAcBa89f6672622ca33224e7",
        abi: VotingRoomAbi,
        implementationOnly: true,
    },
    VotingResultCenter: {
        address: "0x64573dCF69121ce0d8AdaBf18a8C4D30E2d612D8",
        abi: VotingResultCenterAbi,
    },
};

export function assertIsRoomClone(roomAddress) {
    if (!roomAddress) {
        throw new Error("VotingRoom clone address is required");
    }

    if (roomAddress.toLowerCase() === CONTRACTS.VotingRoom.address.toLowerCase()) {
        throw new Error(
            "Invalid VotingRoom address: implementation/template detected. Use the room clone address returned by createRoom()."
        );
    }
}
