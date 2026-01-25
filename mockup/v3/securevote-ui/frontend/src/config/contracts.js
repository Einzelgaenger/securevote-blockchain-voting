import MinimalForwarderAbi from "../abi/MinimalForwarder.json";
import SponsorVaultAbi from "../abi/SponsorVault.json";
import VotingRoomAbi from "../abi/VotingRoom.json";
import RoomFactoryAbi from "../abi/RoomFactory.json";

export const CHAIN_ID = 11155111;

export const CONTRACTS = {
    MinimalForwarder: {
        address: "0xdE41F486df655AdA306166a601166DDA5e69e241",
        abi: MinimalForwarderAbi
    },
    SponsorVault: {
        address: "0x04d1BB5E8565DF62743212B39F3586d5A9965b67",
        abi: SponsorVaultAbi
    },
    VotingRoom: {
        // NOTE: ini implementation; kalau kamu mau interaksi room hasil createRoom,
        // nanti tinggal ganti address dari UI (kita sediain input).
        address: "0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF",
        abi: VotingRoomAbi
    },
    RoomFactory: {
        address: "0x35404f230901488BFE187d7edCF31287396E6842",
        abi: RoomFactoryAbi
    }
};

export const FORWARDER_EIP712 = {
    domainName: "MinimalForwarder",
    domainVersion: "1.0.0"
};

export const TYPES = {
    ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "data", type: "bytes" }
    ]
};
