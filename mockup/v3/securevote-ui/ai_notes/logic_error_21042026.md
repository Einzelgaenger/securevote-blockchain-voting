# Logic Review Notes - 21 April 2026

Dokumen ini mencatat risiko logika pada sistem SecureVote v2 dan update yang perlu dilakukan.

## Findings

### 1. Credit accounting salah setelah voter vote

Lokasi:

```text
contracts/v2/VotingRoom.sol
function vote(uint256 candidateId)
```

Saat voter melakukan vote, contract mengubah:

```solidity
voterCredit[voter] = 0;
totalCreditsUsed += weight;
```

Namun `totalCreditsGranted` tidak dikurangi.

Dampak:

- `totalCreditsGranted` tetap menghitung credit yang sebenarnya sudah habis dipakai.
- Setelah `prepareNextRound()` dan grant credit ulang, angka credit bisa makin tidak konsisten.

Rekomendasi fix:

```solidity
totalCreditsGranted -= weight;
```

diletakkan setelah `weight` diketahui dan sebelum/bersamaan dengan konsumsi credit voter.

### 2. Batch credit bisa salah hitung jika ada duplicate voter

Lokasi:

```text
contracts/v2/VotingRoom.sol
function batchGrantCredits(...)
function batchAddVotersWithCredits(...)
```

Komentar function menyebut duplicate voter memakai prinsip "last value wins", tetapi perhitungan `totalIncrease` dan `totalDecrease` tetap menghitung setiap kemunculan address.

Contoh:

```text
voters  = [A, A]
credits = [20, 5]
```

Risiko:

- Counter global seperti `totalCreditsGranted`, `availableCreditsPool`, dan `totalCreditsInSystem` bisa salah.
- Dalam kondisi tertentu bisa revert karena underflow.

Rekomendasi fix:

1. Reject duplicate voter dalam input batch, atau
2. Pre-aggregate input off-chain/on-chain sehingga setiap voter hanya diproses sekali dengan nilai final.

Status update:

- `addVoter(voter)` sekarang revert jika voter sudah terdaftar.
- `batchAddVoters(voters)` sekarang reject duplicate input dan voter yang sudah terdaftar.
- `batchAddVotersWithCredits(voters, credits)` sekarang reject duplicate input dan voter yang sudah terdaftar.
- `batchGrantCredits(voters, amounts)` sekarang reject duplicate input agar accounting tetap konsisten.
- Ditambahkan `addVoterWithCredit(voter, credit)` untuk add satu voter sekaligus set credit.

### 3. RoundSummary harus menyimpan vote count milik winner, bukan total semua vote

Keputusan desain:

- `closeRound(winnerId)` tetap menerima `winnerId` secara manual dari admin.
- Contract tidak perlu otomatis menentukan pemenang tertinggi.
- Namun data yang disimpan pada `roundSummaries` dan `getRoundSummary` harus merepresentasikan winner yang dipilih.

Format yang seharusnya dikembalikan:

```text
winnerId
winnerName
winnerVoteCount
startAt
endAt
closed
```

Sebelumnya:

```solidity
struct RoundSummary {
    uint256 winnerId;
    string winnerName;
    uint256 totalVotesWeight;
    uint256 startAt;
    uint256 endAt;
    bool closed;
}
```

Masalah:

- `totalVotesWeight` berisi `totalCreditsUsed`, yaitu total semua vote dalam round.
- Itu bukan vote count milik winner.

Update yang benar:

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

Pada `closeRound(winnerId)`:

```solidity
uint256 winnerVoteCount = roundVotes[currentRound][winnerId];

summary.winnerId = winnerId;
summary.winnerName = candidateName[winnerId];
summary.winnerVoteCount = winnerVoteCount;
summary.closed = true;
```

Event juga sebaiknya ikut diperjelas:

```solidity
event RoundClosed(
    address indexed room,
    uint256 indexed round,
    uint256 winnerId,
    uint256 winnerVoteCount
);
```

