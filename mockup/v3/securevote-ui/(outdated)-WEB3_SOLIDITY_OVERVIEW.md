# SecureVote Web3 Solidity Overview

Dokumen ini menjelaskan kontrak Solidity yang dipakai oleh UI `securevote-ui`.

Kontrak utama:

1. `RoomFactory`
2. `VotingRoom`
3. `SponsorVault`
4. `MinimalForwarder`

UI membaca ABI dari:

```text
frontend/src/abi/RoomFactory.json
frontend/src/abi/VotingRoom.json
frontend/src/abi/SponsorVault.json
frontend/src/abi/MinimalForwarder.json
```

Source Solidity berada di:

```text
contracts/v2/RoomFactory.sol
contracts/v2/VotingRoom.sol
contracts/v2/SponsorVault.sol
contracts/v2/MinimalForwarder.sol
```

## 1. RoomFactory

`RoomFactory` bertugas membuat room voting baru. Room yang dibuat adalah clone dari `VotingRoom` implementation menggunakan pola EIP-1167 minimal proxy.

### Variables

```solidity
address public immutable votingRoomImplementation;
```

Alamat contract logic/template `VotingRoom`. Ini bukan room voting asli, hanya implementation.

```solidity
address public immutable sponsorVault;
```

Alamat contract `SponsorVault`.

```solidity
address public immutable trustedForwarder;
```

Alamat contract `MinimalForwarder` untuk gasless transaction.

```solidity
mapping(address room => address admin) public roomOwner;
```

Mapping dari address room ke admin room.

```solidity
mapping(address room => bool valid) public isRoom;
```

Menandai apakah sebuah address adalah room valid yang dibuat oleh factory.

```solidity
address[] public allRooms;
```

Array semua room yang pernah dibuat.

Karena variable ini `public`, Solidity otomatis membuat getter:

```solidity
roomOwner(address room)
isRoom(address room)
allRooms(uint256 index)
```

Catatan: `allRooms` perlu input index. Contoh: `allRooms(0)`.

### Functions

```solidity
createRoom(string calldata roomName) external payable returns (address room)
```

Membuat voting room baru.

Alur:

1. Cek registration fee dari `SponsorVault`.
2. Clone `VotingRoom` implementation.
3. Panggil `initialize()` pada room clone.
4. Simpan `roomOwner`.
5. Set `isRoom`.
6. Push room ke `allRooms`.
7. Kirim registration fee ke `SponsorVault`.

```solidity
getRoomCount() external view returns (uint256)
```

Mengembalikan jumlah room yang sudah dibuat.

```solidity
getRoomAt(uint256 index) external view returns (address)
```

Mengambil address room berdasarkan index.

Jika `getRoomCount()` menghasilkan `3`, index valid adalah `0`, `1`, dan `2`.

```solidity
getRoomsByAdmin(address admin) external view returns (address[] memory)
```

Mengambil semua room yang dimiliki admin tertentu.

```solidity
getRoomsByVoter(address voter) external view returns (address[] memory rooms)
```

Mengambil room tempat voter tersebut eligible. Function ini melakukan loop ke semua room, sehingga kurang cocok untuk data besar.

### Event

```solidity
event RoomRegistered(address indexed room, address indexed admin, uint256 feePaid, string name);
```

Dikeluarkan setelah room baru berhasil dibuat.

## 2. VotingRoom

`VotingRoom` adalah logic utama voting. Setiap room clone memiliki state sendiri: admin, voter, kandidat, round, credit, dan hasil vote.

### Enum

```solidity
enum State { Inactive, Active, Paused, Ended, Closed }
```

Arti state:

```text
Inactive = setup / belum mulai
Active   = voting sedang berjalan
Paused   = voting dipause sementara
Ended    = voting selesai, belum final close
Closed   = round sudah ditutup
```

### Constant

```solidity
uint256 public constant MAX_BATCH_SIZE = 500;
```

Batas maksimal batch operation, misalnya upload 500 voter sekali transaksi.

### Core Variables

```solidity
bool public initialized;
```

Menandakan clone room sudah di-initialize.

```solidity
address public roomAdmin;
```

Admin room.

```solidity
string public roomName;
```

Nama room voting.

```solidity
address public sponsorVault;
```

Alamat `SponsorVault`.

```solidity
State public state;
```

Status room saat ini.

