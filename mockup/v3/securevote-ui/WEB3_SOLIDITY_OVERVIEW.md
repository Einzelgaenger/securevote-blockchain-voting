# WEB3 / SOLIDITY OVERVIEW

Dokumen ini menjelaskan cara kerja sistem Web3 pada `mockup/v3/securevote-ui`. Fokus utama dokumen adalah arsitektur smart contract, model transaksi, struktur data, state machine, alur pemungutan suara, publikasi hasil, dan bagaimana frontend berinteraksi dengan blockchain. Penjelasan ditulis sebagai deskripsi sistem aktif sehingga dapat digunakan sebagai bahan teknis untuk research paper, laporan implementasi, maupun dokumentasi pengujian.

## Ringkasan Sistem

SecureVote pada mockup ini adalah sistem e-voting berbasis smart contract yang berjalan di jaringan Ethereum-compatible, termasuk private network seperti Hyperledger Besu atau testnet publik seperti Sepolia sesuai konfigurasi environment. Sistem menggunakan pola direct vote, yaitu voter mengirim transaksi `vote(candidateId)` langsung dari wallet atau Externally Owned Account (EOA) miliknya.

Secara konseptual, sistem dibagi menjadi tiga lapisan:

1. Lapisan pembuatan room.
   Kontrak `RoomFactory` membuat room voting baru menggunakan pola EIP-1167 minimal proxy. Setiap room adalah clone dari implementation `VotingRoom`.

2. Lapisan eksekusi voting.
   Kontrak `VotingRoom` menyimpan daftar voter, daftar kandidat, status round, perhitungan suara, histori hasil round, dan logic administrasi untuk memulai serta menghentikan voting.

3. Lapisan publikasi hasil.
   Kontrak `VotingResultCenter` menjadi pusat penyimpanan hasil yang sudah disubmit dari room resmi. Setiap submit disimpan sebagai version baru untuk room terkait.

Frontend `mockup/v3/securevote-ui/frontend` menyediakan tiga mode utama:

- `Voter Booth`, yaitu antarmuka untuk voter memuat address room, memilih kandidat, dan mengirim vote dari wallet yang sedang terhubung.
- `Public Audit Dashboard`, yaitu dashboard publik untuk membaca daftar room dari `RoomFactory` dan hasil terkonfirmasi dari `VotingResultCenter`.
- `Contract Console`, yaitu antarmuka teknis untuk memanggil fungsi read dan write berdasarkan ABI kontrak.

## Tujuan Desain

Desain sistem ini menekankan beberapa tujuan:

- Transparansi proses, karena pembuatan room, pendaftaran voter, pendaftaran kandidat, vote, penghentian round, dan publikasi hasil terjadi sebagai transaksi atau data on-chain.
- Akuntabilitas hasil, karena hasil round disimpan pada room dan dapat dipublikasikan ke kontrak pusat dengan `historyHash`.
- Isolasi konteks pemilihan, karena setiap room memiliki admin, voter, kandidat, round, dan histori sendiri.
- Reusability kontrak, karena room dibuat sebagai clone dari satu implementation sehingga deployment banyak room lebih efisien.
- Auditability, karena frontend publik membaca data langsung dari smart contract tanpa perlu server aplikasi sebagai sumber kebenaran utama.

## Komponen Kontrak

### RoomFactory

`RoomFactory` adalah kontrak registry dan factory. Tugas utamanya adalah membuat room voting baru, mencatat room yang valid, dan menyediakan fungsi baca untuk menemukan room berdasarkan admin atau voter.

State utama:

- `votingRoomImplementation`
  Address implementation/template `VotingRoom` yang dipakai sebagai sumber clone.

- `roomOwner`
  Mapping dari address room ke address admin room.

- `isRoom`
  Mapping yang menandai apakah suatu address adalah room resmi hasil pembuatan `RoomFactory`.

- `allRooms`
  Array semua room clone yang pernah dibuat oleh factory.

Fungsi utama:

- `createRoom(string roomName) returns (address room)`
  Membuat clone baru dari `VotingRoom`, memanggil `initialize(admin, roomName)`, mencatat ownership room, menandai room sebagai valid, dan memancarkan event `RoomRegistered`.

- `getRoomCount()`
  Mengembalikan jumlah room yang terdaftar di factory.

- `getRoomAt(uint256 index)`
  Mengembalikan address room berdasarkan index pada `allRooms`.

- `getRoomsByAdmin(address admin)`
  Mengembalikan daftar room yang dimiliki oleh admin tertentu.

- `getRoomsByVoter(address voter)`
  Mengembalikan daftar room tempat address voter tersebut terdaftar sebagai eligible voter. Fungsi ini melakukan `staticcall` ke masing-masing room untuk membaca `isVoterEligible(voter)`.

Event utama:

- `RoomRegistered(address indexed room, address indexed admin, string name)`
  Menjadi bukti on-chain bahwa room clone telah dibuat, diinisialisasi, dan dicatat oleh factory.

### VotingRoom

`VotingRoom` adalah kontrak inti pemilihan. Setiap instance room menyimpan konfigurasi dan hasil voting untuk satu konteks pemilihan. Karena room dibuat sebagai clone, address implementation pada konfigurasi frontend hanya berfungsi sebagai template. Operasi voting, setup, start, stop, dan submit hasil dilakukan pada address clone yang dikembalikan oleh `RoomFactory.createRoom()`.

State utama:

- `initialized`
  Penanda bahwa room clone sudah diinisialisasi.

- `roomAdmin`
  Address admin yang mengelola room. Admin ditentukan saat room dibuat oleh `RoomFactory`.

- `roomName`
  Nama pemilihan atau nama room.

- `resultCenter`
  Address `VotingResultCenter` yang menerima publikasi histori round.

- `state`
  Status room, yaitu `Inactive` atau `Active`.

- `currentRound`
  Nomor round aktif secara logis. Room dimulai dari round `1`.

- `activeRoundStartAt`
  Timestamp saat round aktif dimulai.

- `roundReadyToStart`
  Flag yang menunjukkan apakah round saat ini siap dimulai.

- `voterList`
  Array address voter yang terdaftar.

- `voterRegistry`
  Mapping address voter ke status eligible.

- `lastVotedRound`
  Mapping address voter ke round terakhir tempat voter tersebut sudah mengirim vote.

