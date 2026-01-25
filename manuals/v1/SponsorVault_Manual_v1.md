# 📘 SponsorVault - User Manual

**Contract Type:** Escrow & Payment Handler  
**Purpose:** Menyimpan dana untuk bayar gas voting dan manage platform revenue

---

## 🎯 Executive Summary

SponsorVault adalah "kas/brankas" untuk menyimpan uang (ETH) yang digunakan untuk membayar gas fee voting. Setiap voting room punya "rekening" sendiri di vault ini. Admin room deposit uang, relayer yang pakai untuk bayar gas, dan platform owner yang atur settingan.

**Analogi:** Seperti rekening di bank - room admin deposit, relayer tarik untuk bayar gas, bank (platform) dapat fee.

---

## 👥 Siapa yang Menggunakan?

### 👔 Platform Owner - System Administrator
- Mengatur fee dan overhead
- Manage relayer allowlist
- Withdraw platform revenue

### 🎓 Room Admin - Voting Organizer
- Deposit ETH untuk gas voting
- Withdraw sisa deposit
- Monitor balance room

### 🚀 Relayer - Gas Provider
- Claim reimbursement setelah bayar gas vote
- Withdraw gas cost + overhead

---

## 🔧 Fungsi-Fungsi Utama

---

## 📊 Untuk Platform Owner

### 1. `setRelayer` 🟠

**Apa Itu?**  
Mengatur siapa yang boleh jadi relayer (allowlist).

**Kenapa Ada?**  
Security - hanya relayer terpercaya yang bisa claim gas reimbursement.

**Kapan Digunakan?**  
- Setup awal platform (add relayer pertama)
- Tambah relayer baru saat scale up
- Block relayer yang bermasalah

**Cara Pakai:**

#### Scenario 1: Tambah Relayer Baru

```javascript
Situasi: Platform mau hire relayer service baru

1. Platform owner login
2. Call setRelayer:
   - relayer: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"
   - allowed: true
3. Relayer sekarang bisa claim reimbursement
```

**Real Example:**
```
Platform "VoteChain" mau tambah relayer:
- Relayer A sudah ada (allowlisted)
- Hire Relayer B untuk handle lebih banyak traffic
- Owner call: setRelayer(RelayerB_Address, true)
- Relayer B sekarang bisa operate
```

#### Scenario 2: Block Relayer Bermasalah

```javascript
Situasi: Relayer ketahuan curang (overcharge gas)

1. Platform owner investigasi
2. Call setRelayer:
   - relayer: "0xRelayerJahat"
   - allowed: false
3. Relayer tidak bisa claim lagi
```

---

### 2. `setOverheadBps` 🟠

**Apa Itu?**  
Mengatur berapa persen keuntungan relayer di atas gas cost (basis points: 1000 = 10%).

**Kenapa Ada?**  
Relayer perlu profit untuk operasional - server, maintenance, dll.

**Kapan Digunakan?**  
- Setup awal (tentukan profit margin)
- Adjust saat gas price berubah drastis
- Competitive pricing vs platform lain

**Cara Pakai:**

#### Scenario: Adjust Overhead

```javascript
Situasi: Gas price naik, mau adjust overhead

1. Current overhead: 1000 (10%)
2. New strategy: lower overhead untuk attract user
3. Call setOverheadBps(500) // 5% overhead
4. Relayer sekarang dapat 5% profit instead of 10%
```

**Real Example:**
```
Platform "VoteChain":
- Gas cost 1 vote = 0.01 ETH
- Overhead 10% = 0.001 ETH
- Total charge = 0.011 ETH
- Relayer profit = 0.001 ETH

Setelah setOverheadBps(500):
- Gas cost 1 vote = 0.01 ETH
- Overhead 5% = 0.0005 ETH
- Total charge = 0.0105 ETH
- Relayer profit = 0.0005 ETH (lebih murah untuk user)
```

---

### 3. `setPlatformFee` 🟠

**Apa Itu?**  
Mengatur berapa persen platform fee saat room admin withdraw deposit.

**Kenapa Ada?**  
Platform revenue - biaya operasional server, development, support.

**Kapan Digunakan?**  
- Setup pricing strategy
- Promo (lower fee untuk attract user)
- Adjust revenue model

**Cara Pakai:**

#### Scenario: Platform Promo