```solidity
uint256 public currentRound;
```

Nomor round voting saat ini.

```solidity
uint256 public maxCostPerVoteWei;
```

Batas maksimal biaya gas per vote dalam wei. Dipakai untuk precheck gasless voting.

### Voter Variables

```solidity
uint256 public voterRegistryVersion;
mapping(address voter => uint256 version) public voterVersion;
```

Dipakai untuk mengecek apakah voter masih eligible. Voter eligible jika:

```solidity
voterVersion[voter] == voterRegistryVersion
```

```solidity
mapping(address voter => uint256 credit) public voterCredit;
```

Credit voting milik voter. Bobot vote diambil dari nilai ini.

```solidity
mapping(address voter => uint256 round) public lastVotedRound;
```

Mencegah voter vote dua kali pada round yang sama.

### Credit Pool Variables

```solidity
uint256 public totalCreditsInSystem;
```

Total credit yang pernah masuk ke sistem.

```solidity
uint256 public availableCreditsPool;
```

Credit yang tersedia untuk dipakai ulang.

```solidity
uint256 public totalCreditsGranted;
```

Total credit yang sedang diberikan ke voter aktif.

```solidity
uint256 public totalCreditsUsed;
```

Total credit yang sudah dipakai untuk vote.

### Candidate Variables

```solidity
uint256 public candidateRegistryVersion;
mapping(uint256 candidateId => uint256 version) public candidateVersion;
```

Dipakai untuk mengecek kandidat valid. Kandidat valid jika:

```solidity
candidateVersion[candidateId] == candidateRegistryVersion
```

```solidity
mapping(uint256 candidateId => string name) public candidateName;
```

Nama kandidat berdasarkan ID.

```solidity
mapping(uint256 round => mapping(uint256 candidateId => uint256 votes)) public roundVotes;
```

Total vote per round dan kandidat.

Contoh:

```text
roundVotes[1][2] = total vote kandidat ID 2 di round 1
```

### Round Summary

```solidity
struct RoundSummary {
    uint256 winnerId;
    string winnerName;
    uint256 winnerVoteCount;
    uint256 startAt;
    uint256 endAt;
    bool closed;
}
```

```solidity
mapping(uint256 round => RoundSummary) public roundSummaries;
```

Menyimpan hasil akhir setiap round. `winnerId` tetap dipilih manual saat `closeRound(winnerId)`, sedangkan `winnerVoteCount` diambil dari `roundVotes[currentRound][winnerId]`.

### Admin Functions

```solidity
initialize(address _roomAdmin, string calldata _roomName, address _sponsorVault, address _trustedForwarder)
```

Dipanggil sekali saat clone room dibuat.

```solidity
setMaxCostPerVote(uint256 newCost)
```

Admin mengatur batas biaya gasless vote.

```solidity
addVoter(address voter)
```

Menambahkan voter. Tidak bisa dipanggil saat state `Active`.

```solidity
removeVoter(address voter)
```

Menghapus voter. Jika voter punya credit, credit dikembalikan ke pool.

```solidity
grantCredit(address voter, uint256 newAmount)
```

Set credit voter. Ini mengganti nilai credit, bukan menambah.

Contoh:

```text
credit lama = 10
grantCredit(voter, 7)
credit baru = 7
sisa 3 masuk pool
```

```solidity
burnPoolCredits(uint256 amount)
```

Menghapus credit dari pool secara permanen.

```solidity
addCandidate(uint256 candidateId, string calldata name)
```

Menambahkan kandidat.

```solidity
removeCandidate(uint256 candidateId)
```

Menghapus kandidat dari registry aktif.

### Batch Functions

```solidity
batchAddVoters(address[] calldata voters)
```

Tambah banyak voter dalam satu transaksi.

```solidity
batchGrantCredits(address[] calldata voters, uint256[] calldata amounts)
```

Set credit banyak voter dalam satu transaksi.

```solidity
batchAddVotersWithCredits(address[] calldata voters, uint256[] calldata credits)
```

Tambah voter sekaligus set credit. Cocok untuk upload data dari Excel.

```solidity
batchAddCandidates(uint256[] calldata candidateIds, string[] calldata names)
```

Tambah banyak kandidat.

```solidity
batchRemoveVoters(address[] calldata voters)
```

Hapus banyak voter dan kembalikan credit mereka ke pool.

