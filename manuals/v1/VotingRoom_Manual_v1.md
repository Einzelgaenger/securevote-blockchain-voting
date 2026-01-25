# 📘 VotingRoom - User Manual

**Contract Type:** Voting Logic & State Management  
**Purpose:** Handle semua logic voting - voter, candidate, credit, round management

---

## 🎯 Executive Summary

VotingRoom adalah "ruang voting" tempat semua aktivitas voting terjadi. Admin setup voter & kandidat, voters cast votes dengan credit mereka, dan sistem track semua hasil per round. Setiap room punya data terpisah - voter, kandidat, credit, history semua independent.

**Analogi:** Seperti ruang TPS (Tempat Pemungutan Suara) - ada daftar pemilih, daftar kandidat, kotak suara, dan panitia yang mengatur.

---

## 👥 Siapa yang Menggunakan?

### 🎓 Room Admin - Event Organizer
- Setup voter & kandidat
- Beri vote credit
- Start/stop/end voting
- Manage rounds

### 🗳️ Voter - Participants
- Cast vote untuk kandidat pilihan
- Cek credit balance
- Lihat hasil voting

### 👁️ Public - Observers
- Lihat hasil real-time
- Audit transparency
- Check vote counts

---

## 🔧 Fungsi-Fungsi Utama

---

## 🎓 Untuk Room Admin

### 1. `addVoter` 🟠

**Apa Itu?**  
Menambahkan address ke daftar voter yang eligible untuk vote.

**Kenapa Ada?**  
Tidak semua orang bisa vote - hanya yang terdaftar.

**Kapan Digunakan?**  
- Setup awal sebelum voting
- Tambah voter baru (late registration)
- Setelah reset room

**Cara Pakai:**

#### Scenario 1: Setup Voter List

```javascript
Situasi: University ABC mau setup voting BEM

1. Punya list 500 mahasiswa eligible
2. Add satu per satu atau batch:

// Manual one by one
addVoter("0x5B38Da...") // Budi
addVoter("0xAb8483...") // Ani
addVoter("0x4B20993...") // Citra

// Atau loop (di backend/script)
for (const student of eligibleStudents) {
  await room.addVoter(student.walletAddress)
}
```

**Real Example:**
```
Organization: Student Council
Event: Chairman Election
Eligible voters: All students year 2022-2025

Admin steps:
1. Export student wallet addresses from database
2. Filter: status = active, year >= 2022
3. Result: 480 addresses
4. Batch add to room:
   - addVoter(student1)
   - addVoter(student2)
   - ... (480 total)
5. Voter registry complete
```

**State Requirement:** Inactive or Closed (not during Active voting)

---

### 2. `removeVoter` 🟠

**Apa Itu?**  
Menghapus voter dari registry (tidak eligible lagi).

**Kenapa Ada?**  
Ada voter yang perlu di-remove (dropout, resign, etc).

**Kapan Digunakan?**  
- Voter resign dari organization
- Voter tidak eligible lagi
- Fix error (salah add address)

**Cara Pakai:**

#### Scenario: Remove Ineligible Voter

```javascript
Situasi: Mahasiswa "Budi" dropout, tidak boleh vote lagi

removeVoter("0xBudiAddress")
// Budi sekarang tidak bisa vote
```

**State Requirement:** Inactive or Closed

---

### 3. `addCandidate` 🟠

**Apa Itu?**  
Menambahkan kandidat yang bisa dipilih.

**Kenapa Ada?**  
Voter perlu tau siapa yang bisa mereka pilih.

**Kapan Digunakan?**  
- Setup awal
- Tambah kandidat baru (nomination period)
- Setelah reset

**Cara Pakai:**

#### Scenario: Setup Candidates

```javascript
Situasi: Chairman election dengan 3 kandidat

// Add candidates
addCandidate(1, "Alice - Vision for Better Campus")
addCandidate(2, "Bob - Student Welfare Focus")
addCandidate(3, "Charlie - Innovation & Technology")

// ID bebas pilih, tapi harus unique
// Name bisa panjang, include program/visi
```

