Siap. Di bawah ini aku tuliskan **NOTES FINAL (PRE-CODE DESIGN)** dalam bentuk **Markdown**, rapi, terstruktur, dan **lengkap** sebagai single source of truth sebelum masuk ke Solidity.

Dokumen ini sengaja dibuat **netral implementasi** (belum code), fokus ke:

* role
* action type
* state
* variabel
* event
* invariants

Kalau dokumen ini sudah kamu setujui, **baru aman turun ke coding**.

---

# 🗳️ Web3 Gasless Voting System

## Final Design Notes (Pre-Implementation)

---

## 0. Design Principles

1. **Gasless for Voters**

   * Voter tidak pernah membayar gas
   * Semua vote dilakukan via allowlisted relayer (ERC-2771)

2. **Trusted Relayer, Auditable Accounting**

   * Relayer milik platform (allowlist)
   * Semua pembayaran tercatat on-chain via SponsorVault

3. **Weighted Voting**

   * VoteCredit = bobot suara
   * Semua credit voter langsung habis saat vote

4. **Per-Room Isolation**

   * Deposit gas terpisah per room
   * Tidak ada subsidi silang antar room

5. **Fail Early**

   * Jika gas mahal / deposit kurang → tx tidak dikirim sama sekali

---

## 1. Roles & Responsibilities

### 1.1 PlatformOwner (System / SaaS Owner)

**Hak & Tanggung Jawab**

* Mengatur parameter global
* Mengelola relayer allowlist
* Mengambil platform revenue

**Aksi**

* Set `overheadBps`
* Set `registrationFeeWei`
* Set `platformFeeBps` (opsional)
* Add / remove relayer

---

### 1.2 RoomAdmin (Creator of Voting Room)

**Hak & Tanggung Jawab**

* Mengelola isi dan lifecycle room
* Menyediakan dana gas untuk voting
* Memberikan hak suara (VoteCredit)

**Aksi**

* Create room (bayar registration fee)
* Topup / withdraw deposit
* Add / remove voter
* Add / remove candidate
* Grant VoteCredit
* Set `maxCostPerVoteWei`
* Start / Stop / End / Reset voting

---

### 1.3 Relayer (EOA – Allowlisted)

**Hak & Tanggung Jawab**

* Membayar gas vote transaction
* Melakukan pre-check
* Melakukan settlement & withdraw

**Aksi**

* Relay vote via ERC-2771
* Hitung actual gas cost
* Call `settleAndWithdraw`

---

### 1.4 Voter

**Hak & Tanggung Jawab**

* Cast vote satu kali per round
* Menggunakan seluruh VoteCredit sekaligus

**Aksi**

* Sign meta-transaction untuk vote

---

## 2. Contracts Overview

### 2.1 VotingRoom

**Fungsi utama**

* Menyimpan voter, candidate, credit
* Mengelola round & voting logic
* Emit event voting (tanpa urus ETH)

### 2.2 SponsorVault

**Fungsi utama**

* Menyimpan deposit ETH per room
* Membayar relayer setelah vote
* Menyimpan platform fee

### 2.3 MinimalForwarder (ERC-2771)

**Fungsi utama**

* Memverifikasi signature voter
* Meneruskan call ke VotingRoom

---

## 3. Room State Machine

```text
Inactive → Active → Ended → Closed
```

### State Definitions

| State    | Makna                                  |
| -------- | -------------------------------------- |
| Inactive | Setup room (registry, credit, deposit) |
| Active   | Voting berjalan                        |
| Ended    | Voting berhenti (pause / stop)         |
| Closed   | Round selesai & settlement final       |

### Allowed Actions per State

| Action               | Inactive | Active | Ended | Closed |
| -------------------- | -------- | ------ | ----- | ------ |
| Add/Remove Voter     | ✅        | ❌      | ❌     | ✅      |
| Add/Remove Candidate | ✅        | ❌      | ❌     | ✅      |
| Grant Credit         | ✅        | ❌      | ❌     | ✅      |
| Topup Deposit        | ✅        | ✅      | ✅     | ✅      |
| Withdraw Deposit     | ✅        | ❌      | ✅     | ✅      |
| Vote                 | ❌        | ✅      | ❌     | ❌      |
| Start Vote           | ✅        | ❌      | ❌     | ❌      |
| Stop Vote            | ❌        | ✅      | ❌     | ❌      |
| End / Close          | ❌        | ❌      | ✅     | ❌      |

---

## 4. Voting Model

### 4.1 Round

* `currentRound` selalu meningkat
* Tidak pernah di-reset ke 0
* History round tetap tersimpan

---

### 4.2 Voting Rules