- `candidateIds`
  Array id kandidat yang valid pada room.

- `candidateRegistry`
  Mapping id kandidat ke status valid.

- `candidateName`
  Mapping id kandidat ke nama kandidat.

- `roundVotes`
  Mapping `round => candidateId => jumlah suara`.

- `roundTotalVotes`
  Mapping `round => total suara yang masuk`.

- `roundHistories`
  Penyimpanan histori round yang dibekukan saat admin memanggil `stop()`.

- `roundHistorySaved`
  Mapping yang menandai apakah histori untuk round tertentu sudah tersimpan.

Fungsi administrasi utama:

- `initialize(address _roomAdmin, string _roomName)`
  Menginisialisasi clone. Fungsi ini dipanggil oleh factory saat room dibuat.

- `setResultCenter(address newCenter)`
  Mengatur address pusat hasil untuk room. Fungsi ini hanya dapat dipanggil oleh admin saat room berada pada state `Inactive`.

- `addVoter(address voter)` dan `addVoters(address[] voters)`
  Menambahkan satu atau banyak voter. Batch dibatasi oleh `MAX_BATCH_SIZE = 500`.

- `removeVoter(address voter)` dan `removeAllVoters()`
  Menghapus voter saat room berada pada state `Inactive`.

- `addCandidate(uint256 candidateId, string name)` dan `addCandidates(uint256[] ids, string[] names)`
  Menambahkan kandidat saat room berada pada state `Inactive`. Batch dibatasi oleh `MAX_BATCH_SIZE = 500`.

- `removeCandidate(uint256 candidateId)` dan `removeAllCandidates()`
  Menghapus kandidat saat room berada pada state `Inactive`.

- `start()`
  Memulai round. Room harus `Inactive`, `roundReadyToStart` harus bernilai `true`, minimal ada satu voter, dan minimal ada satu kandidat.

- `stop()`
  Menghentikan round aktif, menghitung total voter dan total golput, lalu menyimpan snapshot histori round.

- `restart()`
  Menyiapkan round berikutnya dengan mempertahankan konfigurasi voter dan kandidat.

- `reset()`
  Menyiapkan round berikutnya dengan membersihkan voter dan kandidat.

- `submitRoundHistory(uint256 round)`
  Mengirim histori round yang sudah tersimpan ke `VotingResultCenter`.

Fungsi voting:

- `vote(uint256 candidateId)`
  Dipanggil langsung oleh voter dari wallet/EOA. Kontrak membaca voter dari `msg.sender`, memvalidasi eligibility, memvalidasi kandidat, memastikan satu address hanya vote satu kali per round, lalu menaikkan counter suara.

Fungsi baca utama:

- `isVoterEligible(address voter)`
- `isCandidateValid(uint256 candidateId)`
- `getVotes(uint256 round, uint256 candidateId)`
- `getVoterCount()`
- `getCandidateCount()`
- `getVoters()`
- `getCandidates()`
- `getRoundHistory(uint256 round)`
- `getRoundHistoryCandidates(uint256 round)`
- `getRoundHistoryHash(uint256 round)`
- `getCurrentRoundStatus()`

Event utama:

- `RoomInitialized`
- `ResultCenterUpdated`
- `VoterAdded`
- `VoterRemoved`
- `CandidateAdded`
- `CandidateRemoved`
- `RoundStarted`
- `VoteCast`
- `RoundStopped`
- `RoundRestarted`
- `RoomReset`
- `RoundHistorySubmitted`

### VotingResultCenter

`VotingResultCenter` adalah kontrak pusat untuk menyimpan hasil round yang telah dipublikasikan oleh room resmi. Kontrak ini menggunakan `RoomFactory` sebagai registry keabsahan room. Dengan demikian, hanya address yang dikenali oleh `RoomFactory.isRoom(room)` yang dapat menjadi sumber submit hasil.

State utama:

- `roomFactory`
  Address `RoomFactory` yang menjadi registry room valid.

- `roomList`
  Array room yang sudah pernah mempublikasikan hasil.

- `hasSubmitted`
  Mapping yang menandai apakah room sudah pernah submit hasil.

- `roomAdmin`
  Mapping room ke admin yang tercatat saat submit pertama.

- `roomVersions`
  Mapping room ke array `PublishedRound`. Setiap elemen array adalah satu version hasil yang dipublikasikan.

Struktur `PublishedRound`:

- `room`
- `version`
- `roundId`
- `admin`
- `totalVoter`
- `totalGolput`
- `startAt`
- `stopAt`
- `historyHash`
- `submittedAt`
- `candidateIds`
- `candidateNames`
- `voteCounts`

Fungsi utama:

- `submitRoundResult(...) returns (uint256 version)`
  Menerima hasil round dari room. Fungsi ini memvalidasi panjang array kandidat, membatasi ukuran batch sampai `MAX_BATCH_SIZE = 500`, memverifikasi caller sebagai room resmi, menyimpan data sebagai version baru, lalu memancarkan event `RoundResultSubmitted`.

- `getRoomCount()`
  Mengembalikan jumlah room yang sudah pernah mempublikasikan hasil.

- `getRooms()`
  Mengembalikan semua room yang sudah pernah submit.

- `getRoomAt(uint256 index)`
  Mengembalikan room berdasarkan index publikasi.

- `getRoomWithAdminAt(uint256 index)` dan `getRoomsWithAdmins()`
  Mengembalikan pasangan room dan admin.

- `getRoomVersionCount(address room)`
  Mengembalikan jumlah version hasil untuk room.

- `getLatestVersion(address room)`
  Mengembalikan nomor version terakhir untuk room.

- `getRoomVersionSummary(address room, uint256 version)`
  Mengembalikan metadata hasil seperti round, admin, total voter, golput, timestamp, hash, dan waktu submit.

- `getRoomVersionCandidates(address room, uint256 version)`
  Mengembalikan id kandidat, nama kandidat, dan jumlah suara pada version tertentu.

Event utama:

- `RoundResultSubmitted(address indexed room, address indexed admin, uint256 indexed version, uint256 roundId, bytes32 historyHash, uint256 submittedAt)`
- `RoomFactoryUpdated(address indexed oldFactory, address indexed newFactory)`

## Arsitektur Deployment

Deployment dilakukan dengan urutan berikut:

1. Deploy `VotingRoom` implementation.
2. Deploy `RoomFactory` dengan parameter constructor:

```solidity
votingRoomImplementation
```

3. Deploy `VotingResultCenter` dengan parameter constructor:

```solidity
roomFactoryAddress
```

Setelah deployment:

- `RoomFactory.votingRoomImplementation()` menunjuk ke implementation `VotingRoom`.
- `VotingResultCenter.roomFactory()` menunjuk ke `RoomFactory`.
- Address implementation `VotingRoom` dicatat di frontend sebagai template.
- Address room yang dipakai untuk voting adalah address clone dari event `RoomRegistered`.
- `VotingResultCenter` memverifikasi submit hasil dengan memanggil `RoomFactory.isRoom(room)`.

Konfigurasi frontend berada pada:

```text
frontend/src/config/contracts.js
```

Nilai penting:

- `CHAIN_ID`
- `CHAIN_NAME`
- `RPC_URL`
- `CONTRACTS.RoomFactory.address`
- `CONTRACTS.VotingRoom.address`
- `CONTRACTS.VotingResultCenter.address`

Frontend juga memiliki guard `assertIsRoomClone(roomAddress)` untuk mencegah penggunaan address implementation `VotingRoom` sebagai address room operasional.

## Pola EIP-1167 Minimal Proxy

Room dibuat menggunakan `Clones.clone(votingRoomImplementation)` dari OpenZeppelin. Pola ini menghasilkan kontrak proxy ringan yang mendelegasikan logic ke implementation, sementara state tetap disimpan pada masing-masing clone.

Implikasi arsitekturalnya:

- Banyak room dapat dibuat dengan biaya deployment yang lebih rendah dibanding deploy kontrak penuh berulang kali.
- Setiap room memiliki state independen: admin, voter, kandidat, round, vote count, dan histori tidak bercampur dengan room lain.
- Implementation dapat dianggap sebagai template logic. Interaksi pemilihan dilakukan ke clone, bukan ke template.
- Factory menjadi sumber registry untuk membedakan room resmi dan address kontrak lain.

Dalam konteks penelitian, pola ini mendukung skalabilitas horizontal untuk banyak pemilihan karena unit pemilihan dipisahkan ke banyak kontrak clone yang homogen.

## Aktor Sistem

### Admin Room

Admin room adalah address yang memanggil `RoomFactory.createRoom(roomName)`. Address tersebut otomatis menjadi `roomAdmin` pada room clone. Admin memiliki kewenangan untuk:

- Mengatur `VotingResultCenter`.
- Menambahkan dan menghapus voter.
- Menambahkan dan menghapus kandidat.
- Memulai round.
- Menghentikan round.
- Menyiapkan round berikutnya.
- Mengirim histori round ke pusat hasil.

Kewenangan admin dibatasi oleh modifier `onlyAdmin`. Pada level kontrak, semua fungsi administrasi yang sensitif memvalidasi `msg.sender == roomAdmin`.

### Voter

Voter adalah address EOA yang didaftarkan oleh admin melalui `addVoter` atau `addVoters`. Voter berinteraksi dengan room melalui fungsi:

```solidity
vote(uint256 candidateId)
```

Identitas voter diambil dari `msg.sender`. Karena itu, address wallet yang mengirim transaksi harus sama dengan address yang didaftarkan pada room.

Hak voter:

- Membaca status room.
- Membaca daftar kandidat.
- Mengirim satu vote per round aktif.

Batasan voter:

- Voter harus terdaftar pada `voterRegistry`.
- Voter hanya dapat vote saat room `Active`.
- Voter hanya dapat vote satu kali pada `currentRound`.
- Candidate id yang dipilih harus valid.

### Publik / Auditor

Publik atau auditor dapat membaca data on-chain melalui fungsi view. Pada frontend, peran ini diwakili oleh `Public Audit Dashboard`. Auditor dapat membaca:

- Daftar room dari `RoomFactory`.
- Admin room dari `roomOwner`.
- Jumlah voter dari `getVoterCount`.
- Status round dari `getCurrentRoundStatus`.
- Jumlah hasil terpublikasi dari `VotingResultCenter.getRoomVersionCount`.
- Ringkasan dan detail kandidat pada setiap version hasil.

Karena data berasal dari smart contract, auditor dapat melakukan verifikasi independen menggunakan RPC, block explorer private, script, atau console frontend.

## State Machine VotingRoom

`VotingRoom` hanya memiliki dua state utama:

```text
Inactive
Active
```

Namun perilaku room juga dipengaruhi oleh flag:

```text
roundReadyToStart
```

Kombinasi state dan flag menghasilkan status operasional berikut:

| State | roundReadyToStart | Makna Operasional |
| --- | --- | --- |
| `Inactive` | `true` | Round siap dimulai. Admin dapat mengatur kandidat, mengatur voter, dan memanggil `start()`. |
| `Active` | `true` | Voting sedang berjalan. Voter yang eligible dapat memanggil `vote()`. |
| `Inactive` | `false` | Round selesai. Histori sudah disimpan, dan admin perlu memanggil `restart()` atau `reset()` untuk menyiapkan round berikutnya. |

Transisi utama:

```text
initialize()
  -> Inactive, currentRound = 1, roundReadyToStart = true

start()
  -> Active, activeRoundStartAt = block.timestamp

vote(candidateId)
  -> Active tetap, counter suara bertambah

stop()
  -> Inactive, histori round disimpan, roundReadyToStart = false

restart()
  -> Inactive, currentRound bertambah, konfigurasi voter dan kandidat dipertahankan, roundReadyToStart = true

reset()
  -> Inactive, currentRound bertambah, voter dan kandidat dibersihkan, roundReadyToStart = true
```

Model state ini penting untuk menjamin bahwa konfigurasi kandidat hanya berubah saat voting berada dalam fase administrasi, sedangkan vote hanya terjadi saat round aktif.

## Siklus Hidup Room

### 1. Pembuatan Room

Admin membuat room dengan:

```solidity
RoomFactory.createRoom("Pemilihan Ketua Organisasi 2026")
```

Eksekusi internal:

1. Factory membuat clone dari implementation `VotingRoom`.
2. Factory memanggil `initialize(msg.sender, roomName)` pada clone.
3. Clone menyimpan admin, nama room, state awal, dan round awal.
4. Factory mencatat `roomOwner[room] = msg.sender`.
5. Factory menandai `isRoom[room] = true`.
6. Factory menambahkan address clone ke `allRooms`.
7. Factory memancarkan event `RoomRegistered`.

Output penting:

- Address room clone.
- Admin room.
- Nama room.
- Status valid pada registry factory.

### 2. Konfigurasi Result Center

Admin mengatur pusat hasil:

```solidity
VotingRoom.setResultCenter(votingResultCenterAddress)
```

Syarat:

- Room sudah initialized.
- Caller adalah admin room.
- Room berada pada state `Inactive`.
- Address pusat hasil bukan zero address.

Fungsi ini menghubungkan room dengan `VotingResultCenter` yang akan menerima histori hasil round.

### 3. Registrasi Voter

Admin menambahkan voter:

```solidity
VotingRoom.addVoter(voterAddress)
```

atau batch:

```solidity
VotingRoom.addVoters(voterAddresses)
```

Validasi:

- Caller adalah admin room.
- Address voter bukan zero address.
- Address voter belum terdaftar.
- Panjang batch maksimal 500 address.

Efek state:

- `voterRegistry[voter] = true`
- `voterList.push(voter)`
- `voterIndexPlusOne[voter] = voterList.length`
- Event `VoterAdded` dipancarkan.

Catatan operasional:

- Voter yang ditambahkan saat room `Active` dapat ikut vote pada round berjalan selama address tersebut belum pernah vote pada round itu.
- Jumlah eligible voter untuk histori round dihitung dari `voterList.length` pada saat `stop()` dipanggil.

### 4. Registrasi Kandidat

Admin menambahkan kandidat:

```solidity
VotingRoom.addCandidate(candidateId, candidateName)
```

atau batch:

```solidity
VotingRoom.addCandidates(candidateIds, candidateNames)
```

Validasi:

- Caller adalah admin room.
- Room berada pada state `Inactive`.
- Candidate id belum terdaftar.
- Panjang `candidateIds` sama dengan panjang `candidateNames`.
- Panjang batch maksimal 500 kandidat.

Efek state:

- `candidateRegistry[candidateId] = true`
- `candidateName[candidateId] = name`
- `candidateIds.push(candidateId)`
- `candidateIndexPlusOne[candidateId] = candidateIds.length`
- Event `CandidateAdded` dipancarkan.

### 5. Memulai Round

Admin memulai voting:

```solidity
VotingRoom.start()
```

Validasi:

- Caller adalah admin room.
- Room sudah initialized.
- Room berada pada state `Inactive`.
- `roundReadyToStart == true`.
- Minimal ada satu voter.
- Minimal ada satu kandidat.

Efek state:

- `activeRoundStartAt = block.timestamp`
- `state = Active`
- Event `RoundStarted` dipancarkan.

Setelah event ini, voter yang eligible dapat mengirim transaksi `vote(candidateId)`.

### 6. Direct Vote oleh Voter

Voter mengirim transaksi:

```solidity
VotingRoom.vote(candidateId)
```

Validasi:

- Room berada pada state `Active`.
- `msg.sender` ada di `voterRegistry`.
- `lastVotedRound[msg.sender]` berbeda dari `currentRound`.
- `candidateId` ada di `candidateRegistry`.

Efek state:

- `roundVotes[currentRound][candidateId] += 1`
- `roundTotalVotes[currentRound] += 1`
- `lastVotedRound[msg.sender] = currentRound`
- Event `VoteCast` dipancarkan.

Event `VoteCast` memuat:

- Address room.
- Nomor round.
- Address voter.
- Candidate id.
- `actionId`, yaitu hash dari kombinasi room, round, dan voter.

Rumus `actionId`:

```solidity
keccak256(abi.encodePacked(address(this), currentRound, voter))
```

`actionId` berguna sebagai identifier tindakan vote pada event log. Karena vote count disimpan sebagai agregat per kandidat, sistem menyimpan bukti event vote dan hasil agregat on-chain.

### 7. Menghentikan Round

Admin menghentikan voting:

```solidity
VotingRoom.stop()
```

Validasi:

- Caller adalah admin room.
- Room berada pada state `Active`.

Perhitungan:

```text
totalVoter = voterList.length
totalGolput = totalVoter - roundTotalVotes[currentRound]
```

Snapshot histori yang disimpan:

- Address room.
- Round id.
- Admin.
- Total voter.
- Total golput.
- Timestamp start.
- Timestamp stop.
- Candidate ids.
- Candidate names.
- Vote counts per kandidat.

Efek state:

- `roundHistorySaved[currentRound] = true`
- `activeRoundStartAt = 0`
- `roundReadyToStart = false`
- `state = Inactive`
- Event `RoundStopped` dipancarkan.

Histori disimpan sebagai snapshot. Artinya, daftar kandidat, nama kandidat, dan jumlah suara pada saat `stop()` direkam ke struktur histori round.

### 8. Publikasi Histori ke Pusat Hasil

Admin mengirim histori round ke pusat:

```solidity
VotingRoom.submitRoundHistory(round)
```

Validasi di `VotingRoom`:

- Caller adalah admin room.
- `resultCenter` sudah terkonfigurasi.
- Histori round sudah tersimpan.

Langkah internal:

1. Room membaca `RoundHistory`.
2. Room menghitung `historyHash` melalui `getRoundHistoryHash(round)`.
3. Room memanggil `VotingResultCenter.submitRoundResult(...)`.
4. Result center memverifikasi bahwa `msg.sender` adalah room resmi menurut `RoomFactory`.
5. Result center menyimpan data sebagai version baru.
6. Result center memancarkan `RoundResultSubmitted`.
7. Room memancarkan `RoundHistorySubmitted`.

`historyHash` dihitung dari:

```solidity
keccak256(
    abi.encode(
        history.room,
        history.roundId,
        history.admin,
        history.totalVoter,
        history.totalGolput,
        history.startAt,
        history.stopAt,
        history.candidateIds,
        history.candidateNames,
        history.voteCounts
    )
)
```

Hash ini memungkinkan auditor membandingkan snapshot histori di room dengan data yang dipublikasikan di pusat. Jika data input sama, hash yang dihasilkan akan sama.

## Model Data Hasil dan Versioning

