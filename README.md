# Web3 Gasless Voting System

Smart contracts implementation menggunakan **EIP-1167 (Minimal Proxy Clone)** dan **ERC-2771 (Meta-Transactions)**.

## 📁 Struktur Kontrak

### Singleton Contracts (Deploy 1x)
- **MinimalForwarder.sol** - ERC-2771 trusted forwarder untuk meta-transactions
- **SponsorVault.sol** - Escrow ETH deposit per room, settlement relayer, platform fees
- **VotingRoom.sol** - Logic contract (implementation) untuk voting room
- **RoomFactory.sol** - Factory untuk deploy room clones dengan EIP-1167

### Per-Room Contracts (Clone)
- Setiap room adalah **minimal proxy clone** dari VotingRoom implementation
- Storage terpisah per clone
- Biaya deploy sangat murah (~45k gas)

## 🔑 Fitur Utama

### Gasless Voting
- Voter **tidak bayar gas**
- Semua vote via allowlisted relayer
- Meta-transaction menggunakan ERC-2771

### Weighted Credit System
- VoteCredit = bobot suara
- Credit habis sekaligus saat vote
- Anti double-vote per round

### State Machine
```
Inactive → Active → Ended → Closed
```

### Settlement Model
- Per-vote settlement
- Relayer dibayar langsung dari SponsorVault
- Overhead + gas cost tracking

## 🚀 Setup & Deployment (Remix IDE)

### 1. Buka Remix IDE
Akses di: https://remix.ethereum.org

### 2. Upload Contracts
- Buat folder `contracts` di Remix workspace
- Copy semua file `.sol` dari folder `contracts/` ke Remix
- Remix akan auto-compile dengan compiler `^0.8.20`

### 3. Compile Settings
- Compiler: **0.8.20** atau lebih baru
- EVM Version: **Paris** atau **Shanghai**
- Optimization: **Enabled** (200 runs)

### 4. Deployment Flow (Urutan Penting!)

#### Step 1: Deploy MinimalForwarder
```
Contract: MinimalForwarder
Constructor: (kosong)
```

#### Step 2: Deploy SponsorVault
```
Contract: SponsorVault
Constructor:
  - _overheadBps: 1000 (10% overhead)
  - _registrationFeeWei: 10000000000000000 (0.01 ETH)
  - _platformFeeBps: 500 (5% platform fee)
```

#### Step 3: Deploy VotingRoom (Implementation)
```
Contract: VotingRoom
Constructor:
  - trustedForwarder: [address MinimalForwarder dari step 1]

⚠️ JANGAN initialize! Ini hanya template untuk clone.
```

#### Step 4: Deploy RoomFactory
```
Contract: RoomFactory
Constructor:
  - _votingRoomImplementation: [address VotingRoom dari step 3]
  - _sponsorVault: [address SponsorVault dari step 2]
  - _trustedForwarder: [address MinimalForwarder dari step 1]
```

#### Step 5: Add Relayer ke Allowlist
```
Contract: SponsorVault (dari step 2)
Function: setRelayer
  - relayer: [address relayer EOA]
  - allowed: true
```

#### Step 6: Create Room
```
Contract: RoomFactory (dari step 4)
Function: createRoom (payable)
  - roomName: "My First Room"
  - Value: 0.01 ETH (atau sesuai registrationFeeWei)
```

### 5. Testing di Remix

#### Setup Room
```javascript
// 1. Add voter
VotingRoom.addVoter("0xVoterAddress")

// 2. Add candidate
VotingRoom.addCandidate(1, "Candidate A")
VotingRoom.addCandidate(2, "Candidate B")

// 3. Grant credit
VotingRoom.grantCredit("0xVoterAddress", 100)

// 4. Set max cost
VotingRoom.setMaxCostPerVote(50000000000000000) // 0.05 ETH

// 5. Topup deposit
SponsorVault.topup(roomAddress) // Value: 0.1 ETH
```

#### Start Voting
```javascript
// Start round
VotingRoom.startVoting()

// Vote (via forwarder - requires relayer)
// Untuk testing, bisa langsung call vote() dari account voter
// Tapi di production HARUS via MinimalForwarder.execute()
VotingRoom.vote(1) // Vote for candidate ID 1
```

#### End Voting
```javascript
// Stop voting
VotingRoom.stopVoting()

// End voting
VotingRoom.endVoting()

// Close round
VotingRoom.closeRound(1) // Declare winner
```

#### Next Round (2 Options)

**Option A: Same Voters/Candidates (Continue)**
```javascript
// 1. Prepare next round (keep registry)
VotingRoom.prepareNextRound()

// 2. Grant credit lagi (credit habis setelah vote)
VotingRoom.grantCredit("0xVoterAddress", 100)

// 3. Start voting round baru
VotingRoom.startVoting() // currentRound auto increment
```

**Option B: Fresh Start (Reset All)**
```javascript
// 1. Reset (hapus semua voter & candidate)
VotingRoom.resetRoom()

// 2. Setup ulang dari awal
VotingRoom.addVoter("0xVoterAddress")
VotingRoom.addCandidate(1, "Candidate A")
VotingRoom.grantCredit("0xVoterAddress", 100)

// 3. Start voting
VotingRoom.startVoting()
```

### 6. Verifikasi di Remix

Gunakan tab **"Deployed Contracts"** untuk:
- Panggil fungsi `view` untuk cek state
- Monitor events di console
- Debug transaksi yang gagal

## 🔐 Security Features

- ✅ Reentrancy protection
- ✅ Access control (Ownable)
- ✅ No loops (versioning-based reset)
- ✅ One-time settlement per actionId
- ✅ Pre-check deposit buffer
- ✅ Fail-early gas estimation

## 📊 Gas Optimization

- **EIP-1167 clones** - Deploy room ~45k gas vs ~2M gas
- **No storage deletion loops** - Versioning pattern
- **Single vote settlement** - No batch processing overhead

## 🎯 Core Invariants

1. Voter tidak pernah bayar gas
2. Relayer tidak pernah rugi
3. 1 voter = 1 vote per round
4. VoteCredit habis sekali pakai
5. Deposit room tidak bisa negative
6. Settlement tidak bisa double
7. Gas spike tidak menyebabkan tx terjadi

## 📝 Next Steps

- [ ] Testing lengkap di Remix (Sepolia testnet)
- [ ] Integration dengan relayer backend
- [ ] Frontend development
- [ ] Gas optimization analysis
- [ ] Security audit preparation

## 📚 References

- [EIP-1167: Minimal Proxy Contract](https://eips.ethereum.org/EIPS/eip-1167)
- [ERC-2771: Secure Protocol for Native Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Remix IDE Documentation](https://remix-ide.readthedocs.io/)

## 💡 Tips Remix

1. **Compile Error**: Pastikan compiler version ≥ 0.8.20
2. **Import Error**: Remix auto-download OpenZeppelin dari GitHub
3. **Deploy Error**: Cek urutan deployment (harus sesuai step 1-4)
4. **Gas Error**: Gunakan JavaScript VM untuk testing awal (gratis)
5. **Testnet**: Deploy ke Sepolia untuk testing dengan faucet ETH

## ⚠️ Important Notes

- Contract **VotingRoom** di step 3 jangan di-initialize
- Clone dibuat otomatis via **RoomFactory.createRoom()**
- Untuk testing quick, bisa skip meta-transaction dan call **vote()** langsung
- Untuk production, **WAJIB** pakai MinimalForwarder.execute()
