// frontend/src/config/contracts.js
// ============================================================
// IMPORTANT NOTES
// ------------------------------------------------------------
// 1. VotingRoom.address di file ini adalah IMPLEMENTATION / LOGIC contract
//    (template untuk EIP-1167 clone).
//
// 2. JANGAN PERNAH melakukan vote() ke address implementation ini.
//
// 3. Untuk interaksi voting (vote, start, stop, restart, reset, dll),
//    SELALU gunakan address ROOM INSTANCE hasil createRoom()
//    (contoh: 0xa536...).
//
// 4. Address room instance bersifat DINAMIS dan harus disimpan di state / Supabase,
//    BUKAN di file config ini.
// ============================================================

import RoomFactoryAbi from "../abi/RoomFactory.json";
import VotingRoomAbi from "../abi/VotingRoom.json";
import SponsorVaultAbi from "../abi/SponsorVault.json";
import MinimalForwarderAbi from "../abi/MinimalForwarder.json";

// ==============================
// NETWORK CONFIG
// ==============================
export const CHAIN_ID = 11155111; // Sepolia

// ==============================
// EIP-712 (MinimalForwarder)
// ==============================
export const FORWARDER_EIP712 = {
    domainName: "MinimalForwarder",
    domainVersion: "1",
};

export const TYPES = {
    ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" },
    ],
};


// ==============================
// CONTRACT ADDRESSES (STATIC)
// ==============================
export const CONTRACTS = {
    // ----------------------------------------------------------
    // RoomFactory
    // - Digunakan untuk createRoom()
    // - Menghasilkan address VotingRoom clone (EIP-1167)
    // ----------------------------------------------------------
    RoomFactory: {
        address: "0x656AcD46DD9AD2E55A7D6E8beD896B563CC13CB4",
        abi: RoomFactoryAbi,
    },

    // ----------------------------------------------------------
    // SponsorVault
    // - Menyimpan:
    //   - registration fee
    //   - deposit room
    //   - reimburse gas relayer
    // ----------------------------------------------------------
    SponsorVault: {
        address: "0xd5CdD32D75Cd3d11c100d2F76924AC23E97145d5",
        abi: SponsorVaultAbi,
    },

    // ----------------------------------------------------------
    // MinimalForwarder (ERC-2771)
    // - Dipakai untuk meta-transaction (gasless vote)
    // ----------------------------------------------------------
    MinimalForwarder: {
        address: "0xdF54C2e489a9f32C60B11d6C5605ea66E069135F",
        abi: MinimalForwarderAbi,
    },

    // ----------------------------------------------------------
    // VotingRoom IMPLEMENTATION (LOGIC CONTRACT)
    // ⚠️ JANGAN dipakai untuk vote()
    // ✔️ Dipakai untuk ABI & referensi
    // ----------------------------------------------------------
    VotingRoom: {
        address: "0x1aAe9b8ec2F0227511c7Aebb7cC911a2110A1136", // IMPLEMENTATION ONLY
        abi: VotingRoomAbi,
    },
};

// ==============================
// HELPER / SAFETY
// ==============================

/**
 * Helper untuk memastikan address yang dipakai adalah
 * room clone (EIP-1167), BUKAN implementation.
 *
 * @param {string} roomAddress
 */
export function assertIsRoomClone(roomAddress) {
    if (!roomAddress) {
        throw new Error("VotingRoom address is required");
    }

    if (
        roomAddress.toLowerCase() ===
        CONTRACTS.VotingRoom.address.toLowerCase()
    ) {
        throw new Error(
            "Invalid VotingRoom address: IMPLEMENTATION detected. " +
            "Use room clone address returned by createRoom()."
        );
    }
}
