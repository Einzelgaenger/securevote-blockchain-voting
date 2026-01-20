/**
 * REMIX DEPLOYMENT GUIDE
 * ======================
 * 
 * Step-by-step deployment untuk Remix IDE
 * Copy script ini ke Remix console setelah deploy manual
 */

// ============================================
// STEP 1: DEPLOY CONTRACTS (Manual di Remix)
// ============================================

/*
1. MinimalForwarder
   - No constructor params
   - Deploy → Copy address

2. SponsorVault
   Constructor:
   - _overheadBps: 1000
   - _registrationFeeWei: 10000000000000000
   - _platformFeeBps: 500
   - Deploy → Copy address

3. VotingRoom
   Constructor:
   - trustedForwarder: [MinimalForwarder address]
   - Deploy → Copy address (JANGAN INITIALIZE!)

4. RoomFactory
   Constructor:
   - _votingRoomImplementation: [VotingRoom address]
   - _sponsorVault: [SponsorVault address]
   - _trustedForwarder: [MinimalForwarder address]
   - Deploy → Copy address
*/

// ============================================
// STEP 2: SETUP (Copy addresses dari Step 1)
// ============================================

const addresses = {
    minimalForwarder: "0x...", // Paste address dari deployment
    sponsorVault: "0x...",
    votingRoom: "0x...",
    roomFactory: "0x...",
    relayer: "0x...", // Your relayer EOA address
    voter: "0x...", // Test voter address
};

// ============================================
// STEP 3: CONFIGURATION
// ============================================

/*
Jalankan fungsi ini di Remix:

1. SponsorVault.setRelayer
   - relayer: [addresses.relayer]
   - allowed: true

2. RoomFactory.createRoom (PAYABLE!)
   - roomName: "Test Room"
   - Value: 0.01 ETH
   - Klik Transact
   - Check event "RoomRegistered" untuk room address
*/

// ============================================
// STEP 4: SETUP ROOM
// ============================================

/*
Setelah dapat room address dari event, panggil:

1. VotingRoom.addVoter
   - voter: [addresses.voter]

2. VotingRoom.addCandidate
   - candidateId: 1
   - name: "Candidate A"

3. VotingRoom.addCandidate
   - candidateId: 2
   - name: "Candidate B"

4. VotingRoom.grantCredit
   - voter: [addresses.voter]
   - amount: 100

5. VotingRoom.setMaxCostPerVote
   - newCost: 50000000000000000 (0.05 ETH)

6. SponsorVault.topup (PAYABLE!)
   - room: [room address]
   - Value: 0.1 ETH
*/

// ============================================
// STEP 5: VOTING FLOW
// ============================================

/*
1. VotingRoom.startVoting()
   - State berubah ke Active

2. VotingRoom.vote (FROM VOTER ACCOUNT!)
   - candidateId: 1
   - ⚠️ Switch account ke voter di Remix

   ATAU untuk production:

   MinimalForwarder.execute
   - req: ForwardRequest struct
   - signature: signed by voter
   (Lebih kompleks, butuh off-chain signing)

3. VotingRoom.stopVoting()
   - State berubah ke Ended

4. VotingRoom.endVoting()
   - Finalize round

5. VotingRoom.closeRound
   - winnerId: 1
   - State berubah ke Closed
*/

// ============================================
// STEP 6: VERIFY & CHECK
// ============================================

/*
Call view functions:

1. VotingRoom.state() → should return 0,1,2,3
2. VotingRoom.currentRound() → check round number
3. VotingRoom.getVotes(round, candidateId) → check tally
4. VotingRoom.getRoundSummary(round) → check result
5. SponsorVault.roomBalance(room) → check remaining deposit
*/

// ============================================
// TROUBLESHOOTING
// ============================================

/*
Error: "AlreadyInitialized"
→ Jangan panggil initialize() di VotingRoom implementation!
  Hanya clone yang di-initialize otomatis oleh Factory

Error: "InvalidState"
→ Cek state dengan VotingRoom.state()
  0=Inactive, 1=Active, 2=Ended, 3=Closed

Error: "InsufficientRegistrationFee"
→ Pastikan Value >= 0.01 ETH saat createRoom()

Error: "VoterNotEligible"
→ Pastikan addVoter() sudah dipanggil

Error: "NoCredit"
→ Pastikan grantCredit() sudah dipanggil

Error: "InsufficientDeposit"
→ Topup room via SponsorVault.topup()
*/

// ============================================
// QUICK TEST SCRIPT (untuk Remix Console)
// ============================================

/*
// Setelah dapat room address:
const roomAddr = "0x..."; // Room address dari event

// Get contract instance
const room = await ethers.getContractAt("VotingRoom", roomAddr);

// Check state
const state = await room.state();
console.log("State:", state); // 0=Inactive

// Check if voter eligible
const eligible = await room.isVoterEligible("0xVoterAddress");
console.log("Voter eligible:", eligible);

// Check vote credit
const credit = await room.voterCredit("0xVoterAddress");
console.log("Credit:", credit.toString());
*/
