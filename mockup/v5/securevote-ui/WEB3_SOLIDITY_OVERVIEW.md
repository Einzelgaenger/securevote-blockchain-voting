# WEB3 / SOLIDITY OVERVIEW

Dokumen ini menjelaskan flow Web3 terbaru untuk `mockup/v5/securevote-ui`.

Versi terbaru memakai **direct vote** di private network Besu QBFT lokal. Voter memanggil `vote()` langsung dari EOA masing-masing, sehingga sistem tidak lagi memakai reimbursement relayer, deposit room, `SponsorVault`, atau `MinimalForwarder`.

## Setup Lokal Yang Dipakai v5

Untuk menjalankan flow ini dari nol:

1. Generate `evaluation\data\testing-eoas.json`.
2. Setup Besu QBFT lokal dari folder khusus `setups\besu-qbft-local-5-node`.
3. Jalankan Besu lokal dengan `docker compose up -d`.
4. Deploy `VotingRoom`, `RoomFactory`, dan `VotingResultCenter` ke `http://127.0.0.1:8545`.
5. Update `frontend\src\config\deployed-contracts.json`.
6. Jalankan frontend dan evaluation scripts.

Detail command ada di folder setup pada repo root:

```txt
setups\besu-qbft-local-5-node\README.md
setups\besu-qbft-local-5-node\commands.txt
setups\besu-qbft-local-5-node\app-testing-commands.txt
```

## Kontrak yang Dipakai

Sistem aktif sekarang memakai 3 kontrak utama:

1. `RoomFactory`
   Membuat room voting baru sebagai clone dari implementation `VotingRoom`.

2. `VotingRoom`
   Logic utama voting room: setup voter, setup kandidat, start, vote, stop, restart, reset, simpan histori round, dan submit histori ke pusat.

3. `VotingResultCenter`
   Kontrak pusat untuk menerima hasil / histori round dari setiap `VotingRoom`. Setiap pengiriman dari satu room disimpan sebagai version baru.

## Kontrak yang Tidak Dipakai Lagi di Flow Utama

Kontrak berikut tidak lagi dipakai pada flow v2 direct-vote:

- `SponsorVault`
- `MinimalForwarder`

Alasannya:

- Tidak ada `registrationFeeWei`.
- Tidak ada deposit room.
- Tidak ada reimbursement relayer.
- Tidak ada meta-transaction / gasless vote.
- Voter melakukan transaksi langsung dari wallet / EOA masing-masing.

## Prinsip Penting

- Satu room hanya punya satu admin.
- Satu voter hanya bisa vote satu kali per round.
- Voting hanya bisa berjalan saat room berada pada state `Active`.
- Kandidat hanya bisa diatur saat room `Inactive`.
- Voter bisa ditambahkan saat room `Inactive` maupun `Active`.
- Voter yang ditambahkan saat round berjalan ikut dihitung sebagai eligible voter pada round tersebut.
- `totalVoter` pada histori dihitung dari jumlah voter saat admin memanggil `stop()`.
- Histori hasil round disimpan saat admin memanggil `stop()`.
- Histori hasil round bisa dikirim admin ke `VotingResultCenter` setelah `stop()`.
- `VotingRoom` di frontend config adalah implementation/template, bukan room yang dipakai voting langsung.

## Direct Vote Tanpa MinimalForwarder

Direct vote tetap bisa berjalan tanpa `MinimalForwarder`.

Pada mode ini:

1. Voter membuka frontend.
2. Voter connect wallet ke network Besu.
3. Frontend memanggil `VotingRoom.vote(candidateId)`.
4. Transaksi dikirim langsung dari address voter.
5. Di Solidity, `msg.sender` adalah address voter asli.
6. Kontrak mengecek apakah `msg.sender` terdaftar sebagai voter.

Konsekuensi:

- Voter harus punya EOA / wallet.
- Voter perlu punya native coin Besu untuk membayar gas.
- Tidak perlu tanda tangan EIP-712.
- Tidak perlu relayer backend.
- Tidak perlu reimbursement gas.
- Flow lebih sederhana dan transparan untuk private network.

## Ringkasan State Room

State room:

- `Inactive`
  Room belum mulai voting atau sudah dihentikan.

- `Active`
  Voting sedang berjalan dan voter bisa memanggil `vote()`.

Flag tambahan:

- `roundReadyToStart == true`
  Round siap dimulai lewat `start()`.

- `roundReadyToStart == false`
  Round sebelumnya sudah selesai dan admin harus memilih `restart()` atau `reset()` sebelum mulai lagi.

## Flow End-to-End

### 1. Deploy kontrak

Urutan deploy yang disarankan:

1. Deploy `VotingRoom` implementation.
2. Deploy `RoomFactory` dengan parameter constructor:

```solidity
votingRoomImplementation
```