```solidity
batchRemoveCandidates(uint256[] calldata candidateIds)
```

Hapus banyak kandidat.

### Voting Lifecycle Functions

```solidity
startVoting()
```

Mulai voting. State berubah dari `Inactive` ke `Active`.

```solidity
stopVoting()
```

Pause voting. State berubah dari `Active` ke `Paused`. Setelah paused, admin hanya bisa resume dengan `startVoting()` atau finish dengan `endVoting()`. Tidak bisa langsung `closeRound()`.

```solidity
endVoting()
```

Mengakhiri voting dan menyimpan timestamp akhir. Function ini bisa dipanggil dari state `Active` atau `Paused`.

```solidity
closeRound(uint256 winnerId)
```

Menutup round dan menyimpan pemenang.

```solidity
resetRoom()
```

Reset room setelah state `Closed`. Registry voter/kandidat dan credit counter di-reset.

```solidity
prepareNextRound()
```

Menyiapkan round berikutnya tanpa menghapus voter, kandidat, dan credit.

### Voting Function

```solidity
vote(uint256 candidateId)
```

Voter memilih kandidat.

Validasi:

1. State harus `Active`.
2. Voter eligible.
3. Voter belum vote di round ini.
4. Kandidat valid.
5. Voter punya credit.

Efek:

1. Semua credit voter menjadi bobot vote.
2. Credit voter menjadi `0`.
3. Vote kandidat bertambah.
4. `lastVotedRound` diupdate.
5. Emit `VoteCast`.

### View Functions

```solidity
getVotes(uint256 round, uint256 candidateId) external view returns (uint256)
```

Ambil total vote kandidat pada round tertentu.

```solidity
getRoundSummary(uint256 round) external view returns (RoundSummary memory)
```

Ambil summary round.

```solidity
isVoterEligible(address voter) external view returns (bool)
```

Cek apakah voter eligible.

```solidity
isCandidateValid(uint256 candidateId) external view returns (bool)
```

Cek apakah kandidat valid.

```solidity
getPoolStatus() external view returns (uint256 systemTotal, uint256 poolAvailable, uint256 currentlyGranted, uint256 totalUsed)
```

Melihat status credit pool.

```solidity
canPoolCover(uint256 amount) external view returns (bool)
```

Cek apakah pool cukup untuk cover jumlah credit tertentu.

```solidity
calculateCreditAllocation(uint256 amount) external view returns (uint256 fromPool, uint256 newCredits)
```

Simulasi alokasi credit: berapa dari pool dan berapa credit baru.

```solidity
newCreditsNeeded(uint256 amount) external view returns (uint256)
```

Cek credit baru yang dibutuhkan di luar pool.

```solidity
getCreditUtilization() external view returns (uint256)
```

Mengembalikan persentase credit yang sedang digunakan.

### Deposit Function

```solidity
withdrawDeposit(uint256 amount)
```

Admin menarik deposit room dari `SponsorVault`. Tidak bisa saat room sedang `Active`.

## 3. SponsorVault

`SponsorVault` menyimpan ETH untuk deposit room, reimbursement relayer, registration fee, dan platform fee.

### Variables

```solidity
mapping(address room => uint256 balance) public roomBalance;
```

Saldo deposit ETH tiap room.

```solidity
mapping(bytes32 actionId => bool settled) public settled;
```

Menandai action vote sudah dibayar ke relayer agar tidak bisa double settlement.

```solidity
mapping(address relayer => bool allowed) public isRelayer;
```

Allowlist relayer.

```solidity
uint256 public overheadBps;
```

Tambahan biaya relayer dalam basis point.

Contoh:

```text
1000  = 10%
500   = 5%
10000 = 100%
```

```solidity
uint256 public registrationFeeWei;
```

Fee pembuatan room.

```solidity
uint256 public platformFeeBps;
```

Fee platform saat withdraw deposit.

```solidity
uint256 public platformFeeAccrued;
```

Total platform fee yang sudah terkumpul.

### Room Functions

```solidity
topup(address room) external payable
```

Menambah deposit ETH untuk room.

```solidity
withdraw(address room, uint256 amount) external
```

Menarik deposit room. Hanya bisa dipanggil oleh contract room itu sendiri.

### Settlement Function

```solidity
settleAndWithdraw(address room, bytes32 actionId, uint256 chargedAmount)
```

