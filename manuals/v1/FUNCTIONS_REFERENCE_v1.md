# 📚 Smart Contract Functions Reference

Dokumentasi lengkap semua fungsi dari setiap contract dengan penjelasan detail dan use case.

---

## 🎨 Kode Warna di Remix

| Warna | Jenis | Butuh Gas? | Ubah State? |
|-------|-------|------------|-------------|
| 🟠 Orange/Red | Write Function | ✅ Ya | ✅ Ya |
| 🔵 Blue | View/Read Function | ❌ Tidak | ❌ Tidak |

---

# 1️⃣ MinimalForwarder

Contract untuk ERC-2771 meta-transactions (gasless voting).

## 🟠 Execute (Write)

```solidity
function execute(tuple req, bytes signature)
```

**Fungsi:** Menjalankan meta-transaction yang sudah di-sign oleh user.

**Parameters:**
- `req`: ForwardRequest struct berisi:
  - `from`: address voter yang sign
  - `to`: address VotingRoom
  - `value`: jumlah ETH (biasanya 0)
  - `gas`: gas limit
  - `nonce`: nonce voter
  - `data`: encoded function call (vote)
- `signature`: tanda tangan dari voter

**Kapan Dipakai:**
- Di **production** untuk gasless voting
- Relayer yang call fungsi ini
- Voter hanya sign off-chain (gratis)

**Contoh Use Case:**
```javascript
// Voter sign message off-chain
const signature = await voter.signTypedData(...)

// Relayer broadcast
await forwarder.execute(forwardRequest, signature)
```

**⚠️ Note:** Untuk testing di Remix, skip ini dan langsung call `vote()`.

---

## 🔵 eip712Domain (View)

**Fungsi:** Mendapatkan EIP-712 domain separator info.

**Return:** Domain info untuk signing.

**Kapan Dipakai:** Setup signature di frontend/relayer.

---

## 🔵 getNonce (View)

```solidity
function getNonce(address from) returns (uint256)
```

**Fungsi:** Cek nonce terakhir dari address.

**Kapan Dipakai:** Sebelum bikin ForwardRequest baru.

**Contoh:**
```javascript
const nonce = await forwarder.getNonce(voterAddress)
// nonce = 0 (belum pernah vote)
```

---

## 🔵 verify (View)

```solidity
function verify(tuple req, bytes signature) returns (bool)
```

**Fungsi:** Validasi signature valid atau tidak.

**Return:** `true` jika valid, `false` jika tidak.

**Kapan Dipakai:** Pre-check sebelum execute.

**Contoh:**
```javascript
const isValid = await forwarder.verify(req, signature)
if (!isValid) return "Invalid signature"
```

---

# 2️⃣ SponsorVault

Contract untuk escrow deposit gas per room dan settlement relayer.

## 🟠 acceptRegistrationFee (Write)

```solidity
function acceptRegistrationFee() payable
```

**Fungsi:** Terima registration fee dari RoomFactory.

**Kapan Dipakai:** Otomatis dipanggil saat `RoomFactory.createRoom()`.

**⚠️ Note:** Jangan panggil manual, RoomFactory yang handle.

---

## 🟠 renounceOwnership (Write)

**Fungsi:** Hapus owner (buang kontrol contract).

**⚠️ BAHAYA:** Jangan gunakan! Contract jadi tidak bisa diatur.

---

## 🟠 setOverheadBps (Write)

```solidity
function setOverheadBps(uint256 newBps)
```

**Fungsi:** Set overhead percentage untuk relayer (basis points).

**Parameters:**
- `newBps`: overhead dalam basis points (1000 = 10%)

**Kapan Dipakai:** Platform owner adjust profit margin relayer.

**Contoh:**
```javascript
// Set overhead 15%
setOverheadBps(1500)
```

**Access:** Only platform owner.

---

## 🟠 setPlatformFee (Write)

```solidity
function setPlatformFee(uint256 newBps)
```

**Fungsi:** Set platform fee percentage (basis points).

