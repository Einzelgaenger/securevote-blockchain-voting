## Web3 Gasless Voting System dengan EIP-1167 (Minimal Proxy Clone)

Di bawah ini “ide final” yang sama seperti plan sebelumnya, tapi **diterapkan dengan EIP-1167 clone** supaya deployment banyak room jadi murah dan scalable.

---

# 1) Inti Arsitektur

### Kontrak yang **singleton** (1x deploy)

* **`SponsorVault`**
  Escrow deposit ETH per room + settle & pay relayer + platform fee + overhead config + relayer allowlist.
* **`VotingRoomImplementation`** (logic/implementation)
  Logika room voting (state, voters, candidates, credits, rounds), dipakai sebagai target clone.
* **`MinimalForwarder`** (ERC-2771)
  Forwarder meta-tx agar voter gasless.

### Kontrak yang **dibuat banyak** (per room)

* **`VotingRoomClone`** (EIP-1167 clone)
  Minimal proxy yang menunjuk ke `VotingRoomImplementation`, punya storage sendiri per room.

---

# 2) Alur Deploy Room (Factory + Clone)

### `RoomFactory.createRoom(name)` (payable)

1. **Validasi registration fee**:

   * `require(msg.value >= registrationFeeWei)`
2. **Buat room clone**:

   * `clone = Clones.clone(votingRoomImplementation)`
3. **Initialize clone** (pengganti constructor):

   * `VotingRoom(clone).initialize({ roomAdmin, roomName, sponsorVault, trustedForwarder })`
4. **Catat mapping**:

   * `roomOwner[clone] = roomAdmin`
   * `isRoom[clone] = true`
5. Emit event:

   * `RoomRegistered(clone, roomAdmin, feePaid, name)`

> Catatan: `VotingRoomImplementation` **tidak pakai constructor**, semua set via `initialize()`.

---

# 3) Storage & Setup VotingRoom (Clone)

Setiap clone menyimpan state per room:

### Storage utama

* `address roomAdmin`
* `string roomName`
* `uint256 currentRound`
* `State state` (`Inactive/Active/Ended/Closed`)
* `uint256 maxCostPerVoteWei` (ditentukan roomAdmin)

### Voter

* `mapping(address => uint256) voterCredit`
* `mapping(address => uint256) lastVotedRound`
* (opsional) allowlist versioning:

  * `uint256 voterRegistryVersion`
  * `mapping(address => uint256) voterVersion`

### Candidate

* `uint256 candidateRegistryVersion`
* `mapping(uint256 => uint256) candidateVersion`
* `mapping(uint256 => string) candidateName`
* `mapping(uint256 round => mapping(uint256 candidateId => uint256)) roundVotes`

### Credit accounting

* `uint256 totalCreditsGranted`
* `uint256 totalCreditsUsed`

### History

* `mapping(uint256 => RoundSummary) roundSummaries`

  * winnerId, totalVotesWeight, startAt, endAt, etc.

---

# 4) Gasless Voting (ERC-2771)

### Requirement

* Vote **wajib** lewat relayer allowlisted.
* `VotingRoom` menggunakan `_msgSender()` untuk identitas voter.

### `vote(candidateId)`

1. `voter = _msgSender()` (bukan msg.sender)
2. require `state == Active`
3. require voter eligible
4. require `lastVotedRound[voter] != currentRound`
5. `weight = voterCredit[voter]` require > 0
6. `voterCredit[voter] = 0`
7. `totalCreditsUsed += weight`
8. `roundVotes[currentRound][candidateId] += weight`
9. `lastVotedRound[voter] = currentRound`
10. buat `actionId` deterministik:

* `actionId = keccak256(abi.encodePacked(address(this), currentRound, voter))`

11. emit:

* `VoteCast(room, round, voter, candidateId, weight, actionId)`

---

# 5) SponsorVault (Per Room Deposit + Settle)

### Storage

* `mapping(address room => uint256) roomBalance`
* `mapping(bytes32 actionId => bool) settled`
* `mapping(address => bool) isRelayer` (allowlist)
* `uint256 overheadBps` (global, platformOwner bisa update)
* `uint256 registrationFeeWei`
* (opsional) platform fee:

  * `uint256 platformFeeBps`
  * `uint256 platformFeeAccrued`