```javascript
Situasi: Launch promo - platform fee turun

1. Normal platform fee: 500 (5%)
2. Promo periode: setPlatformFee(200) // 2%
3. Room admin withdraw lebih murah
4. Setelah promo: setPlatformFee(500) // back to 5%
```

**Real Example:**
```
Room admin "Budi" withdraw 1 ETH:

Platform fee 5%:
- Deposit: 1 ETH
- Platform cut: 0.05 ETH
- Budi terima: 0.95 ETH

Platform fee 2% (promo):
- Deposit: 1 ETH
- Platform cut: 0.02 ETH
- Budi terima: 0.98 ETH (lebih banyak!)
```

---

### 4. `setRegistrationFee` 🟠

**Apa Itu?**  
Mengatur biaya untuk create room baru (non-refundable).

**Kenapa Ada?**  
Prevent spam - orang tidak bisa bikin room asal-asalan gratis.

**Kapan Digunakan?**  
- Setup pricing awal
- Adjust saat platform mature
- Flash sale / promo

**Cara Pakai:**

#### Scenario: Adjust Pricing

```javascript
Situasi: Mau bikin platform lebih affordable

1. Current fee: 0.01 ETH (10000000000000000 wei)
2. New strategy: lower barrier to entry
3. Call setRegistrationFee("5000000000000000") // 0.005 ETH
4. Room creation jadi lebih murah
```

**Real Example:**
```
Sebelum: Create room = 0.01 ETH
- Organization kecil: "Mahal, skip"
- Organization besar: "OK, bayar"

Setelah setRegistrationFee(0.005 ETH):
- Organization kecil: "Affordable, lets try!"
- Organization besar: "Cheap, lets create 10 rooms"
- Platform: More users, more revenue total
```

---

### 5. `withdrawPlatformFee` 🟠

**Apa Itu?**  
Withdraw semua platform fee yang terkumpul.

**Kenapa Ada?**  
Platform owner perlu ambil revenue untuk operasional.

**Kapan Digunakan?**  
- Periodic (weekly/monthly)
- Emergency (butuh cash)
- Reinvestment

**Cara Pakai:**

#### Scenario: Monthly Withdrawal

```javascript
Situasi: End of month, withdraw revenue

1. Check platformFeeAccrued: 10 ETH
2. Call withdrawPlatformFee("0xOwnerAddress")
3. 10 ETH transfer ke owner
4. platformFeeAccrued reset to 0
```

**Real Example:**
```
Platform "VoteChain" bulan Januari:
- 100 rooms created × 0.01 ETH = 1 ETH (registration fee)
- 50 rooms withdraw × 5% fee = 2 ETH (withdraw fee)
- Total platformFeeAccrued = 3 ETH

Owner call withdrawPlatformFee:
- 3 ETH masuk ke owner wallet
- Digunakan untuk: bayar server, gaji dev, marketing
```

---

## 🎓 Untuk Room Admin

### 6. `topup` 🟠 (Payable)

**Apa Itu?**  
Deposit ETH ke room untuk bayar gas voting.

**Kenapa Ada?**  
Relayer perlu dibayar setelah cover gas vote - dana dari sini.

**Kapan Digunakan?**  
- Setup room baru (deposit awal)
- Deposit habis, perlu isi ulang
- Sebelum voting besar (banyak voter)

**Cara Pakai:**

#### Scenario 1: Setup Room Baru

```javascript
Situasi: Baru create room, mau prepare untuk 100 voter

1. Estimasi cost:
   - 1 vote = 0.01 ETH (gas + overhead)
   - 100 voters = 1 ETH total
   
2. Topup deposit:
   topup(roomAddress, { value: "1000000000000000000" }) // 1 ETH
   
3. Room siap untuk 100 votes
```

**Real Example:**
```
Room admin "University ABC" buat room pemilihan ketua BEM:
- Estimasi 500 mahasiswa akan vote
- Gas per vote ~0.008 ETH
- Total needed: 500 × 0.008 = 4 ETH
- Admin topup 5 ETH (buffer 1 ETH untuk safety)
```

#### Scenario 2: Refill Deposit

```javascript
Situasi: Voting ongoing, deposit hampir habis

1. Check roomBalance: 0.05 ETH (cuma cukup 5 vote lagi)
2. Masih ada 50 voter belum vote
3. Topup tambahan: 0.5 ETH
4. Total balance: 0.55 ETH (cukup untuk 50+ votes)
```