**Parameters:**
- `newBps`: fee dalam basis points (500 = 5%)

**Kapan Dipakai:** Platform owner adjust revenue.

**Contoh:**
```javascript
// Set platform fee 3%
setPlatformFee(300)
```

**Access:** Only platform owner.

---

## 🟠 setRegistrationFee (Write)

```solidity
function setRegistrationFee(uint256 newFee)
```

**Fungsi:** Set biaya registrasi room (wei).

**Parameters:**
- `newFee`: biaya dalam wei

**Kapan Dipakai:** Platform owner adjust harga buat room.

**Contoh:**
```javascript
// Set fee 0.02 ETH
setRegistrationFee("20000000000000000")
```

**Access:** Only platform owner.

---

## 🟠 setRelayer (Write)

```solidity
function setRelayer(address relayer, bool allowed)
```

**Fungsi:** Tambah atau hapus relayer dari allowlist.

**Parameters:**
- `relayer`: address relayer EOA
- `allowed`: `true` = allow, `false` = remove

**Kapan Dipakai:** 
- Setup awal (allow relayer)
- Block relayer jahat

**Contoh:**
```javascript
// Add relayer
setRelayer("0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", true)

// Remove relayer
setRelayer("0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", false)
```

**Access:** Only platform owner.

---

## 🟠 settleAndWithdraw (Write)

```solidity
function settleAndWithdraw(
  address room,
  bytes32 actionId,
  uint256 chargedAmount
)
```

**Fungsi:** Settlement gas cost per vote dan withdraw ke relayer.

**Parameters:**
- `room`: address voting room
- `actionId`: keccak256(room, round, voter)
- `chargedAmount`: gas cost + overhead (wei)

**Kapan Dipakai:** 
- Setelah vote tx mined
- Relayer claim reimbursement

**Flow:**
```javascript
// 1. Relayer broadcast vote tx
const tx = await votingRoom.vote(candidateId)

// 2. Get receipt
const receipt = await tx.wait()
const gasCost = receipt.gasUsed * receipt.effectiveGasPrice

// 3. Calculate charge
const overhead = gasCost * overheadBps / 10000
const chargedAmount = gasCost + overhead

// 4. Settle
const actionId = keccak256(room, round, voter)
await vault.settleAndWithdraw(room, actionId, chargedAmount)
```

**Access:** Only allowlisted relayer.

**Validasi:**
- ✅ Relayer in allowlist
- ✅ actionId belum settled
- ✅ roomBalance cukup

---

## 🟠 topup (Write - Payable)

```solidity
function topup(address room) payable
```

**Fungsi:** Top up deposit room untuk gas voting.

**Parameters:**
- `room`: address voting room

**Kapan Dipakai:** 
- Setup room baru
- Deposit habis, perlu isi ulang

**Contoh:**
```javascript
// Topup 0.1 ETH
topup("0xRoomAddress", { value: "100000000000000000" })
```

**Access:** Siapa saja (biasanya room admin).

**⚠️ Note:** Ini deposit **refundable** (bisa ditarik kembali).

---

## 🟠 transferOwnership (Write)

```solidity
function transferOwnership(address newOwner)
```

**Fungsi:** Transfer ownership ke address baru.

**Access:** Only current owner.

---

## 🟠 withdraw (Write)

```solidity
function withdraw(address room, uint256 amount)
```

**Fungsi:** Withdraw deposit room (refund).

**Parameters:**
- `room`: address voting room
- `amount`: jumlah yang mau ditarik (wei)

**Kapan Dipakai:** 
- Room selesai, mau ambil sisa deposit
- Emergency withdraw

**Validasi:**
- ✅ Caller adalah room contract (room admin call via room)
- ✅ Room state bukan Active
- ✅ Balance cukup

**Platform fee:** Dipotong saat withdraw.

**Contoh:**
```javascript
// Withdraw 0.05 ETH
// ⚠️ Call dari VotingRoom contract, bukan direct!
// Di VotingRoom belum ada fungsi withdraw, perlu ditambah
```