`VotingResultCenter` menyimpan hasil berdasarkan room dan version. Version adalah nomor monotonik per room:

```text
version = roomVersions[room].length + 1
```

Contoh:

- Submit pertama dari `0xRoomA` menjadi version `1`.
- Submit kedua dari `0xRoomA` menjadi version `2`.
- Submit pertama dari `0xRoomB` tetap menjadi version `1` untuk `0xRoomB`.

Versioning membuat setiap publikasi hasil memiliki identitas temporal. Dalam research paper, mekanisme ini dapat dijelaskan sebagai append-only publication log per room. Kontrak menjaga version lama tetap tersimpan dan menambahkan elemen baru pada array `roomVersions[room]`.

Data yang dapat dibaca dari version:

- Round id.
- Admin.
- Total voter.
- Total golput.
- Waktu mulai round.
- Waktu berhenti round.
- Hash histori.
- Waktu submit ke pusat.
- Daftar kandidat.
- Nama kandidat.
- Jumlah suara tiap kandidat.

## Model Perhitungan Suara

Perhitungan suara memakai pendekatan agregat:

```text
roundVotes[round][candidateId] = jumlah suara kandidat pada round
roundTotalVotes[round] = total suara sah pada round
lastVotedRound[voter] = round terakhir voter melakukan vote
```

Ketika voter memilih kandidat:

1. Kontrak memvalidasi eligibility voter.
2. Kontrak memvalidasi kandidat.
3. Kontrak memeriksa riwayat vote voter pada round berjalan.
4. Kontrak menaikkan counter kandidat.
5. Kontrak menaikkan total suara round.
6. Kontrak mencatat round terakhir voter.

Invarian utama:

- Satu address voter hanya dapat menambah `roundTotalVotes[currentRound]` satu kali per round.
- Total suara sah pada round adalah jumlah vote yang berhasil dieksekusi.
- Total golput dihitung saat round dihentikan, bukan saat round berjalan.
- Total voter pada histori adalah jumlah voter yang terdaftar pada saat `stop()`.

Dengan model ini, hasil pemilihan dapat diaudit melalui:

- State agregat `roundVotes`.
- State agregat `roundTotalVotes`.
- Histori round.
- Event `VoteCast`.
- Event `RoundStopped`.
- Data publikasi di `VotingResultCenter`.

## Model Golput

Golput dihitung ketika admin memanggil `stop()`:

```text
totalGolput = voterList.length - roundTotalVotes[currentRound]
```

Makna operasional:

- `voterList.length` adalah jumlah voter eligible pada saat round dihentikan.
- `roundTotalVotes[currentRound]` adalah jumlah vote sah yang masuk selama round aktif.
- Selisih keduanya adalah voter eligible yang tidak mengirim vote sah pada round tersebut.

Model ini cocok untuk pemilihan yang memperbolehkan perubahan daftar voter sampai fase voting berjalan. Jika kebijakan penelitian membutuhkan daftar voter final sebelum voting dimulai, maka prosedur operasional admin dapat menetapkan bahwa penambahan voter berhenti sebelum `start()`.

## Restart dan Reset Round

Setelah `stop()`, room masuk ke `Inactive` dengan `roundReadyToStart = false`. Admin perlu memilih salah satu jalur untuk round berikutnya.

### restart()

`restart()` menaikkan `currentRound` dan menyiapkan round baru:

```text
currentRound += 1
roundReadyToStart = true
```

Voter dan kandidat tetap dipertahankan. Jalur ini cocok untuk voting ulang dengan peserta dan kandidat yang sama.

### reset()

`reset()` menaikkan `currentRound`, membersihkan voter, dan membersihkan kandidat:

```text
clear all voters
clear all candidates
currentRound += 1
roundReadyToStart = true
```

Jalur ini cocok untuk pemilihan baru di room yang sama dengan konfigurasi peserta dan kandidat berbeda.

## Mekanisme Validasi dan Error

Kontrak menggunakan custom error untuk membuat revert lebih eksplisit dan efisien. Beberapa error penting:

- `OnlyRoomAdmin`
  Caller bukan admin room.

- `InvalidState`
  Fungsi dipanggil pada state yang tidak sesuai.

- `ZeroAddress`
  Input address bernilai zero address.

- `DuplicateVoter`
  Address voter sudah terdaftar.

- `DuplicateCandidate`
  Candidate id sudah terdaftar.

- `VoterNotEligible`
  Caller vote bukan voter eligible.

- `AlreadyVotedThisRound`
  Voter sudah vote pada round berjalan.

- `CandidateNotFound`
  Candidate id tidak valid.

- `NoVotersConfigured`
  Round dimulai tanpa voter.

- `NoCandidatesConfigured`
  Round dimulai tanpa kandidat.

- `RoundNotReady`
  Admin mencoba start saat round belum disiapkan.

- `RoundAlreadyPrepared`
  Admin mencoba restart/reset saat round sudah siap.

- `ResultCenterNotConfigured`
  Room belum memiliki address pusat hasil.

- `RoundHistoryNotSaved`
  Histori round yang diminta belum tersedia.

- `UnregisteredRoom`
  Result center menerima submit dari address yang bukan room resmi menurut factory.

- `VersionNotFound`
  Version hasil yang diminta tidak tersedia.

Validasi ini membentuk kontrol akses dan kontrol lifecycle sehingga setiap fungsi hanya dapat dieksekusi pada kondisi sistem yang benar.

## Interaksi Frontend

Frontend dibuat dengan React, Vite, Wagmi, Viem, RainbowKit, dan TanStack Query. Wallet connection dikelola melalui RainbowKit dan Wagmi. Read/write kontrak dilakukan melalui Viem client dari Wagmi.

### Konfigurasi Chain

Pada `frontend/src/main.jsx`, chain aplikasi ditentukan dari environment:

- `VITE_CHAIN_ID`
- `VITE_CHAIN_NAME`
- `VITE_RPC_URL`
- `VITE_SEPOLIA_RPC_URL`
- `VITE_NATIVE_CURRENCY_NAME`
- `VITE_NATIVE_CURRENCY_SYMBOL`
- `VITE_WALLETCONNECT_PROJECT_ID`

Jika chain id sesuai Sepolia, frontend menggunakan konfigurasi `sepolia` dari Wagmi. Jika berbeda, frontend membuat custom chain object sehingga dapat diarahkan ke private Besu atau jaringan EVM-compatible lain.