---

### 7. `withdraw` 🟠

**Apa Itu?**  
Tarik sisa deposit setelah voting selesai.

**Kenapa Ada?**  
Deposit adalah refundable - admin bisa ambil kembali sisa yang tidak terpakai.

**Kapan Digunakan?**  
- Voting selesai, mau ambil sisa
- Room tidak jadi dipakai
- Emergency (butuh dana kembali)

**Cara Pakai:**

#### Scenario: Voting Selesai

```javascript
Situasi: Voting selesai, mau ambil sisa deposit

1. Check roomBalance: 0.3 ETH (sisa dari 1 ETH deposit)
2. Call withdraw:
   - room: roomAddress
   - amount: "300000000000000000" // 0.3 ETH
   
3. Platform fee dipotong (5%):
   - Platform fee: 0.015 ETH
   - Admin terima: 0.285 ETH
```

**Real Example:**
```
Room admin "University ABC":
- Deposit awal: 5 ETH
- Dipakai voting: 3.2 ETH (400 voters voted)
- Sisa: 1.8 ETH

Withdraw 1.8 ETH:
- Platform fee 5% = 0.09 ETH
- Admin terima: 1.71 ETH
- Dana bisa dipakai untuk event lain
```

**⚠️ Limitasi Saat Ini:**  
Fungsi `withdraw()` harus dipanggil dari room contract, tapi VotingRoom belum implement wrapper function. Perlu ditambahkan:

```solidity
// TODO: Add to VotingRoom
function withdrawDeposit(uint256 amount) external onlyAdmin {
    ISponsorVault(sponsorVault).withdraw(address(this), amount);
}
```

---

## 🚀 Untuk Relayer

### 8. `settleAndWithdraw` 🟠

**Apa Itu?**  
Claim reimbursement gas + overhead setelah execute vote.

**Kenapa Ada?**  
Relayer bayar gas dari kantong sendiri - harus di-reimburse agar tidak rugi.

**Kapan Digunakan?**  
Setelah setiap vote transaction berhasil di-mine.

**Cara Pakai:**

#### Scenario: Claim Reimbursement per Vote

```javascript
Situasi: Relayer baru execute vote transaction

Step 1: Broadcast vote
const voteTx = await votingRoom.vote(candidateId)
const receipt = await voteTx.wait()

Step 2: Calculate gas cost
const gasUsed = receipt.gasUsed // 150000
const gasPrice = receipt.effectiveGasPrice // 50 gwei
const actualCost = gasUsed × gasPrice // 0.0075 ETH

Step 3: Calculate overhead
const overheadBps = await vault.overheadBps() // 1000 (10%)
const overhead = actualCost × overheadBps / 10000 // 0.00075 ETH
const chargedAmount = actualCost + overhead // 0.00825 ETH

Step 4: Generate actionId
const actionId = keccak256(roomAddress, currentRound, voterAddress)

Step 5: Settle and withdraw
await vault.settleAndWithdraw(
  roomAddress,
  actionId,
  chargedAmount
)

// Relayer receive 0.00825 ETH
// Profit = 0.00075 ETH
```

**Real Example:**
```
Relayer "RelayService A" process 1000 votes per day:

Per vote:
- Gas cost: 0.008 ETH
- Overhead 10%: 0.0008 ETH
- Total claim: 0.0088 ETH
- Profit: 0.0008 ETH

Daily:
- Total claim: 1000 × 0.0088 = 8.8 ETH
- Daily profit: 1000 × 0.0008 = 0.8 ETH
- Monthly profit: 0.8 × 30 = 24 ETH

Operating cost:
- Server: 1 ETH/month
- Maintenance: 2 ETH/month
- Net profit: 24 - 3 = 21 ETH/month
```

---

## 🔍 View Functions (Monitoring)

### 9. `roomBalance` 🔵

**Apa Itu?**  
Check sisa deposit room.

**Kenapa Ada?**  
Monitoring - admin perlu tau kapan perlu topup.

**Cara Pakai:**

#### Untuk Room Admin

```javascript
// Check balance sebelum voting
const balance = await vault.roomBalance(roomAddress)

if (balance < minRequired) {
  alert("Deposit low! Please topup before voting starts")
}
```

