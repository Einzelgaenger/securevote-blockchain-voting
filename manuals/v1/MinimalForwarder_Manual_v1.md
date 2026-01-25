# 📘 MinimalForwarder - User Manual

**Contract Type:** Meta-Transaction Handler  
**Purpose:** Memungkinkan voter untuk voting tanpa membayar gas fee

---

## 🎯 Executive Summary

MinimalForwarder adalah "perantara" yang memungkinkan voter untuk melakukan voting **tanpa memiliki ETH sama sekali**. Voter hanya perlu menandatangani pesan (seperti tanda tangan digital), dan relayer yang akan membayar gas fee.

**Analogi:** Seperti jasa kurir yang membayarkan ongkir untuk Anda - Anda cukup tanda tangan paket, kurir yang bayar biaya pengiriman.

---

## 👥 Siapa yang Menggunakan?

### 🚫 Voter - TIDAK Langsung Menggunakan
- Voter **tidak perlu** interact dengan contract ini secara langsung
- Sistem backend yang handle proses signing
- Voter hanya klik tombol "Vote" di aplikasi

### ✅ Relayer (Backend Service) - Primary User
- Service yang membayar gas untuk voter
- Menerima signature dari voter
- Broadcast transaction ke blockchain

### 👁️ Developer/Auditor - Monitoring
- Verify signature validity
- Check nonce untuk anti-replay

---

## 🔧 Fungsi-Fungsi Utama

### 1. `execute` 🟠

**Apa Itu?**  
Fungsi untuk menjalankan voting transaction atas nama voter.

**Kenapa Ada?**  
Agar voter tidak perlu bayar gas, relayer yang execute dan bayar.

**Kapan Digunakan?**  
Setiap kali ada voter yang mau voting (di production).

**Cara Pakai:**

#### Sebagai Relayer Backend

**Scenario:** Ada voter yang mau voting untuk Candidate A

```javascript
// Step 1: Voter sign message (di aplikasi/frontend)
const message = {
  from: voterAddress,
  to: votingRoomAddress,
  value: 0,
  gas: 300000,
  nonce: 0,
  data: encodedVoteFunction // vote(1)
}

const signature = await voter.signTypedData(message)

// Step 2: Kirim ke relayer backend (API)
POST /api/relay-vote
{
  "message": message,
  "signature": signature
}

// Step 3: Relayer execute (backend)
const tx = await forwarder.execute(message, signature)
// Relayer bayar gas, vote tercatat atas nama voter
```

**Real Example:**
```
Voter "Budi" mau vote Candidate A:
1. Budi klik "Vote for Candidate A" di web
2. Budi tanda tangan dengan wallet (gratis, no gas)
3. Signature dikirim ke server relayer
4. Relayer execute vote atas nama Budi
5. Budi berhasil vote tanpa bayar gas!
```

---

### 2. `verify` 🔵 (View)

**Apa Itu?**  
Fungsi untuk cek apakah signature dari voter valid atau palsu.

**Kenapa Ada?**  
Security - mencegah orang lain vote pakai nama voter lain.

**Kapan Digunakan?**  
Sebelum execute, untuk validasi signature.

**Cara Pakai:**

#### Sebagai Relayer Backend

**Scenario:** Verify signature sebelum broadcast

```javascript
// Pre-check sebelum execute
const isValid = await forwarder.verify(message, signature)

if (!isValid) {
  return "Error: Invalid signature - mungkin ada yang coba fake vote!"
}

// Kalau valid, baru execute
await forwarder.execute(message, signature)
```

**Real Example:**
```
Relayer receive request vote dari "Budi":
1. Check: Apakah signature ini benar dari Budi?
2. verify() return true → lanjut execute
3. verify() return false → tolak request (kemungkinan fraud)
```

---

### 3. `getNonce` 🔵 (View)

**Apa Itu?**  
Angka urut untuk setiap transaction dari voter (seperti nomor antrian).

