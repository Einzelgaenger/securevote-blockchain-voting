# Voting Flow v2

```text
Connect Wallet
↓
Create Room (pay registration fee)
↓
Topup Deposit (ETH)
↓
Set MaxCostPerVoteWei (ETH)
↓
Add Voters + Credits
↓
Add Candidates
↓
startVoting()
↓
Voters vote (gasless)
↓
endVoting()
↓
closeRound(winnerId)
↓
[withdrawDeposit | prepareNextRound | resetRoom]
```

## Pause Flow

`stopVoting()` sekarang berarti pause, bukan end round.

```text
Active
↓
stopVoting()
↓
Paused
↓
[startVoting() resume | endVoting() finish]
```

Saat state `Paused`, admin tidak bisa langsung `closeRound()`.

Untuk menutup round, flow yang benar:

```text
stopVoting()
↓
endVoting()
↓
closeRound(winnerId)
```

## Voter Rules

Voter tidak boleh duplikat dalam registry aktif.

Rule:

- `addVoter(voter)` akan revert jika voter sudah terdaftar.
- `batchAddVoters(voters)` akan revert jika ada duplicate address dalam input.
- `batchAddVoters(voters)` akan revert jika ada voter yang sudah terdaftar.
- `batchAddVotersWithCredits(voters, credits)` akan revert jika ada duplicate address dalam input.
- `batchAddVotersWithCredits(voters, credits)` akan revert jika ada voter yang sudah terdaftar.
- `batchGrantCredits(voters, amounts)` juga reject duplicate input supaya accounting credit tetap aman.

Untuk add satu voter sekaligus credit:

```text
addVoterWithCredit(voter, credit)
```

Untuk add banyak voter sekaligus credit:

```text
batchAddVotersWithCredits(voters, credits)
```

## Round Summary

`closeRound(winnerId)` tetap menerima `winnerId` manual.

Data yang dikembalikan oleh `roundSummaries(round)` dan `getRoundSummary(round)`:

```text
winnerId
winnerName
winnerVoteCount
startAt
endAt
closed
```

`winnerVoteCount` berasal dari:

```text
roundVotes[currentRound][winnerId]
```
