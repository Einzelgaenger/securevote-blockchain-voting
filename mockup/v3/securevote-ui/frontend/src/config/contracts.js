// frontend/src/config/contracts.js
// ============================================================
// IMPORTANT NOTES
// ------------------------------------------------------------
// 1. VotingRoom.address di file ini adalah IMPLEMENTATION / LOGIC contract
//    (template untuk EIP-1167 clone).
//
// 2. JANGAN PERNAH melakukan vote() ke address implementation ini.
//
// 3. Untuk interaksi voting (vote, startVoting, endVoting, closeRound, dll),
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
        address: "0x35404f230901488BFE187d7edCF31287396E6842", // TODO: isi sesuai deployment
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
        address: "0x04d1BB5E8565DF62743212B39F3586d5A9965b67", // TODO: isi sesuai deployment
        abi: SponsorVaultAbi,
    },

    // ----------------------------------------------------------
    // MinimalForwarder (ERC-2771)
    // - Dipakai untuk meta-transaction (gasless vote)
    // ----------------------------------------------------------
    MinimalForwarder: {
        address: "0xdE41F486df655AdA306166a601166DDA5e69e241", // Sepolia
        abi: MinimalForwarderAbi,
    },

    // ----------------------------------------------------------
    // VotingRoom IMPLEMENTATION (LOGIC CONTRACT)
    // ⚠️ JANGAN dipakai untuk vote()
    // ✔️ Dipakai untuk ABI & referensi
    // ----------------------------------------------------------
    VotingRoom: {
        address: "0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF", // IMPLEMENTATION ONLY
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