**⚠️ Note:** Saat ini withdraw harus via room contract, tapi VotingRoom belum implement fungsi untuk ini.

---

## 🟠 withdrawPlatformFee (Write)

```solidity
function withdrawPlatformFee(address to)
```

**Fungsi:** Withdraw platform fee yang terkumpul.

**Parameters:**
- `to`: address penerima

**Kapan Dipakai:** Platform owner ambil revenue.

**Access:** Only platform owner.

---

## 🔵 isRelayer (View)

```solidity
function isRelayer(address relayer) returns (bool)
```

**Fungsi:** Check apakah address adalah relayer.

**Return:** `true` jika allowed, `false` jika tidak.

---

## 🔵 overheadBps (View)

**Return:** Overhead percentage dalam basis points.

**Contoh:** `1000` = 10%

---

## 🔵 owner (View)

**Return:** Address platform owner.

---

## 🔵 platformFeeAccrued (View)

**Return:** Total platform fee yang terkumpul (wei).

---

## 🔵 platformFeeBps (View)

**Return:** Platform fee percentage dalam basis points.

---

## 🔵 registrationFeeWei (View)

**Return:** Biaya registrasi room (wei).

---

## 🔵 roomBalance (View)

```solidity
function roomBalance(address room) returns (uint256)
```

**Fungsi:** Check deposit balance room.

**Return:** Balance dalam wei.

**Contoh:**
```javascript
const balance = await vault.roomBalance(roomAddress)
// balance = 100000000000000000 (0.1 ETH)
```

---

## 🔵 settled (View)

```solidity
function settled(bytes32 actionId) returns (bool)
```

**Fungsi:** Check apakah actionId sudah di-settle.

**Return:** `true` jika sudah, `false` jika belum.

**Kapan Dipakai:** Prevent double settlement.

---

# 3️⃣ VotingRoom

Contract untuk voting logic per room (clone).

## 🟠 addCandidate (Write)

```solidity
function addCandidate(uint256 candidateId, string name)
```

**Fungsi:** Tambah kandidat ke room.

**Parameters:**
- `candidateId`: ID kandidat (unique, pilih sendiri)
- `name`: Nama kandidat

**Kapan Dipakai:** Setup room sebelum voting.

**State:** Hanya di Inactive/Closed.

**Contoh:**
```javascript
addCandidate(1, "Alice")
addCandidate(2, "Bob")
addCandidate(3, "Charlie")
```

**Access:** Only room admin.

---

## 🟠 addVoter (Write)

```solidity
function addVoter(address voter)
```

**Fungsi:** Tambah voter ke registry.

**Parameters:**
- `voter`: Address voter

**Kapan Dipakai:** Setup room sebelum voting.

**State:** Hanya di Inactive/Closed.

**Contoh:**
```javascript
addVoter("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4")
addVoter("0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2")
```

**Access:** Only room admin.

---

## 🟠 endVoting (Write)

```solidity
function endVoting()
```

**Fungsi:** End voting round (finalize).

**Kapan Dipakai:** Setelah semua voter selesai vote.

**State:** Hanya di Active → jadi Ended.

**Contoh:**
```javascript
// Stop accepting votes
endVoting()
```

**Access:** Only room admin.

**Bedanya dengan stopVoting():**
- `stopVoting()`: pause sementara
- `endVoting()`: finalize + catat timestamp

---

## 🟠 closeRound (Write)

```solidity
function closeRound(uint256 winnerId)
```

**Fungsi:** Tutup round dan declare winner.

**Parameters:**
- `winnerId`: ID kandidat yang menang

**Kapan Dipakai:** Setelah endVoting, hitung hasil.

**State:** Hanya di Ended → jadi Closed.

**Contoh:**
```javascript
// Declare winner
closeRound(1) // Alice wins
```

**Access:** Only room admin.

**⚠️ Note:** Admin yang tentukan winner (belum auto-calculate).

---