### Voter Booth

`Voter Booth` adalah UI utama untuk voter. Alurnya:

1. Voter connect wallet.
2. Voter memasukkan address room clone.
3. Frontend memvalidasi format address.
4. Frontend membaca `RoomFactory.isRoom(roomAddress)` untuk memastikan room resmi.
5. Frontend membaca `roomName`, `getCurrentRoundStatus`, `getCandidates`, dan `getVoterCount`.
6. Jika wallet terhubung, frontend membaca `isVoterEligible(address)` dan `lastVotedRound(address)`.
7. Frontend menampilkan kandidat.
8. Voter memilih kandidat.
9. Frontend mengirim transaksi `vote(candidateId)` ke address room clone.
10. Frontend menunggu receipt transaksi.
11. UI menampilkan status sukses atau error.

Kriteria UI untuk mengaktifkan tombol vote:

- Wallet sudah connect.
- Room berhasil dimuat.
- Room berada pada state `Active`.
- Address wallet eligible.
- Address wallet belum vote pada round berjalan.
- Kandidat sudah dipilih.

### Public Audit Dashboard

`Public Audit Dashboard` adalah UI publik untuk observasi hasil. Dashboard melakukan refresh berkala setiap 15 detik.

Alur pembacaan:

1. Baca `RoomFactory.getRoomCount()`.
2. Ambil semua room dengan `RoomFactory.getRoomAt(index)`.
3. Untuk setiap room, baca:
   - `RoomFactory.roomOwner(room)`
   - `VotingRoom.roomName()`
   - `VotingRoom.getVoterCount()`
   - `VotingRoom.getCurrentRoundStatus()`
   - `VotingResultCenter.getRoomVersionCount(room)`
4. Untuk setiap version, baca:
   - `VotingResultCenter.getRoomVersionSummary(room, version)`
   - `VotingResultCenter.getRoomVersionCandidates(room, version)`
5. Dashboard menampilkan room, admin, jumlah voter, current round, jumlah version, metadata hasil, hash histori, dan suara kandidat.

Dengan desain ini, dashboard publik membaca registry room dari factory dan membaca hasil terkonfirmasi dari pusat hasil. Room yang sudah dibuat dapat terlihat dari factory, sedangkan hasil terpublikasi muncul setelah admin submit histori round.

### Contract Console

`Contract Console` adalah UI teknis untuk membaca dan menulis fungsi kontrak berdasarkan ABI.

Fitur:

- Memilih kontrak `RoomFactory`, `VotingRoom`, atau `VotingResultCenter`.
- Menampilkan fungsi read dan write dari ABI.
- Mengisi argumen fungsi.
- Mengirim transaksi write melalui wallet.
- Melakukan call read melalui public client.
- Menampilkan tx hash, receipt, dan event yang berhasil didekode.
- Menyimpan address room clone dari event `RoomRegistered` setelah `createRoom()` berhasil.

Untuk `VotingRoom`, console meminta address clone. Address implementation pada konfigurasi frontend dipakai sebagai referensi template, bukan target voting room.

## Alur End-to-End

Berikut alur lengkap dari deployment sampai audit hasil:

1. Deploy `VotingRoom` implementation.
2. Deploy `RoomFactory` dengan address implementation.
3. Deploy `VotingResultCenter` dengan address factory.
4. Konfigurasikan address kontrak dan chain di frontend.
5. Admin connect wallet ke frontend.
6. Admin membuka `Contract Console`.
7. Admin memanggil `RoomFactory.createRoom(roomName)`.
8. Frontend menangkap event `RoomRegistered` dan menyimpan address clone.
9. Admin memilih kontrak `VotingRoom` dan menggunakan address clone.
10. Admin memanggil `setResultCenter(votingResultCenterAddress)`.
11. Admin menambahkan voter.
12. Admin menambahkan kandidat.
13. Admin memanggil `start()`.
14. Voter membuka `Voter Booth`.
15. Voter memasukkan address room clone.
16. Voter memilih kandidat dan mengirim `vote(candidateId)`.
17. Admin memanggil `stop()` setelah periode voting selesai.
18. Room menyimpan histori round.
19. Admin memanggil `submitRoundHistory(round)`.
20. Result center menyimpan hasil sebagai version baru.
21. Publik membaca hasil melalui `Public Audit Dashboard`.

## Contoh Skenario Satu Round

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

1. Admin membuat room melalui `createRoom("Pemilihan Ketua")`.
2. Admin mengatur result center.
3. Admin menambahkan tiga voter.
4. Admin menambahkan dua kandidat.
5. Admin memulai round dengan `start()`.
6. `0xVoter1` memilih kandidat `1`.
7. `0xVoter2` memilih kandidat `2`.
8. `0xVoter3` memilih kandidat `1`.
9. Admin menghentikan round dengan `stop()`.
10. Admin mempublikasikan histori dengan `submitRoundHistory(1)`.

State di room setelah `stop()`:

```text
roundTotalVotes[1] = 3
roundVotes[1][1] = 2
roundVotes[1][2] = 1
totalVoter = 3
totalGolput = 0
roundHistorySaved[1] = true
```

State di pusat hasil setelah submit:

```text
getRoomVersionCount(0xRoomA) = 1
getLatestVersion(0xRoomA) = 1
```

Data kandidat pada version `1`:

```text
ids = [1, 2]
names = ["Andi", "Budi"]
voteCounts = [2, 1]
```

## Contoh Skenario dengan Golput

Data:

- Voter:
  - `0xVoter1`
  - `0xVoter2`
  - `0xVoter3`
- Kandidat:
  - `1 = Andi`
  - `2 = Budi`

Alur:

1. Admin memulai round.
2. `0xVoter1` memilih kandidat `1`.
3. `0xVoter2` memilih kandidat `2`.
4. `0xVoter3` tidak mengirim vote sampai round dihentikan.
5. Admin memanggil `stop()`.

Hasil:

```text
totalVoter = 3
roundTotalVotes = 2
totalGolput = 1
```

Interpretasi:

- Dua voter berpartisipasi.
- Satu voter eligible tercatat sebagai golput.
- Golput dihitung berdasarkan snapshot jumlah voter saat `stop()`.

## Contoh Skenario Voter Ditambahkan Saat Active