3. Deploy `VotingResultCenter` dengan parameter constructor:

```solidity
roomFactoryAddress
```

Expected result:

- `RoomFactory.votingRoomImplementation()` menunjuk ke implementation `VotingRoom`.
- `VotingResultCenter.roomFactory()` menunjuk ke `RoomFactory`.
- `VotingResultCenter` hanya menerima submit dari room yang valid menurut `RoomFactory.isRoom(room)`.

### 2. Admin membuat room baru

Admin memanggil:

```solidity
RoomFactory.createRoom("Pemilihan Ketua RT 2026")
```

Perubahan penting:

- `createRoom()` tidak lagi `payable`.
- Tidak ada `registrationFeeWei`.
- Tidak ada pembayaran ke `SponsorVault`.
- Room bisa langsung dibuat.

Expected result:

- Room clone baru dibuat.
- Room di-initialize dengan:
  - `roomAdmin = msg.sender`
  - `roomName = "Pemilihan Ketua RT 2026"`
- Address room masuk ke `RoomFactory.allRooms`.
- `RoomFactory.isRoom(roomAddress) == true`.
- `RoomFactory.roomOwner(roomAddress) == admin`.
- Event `RoomRegistered(room, admin, name)` dipancarkan.

### 3. Admin mengatur result center

Admin memanggil dari room clone:

```solidity
VotingRoom.setResultCenter(votingResultCenterAddress)
```

Syarat:

- Caller adalah admin room.
- Room sudah initialized.
- Room sedang `Inactive`.
- Address result center bukan zero address.

Expected result:

- `VotingRoom.resultCenter()` berisi address `VotingResultCenter`.
- Event `ResultCenterUpdated` dipancarkan.

### 4. Admin menambahkan voter

Admin bisa memanggil:

```solidity
VotingRoom.addVoter(voterAddress)
```

atau:

```solidity
VotingRoom.addVoters(voterAddresses)
```

Aturan:

- Hanya admin room.
- Bisa dilakukan saat `Inactive`.
- Bisa dilakukan saat `Active`.
- Voter duplikat akan revert `DuplicateVoter`.

Expected result:

- Address voter masuk ke `voterRegistry`.
- Address voter masuk ke `voterList`.
- Jika voter ditambahkan saat room `Active`, voter tersebut langsung bisa vote pada round berjalan selama belum pernah vote pada round itu.

### 5. Admin menambahkan kandidat

Admin bisa memanggil:

```solidity
VotingRoom.addCandidate(candidateId, candidateName)
```

atau:

```solidity
VotingRoom.addCandidates(candidateIds, candidateNames)
```

Aturan:

- Hanya admin room.
- Hanya bisa dilakukan saat `Inactive`.
- Candidate id tidak boleh duplikat.

Expected result:

- Candidate id masuk ke `candidateRegistry`.
- Candidate name tersimpan di `candidateName`.
- Candidate id masuk ke `candidateIds`.

### 6. Admin memulai voting

Admin memanggil:

```solidity
VotingRoom.start()
```

Syarat:

- Room `Inactive`.
- `roundReadyToStart == true`.
- Minimal ada 1 voter.
- Minimal ada 1 kandidat.

Expected result:

- Room berubah menjadi `Active`.
- `activeRoundStartAt` diisi timestamp.
- Event `RoundStarted` dipancarkan.

### 7. Voter melakukan direct vote

Voter memanggil:

```solidity
VotingRoom.vote(candidateId)
```

Validasi:

- Room sedang `Active`.
- `msg.sender` terdaftar sebagai voter.
- `msg.sender` belum pernah vote di round tersebut.
- Candidate id valid.

Expected result:

- `roundVotes[currentRound][candidateId] += 1`.
- `roundTotalVotes[currentRound] += 1`.
- `lastVotedRound[msg.sender] = currentRound`.
- Event `VoteCast` dipancarkan.

### 8. Admin menghentikan voting

Admin memanggil:

```solidity
VotingRoom.stop()
```

Expected result:

- Room berubah kembali menjadi `Inactive`.
- Histori round disimpan di `roundHistories[currentRound]`.
- `roundHistorySaved[currentRound] == true`.
- `roundReadyToStart == false`.
- `totalVoter = voterList.length` pada saat `stop()`.
- `totalGolput = totalVoter - roundTotalVotes[currentRound]`.
- Event `RoundStopped` dipancarkan.

### 9. Admin submit histori round ke pusat

Admin memanggil:

```solidity
VotingRoom.submitRoundHistory(round)
```

Contoh:

```solidity
VotingRoom.submitRoundHistory(1)
```

Cara kerja:

1. `VotingRoom` mengecek `resultCenter` sudah diset.
2. `VotingRoom` mengecek histori round sudah tersimpan.
3. `VotingRoom` menghitung `historyHash`.
4. `VotingRoom` memanggil `VotingResultCenter.submitRoundResult(...)`.
5. `VotingResultCenter` mengecek caller adalah room resmi dari `RoomFactory`.
6. `VotingResultCenter` menyimpan data sebagai version baru untuk room tersebut.

Expected result:

- Submit pertama dari room menjadi version `1`.
- Submit berikutnya dari room yang sama menjadi version `2`, `3`, dan seterusnya.
- Event `RoundHistorySubmitted` dipancarkan dari `VotingRoom`.
- Event `RoundResultSubmitted` dipancarkan dari `VotingResultCenter`.

## Fungsi Baca Hasil di Room

Setelah `stop()`, hasil bisa dibaca lewat:

- `getRoundHistory(round)`
- `getRoundHistoryCandidates(round)`
- `getVotes(round, candidateId)`
- `getRoundHistoryHash(round)`

## Fungsi Baca Hasil di Pusat

Fungsi di `VotingResultCenter`:

- `getRoomCount()`
- `getRooms()`
- `getRoomAt(index)`
- `getRoomAdmin(room)`
- `getRoomWithAdminAt(index)`
- `getRoomsWithAdmins()`
- `getRoomVersionCount(room)`
- `getLatestVersion(room)`
- `getRoomVersionSummary(room, version)`
- `getRoomVersionCandidates(room, version)`

## Contoh Kasus: Direct Vote Satu Round

Data:

- Admin: `0xAdmin`
- Room: `0xRoomA`
- Voter:
  - `0xVoter1`
  - `0xVoter2`
  - `0xVoter3`
- Kandidat:
  - `1 = Andi`
  - `2 = Budi`

Alur:

1. Admin membuat room lewat `createRoom()`.
2. Admin set result center.
3. Admin menambahkan 3 voter.
4. Admin menambahkan 2 kandidat.
5. Admin memanggil `start()`.
6. `0xVoter1` vote kandidat 1.
7. `0xVoter2` vote kandidat 2.
8. `0xVoter3` vote kandidat 1.
9. Admin memanggil `stop()`.
10. Admin memanggil `submitRoundHistory(1)`.

Expected result di room:

```text
roundTotalVotes[1] = 3
roundVotes[1][1] = 2
roundVotes[1][2] = 1
totalVoter = 3
totalGolput = 0
roundHistorySaved[1] = true
```

Expected result di pusat:

```text
getRoomCount() = 1
getRoomVersionCount(0xRoomA) = 1
getLatestVersion(0xRoomA) = 1
```

`getRoomVersionCandidates(0xRoomA, 1)`:

```text
ids = [1, 2]
names = ["Andi", "Budi"]
voteCounts = [2, 1]
```

## Contoh Kasus: Voter Ditambahkan Saat Voting Berjalan

Data awal:

- Voter awal:
  - `0xVoter1`
  - `0xVoter2`
- Kandidat:
  - `1 = Andi`
  - `2 = Budi`

Alur:

1. Admin memanggil `start()`.
2. `0xVoter1` vote kandidat 1.
3. Admin menambahkan voter baru saat room masih `Active`:

```solidity
VotingRoom.addVoter(0xVoter3)
```

4. `0xVoter3` vote kandidat 2.
5. Admin memanggil `stop()`.

Expected result:

```text
totalVoter = 3
roundTotalVotes = 2
totalGolput = 1
```

Catatan:

- `0xVoter3` dihitung sebagai eligible voter round tersebut.
- `0xVoter2` dihitung golput jika tidak vote.
- Ini sesuai jika operasional memang mengizinkan daftar pemilih susulan.

## EOA / Account Voter di Besu

Untuk direct vote, setiap voter perlu EOA.

Pilihan pembuatan account:

1. Voter membuat wallet sendiri, misalnya via MetaMask.
   - Admin hanya menerima address voter.
   - Admin mendaftarkan address tersebut dengan `addVoter(address)`.
   - Ini pilihan paling aman.

2. Operator membuat account lalu membagikan private key / keystore.
   - Lebih praktis untuk demo atau internal lab.
   - Kurang ideal untuk produksi karena operator pernah mengetahui private key voter.

Yang harus disiapkan:

- RPC private Besu.
- Chain ID Besu.
- Native coin Besu untuk gas pada setiap voter.
- Address voter didaftarkan ke room.

## Kesimpulan

Flow terbaru:

1. Deploy `VotingRoom` implementation.
2. Deploy `RoomFactory`.
3. Deploy `VotingResultCenter`.
4. Admin buat room gratis lewat `createRoom()`.
5. Admin set result center.
6. Admin setup voter dan kandidat.
7. Admin start voting.
8. Voter direct vote dari EOA masing-masing.
9. Admin stop voting.
10. Admin submit histori round ke pusat.
11. Pusat menyimpan hasil dengan versioning per room.