## 🟠 grantCredit (Write)

```solidity
function grantCredit(address voter, uint256 amount)
```

**Fungsi:** Beri vote credit ke voter.

**Parameters:**
- `voter`: Address voter
- `amount`: Jumlah credit (vote weight)

**Kapan Dipakai:** Setup atau re-grant setelah vote.

**State:** Hanya di Inactive/Closed.

**Contoh:**
```javascript
// Equal voting (1 person = 1 vote)
grantCredit(voter1, 1)
grantCredit(voter2, 1)

// Weighted voting (shareholder)
grantCredit(shareholder1, 1000) // 1000 saham
grantCredit(shareholder2, 500)  // 500 saham
```

**Access:** Only room admin.

**⚠️ Important:** Credit habis setelah vote, perlu grant lagi untuk round berikutnya.

---

## 🟠 initialize (Write)

```solidity
function initialize(
  address _roomAdmin,
  string _roomName,
  address _sponsorVault,
  address _trustedForwarder
)
```

**Fungsi:** Initialize room clone (pengganti constructor).

**⚠️ JANGAN PANGGIL MANUAL!**

Fungsi ini otomatis dipanggil oleh `RoomFactory.createRoom()`.

**Access:** One-time only (auto by factory).

---

## 🟠 prepareNextRound (Write) ✨

```solidity
function prepareNextRound()
```

**Fungsi:** Prepare round baru tanpa reset voter/candidate.

**Kapan Dipakai:** Setelah closeRound, mau lanjut voting lagi.

**State:** Hanya di Closed → jadi Inactive.

**Flow:**
```javascript
// Round 1 selesai
closeRound(1)

// Prepare round 2
prepareNextRound()

// Grant credit lagi (habis setelah vote)
grantCredit(voter1, 100)
grantCredit(voter2, 100)

// Start round 2
startVoting() // currentRound = 2
```

**Bedanya dengan resetRoom():**
- `prepareNextRound()`: Keep voter & candidate
- `resetRoom()`: Hapus semua, setup ulang

**Access:** Only room admin.

---

## 🟠 removeCandidate (Write)

```solidity
function removeCandidate(uint256 candidateId)
```

**Fungsi:** Hapus kandidat dari registry.

**Parameters:**
- `candidateId`: ID kandidat

**State:** Hanya di Inactive/Closed.

**Access:** Only room admin.

---

## 🟠 removeVoter (Write)

```solidity
function removeVoter(address voter)
```

**Fungsi:** Hapus voter dari registry.

**Parameters:**
- `voter`: Address voter

**State:** Hanya di Inactive/Closed.

**Access:** Only room admin.

---

## 🟠 resetRoom (Write)

```solidity
function resetRoom()
```

**Fungsi:** Reset room total (hapus semua voter & candidate).

**Kapan Dipakai:** Mau mulai dari nol (ganti tema voting).

**State:** Hanya di Closed → jadi Inactive.

**Efek:**
- ❌ Semua voter jadi invalid
- ❌ Semua candidate jadi invalid
- ❌ Credit reset ke 0
- ✅ History tetap tersimpan

**Flow:**
```javascript
resetRoom()

// Setup ulang
addVoter(...)
addCandidate(...)
grantCredit(...)
```

**Access:** Only room admin.

---

## 🟠 setMaxCostPerVote (Write)

```solidity
function setMaxCostPerVote(uint256 newCost)
```

**Fungsi:** Set gas cost cap per vote.

**Parameters:**
- `newCost`: Max gas cost dalam wei

**Kapan Dipakai:** 
- Setup awal
- Adjust saat gas price tinggi

**Contoh:**
```javascript
// Set max 0.05 ETH per vote
setMaxCostPerVote("50000000000000000")
```

**Guna:**
- Relayer pre-check: reject vote jika estimasi > max
- Safety: prevent gas spike attack

**Access:** Only room admin.

---

## 🟠 startVoting (Write)

```solidity
function startVoting()
```

**Fungsi:** Mulai voting round baru.

