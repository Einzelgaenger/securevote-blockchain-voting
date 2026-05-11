# WEB3 / SOLIDITY OVERVIEW

Dokumen ini menjelaskan cara kerja sistem voting yang saat ini dipakai oleh `mockup/v3/securevote-ui`, dengan fokus pada alur operasional dari membuat room sampai voting selesai.

Dokumen ini menggantikan versi lama di:

- `(outdated)-WEB3_SOLIDITY_OVERVIEW.md`

## Kontrak yang Dipakai

Sistem saat ini memakai 5 komponen utama:

1. `RoomFactory`
   Dipakai untuk membuat room voting baru.

2. `VotingRoom`
   Logic utama room voting. Room yang dipakai user adalah clone/instance hasil `createRoom()`, bukan implementation.

3. `SponsorVault`
   Menyimpan registration fee, deposit room, dan membayar relayer untuk gasless vote.

4. `MinimalForwarder`
   Dipakai untuk meta-transaction saat voter melakukan gasless vote.

5. `VotingResultCenter`
   Kontrak pusat untuk menerima hasil/histori round dari setiap `VotingRoom`. Setiap pengiriman dari satu room disimpan sebagai version baru.

## Prinsip Penting

Beberapa prinsip penting pada versi sistem saat ini:

- Satu room hanya punya satu admin.
- Satu voter hanya bisa vote satu kali per round.
- Voting hanya bisa berjalan saat room berada pada state `Active`.
- Kandidat hanya bisa diatur saat room `Inactive`.
- Voter bisa ditambahkan saat room `Inactive` maupun `Active`; voter yang ditambahkan saat round berjalan ikut dihitung sebagai eligible voter pada round tersebut.
- Histori hasil round disimpan saat admin memanggil `stop()`.
- Histori hasil round bisa dikirim admin ke `VotingResultCenter` setelah `stop()`.
- Gasless vote hanya dipakai untuk `vote(uint256)`, bukan untuk fungsi admin.
- `VotingRoom` di `frontend/src/config/contracts.js` adalah implementation/template, bukan room yang dipakai voting langsung.

## Ringkasan State Room

State room saat ini sederhana:

- `Inactive`
  Room belum mulai voting atau sudah dihentikan.

- `Active`
  Voting sedang berjalan dan voter bisa memanggil `vote()`.

Selain state, ada flag `roundReadyToStart`:

- `true`: round siap dimulai lewat `start()`
- `false`: round sebelumnya sudah selesai dan admin harus pilih `restart()` atau `reset()` dulu sebelum mulai lagi

## Kasus End-to-End: Dari Buat Room Sampai Voting Selesai

Di bawah ini contoh kasus operasional yang sesuai dengan flow sistem saat ini.

### 1. Admin membuat room baru

Contoh:

- Admin: `0xAdmin`
- Nama room: `Pemilihan Ketua RT 2026`

Langkah:

1. Admin memanggil `RoomFactory.createRoom("Pemilihan Ketua RT 2026")`.
2. Admin wajib mengirim ETH minimal sebesar `registrationFeeWei`.
3. `RoomFactory` membuat clone baru dari `VotingRoom` implementation.
4. Clone room di-`initialize()` dengan:
   - `roomAdmin = 0xAdmin`
   - `roomName = "Pemilihan Ketua RT 2026"`
   - `sponsorVault = address SponsorVault`
   - `trustedForwarder = address MinimalForwarder`
5. Address room baru disimpan di `roomOwner`, `isRoom`, dan `allRooms`.
6. Registration fee diteruskan ke `SponsorVault`.
7. Jika ingin publish histori ke pusat, admin atau operator perlu memanggil `VotingRoom.setResultCenter(address VotingResultCenter)` saat room `Inactive`.

Hasil:

- Terbentuk satu room instance baru, misalnya `0xRoomA`.
- Room awal berada di kondisi:
  - `state = Inactive`
  - `currentRound = 1`
  - `roundReadyToStart = true`

Catatan penting:

- Address `0xRoomA` inilah yang harus dipakai untuk `start`, `vote`, `stop`, `restart`, dan `reset`.
- Jangan memakai address implementation `VotingRoom` di config untuk voting langsung.

### 2. Admin menyiapkan daftar voter

Sebelum voting dimulai, admin mendaftarkan voter ke room clone, misalnya:

- `0xVoter1`
- `0xVoter2`
- `0xVoter3`

Fungsi yang bisa dipakai:

- `addVoter(address voter)`
- `addVoters(address[] voters)`

Aturan:

- Hanya admin room yang boleh menambah voter.
- Bisa dilakukan saat `Inactive` maupun `Active`.
- Voter duplikat akan gagal karena ada validasi `DuplicateVoter`.
- Jika voter ditambahkan ketika round sedang `Active`, voter tersebut langsung bisa vote pada round berjalan selama belum pernah vote pada round itu.

Hasil:

- Address voter masuk ke `voterRegistry`
- Address voter masuk ke `voterList`

### 3. Admin menyiapkan kandidat

Contoh kandidat:

- ID `1` = `Andi`
- ID `2` = `Budi`

Fungsi yang bisa dipakai:

- `addCandidate(uint256 candidateId, string name)`
- `addCandidates(uint256[] ids, string[] names)`

Aturan:

- Hanya admin room yang boleh menambah kandidat.
- Hanya boleh dilakukan saat `Inactive`.
- ID kandidat tidak boleh duplikat.

Hasil:

- Kandidat masuk ke `candidateRegistry`
- Nama kandidat tersimpan di `candidateName`
- ID kandidat masuk ke `candidateIds`

### 4. Admin menyiapkan deposit untuk gasless vote

Langkah ini dibutuhkan jika room ingin mendukung gasless vote.

Langkah:

1. Admin melakukan `SponsorVault.topup(roomAddress)` dengan mengirim ETH.
2. Saldo deposit room akan tercatat di `roomBalance[room]`.
3. Admin bisa mengatur batas biaya vote dengan `VotingRoom.setMaxCostPerVote(uint256 newCost)` saat room masih `Inactive`.

Hubungannya dengan relayer:

- Saat relayer memproses gasless vote, relayer akan mengecek:
  - room balance cukup
  - `maxCostPerVoteWei` memadai
- Setelah vote sukses, relayer akan meminta reimbursement ke `SponsorVault.settleAndWithdraw(...)`

Kalau hanya ingin direct vote biasa:

- Deposit room tidak wajib.
- Voter membayar gas sendiri dari wallet mereka.

### 5. Admin memulai voting

Setelah voter dan kandidat siap, admin memanggil:

- `VotingRoom.start()`

Syarat:

- Room harus `Inactive`
- `roundReadyToStart == true`
- Minimal ada 1 voter
- Minimal ada 1 kandidat

Efek:

- `state` berubah menjadi `Active`
- `activeRoundStartAt` diset ke timestamp saat itu
- Event `RoundStarted` dipancarkan

Hasil bisnis:

- Round 1 resmi dimulai
- Voter sudah boleh memberikan suara

### 6. Voter melakukan voting

Saat room `Active`, voter memilih kandidat dengan:

- `vote(candidateId)`

Contoh:

- `0xVoter1` memilih kandidat `1`
- `0xVoter2` memilih kandidat `2`
- `0xVoter3` memilih kandidat `1`

Validasi saat `vote()`:

1. Caller harus voter terdaftar.
2. Caller belum pernah vote di round yang sama.
3. Kandidat yang dipilih harus valid.
4. Room harus sedang `Active`.

Efek on-chain:

- `roundVotes[currentRound][candidateId] += 1`
- `roundTotalVotes[currentRound] += 1`
- `lastVotedRound[voter] = currentRound`
- Event `VoteCast` dipancarkan

Karena sistem sekarang adalah one-voter-one-vote:

- Setiap voter hanya menambah 1 suara ke kandidat yang dipilih.
- Tidak ada credit/bobot suara seperti versi lama.

### 7. Dua mode voting: direct dan gasless

#### Direct vote

Pada direct vote:

1. Voter memanggil `vote()` langsung dari wallet.
2. Gas dibayar oleh voter.
3. Contract tetap mencatat hasil vote dengan logic yang sama.

#### Gasless vote

Pada gasless vote:

1. Frontend membuat data call `vote(candidateId)`.
2. Frontend membaca nonce dari `MinimalForwarder`.
3. Voter menandatangani EIP-712 `ForwardRequest`.
4. Frontend mengirim request bertanda tangan ke relayer `/relay`.
5. Relayer memverifikasi signature lewat `MinimalForwarder.verify(...)`.
6. Relayer hanya mengizinkan meta-tx untuk fungsi `vote(uint256)`.
7. Relayer melakukan pre-check:
   - chain sesuai
   - room balance cukup
   - jika `maxCostPerVoteWei > 0`, balance room minimal `2x maxCostPerVoteWei`
8. Relayer menjalankan `forwarder.execute(...)`.
9. Jika vote sukses dan event `VoteCast` ditemukan, relayer mengambil `actionId`.
10. Relayer memanggil `SponsorVault.settleAndWithdraw(room, actionId, chargedAmount)`.
11. Deposit room berkurang, lalu relayer menerima reimbursement.

Hasil:

- Bagi contract `VotingRoom`, hasil akhirnya tetap sama dengan direct vote.
- Perbedaannya hanya pada siapa yang membayar gas.

### 8. Admin menghentikan voting

Ketika periode voting selesai, admin memanggil:

- `VotingRoom.stop()`

Syarat:

- Room harus sedang `Active`

Efek penting:

1. Timestamp berhenti disimpan ke `stopAt`.
2. Jumlah voter diambil dari `voterList.length`.
3. `totalGolput` dihitung sebagai:
   `totalVoter - roundTotalVotes[currentRound]`
4. Semua data kandidat dan jumlah suaranya untuk round aktif disalin ke `roundHistories[currentRound]`.
5. `roundHistorySaved[currentRound] = true`
6. `activeRoundStartAt = 0`
7. `roundReadyToStart = false`
8. `state` kembali menjadi `Inactive`

Makna bisnis:

- Round dinyatakan selesai.
- Hasil round sudah dibekukan ke histori.
- Room belum bisa langsung `start()` lagi sampai admin memutuskan lanjut round baru atau reset.

### 9. Membaca hasil voting

Setelah `stop()`, hasil bisa dibaca lewat:

- `getRoundHistory(round)`
- `getRoundHistoryCandidates(round)`
- `getVotes(round, candidateId)`
- `getRoundHistoryHash(round)`

Contoh hasil round 1:

- Total voter: `3`
- Suara kandidat 1: `2`
- Suara kandidat 2: `1`
- Golput: `0`

Kalau hanya 2 dari 3 voter yang vote:

- `roundTotalVotes[1] = 2`
- `totalGolput = 1`

Catatan penting:

- Contract tidak memilih pemenang secara otomatis.
- Penentuan siapa pemenang dilakukan di level pembacaan hasil, berdasarkan kandidat dengan vote terbanyak.

### 9A. Admin mengirim histori round ke pusat

Setelah `stop()`, admin room bisa mengirim histori round ke kontrak pusat:

- `VotingRoom.submitRoundHistory(round)`

Syarat:

- `VotingRoom.resultCenter` sudah diset ke address `VotingResultCenter`.
- Round tersebut sudah dihentikan dan `roundHistorySaved[round] == true`.
- Caller adalah admin room.
- Room tersebut terdaftar di `RoomFactory.isRoom(room)`, karena `VotingResultCenter` menolak submit dari address yang bukan room resmi factory.

Efek:

- `VotingRoom` menghitung hash histori lewat `getRoundHistoryHash(round)`.
- `VotingRoom` mengirim ringkasan round, daftar kandidat, jumlah vote, dan hash ke `VotingResultCenter`.
- `VotingResultCenter` menambah version baru untuk address room tersebut.
- Event `RoundHistorySubmitted` dan `RoundResultSubmitted` dipancarkan.

Fungsi baca di kontrak pusat:

- `getRoomCount()`: jumlah room yang pernah mengirim histori.
- `getRooms()`: semua address room yang pernah mengirim histori.
- `getRoomAt(index)`: address room berdasarkan index.
- `getRoomAdmin(room)`: admin room yang tercatat saat submit pertama.
- `getRoomWithAdminAt(index)`: address room dan admin berdasarkan index.
- `getRoomsWithAdmins()`: semua address room beserta admin masing-masing.
- `getRoomVersionCount(room)`: berapa kali room tersebut mengirim histori.
- `getLatestVersion(room)`: version terbaru untuk room.
- `getRoomVersionSummary(room, version)`: metadata version, termasuk `roundId`, total voter, golput, timestamp, dan `historyHash`.
- `getRoomVersionCandidates(room, version)`: kandidat dan jumlah vote pada version tersebut.

