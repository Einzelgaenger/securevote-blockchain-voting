// frontend/src/config/contracts.js
// ============================================================
// SecureVote v2 direct-vote configuration for Besu QBFT.
//
// VotingRoom.address is the implementation/template contract. For voting room
// operations, paste the room clone address returned by RoomFactory.createRoom().
// ============================================================

import RoomFactoryAbi from "../abi/RoomFactory.json";
import VotingRoomAbi from "../abi/VotingRoom.json";
import VotingResultCenterAbi from "../abi/VotingResultCenter.json";
import deployedContracts from "./deployed-contracts.json";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 1337);
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Besu QBFT Private";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

function contractAddress(name) {
    const envKey = `VITE_${name.toUpperCase()}_ADDRESS`;
    const readableEnvKey = `VITE_${name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}_ADDRESS`;
    const envValue = import.meta.env[envKey] || import.meta.env[readableEnvKey];
    return envValue || deployedContracts?.[name]?.address || ZERO_ADDRESS;
}

export const CONTRACTS = {
    RoomFactory: {
        address: contractAddress("RoomFactory"),
        abi: RoomFactoryAbi,
    },
    VotingRoom: {
        address: contractAddress("VotingRoom"),
        abi: VotingRoomAbi,
        implementationOnly: true,
    },
    VotingResultCenter: {
        address: contractAddress("VotingResultCenter"),
        abi: VotingResultCenterAbi,
    },
};

export function assertIsRoomClone(roomAddress) {
    if (!roomAddress) {
        throw new Error("VotingRoom clone address is required");
    }

    if (roomAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
        throw new Error("Contract address belum diset. Update deployed-contracts.json atau .env frontend.");
    }

    if (roomAddress.toLowerCase() === CONTRACTS.VotingRoom.address.toLowerCase()) {
        throw new Error(
            "Invalid VotingRoom address: implementation/template detected. Use the room clone address returned by createRoom()."
        );
    }
}