Data awal:

- Voter awal:
  - `0xVoter1`
  - `0xVoter2`
- Kandidat:
  - `1 = Andi`
  - `2 = Budi`

Alur:

1. Admin memanggil `start()`.
2. `0xVoter1` memilih kandidat `1`.
3. Admin menambahkan voter baru:

```solidity
VotingRoom.addVoter(0xVoter3)
```

4. `0xVoter3` memilih kandidat `2`.
5. `0xVoter2` tidak mengirim vote.
6. Admin memanggil `stop()`.

Hasil:

```text
totalVoter = 3
roundTotalVotes = 2
totalGolput = 1
```

Interpretasi:

- `0xVoter3` menjadi eligible pada round berjalan.
- `0xVoter2` dihitung golput.
- Snapshot eligible voter mengikuti daftar voter saat round dihentikan.

## Properti Keamanan dan Integritas

### Kontrol Akses

Fungsi administratif dilindungi oleh `onlyAdmin`. Hal ini memastikan hanya `roomAdmin` yang dapat mengubah konfigurasi room, memulai round, menghentikan round, menyiapkan round baru, dan mempublikasikan histori.

### One Voter One Vote per Round

Kontrak menggunakan `lastVotedRound[voter]` untuk mencegah double voting. Setelah voter berhasil vote pada `currentRound`, mapping tersebut diisi dengan nomor round. Percobaan vote kedua pada round yang sama akan revert dengan `AlreadyVotedThisRound`.

### Validasi Kandidat

Vote hanya dapat diberikan kepada candidate id yang terdaftar pada `candidateRegistry`. Candidate id yang tidak valid akan menyebabkan revert `CandidateNotFound`.

### Validasi Room Resmi

`VotingResultCenter` hanya menerima submit dari room yang valid menurut `RoomFactory`. Validasi dilakukan dengan:

```solidity
IRoomFactoryRegistry(roomFactory).isRoom(msg.sender)
```

Ini mencegah address eksternal mempublikasikan hasil palsu ke pusat hasil.

### Snapshot Histori

Saat `stop()`, room menyimpan snapshot hasil round. Snapshot mencakup daftar kandidat, nama kandidat, dan vote count. Ini penting karena konfigurasi kandidat dapat berubah pada round berikutnya melalui `restart()` atau `reset()`.

### Hash Histori

`historyHash` menyediakan fingerprint dari snapshot histori. Auditor dapat menghitung ulang hash dari data histori room dan membandingkannya dengan hash yang tersimpan di `VotingResultCenter`.

### Reentrancy Guard

Fungsi `vote()` memakai `nonReentrant` dari OpenZeppelin `ReentrancyGuard`. Walaupun fungsi vote tidak melakukan transfer aset, guard ini memberi lapisan proteksi tambahan terhadap pola reentrancy yang tidak diinginkan.

### Batas Batch

Batch voter dan kandidat dibatasi oleh `MAX_BATCH_SIZE = 500`. Batas ini mengurangi risiko transaksi terlalu besar dan membantu menjaga eksekusi tetap realistis terhadap gas limit jaringan.

## Auditability

Sistem menyediakan beberapa sumber audit:

- Storage state pada `RoomFactory`, `VotingRoom`, dan `VotingResultCenter`.
- Event log untuk lifecycle room dan voting.
- Snapshot histori pada room.
- Version hasil pada pusat.
- Hash histori untuk verifikasi konsistensi.
- Dashboard publik yang membaca data langsung dari kontrak.

Contoh verifikasi auditor:

1. Ambil address room dari `RoomFactory.getRoomAt(index)`.
2. Verifikasi admin melalui `RoomFactory.roomOwner(room)`.
3. Ambil status room melalui `VotingRoom.getCurrentRoundStatus()`.
4. Ambil histori round melalui `VotingRoom.getRoundHistory(round)`.
5. Ambil kandidat histori melalui `VotingRoom.getRoundHistoryCandidates(round)`.
6. Hitung atau baca `VotingRoom.getRoundHistoryHash(round)`.
7. Ambil version hasil dari `VotingResultCenter`.
8. Bandingkan `historyHash` di room dengan `historyHash` di pusat.
9. Bandingkan kandidat dan vote count antara room dan pusat.

## Pertimbangan Privasi

Sistem ini menekankan transparansi on-chain. Address voter yang mengirim vote muncul pada event `VoteCast`, sedangkan pilihan kandidat muncul sebagai `candidateId` pada event. Dengan demikian, model ini cocok untuk konteks pemilihan yang mengutamakan auditability dan demonstrasi integritas proses, tetapi perlu evaluasi tambahan jika dipakai untuk pemilihan yang menuntut kerahasiaan pilihan.

Untuk research paper, batasan privasi ini dapat dijelaskan sebagai trade-off antara verifiability dan ballot secrecy. Jika kebutuhan penelitian mencakup kerahasiaan suara, desain dapat dikembangkan lebih lanjut menggunakan mekanisme commit-reveal, zero-knowledge proof, anonymous credential, atau homomorphic tallying.

## Pertimbangan Operasional di Private Network

Pada jaringan private Besu atau jaringan EVM-compatible internal, operator perlu menyiapkan:

- RPC endpoint.
- Chain ID.
- Native currency symbol dan nama chain untuk wallet.
- Wallet admin.
- Wallet voter.
- Saldo native coin untuk membayar gas pada akun yang mengirim transaksi.
- Address kontrak hasil deployment.
- Konfigurasi environment frontend.

Karena voter mengirim transaksi langsung, setiap voter perlu memiliki wallet/EOA dan saldo gas. Pada private network, saldo gas dapat dialokasikan oleh operator jaringan sesuai kebutuhan eksperimen atau demo.

## Mapping Frontend terhadap Kontrak