**Real Example:**
```
Organization: Company Board
Event: CEO Selection
Candidates: 2 nominees

Admin steps:
1. Nomination period closed
2. Final candidates:
   - John Doe (ID: 1)
   - Jane Smith (ID: 2)
3. Add to room:
   addCandidate(1, "John Doe - Growth Strategy")
   addCandidate(2, "Jane Smith - Sustainability Focus")
```

**State Requirement:** Inactive or Closed

---

### 4. `removeCandidate` 🟠

**Apa Itu?**  
Remove kandidat dari daftar.

**Kenapa Ada?**  
Kandidat withdraw, diskualifikasi, etc.

**Cara Pakai:**

```javascript
Situasi: Kandidat "Charlie" withdraw dari pencalonan

removeCandidate(3) // Remove Charlie
// Sekarang hanya Alice & Bob yang bisa dipilih
```

**State Requirement:** Inactive or Closed

---

### 5. `grantCredit` 🟠

**Apa Itu?**  
Memberikan vote credit (bobot suara) ke voter.

**Kenapa Ada?**  
Credit = voting power. Tanpa credit, voter tidak bisa vote.

**Kapan Digunakan?**  
- Setup awal (grant ke semua voter)
- Re-grant setelah vote (untuk round berikutnya)
- Adjust voting power (weighted voting)

**Cara Pakai:**

#### Scenario 1: Democratic Voting (1 person = 1 vote)

```javascript
Situasi: University election, semua mahasiswa equal

// Grant credit 1 ke semua voter
grantCredit(voter1, 1)
grantCredit(voter2, 1)
grantCredit(voter3, 1)
// ... all voters get 1 credit

// Hasil: Each person has equal voting power
```

#### Scenario 2: Shareholder Voting (weighted by shares)

```javascript
Situasi: Company voting, weight by share ownership

// Shareholder A: 10,000 shares
grantCredit(shareholderA, 10000)

// Shareholder B: 5,000 shares
grantCredit(shareholderB, 5000)

// Shareholder C: 500 shares
grantCredit(shareholderC, 500)

// Hasil: Voting power proportional to ownership
```

#### Scenario 3: Role-based Voting

```javascript
Situasi: Organization voting dengan tier

// Board members: high weight
grantCredit(boardMember1, 100)
grantCredit(boardMember2, 100)

// Regular members: medium weight
grantCredit(member1, 10)
grantCredit(member2, 10)

// Associate members: low weight
grantCredit(associate1, 1)
grantCredit(associate2, 1)
```

**Real Example:**
```
Organization: DAO (Decentralized Autonomous Organization)
Voting: Protocol upgrade proposal
Credit strategy: Token-based

Admin steps:
1. Snapshot token holdings:
   - User A: 1000 tokens
   - User B: 500 tokens
   - User C: 100 tokens
2. Grant credit equal to tokens:
   grantCredit(userA, 1000)
   grantCredit(userB, 500)
   grantCredit(userC, 100)
3. Result: Fair voting by stake
```

**Important:** Credit habis setelah vote! Perlu grant lagi untuk round berikutnya.

**State Requirement:** Inactive or Closed

---

### 6. `setMaxCostPerVote` 🟠

**Apa Itu?**  
Set maximum gas cost per vote transaction.

**Kenapa Ada?**  
Safety cap - prevent gas spike attack, ensure predictable cost.

**Kapan Digunakan?**  
- Setup awal
- Adjust saat gas price volatile
- Update based on network conditions

**Cara Pakai:**

#### Scenario: Set Gas Cap

```javascript
Situasi: Setup room, estimate gas per vote

1. Test vote transaction di testnet:
   - Gas used: 150,000
   - Gas price: 50 gwei
   - Cost: 0.0075 ETH

2. Add 50% buffer untuk gas spike:
   - Max cost: 0.0075 × 1.5 = 0.01125 ETH

3. Set cap:
   setMaxCostPerVote("11250000000000000") // 0.01125 ETH

4. Relayer will reject vote if estimate > cap
```

**Real Example:**
```
Situation: High gas price period

Normal: 50 gwei → vote cost 0.0075 ETH
Spike: 200 gwei → vote cost 0.03 ETH

Without maxCost:
- Vote might cost 0.03 ETH
- Drain deposit quickly
- Not sustainable

With maxCost = 0.015 ETH:
- Relayer check: estimate = 0.03 ETH
- 0.03 > 0.015 → REJECT
- Vote ditunda sampai gas turun
- Protect deposit from excessive cost
```