**Kapan Dipakai:** Setelah setup selesai.

**State:** Hanya di Inactive → jadi Active.

**Efek:**
- `currentRound++` (increment)
- State jadi Active
- Voter bisa mulai vote

**Contoh:**
```javascript
startVoting()
// currentRound = 1 (pertama kali)
// state = Active
```

**Access:** Only room admin.

---

## 🟠 stopVoting (Write)

```solidity
function stopVoting()
```

**Fungsi:** Stop voting sementara (pause).

**Kapan Dipakai:** Emergency pause.

**State:** Hanya di Active → jadi Ended.

**Bedanya dengan endVoting():**
- `stopVoting()`: Pause saja
- `endVoting()`: Finalize dengan timestamp

**Access:** Only room admin.

---

## 🟠 vote (Write)

```solidity
function vote(uint256 candidateId)
```

**Fungsi:** Cast vote untuk kandidat.

**Parameters:**
- `candidateId`: ID kandidat yang dipilih

**Kapan Dipakai:** Saat voting Active.

**State:** Hanya di Active.

**Flow:**
```javascript
// ⚠️ Switch account ke voter dulu!
vote(1) // Vote for candidate ID 1
```

**Validasi:**
- ✅ State = Active
- ✅ Voter eligible
- ✅ Belum vote di round ini
- ✅ Candidate valid
- ✅ Credit > 0

**Efek:**
- Credit habis semua (jadi 0)
- Vote recorded
- Emit VoteCast event dengan actionId

**Access:** Any eligible voter.

**⚠️ Testing:** Di Remix, langsung call dari voter account.

**⚠️ Production:** Harus via `MinimalForwarder.execute()`.

---

## 🔵 candidateName (View)

```solidity
function candidateName(uint256 candidateId) returns (string)
```

**Return:** Nama kandidat.

---

## 🔵 candidateRegistryVersion (View)

**Return:** Versi registry kandidat saat ini.

**Guna:** Internal versioning (reset strategy).

---

## 🔵 candidateVersion (View)

```solidity
function candidateVersion(uint256 candidateId) returns (uint256)
```

**Return:** Versi kandidat (untuk validasi).

---

## 🔵 currentRound (View)

**Return:** Round number saat ini.

**Contoh:** `1`, `2`, `3`, ...

---

## 🔵 getRoundSummary (View)

```solidity
function getRoundSummary(uint256 round) returns (RoundSummary)
```

**Return:** Summary round (winner, votes, timestamp).

**Contoh:**
```javascript
const summary = await room.getRoundSummary(1)
// {
//   winnerId: 1,
//   totalVotesWeight: 500,
//   startAt: 1705660800,
//   endAt: 1705664400,
//   closed: true
// }
```

---

## 🔵 getVotes (View)

```solidity
function getVotes(uint256 round, uint256 candidateId) returns (uint256)
```

**Return:** Total votes untuk kandidat di round tertentu.

**Contoh:**
```javascript
const votes = await room.getVotes(1, 1)
// votes = 300 (candidate 1 dapat 300 vote weight)
```

---

## 🔵 initialized (View)

**Return:** Apakah room sudah di-initialize.

---

## 🔵 isCandidateValid (View)

```solidity
function isCandidateValid(uint256 candidateId) returns (bool)
```

**Return:** Apakah kandidat masih valid (belum di-remove).

---

## 🔵 isTrustedForwarder (View)

```solidity
function isTrustedForwarder(address forwarder) returns (bool)
```

**Return:** Apakah address adalah trusted forwarder.

---

## 🔵 isVoterEligible (View)

```solidity
function isVoterEligible(address voter) returns (bool)
```

**Return:** Apakah voter eligible untuk vote.

**Contoh:**
```javascript
const eligible = await room.isVoterEligible(voterAddress)
// eligible = true
```

---

## 🔵 lastVotedRound (View)

```solidity
function lastVotedRound(address voter) returns (uint256)
```

**Return:** Round terakhir voter vote.