### 10. Setelah voting selesai: pilih `restart()` atau `reset()`

Setelah satu round dihentikan, ada dua pilihan:

#### Opsi A: `restart()`

Pakai jika:

- daftar voter tetap sama
- daftar kandidat tetap sama
- ingin membuka round baru dengan konfigurasi lama

Efek:

- `currentRound += 1`
- `roundReadyToStart = true`
- voter dan kandidat tidak dihapus

Lalu admin bisa memanggil `start()` lagi untuk round berikutnya.

#### Opsi B: `reset()`

Pakai jika:

- ingin mengosongkan daftar voter
- ingin mengosongkan daftar kandidat
- ingin menyiapkan pemilihan baru dari nol

Efek:

- semua voter dihapus
- semua kandidat dihapus
- `currentRound += 1`
- `roundReadyToStart = true`

Setelah itu admin perlu input ulang voter dan kandidat sebelum memulai voting lagi.

## Contoh Skenario Lengkap

Berikut contoh ringkas satu siklus penuh:

1. Admin membuat room `Pemilihan Ketua RT 2026` lewat `createRoom()`.
2. Factory menghasilkan room clone `0xRoomA`.
3. Admin top up deposit ke `SponsorVault` untuk mendukung gasless vote.
4. Admin set `maxCostPerVoteWei`.
5. Admin menambahkan 3 voter.
6. Admin menambahkan 2 kandidat.
7. Admin memanggil `start()`.
8. `Voter1` melakukan gasless vote ke kandidat 1.
9. `Voter2` melakukan direct vote ke kandidat 2.
10. `Voter3` melakukan gasless vote ke kandidat 1.
11. Admin memanggil `stop()`.
12. Histori round 1 tersimpan.
13. Hasil akhir round 1:
    - kandidat 1 = 2 suara
    - kandidat 2 = 1 suara
    - golput = 0
14. Admin memutuskan:
    - `restart()` jika mau lanjut round 2 dengan peserta/kandidat yang sama
    - `reset()` jika mau buat pemilihan baru dari nol

## Peran Tiap Komponen

### RoomFactory

Tugas:

- membuat room clone baru
- menetapkan admin room
- menyimpan daftar room valid
- meneruskan registration fee ke vault

### VotingRoom

Tugas:

- menyimpan voter dan kandidat
- mengatur start/stop round
- menerima vote
- menyimpan histori hasil round
- menjadi titik validasi utama logic voting

### SponsorVault

Tugas:

- menerima registration fee
- menyimpan deposit ETH per room
- membayar relayer setelah gasless vote berhasil
- memproses withdraw deposit oleh room saat tidak aktif

### MinimalForwarder + Relayer

Tugas:

- memfasilitasi vote tanpa voter membayar gas langsung
- memverifikasi signature meta-tx
- mengeksekusi `vote()` atas nama voter
- menagih reimbursement ke vault

## Batasan Sistem Saat Ini

Beberapa batasan penting pada implementasi saat ini:

- Vote berbobot/credit tidak dipakai lagi.
- Pemenang tidak ditentukan otomatis oleh contract.
- Gasless hanya untuk `vote()`, bukan operasi admin.
- `getRoomsByVoter()` di factory melakukan loop semua room, jadi kurang cocok untuk skala besar.
- Histori round disimpan saat `stop()`, jadi kalau round belum dihentikan maka hasil final round belum dibekukan ke histori.

## Kesimpulan

Secara operasional, flow sistem saat ini adalah:

1. Buat room lewat `RoomFactory`
2. Simpan address room clone
3. Setup voter dan kandidat di `VotingRoom`
4. Top up deposit jika ingin gasless vote
5. Mulai voting dengan `start()`
6. Voter melakukan `vote()` secara direct atau gasless
7. Akhiri voting dengan `stop()`
8. Baca histori hasil round
9. Lanjut dengan `restart()` atau `reset()`

Kalau diinginkan, dokumen ini bisa saya lanjutkan jadi versi yang lebih teknis juga, misalnya ditambah:

- sequence diagram per aktor
- mapping tombol UI ke function contract
- contoh call function per langkah
- tabel state transition room
