# 🔄 Redeploy Guide - VotingRoom Update

Karena ada update di `VotingRoom.sol` (fungsi `prepareNextRound()`), berikut step redeploy di Remix.

---

## 📋 Yang Perlu Di-Redeploy

| Contract | Redeploy? | Alasan |
|----------|-----------|--------|
| MinimalForwarder | ❌ Tidak | Tidak ada perubahan |
| SponsorVault | ❌ Tidak | Tidak ada perubahan |
| **VotingRoom** | ✅ **YA** | Ada fungsi baru `prepareNextRound()` |
| **RoomFactory** | ✅ **YA** | Butuh address VotingRoom baru |

---

## 🚀 Step-by-Step Redeploy

### Prep: Save Address Lama (Optional)

Catat address yang sudah ada (untuk reference):
```
MinimalForwarder: 0x... (TETAP PAKAI INI)
SponsorVault: 0x... (TETAP PAKAI INI)
```

---

### Step 1: Compile Ulang VotingRoom.sol

1. **Buka Remix** → https://remix.ethereum.org
2. **Solidity Compiler** tab (ikon logo Solidity)
3. Pilih file `VotingRoom.sol`
4. **Compile** (atau auto-compile jika sudah enabled)
5. ✅ Pastikan **no errors**

---

### Step 2: Deploy VotingRoom (Implementation) Baru

1. **Deploy & Run Transactions** tab
2. **Environment**: JavaScript VM (untuk testing)
3. **Contract**: Pilih `VotingRoom`
4. **Constructor Parameters**:
   ```
   trustedForwarder: [paste address MinimalForwarder LAMA]
   ```
   Contoh: `0xd9145CCE52D386f254917e481eB44e9943F39138`
5. Klik **Deploy**
6. **📝 CATAT ADDRESS BARU**:
   ```
   VotingRoom (NEW): 0x...
   ```

---

### Step 3: Deploy RoomFactory Baru

1. Masih di tab **Deploy & Run Transactions**
2. **Contract**: Pilih `RoomFactory`
3. **Constructor Parameters**:
   ```
   _votingRoomImplementation: [paste VotingRoom address BARU dari Step 2]
   _sponsorVault: [paste SponsorVault address LAMA]
   _trustedForwarder: [paste MinimalForwarder address LAMA]
   ```
   
   Contoh:
   ```
   _votingRoomImplementation: 0xAbC123... (BARU)
   _sponsorVault: 0xdEf456... (LAMA)
   _trustedForwarder: 0x789GhI... (LAMA)
   ```
4. Klik **Deploy**
5. **📝 CATAT ADDRESS BARU**:
   ```
   RoomFactory (NEW): 0x...
   ```

---

### Step 4: Create Room Baru

1. Expand `RoomFactory` di **Deployed Contracts**
2. Function: **createRoom**
3. Parameters:
   ```
   roomName: "TestRoom-v2"
   ```
4. **Value**: `10000000000000000` wei (0.01 ETH)
5. Klik **transact**
6. **Lihat logs** → cari **RoomRegistered event**
7. **📝 CATAT ROOM ADDRESS**:
   ```
   Room Address: 0x...
   ```

---

### Step 5: Load Room Contract

1. **Contract**: Pilih `VotingRoom`
2. **At Address**: paste `Room Address` dari Step 4
3. Klik **At Address**
4. ✅ Sekarang `VotingRoom at 0x...` muncul di Deployed Contracts

---

### Step 6: Setup Room (Testing Flow)

Expand `VotingRoom at 0x...`:

#### 6.1 Add Voter
```
Function: addVoter
voter: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
(atau address test lain)
[Transact]
```

#### 6.2 Add Candidates
```
Function: addCandidate
candidateId: 1
name: "Alice"
[Transact]

candidateId: 2
name: "Bob"
[Transact]
```

#### 6.3 Grant Credit
```
Function: grantCredit
voter: 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4
amount: 100
[Transact]
```

#### 6.4 Set Max Cost (Optional)
```
Function: setMaxCostPerVote
newCost: 50000000000000000
[Transact]
```

---

### Step 7: Test Voting Flow

#### Round 1

```javascript
// 1. Start voting
startVoting() → [Transact]

// 2. Check state
state() → returns: 1 (Active)

// 3. Vote (switch ke voter account)
vote(1) → [Transact]

// 4. End voting
endVoting() → [Transact]

// 5. Close round
closeRound(1) → [Transact]
```

#### Round 2 - TEST prepareNextRound() ✨

```javascript
// 1. Prepare next round (FUNGSI BARU!)
prepareNextRound() → [Transact]
// Event: RoundPrepared(room, 2)

// 2. Grant credit lagi (voter sudah habis creditnya)
grantCredit("0x5B38...", 100) → [Transact]

// 3. Start voting round 2
startVoting() → [Transact]
// currentRound = 2

// 4. Vote
vote(2) → [Transact]

// 5. End & close
endVoting() → [Transact]
closeRound(2) → [Transact]
```

---

### Step 8: Verify Fungsi Baru

Check bahwa `prepareNextRound()` ada:

```javascript
// Di Deployed Contracts, expand VotingRoom
// Lihat di list functions, harus ada:
prepareNextRound() → [button]
```

✅ Kalau ada = redeploy sukses!

---

## 🧪 Testing Checklist

- [ ] VotingRoom baru berhasil di-deploy
- [ ] RoomFactory baru berhasil di-deploy
- [ ] Room baru berhasil dibuat via Factory
- [ ] Add voter/candidate berhasil
- [ ] Vote round 1 berhasil
- [ ] **prepareNextRound() berhasil** ✨
- [ ] Vote round 2 berhasil
- [ ] Voter & candidate tetap sama di round 2

---

## 📝 Summary Addresses (Template)

Isi setelah deploy:

```
=== DEPLOYMENT ADDRESSES ===

MinimalForwarder (reuse): 0x...
SponsorVault (reuse): 0x...

VotingRoom (NEW): 0x...
RoomFactory (NEW): 0x...

Test Room Address: 0x...
```

---

## 💡 Tips

1. **Save addresses** di notepad/file
2. **Jangan initialize** VotingRoom implementation
3. **Switch account** ke voter saat call `vote()`
4. **Check events** di console untuk debug
5. **Use JavaScript VM** untuk testing (gratis)

---

## 🐛 Troubleshooting

**Error: "Function not found: prepareNextRound"**
→ Belum compile/redeploy VotingRoom yang baru

**Error: "AlreadyInitialized"**
→ Jangan panggil `initialize()` di VotingRoom implementation

**Error: "InvalidState"**
→ Check `state()` → harus Closed sebelum `prepareNextRound()`

**Error: "OnlyRoomAdmin"**
→ Pastikan caller adalah address yang create room

---

Selamat testing! 🎉