Dipanggil relayer setelah vote berhasil. Vault mengurangi saldo room dan membayar relayer.

### Platform Admin Functions

```solidity
setOverheadBps(uint256 newBps)
```

Owner update overhead relayer.

```solidity
setRegistrationFee(uint256 newFee)
```

Owner update registration fee.

```solidity
setPlatformFeeBps(uint256 newBps)
```

Owner update platform fee.

```solidity
setRelayer(address relayer, bool allowed)
```

Owner menambah atau menghapus relayer dari allowlist.

```solidity
withdrawPlatformFee(address to)
```

Owner menarik platform fee.

```solidity
acceptRegistrationFee() external payable
```

Menerima registration fee dari `RoomFactory`.

### Analytics Functions

```solidity
getTotalBalance() external view returns (uint256)
```

Total ETH yang ada di vault.

```solidity
getRoomBalances(address[] calldata rooms) external view returns (uint256[] memory)
```

Ambil saldo banyak room sekaligus.

```solidity
getVaultStats() external view returns (uint256 totalLocked, uint256 platformFees, uint256 roomsDeposits)
```

Ringkasan vault.

## 4. MinimalForwarder

`MinimalForwarder` menjalankan gasless transaction. User menandatangani message, lalu relayer mengirim transaksi ke blockchain.

### Struct

```solidity
struct ForwardRequest {
    address from;
    address to;
    uint256 value;
    uint256 gas;
    uint256 nonce;
    bytes data;
}
```

Arti field:

```text
from  = voter asli
to    = contract tujuan, biasanya VotingRoom clone
value = ETH yang dikirim, biasanya 0
gas   = limit gas
nonce = anti replay
data  = encoded function call, misalnya vote(candidateId)
```

### Variables

```solidity
bytes32 private constant TYPEHASH;
```

Hash tipe EIP-712 untuk `ForwardRequest`.

```solidity
mapping(address => uint256) private _nonces;
```

Nonce per address agar signature tidak bisa dipakai ulang.

### Functions

```solidity
getNonce(address from) public view returns (uint256)
```

Ambil nonce user.

```solidity
verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool)
```

Cek apakah signature valid dan dibuat oleh `req.from`.

```solidity
execute(ForwardRequest calldata req, bytes calldata signature) public payable returns (bool success, bytes memory returnData)
```

Menjalankan meta-transaction.

Alur:

1. Verify signature.
2. Naikkan nonce.
3. Append address `from` ke calldata.
4. Call contract tujuan.
5. Jika gagal, revert dengan reason asli.

## Alur Besar Aplikasi

### 1. Admin Membuat Room

```text
RoomFactory.createRoom(roomName)
```

Factory membuat clone `VotingRoom`, lalu mengirim registration fee ke `SponsorVault`.

### 2. Admin Setup Room

Admin biasanya menjalankan:

```text
VotingRoom.addVoter()
VotingRoom.grantCredit()
VotingRoom.addCandidate()
SponsorVault.topup()
VotingRoom.setMaxCostPerVote()
```

### 3. Admin Mulai Voting

```text
VotingRoom.startVoting()
```

State berubah menjadi `Active`.

### 4. Voter Vote Gasless

Alur gasless:

```text
Frontend signTypedData
Relayer menerima signature
Relayer call MinimalForwarder.execute()
MinimalForwarder call VotingRoom.vote()
Relayer call SponsorVault.settleAndWithdraw()
```

Voter tidak membayar gas langsung. Gas dibayar relayer, lalu relayer diganti dari deposit room di `SponsorVault`.

### 5. Admin Mengakhiri Voting

```text
VotingRoom.endVoting()
VotingRoom.closeRound(winnerId)
```

### 6. Lanjut Round atau Reset

Untuk lanjut round dengan voter/kandidat/credit tetap:

```text
VotingRoom.prepareNextRound()
```

Untuk reset total:

```text
VotingRoom.resetRoom()
```

## Catatan UI

Pada UI `securevote-ui`, setiap public variable akan muncul seperti function read.

Contoh:

```solidity
address[] public allRooms;
```

akan muncul sebagai:

```text
allRooms(uint256)
```

Jadi input index wajib diisi.

Contoh:

```text
allRooms(0)
```

Untuk mengetahui index yang valid, panggil:

```text
getRoomCount()
```

Jika hasilnya `3`, index valid adalah `0`, `1`, dan `2`.