**Real Example:**
```
Voting Dashboard "University ABC":
┌─────────────────────────────┐
│ Room Balance: 0.45 ETH      │
│ Estimated votes left: 56    │
│ Total voters: 500           │
│ ⚠️ Warning: Topup needed!   │
│ [Topup Now]                 │
└─────────────────────────────┘
```

---

### 10. `settled` 🔵

**Apa Itu?**  
Check apakah vote sudah di-settle (prevent double claim).

**Kenapa Ada?**  
Security - relayer tidak bisa claim 2x untuk vote yang sama.

**Cara Pakai:**

#### Untuk Relayer

```javascript
const actionId = calculateActionId(room, round, voter)
const alreadySettled = await vault.settled(actionId)

if (alreadySettled) {
  console.log("Already claimed, skip")
  return
}

// Claim reimbursement
await vault.settleAndWithdraw(room, actionId, amount)
```

---

### 11. `isRelayer` 🔵

**Apa Itu?**  
Check apakah address adalah relayer yang diallowlist.

**Kenapa Ada?**  
Validation - frontend bisa cek relayer valid atau tidak.

**Cara Pakai:**

```javascript
// Before send request ke relayer
const isValid = await vault.isRelayer(relayerAddress)

if (!isValid) {
  alert("Warning: This is not an official relayer!")
}
```

---

### 12. `overheadBps` 🔵

**Apa Itu?**  
Check overhead percentage saat ini.

**Cara Pakai:**

```javascript
// Display to user
const overhead = await vault.overheadBps() // 1000
const percentage = overhead / 100 // 10%

console.log(`Relayer overhead: ${percentage}%`)
```

---

### 13. `platformFeeBps` 🔵

**Apa Itu?**  
Check platform fee percentage.

**Cara Pakai:**

```javascript
// Calculate withdraw amount
const platformFee = await vault.platformFeeBps() // 500 (5%)
const withdrawAmount = 1000000000000000000 // 1 ETH

const fee = withdrawAmount × platformFee / 10000 // 0.05 ETH
const receive = withdrawAmount - fee // 0.95 ETH

alert(`You will receive ${receive} ETH after 5% platform fee`)
```

---

### 14. `registrationFeeWei` 🔵

**Apa Itu?**  
Check biaya create room saat ini.

**Cara Pakai:**

```javascript
// Display to user before create room
const fee = await vault.registrationFeeWei()

alert(`Creating a room costs ${ethers.formatEther(fee)} ETH`)
```

---

### 15. `platformFeeAccrued` 🔵

**Apa Itu?**  
Total platform fee yang terkumpul.

**Untuk Platform Owner:**

```javascript
// Dashboard platform
const accrued = await vault.platformFeeAccrued()

console.log(`Platform revenue: ${ethers.formatEther(accrued)} ETH`)
```

---

## 📋 Complete Use Cases

### Use Case 1: Room Admin Setup Voting Event

**Actor:** Room Admin (University ABC)  
**Goal:** Prepare room untuk voting BEM

```
Step 1: Create Room
- createRoom("BEM Election 2026")
- Pay 0.01 ETH registration fee

Step 2: Estimate Cost
- Expected voters: 500
- Gas per vote: ~0.008 ETH
- Total needed: 500 × 0.008 = 4 ETH
- Add 20% buffer: 4.8 ETH

Step 3: Topup Deposit
- vault.topup(roomAddress, { value: 4.8 ETH })
- roomBalance now: 4.8 ETH

Step 4: Monitor During Voting
- Check roomBalance periodically
- If balance < 0.5 ETH → topup lagi

Step 5: After Voting
- 350 students voted (150 absent)
- Used: 350 × 0.008 = 2.8 ETH
- Remaining: 4.8 - 2.8 = 2 ETH

Step 6: Withdraw Remaining
- vault.withdraw(roomAddress, 2 ETH)
- Platform fee 5%: 0.1 ETH
- Receive: 1.9 ETH
- Money can reuse for next event
```

---

### Use Case 2: Platform Owner Manage System

**Actor:** Platform Owner  
**Goal:** Maintain healthy platform economics

