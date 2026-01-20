# 🚀 Smart Contract Deployment Guide - Step by Step

## 📋 Prerequisites

### 1. **Get Sepolia ETH (Testnet)**
Kamu butuh ETH Sepolia untuk deploy contracts (~0.05 ETH cukup).

**Cara dapat gratis:**
- **Alchemy Faucet:** https://sepoliafaucet.com/
- **Infura Faucet:** https://www.infura.io/faucet/sepolia
- **QuickNode Faucet:** https://faucet.quicknode.com/ethereum/sepolia

**Steps:**
1. Connect MetaMask wallet
2. Switch network ke **Sepolia**
3. Copy address kamu
4. Request ETH (biasanya dapat 0.5 ETH)
5. Wait ~1-2 menit

**Cara check balance:**
1. Buka MetaMask
2. Pastikan network = Sepolia
3. Lihat balance (harus > 0)

### 2. **Setup Remix IDE**
1. Buka: https://remix.ethereum.org
2. Jangan perlu install apa-apa (web-based)

---

## 🔧 Deployment Steps

### Phase 1: Upload Contracts ke Remix

#### Step 1: Create Workspace
1. Di Remix, klik **File Explorer** (icon folder, kiri atas)
2. Klik **Create New Workspace**
3. Name: "SecureVote-v2"
4. Template: **Blank**
5. Klik **OK**

#### Step 2: Upload Contract Files
1. Klik kanan di File Explorer → **New Folder** → `contracts`
2. Upload 4 files dari folder ini ke Remix:

**Path di komputermu:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\contracts\v2\
```

**Upload files ini:**
- ✅ MinimalForwarder.sol
- ✅ SponsorVault.sol
- ✅ VotingRoom.sol
- ✅ RoomFactory.sol

**Cara upload:**
1. Klik kanan folder `contracts` → **Upload Files**
2. Pilih keempat file `.sol`
3. Atau copy-paste isi file ke Remix (create file → paste code)

#### Step 3: Compile Contracts
1. Klik **Solidity Compiler** (icon S di sidebar)
2. Settings:
   - Compiler: **0.8.20** atau **0.8.26** (terakhir)
   - EVM Version: **paris** (default)
   - Optimization: **Enabled** ✅
   - Runs: **200**
3. Klik **Compile MinimalForwarder.sol** → wait for green checkmark ✅
4. Klik **Compile SponsorVault.sol** → ✅
5. Klik **Compile VotingRoom.sol** → ✅
6. Klik **Compile RoomFactory.sol** → ✅

**Troubleshooting:**
- Red X error? Check OpenZeppelin imports (should auto-install)
- Warning kuning? OK, abaikan (bukan error)

---

### Phase 2: Deploy to Sepolia

#### Step 4: Connect MetaMask
1. Klik **Deploy & Run Transactions** (icon Ethereum di sidebar)
2. Environment: Pilih **Injected Provider - MetaMask**
3. MetaMask popup akan muncul → Klik **Connect**
4. Check:
   - Network harus **Sepolia** (11155111)
   - Balance harus > 0.01 ETH
   - Jika salah network, switch di MetaMask

#### Step 5: Deploy MinimalForwarder
1. Di dropdown "CONTRACT": Pilih **MinimalForwarder**
2. Constructor parameters: **KOSONG** (no input needed)
3. Klik **Deploy** (tombol orange)
4. MetaMask popup → Check gas fee → **Confirm**
5. Wait ~15-30 detik
6. **COPY ADDRESS** dari "Deployed Contracts" section
   - Contoh: `0x1234...5678`
   - Save ke notepad:
     ```
     MinimalForwarder: 0x1234...5678
     ```

#### Step 6: Deploy SponsorVault
1. Di dropdown "CONTRACT": Pilih **SponsorVault**
2. Constructor parameters (isi 3 values):
   ```
   _OVERHEADBPS: 1000
   _REGISTRATIONFEEWEI: 10000000000000000
   _PLATFORMFEEBPS: 500
   ```
   
   **Penjelasan:**
   - `1000` = 10% overhead untuk relayer
   - `10000000000000000` = 0.01 ETH registration fee (18 zeros)
   - `500` = 5% platform fee
   
3. Klik **Deploy**
4. Confirm di MetaMask
5. Wait ~15-30 detik
6. **COPY ADDRESS** → Save:
   ```
   SponsorVault: 0xabcd...ef01
   ```

#### Step 7: Deploy VotingRoom (Implementation)
1. Di dropdown "CONTRACT": Pilih **VotingRoom**
2. Constructor parameters (isi 1 value):
   ```
   TRUSTEDFORWARDER: [paste MinimalForwarder address dari Step 5]
   ```
   
   Contoh:
   ```
   TRUSTEDFORWARDER: 0x1234567890123456789012345678901234567890
   ```

3. Klik **Deploy**
4. Confirm di MetaMask
5. Wait ~15-30 detik
6. **COPY ADDRESS** → Save:
   ```
   VotingRoom: 0x5678...9abc
   ```

⚠️ **PENTING:** Jangan initialize VotingRoom ini! Ini cuma template untuk clone.

#### Step 8: Deploy RoomFactory
1. Di dropdown "CONTRACT": Pilih **RoomFactory**
2. Constructor parameters (isi 3 values):
   ```
   _VOTINGROOMIMPLEMENTATION: [VotingRoom address dari Step 7]
   _SPONSORVAULT: [SponsorVault address dari Step 6]
   _TRUSTEDFORWARDER: [MinimalForwarder address dari Step 5]
   ```

   Contoh lengkap:
   ```
   _VOTINGROOMIMPLEMENTATION: 0x5678901234567890123456789012345678901234
   _SPONSORVAULT: 0xabcdef0123456789012345678901234567890123
   _TRUSTEDFORWARDER: 0x1234567890123456789012345678901234567890
   ```

3. Klik **Deploy**
4. Confirm di MetaMask (gas lebih tinggi, normal)
5. Wait ~20-40 detik
6. **COPY ADDRESS** → Save:
   ```
   RoomFactory: 0xdef0...1234
   ```

---

### Phase 3: Verify Deployment

#### Step 9: Test Contract Calls
Di Remix, expand "Deployed Contracts":

**Test MinimalForwarder:**
1. Expand MinimalForwarder contract
2. Klik button **verify** (orange)
3. Input dummy data:
   ```
   req: (kosongkan, complex struct)
   signature: 0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
   ```
4. Harusnya tidak error (might return false, OK)

**Test SponsorVault:**
1. Expand SponsorVault
2. Klik **registrationFeeWei** (blue button)
3. Harusnya return: `10000000000000000` ✅

**Test RoomFactory:**
1. Expand RoomFactory
2. Klik **votingRoomImplementation** (blue)
3. Harusnya return: VotingRoom address ✅
4. Klik **sponsorVault** (blue)
5. Harusnya return: SponsorVault address ✅

**Semua berfungsi?** ✅ Deployment success!

---

### Phase 4: Save Addresses

#### Step 10: Update Frontend .env

Copy addresses ke file `.env` di frontend:

**Path:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\lovable_ai\vote-free-main\vote-free-main\.env
```