* 1 voter hanya boleh memilih **1 kandidat per round**
* VoteCredit = bobot suara
* Saat vote:

  * semua credit voter **langsung habis**
  * credit tidak bisa dipakai di round lain

---

### 4.3 Anti Double Vote

```solidity
mapping(address => uint256) lastVotedRound;
```

Rule:

* `lastVotedRound[voter] != currentRound`

---

## 5. VoteCredit Model

### Variables

* `mapping(address => uint256) voterCredit`
* `uint256 totalCreditsGranted`
* `uint256 totalCreditsUsed`

### Grant Credit

* Hanya RoomAdmin
* Bisa grant jumlah bebas

### Saat Vote

* `weight = voterCredit[voter]`
* `voterCredit[voter] = 0`
* `totalCreditsUsed += weight`

---

## 6. Candidate Model

### Variables

* `uint256 candidateRegistryVersion`
* `mapping(uint256 => uint256) candidateVersion`
* `mapping(uint256 => string) candidateName`

### Tally

```solidity
mapping(uint256 round => mapping(uint256 candidateId => uint256)) roundVotes;
```

---

## 7. Deposit & Gas Sponsorship Model

### 7.1 Registration Fee (Non-Refundable)

* Dibayar saat `createRoom`
* Masuk ke platform revenue

---

### 7.2 Room Deposit (Refundable)

Disimpan di SponsorVault:

```solidity
mapping(address room => uint256) roomBalance;
```

Digunakan untuk:

* Membayar gas vote
* Membayar overhead relayer

---

### 7.3 Room Parameter

```solidity
uint256 maxCostPerVoteWei;
```

Fungsi:

* Gas cap policy
* Minimum reserve guideline

---

## 8. Relayer Pre-Check (Off-Chain Mandatory)

### Rule 1 — Balance Check

```text
roomBalance >= 2 * maxCostPerVoteWei
```

### Rule 2 — Gas Estimation Check

```text
estimatedGas * maxFeePerGas <= maxCostPerVoteWei
```

Jika gagal → **TX TIDAK DIKIRIM**

---

## 9. Settlement Model (Per Vote)

### Action ID

```solidity
actionId = keccak256(room, currentRound, voter);
```

### Cost Calculation (Off-chain)

```text
actualVoteCost = gasUsed * effectiveGasPrice
overhead = actualVoteCost * overheadBps / 10_000
chargedAmount = actualVoteCost + overhead
```

---

### On-chain Settlement

```solidity
settleAndWithdraw(room, actionId, chargedAmount)
```

Rules:

* Only allowlisted relayer
* `actionId` hanya bisa settle sekali
* ETH langsung ditransfer ke relayer

---

## 10. Global Platform Parameters

### Variables

* `uint256 overheadBps`
* `uint256 registrationFeeWei`
* `uint256 platformFeeBps`
* `uint256 platformFeeAccrued`
* `mapping(address => bool) isRelayer`

---

## 11. Reset Strategy (No Loop)

### Versioning

```solidity
uint256 voterRegistryVersion;
mapping(address => uint256) voterVersion;
```

Reset:

* `voterRegistryVersion++`
* `candidateRegistryVersion++`

History tetap ada.

---

## 12. Events (UI + Audit)

### Room Lifecycle

* `RoomRegistered(room, admin, fee)`
* `RoundStarted(room, round)`
* `RoundStopped(room, round)`
* `RoundEnded(room, round)`
* `RoundClosed(room, round, winner)`

### Registry

* `VoterAdded(room, voter)`
* `VoterRemoved(room, voter)`
* `CandidateAdded(room, candidateId, name)`
* `CandidateRemoved(room, candidateId)`

### Credit

* `CreditGranted(room, voter, amount, newBalance)`

### Voting

* `VoteCast(room, round, voter, candidateId, weight, actionId)`

### Vault

* `RoomToppedUp(room, admin, amount, newBalance)`
* `RoomWithdrawn(room, admin, amount)`
* `Settled(room, actionId, relayer, chargedAmount, newBalance)`
* `OverheadBpsUpdated(old, new)`

---

## 13. Core Security Invariants

1. Voter tidak pernah bayar gas
2. Relayer tidak pernah rugi
3. 1 voter = 1 vote per round
4. VoteCredit habis sekali pakai
5. Deposit room tidak bisa negative
6. Settlement tidak bisa double
7. Gas spike tidak menyebabkan tx terjadi

---

## 14. Status Dokumen

✅ Final design
⏭️ Next step: **Solidity implementation**

Jika kamu mau, langkah berikutnya aku bisa:

* Buat **skeleton Solidity** dari dokumen ini
* Mapping langsung ke `VotingRoom.sol` & `SponsorVault.sol`
* Buat **checklist test case** (unit + attack scenarios)

Tinggal bilang mau lanjut ke bagian mana.