**Guna:** Anti double-vote validation.

---

## 🔵 maxCostPerVote (View)

**Return:** Max gas cost per vote (wei).

---

## 🔵 roomAdmin (View)

**Return:** Address room admin (creator).

---

## 🔵 roomName (View)

**Return:** Nama room.

---

## 🔵 roundSummaries (View)

```solidity
function roundSummaries(uint256 round) returns (...)
```

**Return:** Raw summary data (sama seperti getRoundSummary).

---

## 🔵 roundVotes (View)

```solidity
function roundVotes(uint256 round, uint256 candidateId) returns (uint256)
```

**Return:** Votes untuk kandidat (sama seperti getVotes).

---

## 🔵 sponsorVault (View)

**Return:** Address SponsorVault contract.

---

## 🔵 state (View)

**Return:** State room saat ini (enum).

| Value | State |
|-------|-------|
| 0 | Inactive |
| 1 | Active |
| 2 | Ended |
| 3 | Closed |

---

## 🔵 totalCreditsGranted (View)

**Return:** Total credit yang pernah di-grant.

---

## 🔵 totalCreditsUsed (View)

**Return:** Total credit yang sudah dipakai (voted).

---

## 🔵 trustedForwarder (View)

**Return:** Address MinimalForwarder.

---

## 🔵 voterCredit (View)

```solidity
function voterCredit(address voter) returns (uint256)
```

**Return:** Credit balance voter saat ini.

**Contoh:**
```javascript
const credit = await room.voterCredit(voterAddress)
// credit = 100 (sebelum vote)
// credit = 0 (setelah vote)
```

---

## 🔵 voterRegistryVersion (View)

**Return:** Versi registry voter saat ini.

---

## 🔵 voterVersion (View)

```solidity
function voterVersion(address voter) returns (uint256)
```

**Return:** Versi voter (untuk validasi).

---

# 4️⃣ RoomFactory

Contract untuk create voting room (EIP-1167 clone).

## 🟠 createRoom (Write - Payable)

```solidity
function createRoom(string roomName) payable returns (address room)
```

**Fungsi:** Buat voting room baru (clone).

**Parameters:**
- `roomName`: Nama room

**Value:** Minimal `registrationFeeWei` (default 0.01 ETH).

**Return:** Address room yang baru dibuat.

**Flow:**
```javascript
// Create room dengan fee 0.01 ETH
const tx = await factory.createRoom("MyRoom", {
  value: "10000000000000000"
})

// Lihat event untuk dapat room address
const receipt = await tx.wait()
const event = receipt.events.find(e => e.event === 'RoomRegistered')
const roomAddress = event.args[0]
```

**Efek:**
- Deploy clone contract (murah ~45k gas)
- Auto-initialize clone
- Forward fee ke SponsorVault
- Emit RoomRegistered event

**Access:** Siapa saja (bayar fee).

---

## 🟠 renounceOwnership (Write)

**Fungsi:** Hapus owner.

**⚠️ BAHAYA:** Jangan gunakan!

---

## 🟠 transferOwnership (Write)

**Fungsi:** Transfer ownership.

**Access:** Only owner.

---

## 🔵 allRooms (View)

```solidity
function allRooms(uint256 index) returns (address)
```

**Return:** Address room by index.

**Contoh:**
```javascript
const room0 = await factory.allRooms(0)
const room1 = await factory.allRooms(1)
```

---

## 🔵 getRoomAt (View)

```solidity
function getRoomAt(uint256 index) returns (address)
```

**Return:** Address room by index (sama seperti allRooms).

---

## 🔵 getRoomCount (View)

**Return:** Total jumlah room yang pernah dibuat.

**Contoh:**
```javascript
const count = await factory.getRoomCount()
// count = 5
```

---

## 🔵 getRoomsByAdmin (View)

```solidity
function getRoomsByAdmin(address admin) returns (address[])
```

**Return:** Array semua room yang dibuat oleh admin tertentu.

