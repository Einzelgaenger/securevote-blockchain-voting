Mantap, ini pertanyaan **inti sistem** 👍
Aku jelaskan **alur keuangan (ETH flow)** SecureVote **end-to-end**, **berdasarkan arsitektur v2 yang kamu pakai sekarang**, dengan sudut pandang:

* **siapa bayar apa**
* **uang ETH mengalir ke mana**
* **kapan relayer diganti gas**
* **dari mana platform (creator) dapat revenue**

Aku akan jelaskan **berurutan sesuai lifecycle nyata**, bukan per kontrak biar kebayang sistemnya.

---

# 🧠 Gambaran Besar (1 paragraf dulu)

SecureVote memisahkan **logic voting** dan **uang**:

* **VotingRoom** → hanya urus *hak suara & hasil*
* **SponsorVault** → satu-satunya tempat ETH berada
* **MinimalForwarder + Relayer** → membuat **vote() gasless**
* **RoomFactory** → pintu masuk monetisasi (registration fee)

👉 **Voter TIDAK PERNAH bayar ETH**
👉 **Room admin yang “mensponsori” gas voting**
👉 **Platform (creator) ambil fee secara sistematis**

---

# 1️⃣ Platform / Creator Setup (sekali di awal)

Dilakukan oleh **platform owner / creator** (EOA deployer).

### a. Set parameter ekonomi di `SponsorVault`

```solidity
setRegistrationFee(0.01 ETH)
setOverheadBps(1000)      // 10% untuk relayer
setPlatformFeeBps(500)   // 5% fee platform saat withdraw
setRelayer(relayerEOA, true)
```

**Makna ekonomi:**

| Parameter         | Artinya                              |
| ----------------- | ------------------------------------ |
| registrationFee   | biaya bikin room (non-refundable)    |
| overheadBps       | profit relayer di atas gas asli      |
| platformFeeBps    | potongan saat admin tarik deposit    |
| relayer allowlist | hanya relayer resmi yang boleh klaim |

📌 **Belum ada ETH berpindah**, ini hanya konfigurasi.

---

# 2️⃣ Room Admin Create Room (uang pertama masuk)

Dilakukan oleh **room admin / event organizer**.

### a. Create room via `RoomFactory`

```solidity
createRoom("Pemilihan Ketua BEM")
value = registrationFee (mis. 0.01 ETH)
```

### b. Apa yang terjadi di balik layar

```
Admin Wallet
   │ 0.01 ETH (registration fee)
   ▼
RoomFactory
   ▼
SponsorVault.acceptRegistrationFee()
```

### c. Dampak keuangan

| Pihak              | Perubahan         |
| ------------------ | ----------------- |
| Admin              | −0.01 ETH         |
| SponsorVault       | +0.01 ETH         |
| platformFeeAccrued | +0.01 ETH         |
| Room balance       | 0 (belum deposit) |

📌 **Registration fee:**

* **NON-REFUNDABLE**
* Langsung jadi **pendapatan platform**

---

# 3️⃣ Room Admin Deposit ETH untuk Voting (escrow)

Sebelum voting dimulai, admin **harus menyediakan ETH** untuk bayar gas voting.

### a. Deposit via `SponsorVault.topup`

```solidity
topup(roomAddress)
value = mis. 2 ETH
```

### b. Alur ETH

```
Admin Wallet
   │ 2 ETH
   ▼
SponsorVault
   ├─ roomBalance[room] += 2 ETH
   └─ platformFeeAccrued (tidak berubah)
```

📌 **PENTING**

* Ini **bukan biaya**
* Ini **deposit escrow**
* Sisa bisa ditarik kembali nanti

---

# 4️⃣ Voting Berjalan (GASLESS untuk voter)

Sekarang bagian **paling penting**: gasless voting.

---

## 4.1 Voter melakukan vote (tanpa ETH)

Voter klik **Vote** di UI:

1. Wallet **SIGN message** (EIP-712)
2. **Tidak bayar gas**
3. Signature dikirim ke backend relayer