**Update:**
```env
# Network
VITE_NETWORK=sepolia

# Smart Contract Addresses (Sepolia)
VITE_MINIMAL_FORWARDER_ADDRESS=0x... (dari Step 5)
VITE_SPONSOR_VAULT_ADDRESS=0x... (dari Step 6)
VITE_VOTING_ROOM_IMPLEMENTATION_ADDRESS=0x... (dari Step 7)
VITE_ROOM_FACTORY_ADDRESS=0x... (dari Step 8)
```

#### Step 11: Save to Project Documentation

Buat file baru di `/Addresses/` folder:

**Path:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\Addresses\2_sepoliaAddresses.txt
```

**Content:**
```
===========================================
SecureVote v2 - Sepolia Deployment
===========================================
Network: Sepolia Testnet (Chain ID: 11155111)
Deployed: [TANGGAL]
Deployer: [YOUR WALLET ADDRESS]

===========================================
Contract Addresses:
===========================================

MinimalForwarder:
0x...

SponsorVault:
0x...
- Registration Fee: 0.01 ETH
- Overhead: 10%
- Platform Fee: 5%

VotingRoom (Implementation):
0x...

RoomFactory:
0x...

===========================================
Etherscan Links:
===========================================

MinimalForwarder:
https://sepolia.etherscan.io/address/0x...

SponsorVault:
https://sepolia.etherscan.io/address/0x...

VotingRoom:
https://sepolia.etherscan.io/address/0x...

RoomFactory:
https://sepolia.etherscan.io/address/0x...

===========================================
Configuration Used:
===========================================

SponsorVault Constructor:
- overheadBps: 1000 (10%)
- registrationFeeWei: 10000000000000000 (0.01 ETH)
- platformFeeBps: 500 (5%)