### Topup (Refundable)

* `topup(room)` payable only roomAdmin
* `roomBalance[room] += msg.value`

### Withdraw (Refundable, by roomAdmin)

* only allowed when room not Active
* potong platformFee jika ada
* transfer ke roomAdmin

---

# 6) Pre-check Relayer (Off-chain, Mandatory)

Sebelum broadcast vote tx:

### Check A — Deposit buffer

* `roomBalance(room) >= 2 * maxCostPerVoteWei`

  * kalau gagal: `"topup needed"`

### Check B — Gas estimation cap

* `estimatedCost = estimateGas(tx) * maxFeePerGas`
* jika `estimatedCost > maxCostPerVoteWei`

  * gagal: `"gas too high"`

Jika lolos → relayer broadcast tx vote.

---

# 7) Settlement per Vote: `settleAndWithdraw(actionId, chargedAmount)`

### Perhitungan off-chain (Alchemy receipt)

Relayer ambil receipt vote:

* `gasUsed`
* `effectiveGasPrice`

Hitung:

* `actualVoteCost = gasUsed * effectiveGasPrice`
* `overhead = actualVoteCost * overheadBps / 10_000`
* `chargedAmount = actualVoteCost + overhead`

### Call on-chain (TX kedua)

Relayer call:

* `SponsorVault.settleAndWithdraw(room, actionId, chargedAmount)`

Vault:

1. require `isRelayer[msg.sender]`
2. require `!settled[actionId]`
3. (opsional) verifikasi `actionId` valid untuk room (via interface room)
4. `require(roomBalance[room] >= chargedAmount)`
5. `settled[actionId] = true`
6. `roomBalance[room] -= chargedAmount`
7. transfer `chargedAmount` ke relayer EOA (`msg.sender`)
8. emit `Settled(room, actionId, relayer, chargedAmount, newBalance)`

> Dengan ini relayer **langsung withdraw tiap vote**, dan dana tidak mengendap di relayer.

---

# 8) Reset & Scalability (No Loop)

Karena room bisa punya banyak voter/candidate:

* jangan hapus mapping dengan loop
* gunakan **versioning**

Reset total:

* `voterRegistryVersion++`
* `candidateRegistryVersion++`
* deposit sisa bisa di-withdraw oleh admin (refund)
* history round tetap tersimpan (mapping by round)

---

# 9) Events (Minimal dan Penting)

### Factory

* `RoomRegistered(room, admin, feePaid, name)`

### VotingRoom

* `RoundStarted(room, round)`
* `RoundStopped(room, round)` (pause)
* `RoundEnded(room, round)`
* `RoundClosed(room, round, winnerId, totalWeight)`
* `VoterAdded(room, voter)`
* `VoterRemoved(room, voter)`
* `CandidateAdded(room, candidateId, name)`
* `CandidateRemoved(room, candidateId)`
* `CreditGranted(room, voter, amount, newBalance)`
* `VoteCast(room, round, voter, candidateId, weight, actionId)`
* `MaxCostUpdated(room, old, new)`

### SponsorVault

* `RoomToppedUp(room, admin, amount, newBalance)`
* `RoomWithdrawn(room, admin, amountToAdmin, platformFee, newBalance)`
* `Settled(room, actionId, relayer, chargedAmount, newBalance)`
* `OverheadBpsUpdated(old, new)`
* `RelayerUpdated(relayer, allowed)`

---

# 10) Kenapa EIP-1167 Cocok di Sistem Ini?

* Deploy room jadi **murah sekali** (minimal proxy)
* Room bisa dibuat banyak (SaaS scalable)
* Room punya storage sendiri (isolated)
* Implementation tunggal mudah diaudit & diverifikasi

---

Kalau kamu setuju, next step yang paling pas:

1. aku bikinkan **interface & skeleton** `SponsorVault.sol`, `VotingRoomImplementation.sol`, `RoomFactory.sol` (clone + initialize),
2. lalu kita mapping ke kontrak kamu yang sudah ada (RoomFactory/VotingRoom/Forwarder) dan lakukan refactor yang diperlukan.
