Berikut **FINAL PLAN** dalam bentuk **Markdown** yang rapi, konsisten, dan siap kamu pakai sebagai:

* **Blueprint implementasi smart contract**
* **Dokumen desain sistem**
* **Bab arsitektur / metodologi skripsi**

---

# 🗳️ Web3 Gasless Voting System — Final Technical Plan

## 1. Tujuan Sistem

Membangun sistem **e-voting berbasis blockchain** yang:

* Gasless untuk voter (voter tidak membayar gas sama sekali)
* Menggunakan **trusted relayer (allowlist)** berbasis ERC-2771
* Mendukung **weighted voting** (VoteCredit sebagai bobot suara)
* Memiliki **accounting on-chain** yang transparan dan auditable
* Cocok untuk model **SaaS / Web3 Voting Service**

---

## 2. Komponen Utama

### 2.1 Smart Contracts

| Kontrak            | Fungsi                                           |
| ------------------ | ------------------------------------------------ |
| `RoomFactory`      | Membuat room voting                              |
| `VotingRoom`       | Logika voting, kandidat, voter, credit, round    |
| `SponsorVault`     | Escrow ETH deposit per room + pembayaran relayer |
| `MinimalForwarder` | ERC-2771 meta-transaction                        |

### 2.2 Off-chain

| Komponen               | Fungsi                       |
| ---------------------- | ---------------------------- |
| Relayer Service (EOA)  | Membayar gas & relay meta-tx |
| RPC Provider (Alchemy) | Send tx & ambil receipt      |
| Frontend Web3          | UI voting & admin panel      |

---

## 3. Roles & Permissions

### 3.1 Roles

* **RoomAdmin**

  * Membuat room
  * Topup deposit
  * Grant VoteCredit
  * Start / Pause / End / Reset voting
  * Set `maxCostPerVoteWei`

* **PlatformOwner**

  * Set `overheadBps`
  * Set `registrationFeeWei`
  * Manage relayer allowlist

* **Relayer (EOA Allowlisted)**

  * Relay vote transaction
  * Hitung gas cost
  * Memanggil `settleAndWithdraw`

* **Voter**

  * Cast vote (gasless)
  * 1 vote per round
  * Vote berbobot credit

---

## 4. Economic Model

### 4.1 Registration Fee (Non-refundable)

* Dibayar saat `createRoom`
* Masuk ke platform (SaaS revenue)
* Tidak terkait deposit gas

```solidity
require(msg.value >= registrationFeeWei);
```

---

### 4.2 Deposit Gas (Refundable)

* Disimpan di `SponsorVault`
* Mapping:

```solidity
mapping(address room => uint256) roomBalance;
```

* Dipakai untuk membayar **actual gas cost + overhead**
* Bisa di-topup dan di-withdraw (oleh RoomAdmin)

---

### 4.3 VoteCredit (Weighted Voting)

* Credit diberikan manual oleh RoomAdmin
* Credit = bobot suara
* Saat vote:

  * **SEMUA credit voter langsung habis**
  * Tidak bisa digunakan di round berikutnya
* Voting hanya **1 kandidat per round**

---

## 5. Parameter Sistem

### 5.1 Per Room

* `maxCostPerVoteWei`

  * Ditetapkan oleh RoomAdmin
  * Digunakan untuk:

    * Relayer gas cap (pre-check)
    * Minimum reserve check

### 5.2 Global (Platform)

* `overheadBps` (basis points)

  * Ditetapkan oleh PlatformOwner
  * Digunakan untuk menghitung overhead relayer
* `registrationFeeWei`
* `platformFeeBps` (opsional, saat withdraw admin)

---

## 6. Relayer Pre-check (Off-chain, Mandatory)

Sebelum mengirim transaksi vote, relayer **WAJIB** melakukan:

### 6.1 Balance Check

```text
if roomBalance < 2 * maxCostPerVoteWei:
  reject("topup needed")
```

### 6.2 Gas Estimation Check

```text
estimatedGas = estimateGas(tx)
estimatedCost = estimatedGas * maxFeePerGas

if estimatedCost > maxCostPerVoteWei:
  reject("gas too high")
```

> Jika salah satu gagal → **TX TIDAK DIKIRIM**

---

## 7. Voting Flow (End-to-End)

### 7.1 Vote (Tx #1 — Relayer pays gas)

1. Voter tanda tangan meta-tx
2. Relayer broadcast via ERC-2771 forwarder
3. `VotingRoom.vote(candidateId)`:

   * `voter = _msgSender()`
   * cek eligible
   * cek belum vote round ini
   * `weight = credits[voter]`
   * `credits[voter] = 0`
   * `usedCredits += weight`
   * `candidateVotes += weight`
   * emit `VoteCast(...)`

### Action ID

```solidity
actionId = keccak256(
  abi.encodePacked(room, currentRound, voter)
);
```

---

### 7.2 Settlement + Withdraw (Tx #2 — Relayer)

Relayer:

1. Ambil receipt via Alchemy
2. Hitung:

```text
actualVoteCost = gasUsed * effectiveGasPrice
overhead = actualVoteCost * overheadBps / 10_000
chargedAmount = actualVoteCost + overhead
```

3. Call:

```solidity
SponsorVault.settleAndWithdraw(room, actionId, chargedAmount)
```

SponsorVault:

* Only allowlisted relayer
* Anti double-settle
* Potong `roomBalance`
* Transfer ETH langsung ke relayer

---

## 8. settleAndWithdraw (Critical Function)

```solidity
function settleAndWithdraw(
  address room,
  bytes32 actionId,
  uint256 chargedAmount
) external onlyRelayer nonReentrant {
  require(!settled[actionId]);
  require(roomBalance[room] >= chargedAmount);

  settled[actionId] = true;
  roomBalance[room] -= chargedAmount;

  payable(msg.sender).transfer(chargedAmount);
}
```

✔ Relayer **tidak pernah rugi**
✔ Withdraw **per transaksi**
✔ Dana tidak mengendap di relayer

---