Compiler:
- Version: 0.8.20
- Optimization: Enabled (200 runs)
- EVM: Paris

===========================================
Next Steps:
===========================================

1. ✅ Contracts deployed
2. ⏳ Update frontend .env
3. ⏳ Test create room from frontend
4. ⏳ Add relayer to SponsorVault allowlist
5. ⏳ Deploy relayer backend service

===========================================
```

---

## 🔐 Security Checklist

### After Deployment:
- [ ] Save all addresses securely (backup!)
- [ ] Verify contracts on Etherscan (optional, for transparency)
- [ ] Test create room via Remix (before frontend)
- [ ] NEVER share private key!
- [ ] Backup deployment addresses (multiple locations)

### Verify on Etherscan (Optional):
1. Go to: https://sepolia.etherscan.io/
2. Search your contract address
3. Click "Contract" tab → "Verify & Publish"
4. Select:
   - Compiler: 0.8.20
   - Optimization: Yes
   - License: MIT
5. Paste contract code → Submit
6. Repeat for all 4 contracts

---

## 🧪 Test Deployment (Before Frontend)

### Test 1: Create Room via Remix

1. Di RoomFactory deployed contract
2. Expand **createRoom** function
3. Input:
   ```
   ROOMNAME: "Test Room 1"
   VALUE: 10000000000000000 (0.01 ETH)
   ```
4. Klik **transact**
5. Confirm di MetaMask
6. Wait ~15 detik
7. Check transaction di Etherscan
8. Harusnya ada event **RoomRegistered** ✅

### Test 2: Query Rooms

1. Di RoomFactory
2. Klik **getRoomCount**
3. Harusnya return: `1` ✅
4. Klik **getRoomAt** → input `0`
5. Return: address room baru ✅

**Semua test pass?** Siap untuk frontend! 🎉

---

## ❌ Troubleshooting

### Error: "Insufficient funds"
**Solution:** Minta Sepolia ETH lagi dari faucet

### Error: "Creation of X errored"
**Solution:** 
1. Check constructor parameters (harus exact)
2. Pastikan address pakai `0x` prefix
3. Pastikan tidak ada spasi di input

### Error: "Gas estimation failed"
**Solution:**
1. Check network (harus Sepolia)
2. Increase gas limit manual
3. Try again (sometimes network issue)

### Transaction pending lama
**Solution:**
1. Wait max 5 menit
2. Check Etherscan: https://sepolia.etherscan.io/
3. Paste transaction hash
4. Lihat status

### Wrong network
**Solution:**
1. Buka MetaMask
2. Klik network dropdown (atas)
3. Pilih **Sepolia**
4. Refresh Remix

---

## 📊 Gas Cost Estimation

| Contract | Est. Gas | Est. Cost (20 gwei) |
|----------|----------|---------------------|
| MinimalForwarder | ~500k | ~0.01 ETH |
| SponsorVault | ~2M | ~0.04 ETH |
| VotingRoom | ~4M | ~0.08 ETH |
| RoomFactory | ~1.5M | ~0.03 ETH |
| **TOTAL** | **~8M** | **~0.16 ETH** |

**Actual cost varies** based on gas price. Sepolia biasanya ~1-5 gwei (gratis/murah).

---

## ✅ Success Checklist

Setelah deployment berhasil:

- [ ] ✅ MinimalForwarder deployed
- [ ] ✅ SponsorVault deployed (dengan 3 parameters)
- [ ] ✅ VotingRoom deployed (dengan forwarder address)
- [ ] ✅ RoomFactory deployed (dengan 3 addresses)
- [ ] ✅ Test contract calls (read functions)
- [ ] ✅ Test create room
- [ ] ✅ Addresses saved to `/Addresses/2_sepoliaAddresses.txt`
- [ ] ✅ Frontend `.env` updated
- [ ] ✅ Backup addresses (email/cloud/USB)

**All checked?** You're ready to connect frontend! 🚀

---

## 🔗 Useful Links

**Network Info:**
- Chain ID: 11155111
- RPC: https://rpc.sepolia.org
- Explorer: https://sepolia.etherscan.io/

**Faucets:**
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia
- https://faucet.quicknode.com/ethereum/sepolia

**Tools:**
- Remix: https://remix.ethereum.org
- MetaMask: https://metamask.io
- Etherscan: https://sepolia.etherscan.io/

---

Good luck! Deploy dengan hati-hati dan save semua addresses! 💎