**Kenapa Ada?**  
Mencegah replay attack - orang jahat tidak bisa pakai signature lama untuk vote lagi.

**Kapan Digunakan?**  
Sebelum bikin message untuk di-sign voter.

**Cara Pakai:**

#### Sebagai Frontend/Backend

**Scenario:** Prepare message untuk voter sign

```javascript
// Get nonce voter
const nonce = await forwarder.getNonce(voterAddress)
// nonce = 0 (belum pernah vote)

// Build message dengan nonce yang benar
const message = {
  from: voterAddress,
  to: votingRoomAddress,
  value: 0,
  gas: 300000,
  nonce: nonce, // ← Penting!
  data: encodedVoteData
}

// Voter sign message ini
```

**Real Example:**
```
"Budi" mau vote:
1. getNonce("Budi") = 0
2. Budi sign message dengan nonce 0
3. Vote executed, nonce Budi jadi 1
4. Next vote, getNonce("Budi") = 1
5. Signature lama (nonce 0) tidak bisa dipakai lagi
```

---

### 4. `eip712Domain` 🔵 (View)

**Apa Itu?**  
Informasi domain untuk signing (metadata contract).

**Kenapa Ada?**  
Standard EIP-712 untuk structured message signing.

**Kapan Digunakan?**  
Setup signing di frontend (wallet integration).

**Cara Pakai:**

#### Sebagai Frontend Developer

```javascript
// Get domain info
const domain = await forwarder.eip712Domain()

// Use untuk signing
const signature = await signer.signTypedData(
  domain,
  types,
  message
)
```

---

## 📋 Use Cases Lengkap

### Use Case 1: Voter Voting Pertama Kali

**Actor:** Voter (Budi), Relayer Backend

**Scenario:** Budi mau vote untuk pertama kalinya

**Steps:**

1. **Budi buka aplikasi voting**
   - Login dengan wallet (MetaMask)
   - Lihat list kandidat

2. **Budi pilih kandidat**
   - Klik "Vote for Candidate A"
   - Aplikasi prepare message:
     ```javascript
     nonce = await getNonce(BudiAddress) // = 0
     message = buildVoteMessage(candidateA, nonce)
     ```

3. **Budi tanda tangan**
   - Wallet popup: "Sign message to vote?"
   - Budi klik "Sign" (GRATIS, no gas)
   - Signature generated

4. **Aplikasi kirim ke relayer**
   ```javascript
   POST /api/relay-vote
   {
     voter: "Budi",
     message: {...},
     signature: "0x..."
   }
   ```

5. **Relayer verify & execute**
   ```javascript
   // Verify signature
   if (!await verify(message, signature)) {
     return "Invalid signature"
   }
   
   // Execute vote
   await forwarder.execute(message, signature)
   ```

6. **Vote tercatat**
   - Budi berhasil vote tanpa bayar gas
   - Nonce Budi increment jadi 1

---

### Use Case 2: Prevent Replay Attack

**Actor:** Attacker, Relayer Backend

**Scenario:** Attacker coba pakai signature lama Budi untuk vote lagi

**Steps:**

1. **Attacker punya signature lama**
   - Signature vote Budi yang lama (nonce 0)
   - Coba kirim ulang ke relayer

2. **Relayer receive request**
   ```javascript
   message.nonce = 0
   currentNonce = await getNonce(BudiAddress) // = 1 (sudah vote)
   ```

3. **Verify gagal**
   ```javascript
   verify(message, signature) // = false
   // Karena nonce tidak match (0 vs 1)
   ```

4. **Request ditolak**
   - Relayer reject transaction
   - Attacker gagal

---

## ⚠️ Hal Penting yang Perlu Diketahui

### Untuk Voter:
- ✅ **Tidak perlu ETH** untuk voting
- ✅ **Cukup tanda tangan** dengan wallet
- ✅ **Gratis** - tidak ada biaya sama sekali
- ⚠️ **Jangan share signature** ke orang lain
- ⚠️ **Sign hanya di aplikasi resmi** untuk keamanan