---

### 7. `startVoting` 🟠

**Apa Itu?**  
Mulai voting round baru.

**Kenapa Ada?**  
Marking official start - voter sekarang bisa mulai vote.

**Kapan Digunakan?**  
Setelah setup selesai (voter, candidate, credit, deposit ready).

**Cara Pakai:**

#### Scenario: Launch Voting

```javascript
Pre-launch checklist:
✓ Voters added (500 voters)
✓ Candidates added (3 candidates)
✓ Credit granted (500 × 1 credit)
✓ Deposit topped up (4 ETH)
✓ Announcement sent to voters

Action: startVoting()

Result:
- currentRound = 1 (or increment if not first)
- state = Active
- Voters can now vote
- Timestamp recorded
```

**Real Example:**
```
Event: University BEM Election
Schedule: Voting starts 9 AM, ends 5 PM

8:55 AM: Admin final check
- All setup complete
- Communication sent
- System ready

9:00 AM: Admin call startVoting()
- state changed to Active
- Round 1 begins
- Students start voting
- Real-time dashboard shows live count
```

**State Requirement:** Must be Inactive

---

### 8. `stopVoting` 🟠

**Apa Itu?**  
Pause voting (emergency stop).

**Kenapa Ada?**  
Untuk situasi darurat - bug, security issue, etc.

**Kapan Digunakan?**  
- Emergency situations
- Technical issues
- Security concerns

**Cara Pakai:**

```javascript
Situasi: Bug detected during voting

stopVoting()
// state = Ended
// No more votes accepted
// Admin investigate issue
// Can resume or end formally later
```

**State Requirement:** Must be Active

---

### 9. `endVoting` 🟠

**Apa Itu?**  
End voting round officially (with timestamp).

**Kenapa Ada?**  
Mark official end time, prepare for result declaration.

**Kapan Digunakan?**  
Scheduled voting end time reached.

**Cara Pakai:**

#### Scenario: Scheduled End

```javascript
Event timeline:
- Start: 9 AM
- End: 5 PM

5:00 PM: Admin call endVoting()
- state = Ended
- endAt timestamp recorded
- No more votes accepted
- Ready for result counting
```

**Real Example:**
```
University BEM Election:

5:00 PM:
- 450 out of 500 students voted
- Admin call endVoting()
- state = Ended
- Timestamp: 1705672800

Next steps:
- Count votes (off-chain or manual)
- Verify results
- Prepare announcement
- Call closeRound with winner
```

**State Requirement:** Must be Active

---

### 10. `closeRound` 🟠

**Apa Itu?**  
Tutup round dan declare winner officially.

**Kenapa Ada?**  
Finalize result on-chain, permanent record.

**Kapan Digunakan?**  
Setelah endVoting + result verified.

**Cara Pakai:**

#### Scenario: Declare Winner

```javascript
Situasi: Counting selesai, Alice menang

// Check votes
const aliceVotes = await room.getVotes(1, 1) // 250
const bobVotes = await room.getVotes(1, 2)   // 150
const charlieVotes = await room.getVotes(1, 3) // 50

// Alice highest, declare winner
closeRound(1) // candidateId = 1 (Alice)

// Result:
// - state = Closed
// - roundSummaries[1].winnerId = 1
// - roundSummaries[1].closed = true
// - Permanent record on-chain
```

**Real Example:**
```
University BEM Election Results:

Votes:
- Alice: 250 votes (55.6%)
- Bob: 150 votes (33.3%)
- Charlie: 50 votes (11.1%)
Total: 450 votes

Verification:
- No fraud detected
- Process legitimate
- Results accepted

Admin action:
- closeRound(1) // Alice is candidate ID 1
- Event emitted: RoundClosed(room, 1, 1, 450)
- Public announcement
- Alice officially declared chairman
```

**State Requirement:** Must be Ended

---

### 11. `prepareNextRound` 🟠 ✨ (New!)