Status update:

- Sudah diupdate pada `contracts/v2/VotingRoom.sol`.
- ABI yang dipakai UI perlu disesuaikan atau regenerate setelah compile.

### 4. stopVoting harus menjadi pause, bukan end round

Lokasi:

```text
contracts/v2/VotingRoom.sol
function stopVoting()
```

Keputusan desain terbaru:

- `stopVoting()` hanya melakukan pause.
- State berubah dari `Active` menjadi `Paused`.
- Saat `Paused`, admin hanya boleh `startVoting()` untuk resume atau `endVoting()` untuk finish.
- Admin tidak boleh langsung `closeRound()` setelah `stopVoting()`.

Update yang benar:

```solidity
enum State { Inactive, Active, Paused, Ended, Closed }
```

```solidity
function stopVoting() external onlyAdmin inState(State.Active) {
    state = State.Paused;

    emit RoundStopped(address(this), currentRound);
}
```

```solidity
function startVoting() external onlyAdmin {
    if (state == State.Inactive) {
        currentRound++;
        roundSummaries[currentRound].startAt = block.timestamp;
    } else if (state != State.Paused) {
        revert InvalidState();
    }

    state = State.Active;
    emit RoundStarted(address(this), currentRound);
}
```

```solidity
function endVoting() external onlyAdmin {
    if (state != State.Active && state != State.Paused) revert InvalidState();

    state = State.Ended;
    roundSummaries[currentRound].endAt = block.timestamp;

    emit RoundEnded(address(this), currentRound);
}
```

Status update:

- Sudah diupdate pada `contracts/v2/VotingRoom.sol`.

### 5. vote tidak benar-benar wajib lewat forwarder

Lokasi:

```text
contracts/v2/VotingRoom.sol
function vote(uint256 candidateId)
```

Komentar menyebut vote harus melalui ERC-2771 forwarder, tetapi tidak ada guard bahwa caller adalah trusted forwarder.

Keputusan desain:

- Direct vote diperbolehkan.
- Gasless vote tetap tersedia lewat `MinimalForwarder`.
- Karena itu, ini bukan bug dan tidak perlu dimitigasi.

### 6. SponsorVault settlement memakai trust assumption pada relayer

Lokasi:

```text
contracts/v2/SponsorVault.sol
function settleAndWithdraw(address room, bytes32 actionId, uint256 chargedAmount)
```

Contract memeriksa:

- caller adalah relayer allowlisted,
- `actionId` belum pernah settled,
- saldo room cukup.

Keputusan desain:

- Relayer sudah diverifikasi terlebih dahulu sebelum masuk allowlist.
- Settlement memang mempercayai relayer allowlisted sebagai trusted service.
- Karena itu, validasi tambahan proof on-chain untuk `actionId` tidak diterapkan saat ini.

Residual risk yang diterima:

- Jika private key relayer bocor atau relayer allowlisted berperilaku jahat, deposit room tetap berisiko.
- Risiko ini diterima untuk versi saat ini karena sistem mengandalkan relayer terverifikasi.

## Prioritas Fix

1. Fix `RoundSummary` agar menyimpan `winnerVoteCount`, bukan total semua vote.
2. Ubah `stopVoting()` menjadi pause dan blok `closeRound()` sampai `endVoting()`.
3. Fix `totalCreditsGranted` saat `vote()`.
4. Tangani duplicate voter pada batch credit.
5. Direct vote sudah diputuskan boleh, jadi tidak perlu guard forwarder-only.
6. Settlement `SponsorVault` dibiarkan berbasis trusted relayer allowlist.

## Catatan Deploy

Perubahan pada `contracts/v2/VotingRoom.sol` baru berlaku di chain setelah compile dan redeploy implementation baru.

Untuk EIP-1167 clone, room lama biasanya tetap menunjuk ke implementation lama. Room baru harus dibuat dari `RoomFactory` yang memakai implementation baru agar logic terbaru aktif.