### Untuk Relayer/Developer:
- ⚠️ **Selalu verify signature** sebelum execute
- ⚠️ **Check nonce** untuk prevent replay
- ⚠️ **Handle error** jika gas terlalu tinggi
- ⚠️ **Monitor failed transactions** untuk debugging
- 💡 **Gunakan gas estimation** sebelum execute

### Untuk Admin/Platform:
- 📊 **Monitor relayer balance** - pastikan ada ETH untuk bayar gas
- 📊 **Track execution metrics** - berapa vote per hari
- 🔐 **Secure relayer private key** - ini yang bayar gas
- 🔐 **Rate limiting** - prevent spam attack

---

## 🚨 Troubleshooting

### Error: "Invalid signature"

**Penyebab:**
- Signature tidak dari voter yang benar
- Message diubah setelah di-sign
- Domain atau chainId salah

**Solusi:**
```javascript
// Re-generate signature dengan domain yang benar
const domain = await forwarder.eip712Domain()
const signature = await voter.signTypedData(domain, types, message)
```

---

### Error: "Nonce mismatch"

**Penyebab:**
- Pakai nonce lama
- Voter sudah vote dengan signature lain

**Solusi:**
```javascript
// Get nonce terbaru
const latestNonce = await forwarder.getNonce(voterAddress)
// Build message dengan nonce baru
```

---

### Error: "Transaction failed"

**Penyebab:**
- Gas terlalu rendah
- Voter tidak eligible
- Voting belum start

**Solusi:**
```javascript
// Estimate gas dulu
const gasEstimate = await provider.estimateGas(tx)
// Set gas lebih tinggi
message.gas = gasEstimate * 1.2
```

---

## 📊 Monitoring & Analytics

### Metrics yang Perlu Ditrack:

1. **Total Votes via Forwarder**
   ```javascript
   // Count execute success
   const events = await forwarder.queryFilter("MetaTransactionExecuted")
   const totalVotes = events.length
   ```

2. **Nonce per Voter**
   ```javascript
   // Check voter activity
   const nonce = await forwarder.getNonce(voterAddress)
   // nonce = jumlah vote yang sudah dilakukan
   ```

3. **Failed Transactions**
   ```javascript
   // Monitor failures
   const events = await forwarder.queryFilter("MetaTransactionExecuted")
   const failed = events.filter(e => e.args.success === false)
   ```

---

## 💡 Best Practices

### Untuk Implementation:

1. **Always verify before execute**
   ```javascript
   if (!await forwarder.verify(req, sig)) {
     throw new Error("Invalid signature")
   }
   ```

2. **Use proper gas estimation**
   ```javascript
   const gasEstimate = await estimateGas(...)
   req.gas = gasEstimate * 1.1 // 10% buffer
   ```

3. **Handle errors gracefully**
   ```javascript
   try {
     await forwarder.execute(req, sig)
   } catch (error) {
     // Log error, notify user
     logError(error)
     notifyUser("Vote failed, please try again")
   }
   ```

4. **Rate limiting**
   ```javascript
   // Prevent spam
   if (votesInLastMinute > 10) {
     throw new Error("Too many requests")
   }
   ```

---

## 🔗 Integration dengan Contract Lain

MinimalForwarder bekerja dengan:

- **VotingRoom**: Target dari meta-transaction (vote function)
- **Backend Relayer**: Service yang call execute()
- **Frontend**: Aplikasi yang generate signature

**Flow Lengkap:**
```
Voter (Frontend) → Sign Message (Gratis)
                      ↓
                 Relayer Backend → verify() → execute()
                      ↓
                 VotingRoom → vote() executed
                      ↓
                 Vote tercatat
```

---

**Kesimpulan:**  
MinimalForwarder adalah "jembatan" yang memungkinkan voting gasless. Voter cukup tanda tangan, relayer yang handle kompleksitas dan biaya gas.