| Kebutuhan UI | Kontrak | Fungsi |
| --- | --- | --- |
| Membuat room | `RoomFactory` | `createRoom` |
| Memvalidasi room | `RoomFactory` | `isRoom` |
| Menampilkan daftar room | `RoomFactory` | `getRoomCount`, `getRoomAt` |
| Menampilkan room admin | `RoomFactory` | `roomOwner` |
| Mengatur pusat hasil | `VotingRoom` | `setResultCenter` |
| Menambah voter | `VotingRoom` | `addVoter`, `addVoters` |
| Menambah kandidat | `VotingRoom` | `addCandidate`, `addCandidates` |
| Membaca kandidat untuk voter | `VotingRoom` | `getCandidates` |
| Mengecek eligibility voter | `VotingRoom` | `isVoterEligible` |
| Mengecek status round | `VotingRoom` | `getCurrentRoundStatus` |
| Mengirim vote | `VotingRoom` | `vote` |
| Menghentikan round | `VotingRoom` | `stop` |
| Mengirim hasil ke pusat | `VotingRoom` | `submitRoundHistory` |
| Membaca jumlah version | `VotingResultCenter` | `getRoomVersionCount` |
| Membaca ringkasan hasil | `VotingResultCenter` | `getRoomVersionSummary` |
| Membaca suara kandidat | `VotingResultCenter` | `getRoomVersionCandidates` |

## Data Flow Ringkas

```text
Admin wallet
  -> RoomFactory.createRoom(roomName)
  -> RoomRegistered(roomClone, admin, name)

Admin wallet
  -> VotingRoom(roomClone).setResultCenter(center)
  -> VotingRoom(roomClone).addVoters(voters)
  -> VotingRoom(roomClone).addCandidates(ids, names)
  -> VotingRoom(roomClone).start()

Voter wallet
  -> VotingRoom(roomClone).vote(candidateId)
  -> VoteCast(roomClone, round, voter, candidateId, actionId)

Admin wallet
  -> VotingRoom(roomClone).stop()
  -> RoundStopped(roomClone, round, totalVoter, totalGolput)

Admin wallet
  -> VotingRoom(roomClone).submitRoundHistory(round)
  -> VotingResultCenter.submitRoundResult(...)
  -> RoundResultSubmitted(roomClone, admin, version, roundId, historyHash, submittedAt)

Public dashboard
  -> RoomFactory read functions
  -> VotingRoom read functions
  -> VotingResultCenter read functions
```

## Kekuatan Desain untuk Research Paper

Beberapa aspek yang dapat diangkat sebagai kontribusi teknis atau objek evaluasi:

- Modularitas room melalui EIP-1167 clone.
- Pemisahan antara eksekusi voting per room dan publikasi hasil terpusat.
- Direct vote berbasis EOA yang sederhana untuk private blockchain.
- Registry room sebagai mekanisme validasi sumber hasil.
- Versioning hasil sebagai publication log.
- Snapshot histori untuk menjaga konsistensi hasil antar round.
- Hash histori sebagai fingerprint data hasil.
- Dashboard publik yang membaca data langsung dari kontrak.
- Dukungan multi-round melalui `restart()` dan `reset()`.
- Batas batch untuk menjaga transaksi administrasi tetap terkendali.

Aspek yang dapat dijadikan metrik evaluasi:

- Gas cost pembuatan room clone.
- Gas cost registrasi voter dan kandidat.
- Gas cost vote.
- Gas cost stop dan submit hasil.
- Latency transaksi pada private Besu.
- Skalabilitas jumlah room.
- Skalabilitas jumlah voter per room.
- Skalabilitas jumlah kandidat per room.
- Kemudahan audit hasil melalui event dan storage.
- Konsistensi hash histori antara room dan result center.

## Batasan Sistem

Beberapa batasan desain aktif:

- Vote bersifat transparan pada level event karena address voter dan candidate id muncul di log transaksi.
- Eligibility berbasis address wallet sehingga pengelolaan identitas off-chain tetap diperlukan.
- Voter membutuhkan saldo native coin untuk membayar gas.
- Admin room memiliki kewenangan besar terhadap konfigurasi voter, kandidat, lifecycle round, dan publikasi histori.
- Pusat hasil menerima submit sebagai version baru sehingga prosedur operasional perlu mendefinisikan version mana yang dianggap final.
- `getRoomsByVoter` melakukan iterasi semua room dan `staticcall` ke tiap room, sehingga biaya call meningkat seiring jumlah room jika dipanggil on-chain oleh kontrak lain. Untuk frontend read-only, fungsi ini lebih cocok dipakai sebagai query off-chain melalui RPC.

Batasan ini tidak mengurangi fungsi dasar sistem, tetapi penting dicatat sebagai ruang pengembangan lanjutan.

## Arah Pengembangan Lanjutan

Untuk penelitian lanjutan, sistem dapat dikembangkan pada beberapa arah:

- Integrasi identitas terverifikasi, misalnya DID, allowlist berbasis institusi, atau credential terbitan admin.
- Mekanisme privacy-preserving voting, misalnya commit-reveal, zero-knowledge proof, atau anonymous voting credential.
- Finalization policy pada `VotingResultCenter`, misalnya menandai satu version sebagai final.
- Role management multi-admin untuk membagi tugas operator, auditor, dan election committee.
- Event indexing menggunakan subgraph atau indexer lokal agar dashboard dapat menangani data besar dengan lebih efisien.
- Batch import voter dari file CSV dengan verifikasi client-side sebelum transaksi.
- Analytics gas dan latency untuk membandingkan private Besu dengan testnet publik.
- Formal verification untuk invariant one-voter-one-vote dan valid state transition.

## Kesimpulan

SecureVote pada `mockup/v3/securevote-ui` adalah sistem voting on-chain berbasis tiga kontrak utama: `RoomFactory`, `VotingRoom`, dan `VotingResultCenter`. `RoomFactory` membuat dan meregistrasi room clone menggunakan EIP-1167. `VotingRoom` menjalankan lifecycle pemilihan, mulai dari konfigurasi voter dan kandidat, start round, direct vote, stop round, hingga penyimpanan histori. `VotingResultCenter` menyimpan hasil yang dipublikasikan sebagai version per room dan memverifikasi bahwa sumber submit adalah room resmi dari factory.

Frontend v3 menyediakan pengalaman operasional untuk voter, admin, dan auditor. Voter mengirim vote langsung dari wallet melalui `Voter Booth`; admin dapat mengelola kontrak melalui `Contract Console`; publik dapat membaca hasil terkonfirmasi melalui `Public Audit Dashboard`. Kombinasi smart contract, event log, snapshot histori, hash histori, dan versioning hasil membuat sistem ini layak dianalisis sebagai prototipe e-voting berbasis blockchain yang menekankan transparansi, auditability, dan pemisahan konteks pemilihan.