**Contoh:**
```javascript
const myRooms = await factory.getRoomsByAdmin(myAddress)
// myRooms = [0x..., 0x..., ...]
```

---

## 🔵 isRoom (View)

```solidity
function isRoom(address room) returns (bool)
```

**Return:** Apakah address adalah room valid dari factory ini.

**Guna:** Validasi room authenticity.

---

## 🔵 owner (View)

**Return:** Address factory owner.

---

## 🔵 predictRoomAddress (View)

```solidity
function predictRoomAddress(uint256 nonce) returns (address)
```

**Return:** Predicted address room (deterministic).

**⚠️ Note:** Untuk basic clone, prediction terbatas.

---

## 🔵 roomOwner (View)

```solidity
function roomOwner(address room) returns (address)
```

**Return:** Address admin yang buat room.

---

## 🔵 sponsorVault (View)

**Return:** Address SponsorVault.

---

## 🔵 trustedForwarder (View)

**Return:** Address MinimalForwarder.

---

## 🔵 votingRoomImplementation (View)

**Return:** Address VotingRoom implementation (template).

---

# 📊 Common Workflows

## Workflow 1: Setup Room Baru

```javascript
// 1. Create room
const tx = await factory.createRoom("MyRoom", { value: "10000000000000000" })
const receipt = await tx.wait()
const roomAddress = receipt.events[0].args[0]

// 2. Load room contract
const room = VotingRoom.at(roomAddress)

// 3. Add voters
await room.addVoter(voter1)
await room.addVoter(voter2)

// 4. Add candidates
await room.addCandidate(1, "Alice")
await room.addCandidate(2, "Bob")

// 5. Grant credits
await room.grantCredit(voter1, 100)
await room.grantCredit(voter2, 100)

// 6. Set max cost
await room.setMaxCostPerVote("50000000000000000")

// 7. Topup deposit
await vault.topup(roomAddress, { value: "100000000000000000" })
```

---

## Workflow 2: Voting Round

```javascript
// 1. Start voting
await room.startVoting()

// 2. Voters vote
await room.connect(voter1).vote(1)
await room.connect(voter2).vote(2)

// 3. End voting
await room.endVoting()

// 4. Declare winner
await room.closeRound(1) // Alice wins
```

---

## Workflow 3: Next Round (Continue)

```javascript
// After closeRound()

// 1. Prepare next round
await room.prepareNextRound()

// 2. Grant credit again
await room.grantCredit(voter1, 100)
await room.grantCredit(voter2, 100)

// 3. Start round 2
await room.startVoting()
```

---

## Workflow 4: Reset Room (Fresh Start)

```javascript
// After closeRound()

// 1. Reset
await room.resetRoom()

// 2. Setup from scratch
await room.addVoter(voter1)
await room.addCandidate(1, "Charlie")
await room.grantCredit(voter1, 100)

// 3. Start
await room.startVoting()
```

---

# 🎯 Quick Reference

## Access Control Summary

| Function | Access |
|----------|--------|
| SponsorVault.setRelayer | Platform Owner |
| SponsorVault.setOverheadBps | Platform Owner |
| SponsorVault.setPlatformFee | Platform Owner |
| SponsorVault.topup | Anyone (usually room admin) |
| SponsorVault.settleAndWithdraw | Allowlisted Relayer |
| VotingRoom.addVoter | Room Admin |
| VotingRoom.grantCredit | Room Admin |
| VotingRoom.startVoting | Room Admin |
| VotingRoom.vote | Eligible Voter |
| RoomFactory.createRoom | Anyone (pay fee) |

---

## State Machine Summary

```
Inactive → Active → Ended → Closed
    ↑                          ↓
    └──────────────────────────┘
      (prepareNextRound/resetRoom)
```

**Allowed Actions:**

| State | Can Do |
|-------|--------|
| Inactive | Setup (voter, candidate, credit) |
| Active | Vote only |
| Ended | Nothing (pause) |
| Closed | Next round or reset |

---

Semoga membantu! 🎉