**Apa Itu?**  
Prepare round berikutnya tanpa reset voter/candidate.

**Kenapa Ada?**  
Kalau mau voting lagi dengan voter & kandidat yang sama, tidak perlu setup ulang.

**Kapan Digunakan?**  
- Multi-round voting (Round 1, 2, 3...)
- Same voters, same candidates
- Hanya perlu grant credit lagi

**Cara Pakai:**

#### Scenario: Multi-Round Voting

```javascript
Situasi: Voting chairman, system 2 rounds

Round 1: Eliminasi
- 3 kandidat
- 2 tertinggi ke round 2

After closeRound(1):

// Prepare round 2
prepareNextRound()
// state = Inactive
// voter & candidate tetap sama
// credit reset ke 0

// Remove kandidat yang kalah
removeCandidate(3) // Charlie eliminated

// Grant credit lagi
grantCredit(voter1, 1)
grantCredit(voter2, 1)
// ... all voters

// Start round 2
startVoting()
// currentRound = 2
// Only Alice vs Bob
```

**Real Example:**
```
Organization: Board of Directors
System: Ranked-choice voting (multiple rounds)

Round 1: 5 kandidat
- Top 3 advance

Round 2: 3 kandidat
- Top 2 advance

Round 3 (Final): 2 kandidat
- Winner decided

Between rounds:
- prepareNextRound()
- removeCandidate(eliminated)
- grantCredit(all voters)
- startVoting()

Benefit:
- Same voter list (no re-add)
- Streamlined process
- Voters familiar with flow
```

**Difference vs resetRoom():**
- `prepareNextRound()`: Keep voters & candidates
- `resetRoom()`: Wipe everything, start from scratch

**State Requirement:** Must be Closed

---

### 12. `resetRoom` 🟠

**Apa Itu?**  
Reset room total - hapus semua voter & candidate.

**Kenapa Ada?**  
Untuk reuse room untuk event yang completely different.

**Kapan Digunakan?**  
- Ganti tema voting total
- New voter population
- New candidates

**Cara Pakai:**

#### Scenario: Reuse Room for Different Event

```javascript
Situation: Room used for BEM election, now want reuse for Festival vote

// After BEM election closeRound()
resetRoom()

// Effect:
// - All voters removed (need re-add)
// - All candidates removed
// - Credits reset to 0
// - History TETAP tersimpan

// Setup for new event
addVoter(newVoter1)
addVoter(newVoter2)
addCandidate(1, "Band A")
addCandidate(2, "Band B")
grantCredit(...)
```

**Warning:** History tetap ada, bisa dicek di `getRoundSummary(round)`.

**State Requirement:** Must be Closed

---

## 🗳️ Untuk Voter

### 13. `vote` 🟠

**Apa Itu?**  
Cast vote untuk kandidat pilihan.

**Kenapa Ada?**  
Inti dari voting system - voters exercise their right.

**Kapan Digunakan?**  
Saat voting Active, voter eligible, punya credit.

**Cara Pakai:**

#### Scenario: Voter Cast Vote

```javascript
Situasi: Budi mau vote untuk Alice (candidate ID 1)

Pre-check (frontend):
1. Check eligible:
   isVoterEligible(BudiAddress) → true ✓
2. Check credit:
   voterCredit(BudiAddress) → 1 ✓
3. Check not voted yet:
   lastVotedRound(BudiAddress) → 0 (current round = 1) ✓
4. Check state:
   state() → 1 (Active) ✓

Action:
vote(1) // Vote for candidate ID 1 (Alice)

Effect:
- Budi's credit: 1 → 0
- Alice's votes: +1
- lastVotedRound[Budi] = 1
- Event: VoteCast(room, 1, Budi, 1, 1, actionId)
```

**Real Example - Testing (Remix):**
```
Budi's steps in Remix:
1. Switch account to Budi's address
2. Expand VotingRoom contract
3. vote function
4. candidateId: 1
5. Click "transact"
6. Transaction confirmed
7. Check result:
   - voterCredit(Budi) → 0
   - getVotes(1, 1) → increased by 1
```

