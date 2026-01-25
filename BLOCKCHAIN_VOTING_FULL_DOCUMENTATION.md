# 🗳️ Blockchain Voting App - Full Documentation

## 1. Overview
A decentralized voting platform on Ethereum (Sepolia) enabling anyone to create, join, and manage voting rooms with gasless voting for users. The system leverages smart contracts, a relayer, and Supabase for off-chain data.

---

## 2. System Architecture
- **Frontend:** React (Vite), connects to contracts via Wagmi/Viem, and to Supabase for off-chain data.
- **Smart Contracts:**
  - `RoomFactory`: Deploys new `VotingRoom` contracts (EIP-1167 minimal proxy pattern).
  - `VotingRoom`: Handles voting logic, candidates, voters, and round management.
  - `SponsorVault`: Holds ETH deposits for rooms, pays relayer gas, and manages platform/relayer fees.
  - `MinimalForwarder`: Enables meta-transactions (gasless voting).
- **Relayer:** Signs and submits user transactions to the blockchain, paid from room deposits.
- **Supabase:** Stores off-chain data for fast UI queries and analytics.

---

## 3. How Gasless Voting Works
1. **User signs a meta-transaction** (vote, add candidate, etc.) using MinimalForwarder.
2. **Relayer receives the signed request** and submits it on-chain, paying the gas fee.
3. **SponsorVault reimburses the relayer** from the room's deposit, deducting a relayer fee and platform fee.
4. **User pays zero gas**; all costs are covered by the room's deposit.

---

## 4. Step-by-Step: Creating and Running a Voting Room
### 4.1. Create Room
- User calls `RoomFactory.createRoom()` via frontend.
- Pays a **registration fee** (e.g., 0.01 ETH) to SponsorVault.
- SponsorVault deducts an **overhead fee** (e.g., 10%) and a **platform fee** (e.g., 5%).
- Remaining deposit is credited to the new room for future gasless transactions.
- `RoomFactory` deploys a new `VotingRoom` contract (proxy).
- Room info is indexed in Supabase for fast discovery.

### 4.2. Deposit More Funds
- Room admin can deposit more ETH to SponsorVault for their room at any time.
- Ensures enough balance for future gasless transactions.

### 4.3. Add Candidates
- Admin (or allowed users) add candidates to the room (meta-tx, gasless).
- Relayer submits the transaction, SponsorVault pays gas from room deposit.

### 4.4. Voting
- Users vote by signing a meta-transaction.
- Relayer submits the vote, SponsorVault pays gas from room deposit.
- Each vote triggers a deduction for gas + relayer fee.

### 4.5. End Round
- Admin ends the voting round (meta-tx, gasless).
- Relayer submits, SponsorVault pays gas.
- Results are finalized and can be read on-chain and off-chain (Supabase sync).

---

## 5. SponsorVault: Gas & Fee Management
- **Deposit:** All room deposits are sent to SponsorVault.
- **Room Creation:**
  - Registration fee (e.g., 0.01 ETH) is split:
    - Overhead (10%) → platform
    - Platform fee (5%) → platform
    - Remainder → room's gas pool
- **Gas Payment:**
  - For every meta-tx (vote, add candidate, etc.), SponsorVault pays the relayer from the room's pool.
  - Relayer receives a fixed or percentage fee per tx (configurable).
  - If room deposit runs out, no more gasless txs allowed until top-up.
- **Fee Distribution Example:**
  - User deposits 0.01 ETH to create room
  - Overhead: 10% (0.001 ETH) → platform
  - Platform fee: 5% (0.0005 ETH) → platform
  - Remaining: 0.0085 ETH → room's gas pool
  - Each relayed tx deducts gas used + relayer fee from pool

---

## 6. Supabase Off-Chain Sync
- All on-chain events (room created, vote cast, candidate added, etc.) are indexed to Supabase for fast UI queries.
- Manual refresh or backend indexer keeps Supabase in sync with blockchain.

---

## 7. Developer Quick Reference
- **Contract Addresses (Sepolia):**
  - MinimalForwarder: `0xdE41F486df655AdA306166a601166DDA5e69e241`
  - SponsorVault: `0x04d1BB5E8565DF62743212B39F3586d5A9965b67`
  - VotingRoom (Implementation): `0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF`
  - RoomFactory: `0x35404f230901488BFE187d7edCF31287396E6842`
- **Frontend:** Vite + React, RainbowKit, Wagmi, Viem
- **Backend/Relayer:** Node.js, ethers.js/viem
- **Supabase:** Project URL & anon key in .env

---

## 8. Security & Best Practices
- All critical actions require signatures (meta-tx or direct).
- Relayer only submits valid, signed requests.
- Room deposits must be managed to avoid running out of gas.
- Platform/relayer fees are transparent and configurable.

---

## 9. References
- [EIP-2770: Meta-Transactions](https://eips.ethereum.org/EIPS/eip-2770)
- [EIP-1167: Minimal Proxy](https://eips.ethereum.org/EIPS/eip-1167)
- [Supabase](https://supabase.com/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Wagmi](https://wagmi.sh/)

---

For more details, see contract source code and frontend implementation in the repository.