```
Voter Wallet
   │ sign message (gratis)
   ▼
Relayer Backend
```

---

## 4.2 Relayer mengeksekusi vote (bayar gas)

Relayer memanggil:

```solidity
MinimalForwarder.execute(req, signature)
```

📌 **Yang bayar gas:**

* **Relayer EOA**
* BUKAN voter
* BUKAN room admin (langsung)

---

## 4.3 Setelah tx sukses → relayer minta reimbursement

Relayer hitung:

```text
actualGasCost = gasUsed × gasPrice
overhead      = actualGasCost × overheadBps / 10000
chargedAmount = actualGasCost + overhead
```

Lalu klaim ke vault:

```solidity
SponsorVault.settleAndWithdraw(
  roomAddress,
  actionId,
  chargedAmount
)
```

---

## 4.4 ETH flow saat settle

```
SponsorVault
   │ chargedAmount
   ├─ roomBalance[room] -= chargedAmount
   ▼
Relayer EOA
```

### Dampaknya

| Pihak        | Perubahan         |
| ------------ | ----------------- |
| Relayer      | +gas + overhead   |
| Room balance | −(gas + overhead) |
| Voter        | 0 ETH             |
| Platform     | 0 (di tahap ini)  |

📌 **Kenapa aman?**

* `actionId` → mencegah double claim
* `isRelayer` → hanya relayer resmi
* `maxCostPerVote` → admin bisa batasi gas spike

---

# 5️⃣ Voting Selesai → Room Admin Withdraw Sisa Deposit

Setelah round selesai (`Closed` / `Inactive`):

```solidity
VotingRoom.withdrawDeposit(amount)
```

### Contoh

* Sisa deposit: **1 ETH**
* Platform fee: **5%**

### Alur ETH

```
SponsorVault
   │ 1 ETH
   ├─ platformFeeAccrued += 0.05 ETH
   ▼
Room Admin Wallet
      0.95 ETH
```

### Dampak

| Pihak        | Perubahan |
| ------------ | --------- |
| Admin        | +0.95 ETH |
| Platform     | +0.05 ETH |
| SponsorVault | −1 ETH    |

📌 **Catatan penting**

* Admin **tidak bisa withdraw saat Active**
* Ini mencegah admin kabur di tengah voting

---

# 6️⃣ Platform / Creator Withdraw Revenue

Akhirnya, **platform owner** ambil uang hasil layanan.

```solidity
withdrawPlatformFee(ownerEOA)
```

### Sumber pendapatan platform

| Sumber           | Kapan                    |
| ---------------- | ------------------------ |
| Registration fee | Saat create room         |
| Withdraw fee     | Saat admin tarik deposit |

### Alur

```
SponsorVault
   │ platformFeeAccrued
   ▼
Creator / Owner Wallet
```

---

# 🔄 Ringkasan Alur ETH (Timeline)

```
[Create Room]
Admin ──0.01 ETH──▶ Vault (platform fee)

[Deposit]
Admin ──2 ETH─────▶ Vault (roomBalance)

[Voting]
Relayer ──pay gas──▶ Blockchain
Vault ──refund────▶ Relayer

[Withdraw Room]
Vault ──0.95 ETH──▶ Admin
Vault ──0.05 ETH──▶ platformFeeAccrued

[Withdraw Platform]
Vault ──fees──────▶ Creator
```

---

# 🧩 Kenapa Desain Ini Kuat (secara thesis & engineering)

✅ **Gasless UX** → voter awam
✅ **No ETH custody di room** → semua di vault
✅ **Relayer tidak bisa rugpull** → only reimbursed
✅ **Admin tidak bisa kabur saat voting**
✅ **Platform punya revenue jelas & audit-able**

---

Kalau kamu mau, next step aku bisa:

* bikin **diagram alur ETH (sequence / flowchart)**
* jelasin **attack scenario & mitigasinya** (bagus buat bab skripsi)
* bantu **narasikan ini ke bahasa akademik** untuk *Bab Analisis Sistem*

Tinggal bilang mau lanjut ke bagian mana 👌