**Real Example - Production (Gasless):**
```
Budi's steps in Web App:
1. Login dengan wallet
2. See candidates list
3. Click "Vote for Alice"
4. Wallet popup: "Sign message"
5. Budi sign (GRATIS, no ETH needed)
6. Signature sent to relayer
7. Relayer execute via MinimalForwarder
8. Vote recorded
9. Budi see confirmation: "Vote successful!"
```

**Important:**
- Di **Testing/Remix**: Direct call vote() (voter bayar gas)
- Di **Production**: Via MinimalForwarder.execute() (relayer bayar gas)

**State Requirement:** Must be Active

---

## 👁️ Untuk Public (View Functions)

### 14. `state` 🔵

**Apa Itu?**  
Check current state room.

**Return Values:**
- `0` = Inactive (setup phase)
- `1` = Active (voting ongoing)
- `2` = Ended (voting stopped/ended)
- `3` = Closed (round finalized)

**Cara Pakai:**

```javascript
const currentState = await room.state()

if (currentState === 1) {
  console.log("Voting is LIVE! You can vote now")
} else if (currentState === 0) {
  console.log("Voting not started yet")
} else if (currentState === 2) {
  console.log("Voting ended, waiting for results")
} else {
  console.log("Round closed, see results")
}
```

---

### 15. `currentRound` 🔵

**Apa Itu?**  
Nomor round saat ini.

**Cara Pakai:**

```javascript
const round = await room.currentRound()
console.log(`Current round: ${round}`)

// Round 0 = belum pernah start
// Round 1 = round pertama
// Round 2+ = multi-round voting
```

---

### 16. `getVotes` 🔵

**Apa Itu?**  
Check total votes untuk kandidat tertentu di round tertentu.

**Cara Pakai:**

```javascript
// Get votes for candidate 1 in round 1
const votes = await room.getVotes(1, 1)
console.log(`Alice has ${votes} votes`)

// Real-time leaderboard
const alice = await room.getVotes(1, 1)
const bob = await room.getVotes(1, 2)
const charlie = await room.getVotes(1, 3)

console.log(`
Leaderboard:
1. Alice: ${alice} votes
2. Bob: ${bob} votes
3. Charlie: ${charlie} votes
`)
```

**Real Example - Live Dashboard:**
```
┌─────────────────────────────────┐
│  BEM Election - Live Results    │
├─────────────────────────────────┤
│  Alice:   ████████████  250     │
│  Bob:     ███████       150     │
│  Charlie: ███           50      │
├─────────────────────────────────┤
│  Total votes: 450 / 500         │
│  Refresh every 10s              │
└─────────────────────────────────┘
```

---

### 17. `getRoundSummary` 🔵

**Apa Itu?**  
Get complete summary dari round yang sudah closed.

**Return:**
```javascript
{
  winnerId: 1,           // Candidate ID pemenang
  totalVotesWeight: 450, // Total vote weight
  startAt: 1705660800,   // Start timestamp
  endAt: 1705672800,     // End timestamp
  closed: true           // Sudah closed?
}
```

**Cara Pakai:**

```javascript
// Get summary round 1
const summary = await room.getRoundSummary(1)

console.log(`
Round 1 Results:
- Winner: Candidate ${summary.winnerId}
- Total votes: ${summary.totalVotesWeight}
- Duration: ${summary.endAt - summary.startAt} seconds
- Started: ${new Date(summary.startAt * 1000)}
- Ended: ${new Date(summary.endAt * 1000)}
`)
```

---

### 18. `voterCredit` 🔵

**Apa Itu?**  
Check credit balance voter.

**Cara Pakai:**

```javascript
// Check Budi's credit
const credit = await room.voterCredit(BudiAddress)

if (credit > 0) {
  console.log(`You have ${credit} voting power`)
  console.log(`You can vote now!`)
} else {
  console.log(`You have no credit`)
  console.log(`Already voted or not granted credit yet`)
}
```

---

### 19. `isVoterEligible` 🔵

**Apa Itu?**  
Check apakah address eligible untuk vote.

**Cara Pakai:**

```javascript
const eligible = await room.isVoterEligible(userAddress)

if (!eligible) {
  alert("You are not registered to vote in this room")
}
```

---

### 20. `isCandidateValid` 🔵