```
Monthly Routine:

Week 1: Review Metrics
- Check platformFeeAccrued: 50 ETH
- Check relayer performance
- Check user feedback on fees

Week 2: Adjust Pricing (if needed)
- Gas price up 2x → setOverheadBps lower for attract user
- Competition launch → setPlatformFee(300) temporary promo
- Spam attacks detected → setRegistrationFee higher

Week 3: Relayer Management
- New relayer application → verify, then setRelayer(true)
- Relayer B suspicious activity → investigate
- Relayer B confirmed fraud → setRelayer(false)

Week 4: Revenue Withdrawal
- withdrawPlatformFee(companyWallet)
- 50 ETH transferred
- Allocate:
  * 20 ETH → server & infrastructure
  * 15 ETH → development team
  * 10 ETH → marketing
  * 5 ETH → reserve
```

---

### Use Case 3: Relayer Daily Operations

**Actor:** Relayer Service  
**Goal:** Process votes and maintain profitability

```
Daily Operation Flow:

Morning:
1. Check balance relayer wallet: 10 ETH (for gas)
2. Monitor gas price: 50 gwei (normal)
3. Check overhead: 10% (OK)

During Day (per vote):
1. Receive vote request from frontend
2. Verify signature
3. Estimate gas: 150,000 gas
4. Calculate cost: 150k × 50 gwei = 0.0075 ETH
5. Check room deposit: roomBalance >= 2 × maxCostPerVote ✓
6. Execute vote (pay gas from wallet)
7. Get receipt
8. Calculate:
   - actualCost = 0.0075 ETH
   - overhead = 0.00075 ETH (10%)
   - chargedAmount = 0.00825 ETH
9. settleAndWithdraw(room, actionId, chargedAmount)
10. Receive 0.00825 ETH
11. Profit = 0.00075 ETH

End of Day:
- Processed: 500 votes
- Total gas paid: 500 × 0.0075 = 3.75 ETH
- Total claimed: 500 × 0.00825 = 4.125 ETH
- Daily profit: 4.125 - 3.75 = 0.375 ETH
- Wallet balance: 10 - 3.75 + 4.125 = 10.375 ETH ✓
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "InsufficientDeposit" saat settle

**Penyebab:** Room balance tidak cukup untuk bayar gas

**Solusi untuk Room Admin:**
```javascript
// Check balance
const balance = await vault.roomBalance(room)
const needed = estimatedVotes × maxCostPerVote

if (balance < needed) {
  // Topup immediately
  await vault.topup(room, { value: needed - balance })
}
```

---

### Issue 2: "OnlyRelayer" error saat settle

**Penyebab:** Address yang call bukan relayer allowlisted

**Solusi untuk Relayer:**
```javascript
// Check status
const isAllowed = await vault.isRelayer(myAddress)

if (!isAllowed) {
  console.error("Not allowlisted! Contact platform owner")
  // Platform owner perlu call setRelayer(myAddress, true)
}
```

---

### Issue 3: "AlreadySettled" error

**Penyebab:** Trying to claim reimbursement 2x untuk vote yang sama

**Solusi:**
```javascript
// Check sebelum settle
const actionId = calculateActionId(room, round, voter)
const isSettled = await vault.settled(actionId)

if (isSettled) {
  console.log("Already claimed, skip this vote")
  return // Don't try to settle again
}
```

---

## 💡 Best Practices

### Untuk Room Admin:
1. ✅ **Always topup 20% lebih** dari estimasi (buffer)
2. ✅ **Monitor balance** during active voting
3. ✅ **Withdraw remaining** after event selesai
4. ✅ **Plan budget** sebelum create room

### Untuk Platform Owner:
1. ✅ **Review fees quarterly** - adjust based on gas price
2. ✅ **Monitor relayer performance** - block yang bermasalah
3. ✅ **Transparent pricing** - publish fee schedule
4. ✅ **Regular withdrawals** - don't let too much accumulate

### Untuk Relayer:
1. ✅ **Maintain sufficient wallet balance** untuk gas
2. ✅ **Auto-settle after each vote** - don't batch (prevent losing track)
3. ✅ **Monitor profitability** - overhead should cover operational cost
4. ✅ **Handle errors gracefully** - log failed settlements

---

**Kesimpulan:**  
SponsorVault adalah jantung financial system - manage deposit, payment, dan revenue. Critical untuk operasional gasless voting yang sustainable.