**Apa Itu?**  
Check apakah kandidat masih valid (belum di-remove).

**Cara Pakai:**

```javascript
const valid = await room.isCandidateValid(candidateId)

if (!valid) {
  console.log("Candidate withdrawn or removed")
}
```

---

### 21. `candidateName` 🔵

**Apa Itu?**  
Get nama kandidat.

**Cara Pakai:**

```javascript
const name = await room.candidateName(1)
console.log(`Candidate 1: ${name}`)
```

---

### 22. `lastVotedRound` 🔵

**Apa Itu?**  
Check round terakhir voter vote.

**Cara Pakai:**

```javascript
const lastRound = await room.lastVotedRound(voterAddress)
const currentRound = await room.currentRound()

if (lastRound === currentRound) {
  console.log("Already voted this round")
} else {
  console.log("Can vote in this round")
}
```

---

### 23. `roomAdmin` 🔵

**Apa Itu?**  
Address admin room.

```javascript
const admin = await room.roomAdmin()
console.log(`Room admin: ${admin}`)
```

---

### 24. `roomName` 🔵

**Apa Itu?**  
Nama room.

```javascript
const name = await room.roomName()
console.log(`Room: ${name}`)
```

---

## 📋 Complete Use Cases

### Use Case 1: Full Voting Cycle (Simple Democratic Vote)

**Organization:** University Student Council  
**Event:** BEM Chairman Election  
**Voters:** 500 students (equal voting power)  
**Candidates:** 3 nominees

#### Phase 1: Setup (State: Inactive)

```
Admin actions:
1. Create room (done via RoomFactory)
2. Add voters (500 students)
   - Import dari database
   - Loop addVoter untuk each student
3. Add candidates (3 nominees)
   - addCandidate(1, "Alice")
   - addCandidate(2, "Bob")
   - addCandidate(3, "Charlie")
4. Grant equal credit (democratic)
   - grantCredit(student1, 1)
   - grantCredit(student2, 1)
   - ... (all 500 students)
5. Set gas cap
   - setMaxCostPerVote("10000000000000000") // 0.01 ETH
6. Topup deposit (via SponsorVault)
   - 500 votes × 0.008 ETH = 4 ETH + buffer
   - topup(room, 5 ETH)
7. Announce to students
   - Email: "Voting opens tomorrow 9 AM"
```

#### Phase 2: Voting (State: Active)

```
9:00 AM - Admin start:
- startVoting()
- state = Active
- currentRound = 1

9:00 AM - 5:00 PM - Students vote:
- Budi logs in → vote(1) // Alice
- Ani logs in → vote(2)  // Bob
- Citra logs in → vote(1) // Alice
- ... 450 students vote

Real-time tracking:
- Alice: 250 votes (growing)
- Bob: 150 votes (growing)
- Charlie: 50 votes (growing)
- Total: 450 / 500 voted
```

#### Phase 3: End & Results (State: Ended → Closed)

```
5:00 PM - Admin end:
- endVoting()
- state = Ended
- No more votes accepted

5:15 PM - Admin verify:
- getVotes(1, 1) → 250 (Alice)
- getVotes(1, 2) → 150 (Bob)
- getVotes(1, 3) → 50 (Charlie)
- Verify: No fraud, process legitimate

5:30 PM - Admin declare:
- closeRound(1) // Alice wins
- state = Closed
- Public announcement: "Alice elected chairman!"

Summary stored permanently:
- Winner: Alice (ID 1)
- Total votes: 450
- Started: timestamp
- Ended: timestamp
```

---

### Use Case 2: Multi-Round Voting (Elimination Style)

**Organization:** Board of Directors  
**Event:** CEO Selection  
**System:** 2-round voting (top 2 from round 1 advance)

#### Round 1: Elimination

```
Setup (5 candidates):
- addCandidate(1, "John")
- addCandidate(2, "Jane")
- addCandidate(3, "Mike")
- addCandidate(4, "Sarah")
- addCandidate(5, "Tom")

Grant credit → start → voting → end

Results:
- John: 30 votes
- Jane: 25 votes
- Mike: 20 votes
- Sarah: 15 votes
- Tom: 10 votes

Close round: closeRound(1) // John temporary lead
```

#### Round 2: Final

```
Prepare next round:
- prepareNextRound() // Keep voters
- removeCandidate(3) // Mike out
- removeCandidate(4) // Sarah out
- removeCandidate(5) // Tom out
- grantCredit(all voters) // Re-grant credit
- startVoting() // Round 2

Voting:
- Only John vs Jane
- Board members revote

Results:
- John: 55 votes
- Jane: 45 votes

Close: closeRound(1) // John wins
```

---

### Use Case 3: Weighted Shareholder Voting

**Organization:** Corporation  
**Event:** Merger approval  
**System:** Votes weighted by share ownership

#### Setup (Weight by Shares)

```
Shareholders:
- CompanyA: 45% shares → grantCredit(CompanyA, 45000)
- CompanyB: 30% shares → grantCredit(CompanyB, 30000)
- Investor1: 10% shares → grantCredit(Investor1, 10000)
- Investor2: 10% shares → grantCredit(Investor2, 10000)
- Others: 5% shares → grantCredit(Others, 5000)

Candidates:
- addCandidate(1, "Approve Merger")
- addCandidate(2, "Reject Merger")
```

#### Voting & Results

```
Votes:
- CompanyA → vote(1) // 45,000 weight
- CompanyB → vote(1) // 30,000 weight
- Investor1 → vote(2) // 10,000 weight
- Investor2 → vote(1) // 10,000 weight
- Others → vote(2) // 5,000 weight

Tally:
- Approve: 45k + 30k + 10k = 85,000 (85%)
- Reject: 10k + 5k = 15,000 (15%)

Result: Merger approved by 85% majority
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "InvalidState" error

**Cause:** Trying to do action in wrong state

**Solution:**
```javascript
// Check state first
const state = await room.state()

// Map state to allowed actions
if (state === 0) { // Inactive
  // Can: setup, grant credit
  // Cannot: vote
}
if (state === 1) { // Active
  // Can: vote
  // Cannot: setup
}
```

---

### Issue 2: "VoterNotEligible" error

**Cause:** Voter tidak di-add atau sudah di-remove

**Solution:**
```javascript
// Check eligibility
const eligible = await room.isVoterEligible(voterAddress)

if (!eligible) {
  // Admin need to addVoter
}
```

---

### Issue 3: "NoCredit" error

**Cause:** Voter credit = 0

**Solution:**
```javascript
// Check credit
const credit = await room.voterCredit(voterAddress)

if (credit === 0) {
  // Either: 
  // - Already voted (credit exhausted)
  // - Not granted credit yet (admin need grantCredit)
}
```

---

### Issue 4: "AlreadyVotedThisRound" error

**Cause:** Trying to vote 2x in same round

**Solution:**
```javascript
const lastRound = await room.lastVotedRound(voterAddress)
const currentRound = await room.currentRound()

if (lastRound === currentRound) {
  alert("You already voted in this round")
}
```

---

## 💡 Best Practices

### Untuk Room Admin:

1. **Setup Checklist:**
   - ✅ All voters added
   - ✅ All candidates added
   - ✅ All credits granted
   - ✅ Deposit topped up
   - ✅ Announcement sent
   - ✅ Test with dummy voter

2. **During Voting:**
   - 📊 Monitor participation rate
   - 📊 Check deposit balance
   - 🔍 Watch for anomalies
   - 📢 Send reminders to non-voters

3. **After Voting:**
   - ✅ Verify results
   - ✅ Double-check vote counts
   - ✅ Announce results transparently
   - ✅ Store summary off-chain too (backup)

### Untuk Voters:

1. **Before Voting:**
   - ✅ Check eligible: `isVoterEligible(myAddress)`
   - ✅ Check credit: `voterCredit(myAddress)`
   - ✅ Research candidates
   - ✅ Decide choice

2. **During Voting:**
   - ✅ Vote once
   - ✅ Verify transaction success
   - ✅ Save confirmation
   - ❌ Don't share wallet/signature

---

**Kesimpulan:**  
VotingRoom adalah core voting engine - semua logic voting, state management, dan data storage ada di sini. Flexible untuk berbagai use case: democratic, weighted, multi-round, dll.
