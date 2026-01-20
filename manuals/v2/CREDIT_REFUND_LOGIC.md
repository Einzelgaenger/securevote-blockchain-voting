# 💰 Credit Refund System - v2 Logic

## 🎯 Core Principle

**Credits are ONLY consumed when:**
1. ✅ Voter casts a vote → `totalCreditsUsed` increases
2. ✅ Room is reset → All counters zeroed

**Credits are REFUNDED when:**
- ✅ Voter is removed (any method)
- ✅ Credit accounting stays accurate

---

## 🔄 Credit Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CREDIT LIFECYCLE                      │
└─────────────────────────────────────────────────────────┘

1. GRANT CREDIT (Add to system)
   ├─ grantCredit(voter, 100)
   ├─ batchGrantCredits([voters], [amounts])
   └─ batchAddVotersWithCredits([voters], [credits])
      ↓
   totalCreditsGranted += amount
   voterCredit[voter] += amount

2. VOTE (Consume credit)
   └─ vote(candidateId)
      ↓
   voterCredit[voter] = 0 (all consumed!)
   totalCreditsUsed += weight
   totalCreditsGranted unchanged ✅

3. REMOVE VOTER (Refund unused credit)
   ├─ removeVoter(voter)
   ├─ removeVoterWithRefund(voter)  ← Deprecated, use removeVoter
   └─ batchRemoveVoters([voters])
      ↓
   refundAmount = voterCredit[voter]
   voterCredit[voter] = 0
   totalCreditsGranted -= refundAmount ✅
   totalCreditsUsed unchanged ✅

4. RESET ROOM (Wipe everything)
   └─ resetRoom()
      ↓
   totalCreditsGranted = 0
   totalCreditsUsed = 0
   All voters invalidated

5. PREPARE NEXT ROUND (Keep voters, reset counters)
   └─ prepareNextRound()
      ↓
   totalCreditsGranted = 0
   totalCreditsUsed = 0
   voterCredit[voter] unchanged (must re-grant!)
```

---

## 📊 State Variables Tracking

```solidity
// Room state variables
uint256 public totalCreditsGranted;  // Total credits currently in system
uint256 public totalCreditsUsed;     // Total credits spent on votes

mapping(address => uint256) public voterCredit;  // Current balance per voter
```

### **Invariant (Always True):**

```
totalCreditsGranted = Sum of all voterCredit[voter] for eligible voters
```

**Example:**
```
Voter Alice: 100 credits
Voter Bob:   150 credits
Voter Charlie: 100 credits (removed, refunded)
-----------------------------------
totalCreditsGranted = 100 + 150 = 250 ✅
```

---

## 🔍 Function-by-Function Analysis

### **1. removeVoter() - v2 Implementation**

```solidity
function removeVoter(address voter) external onlyAdmin notInState(State.Active) {
    uint256 refundAmount = voterCredit[voter];
    
    // Remove voter
    voterVersion[voter] = 0;
    voterCredit[voter] = 0;
    
    // Refund credits to system (only if voter had credits)
    if (refundAmount > 0) {
        totalCreditsGranted -= refundAmount;
    }
    
    emit VoterRemoved(address(this), voter);
    if (refundAmount > 0) {
        emit CreditGranted(address(this), voter, 0, 0); // Signal credit reset
    }
}
```

**Before & After:**

```
BEFORE removeVoter(alice):
├─ voterCredit[alice] = 100
├─ totalCreditsGranted = 1000
└─ totalCreditsUsed = 500

AFTER removeVoter(alice):
├─ voterCredit[alice] = 0
├─ totalCreditsGranted = 900  ← Refunded!
└─ totalCreditsUsed = 500     ← Unchanged
```

---

### **2. batchRemoveVoters() - Batch Operation**

```solidity
function batchRemoveVoters(address[] calldata voters) external onlyAdmin notInState(State.Active) {
    for (uint256 i = 0; i < voters.length; i++) {
        uint256 refundAmount = voterCredit[voters[i]];
        
        // Remove voter
        voterVersion[voters[i]] = 0;
        voterCredit[voters[i]] = 0;
        
        // Refund credits
        if (refundAmount > 0) {
            totalCreditsGranted -= refundAmount;
        }
        
        emit VoterRemoved(address(this), voters[i]);
    }
}
```

**Example:**

```
BEFORE batchRemoveVoters([alice, bob, charlie]):
├─ voterCredit[alice] = 100
├─ voterCredit[bob] = 150
├─ voterCredit[charlie] = 100
├─ totalCreditsGranted = 1000
└─ totalCreditsUsed = 300

AFTER batchRemoveVoters([alice, bob, charlie]):
├─ voterCredit[alice] = 0
├─ voterCredit[bob] = 0
├─ voterCredit[charlie] = 0
├─ totalCreditsGranted = 650  ← Refunded 350!
└─ totalCreditsUsed = 300     ← Unchanged
```

---

### **3. vote() - Credit Consumption**

```solidity
function vote(uint256 candidateId) external {
    address voter = _msgSender();
    uint256 weight = voterCredit[voter];
    
    // Consume all credit
    voterCredit[voter] = 0;
    totalCreditsUsed += weight;
    
    // Record vote
    roundVotes[currentRound][candidateId] += weight;
    // ...
}
```

**Before & After:**

```
BEFORE vote(candidateId=1):
├─ voterCredit[alice] = 100
├─ totalCreditsGranted = 1000  ← Stays same!
├─ totalCreditsUsed = 0
└─ roundVotes[1][1] = 0

AFTER vote(candidateId=1):
├─ voterCredit[alice] = 0      ← Consumed!
├─ totalCreditsGranted = 1000  ← Unchanged!
├─ totalCreditsUsed = 100      ← Increased!
└─ roundVotes[1][1] = 100
```

---

### **4. resetRoom() - Complete Wipe**

```solidity
function resetRoom() external onlyAdmin inState(State.Closed) {
    voterRegistryVersion++;
    candidateRegistryVersion++;
    
    totalCreditsGranted = 0;
    totalCreditsUsed = 0;
    
    state = State.Inactive;
}
```

**Before & After:**

```
BEFORE resetRoom():
├─ voterRegistryVersion = 1
├─ totalCreditsGranted = 1000
├─ totalCreditsUsed = 850
└─ state = Closed

AFTER resetRoom():
├─ voterRegistryVersion = 2    ← All old voters invalid!
├─ totalCreditsGranted = 0     ← Reset!
├─ totalCreditsUsed = 0        ← Reset!
└─ state = Inactive

Note: Old voterCredit[voter] mappings still exist in storage
but are irrelevant because voters are no longer eligible
(version mismatch).
```

---

### **5. prepareNextRound() - Soft Reset**

```solidity
function prepareNextRound() external onlyAdmin inState(State.Closed) {
    // Reset credit counters for new round
    totalCreditsGranted = 0;
    totalCreditsUsed = 0;
    
    // Change state back to Inactive for setup
    state = State.Inactive;
}
```

**Before & After:**

```
BEFORE prepareNextRound():
├─ voterRegistryVersion = 1
├─ voterCredit[alice] = 0 (voted in round 1)
├─ voterCredit[bob] = 50 (didn't vote)
├─ totalCreditsGranted = 1000
├─ totalCreditsUsed = 950
└─ state = Closed

AFTER prepareNextRound():
├─ voterRegistryVersion = 1    ← Same! Voters still valid
├─ voterCredit[alice] = 0      ← Unchanged! Must re-grant
├─ voterCredit[bob] = 50       ← Unchanged! Old credit lost
├─ totalCreditsGranted = 0     ← Reset counter
├─ totalCreditsUsed = 0        ← Reset counter
└─ state = Inactive

⚠️ WARNING: Old credits in voterCredit mapping are ignored!
Admin MUST call batchGrantCredits() to set new credits.
```

---

## 📈 Example Scenarios

### **Scenario 1: Admin Typo - Remove Wrong Voter**

```javascript
// Setup: Add 3 voters
await room.batchAddVotersWithCredits(
  [alice, bob, charlie],
  [100, 100, 100]
);
// totalCreditsGranted = 300

// Oops! Added wrong address by mistake
await room.addVoter(wrongAddress);
await room.grantCredit(wrongAddress, 100);
// totalCreditsGranted = 400

// Remove wrong voter
await room.removeVoter(wrongAddress);
// totalCreditsGranted = 300 ✅ (refunded!)

// Add correct voter
await room.addVoter(correctAddress);
await room.grantCredit(correctAddress, 100);
// totalCreditsGranted = 400 ✅

// Result: Accounting is correct!
```

---

### **Scenario 2: Voter Drops Out**

```javascript
// Setup: 100 students with 100 credits each
await room.batchAddVotersWithCredits(students, credits);
// totalCreditsGranted = 10,000

// 20 students vote
// totalCreditsUsed = 2,000
// totalCreditsGranted = 10,000 (unchanged)

// 5 students drop out (before voting)
await room.batchRemoveVoters([student1, student2, ...student5]);
// totalCreditsGranted = 9,500 (refunded 500)
// totalCreditsUsed = 2,000 (unchanged)

// Final tally is accurate:
// Eligible voters: 95 students
// Credits in system: 9,500
// Credits used: 2,000
// Credits remaining: 7,500 ✅
```

---

### **Scenario 3: Multi-Round Election**

```javascript
// Round 1 Setup
await room.batchAddVotersWithCredits(voters, [100, 100, 100]);
// totalCreditsGranted = 300

// Round 1 Voting
await room.startVoting();
// All 3 voters vote
// totalCreditsUsed = 300
// totalCreditsGranted = 300 (unchanged)

// Close Round 1
await room.endVoting();
await room.closeRound(winnerId);

// Prepare Round 2 (same voters)
await room.prepareNextRound();
// totalCreditsGranted = 0 (counter reset)
// totalCreditsUsed = 0 (counter reset)
// voterCredit[alice] = 0 (must re-grant!)

// Re-grant credits for Round 2
await room.batchGrantCredits(voters, [150, 150, 150]);
// totalCreditsGranted = 450
// voterCredit[alice] = 150

// Round 2 Voting
await room.startVoting();
// All 3 voters vote again
// totalCreditsUsed = 450
// totalCreditsGranted = 450

// Round 1 and Round 2 have independent accounting ✅
```

---

## ⚠️ Important Notes

### **1. Credit Persistence After Remove**

```solidity
// Storage note: voterCredit[voter] mapping entry
// is SET TO ZERO on remove, not deleted

// Before remove:
voterCredit[0xAlice] = 100

// After remove:
voterCredit[0xAlice] = 0  ← Explicitly set to 0

// If re-added and granted:
voterCredit[0xAlice] = 150  ← New credit
```

### **2. prepareNextRound() Does NOT Auto-Grant**

```solidity
// Common mistake:
await room.prepareNextRound();
await room.startVoting(); // ❌ ERROR! Voters have 0 credit!

// Correct:
await room.prepareNextRound();
await room.batchGrantCredits(voters, newCredits); // Must re-grant!
await room.startVoting(); // ✅ OK now
```

### **3. Batch Remove is NOT Reversible**

```solidity
// Remove voters
await room.batchRemoveVoters([alice, bob]);
// Credits refunded, voters invalidated

// To "undo":
await room.batchAddVoters([alice, bob]);
await room.batchGrantCredits([alice, bob], [100, 100]);
// Must explicitly re-add and re-grant
```

---

## 🎯 Best Practices

### **1. Always Check Credit Balance Before Remove**

```javascript
// Check if voter has unused credits
const credit = await room.voterCredit(voterAddress);

if (credit > 0) {
  console.log(`⚠️ Voter has ${credit} unused credits that will be refunded`);
  
  // Confirm removal
  const confirmed = confirm(`Remove voter and refund ${credit} credits?`);
  if (!confirmed) return;
}

await room.removeVoter(voterAddress);
```

---

### **2. Monitor Accounting After Operations**

```javascript
// Before operation
const beforeGranted = await room.totalCreditsGranted();
const beforeUsed = await room.totalCreditsUsed();

// Perform operation
await room.batchRemoveVoters(votersToRemove);

// After operation
const afterGranted = await room.totalCreditsGranted();
const afterUsed = await room.totalCreditsUsed();

// Verify
const refunded = beforeGranted - afterGranted;
console.log(`Refunded ${refunded} credits`);
assert(beforeUsed === afterUsed, "Used credits should not change");
```

---

### **3. Use Events to Track Refunds**

```javascript
// Listen for credit refunds
room.on("CreditGranted", (room, voter, amount, newBalance) => {
  if (amount === 0 && newBalance === 0) {
    console.log(`Voter ${voter} removed, credits refunded`);
    
    // Update database
    await db.voters.update({
      room_address: room,
      voter_address: voter,
      credit: 0,
      eligible: false,
      removed_at: new Date()
    });
  }
});
```

---

## 📊 Accounting Verification

### **Verify Integrity:**

```javascript
async function verifyRoomAccounting(roomAddress) {
  const room = await ethers.getContractAt("VotingRoom", roomAddress);
  
  // Get totals
  const totalGranted = await room.totalCreditsGranted();
  const totalUsed = await room.totalCreditsUsed();
  
  // Get all eligible voters from events or database
  const voters = await getAllEligibleVoters(roomAddress);
  
  // Sum individual credits
  let sumCredits = BigInt(0);
  for (const voter of voters) {
    const credit = await room.voterCredit(voter);
    sumCredits += credit;
  }
  
  // Verify
  console.log(`Total Granted: ${totalGranted}`);
  console.log(`Sum of Credits: ${sumCredits}`);
  console.log(`Total Used: ${totalUsed}`);
  
  if (sumCredits === totalGranted) {
    console.log("✅ Accounting is correct!");
  } else {
    console.error("❌ Accounting mismatch!");
    console.error(`Difference: ${sumCredits - totalGranted}`);
  }
  
  // Additional check
  const unvotedCredits = totalGranted - totalUsed;
  console.log(`Unvoted Credits: ${unvotedCredits}`);
}
```

---

## 🔐 Security Implications

### **Why Refund Matters:**

**Without refund (v1):**
```
Admin grants: 10,000 credits
Voter removed: 500 credits stuck
Actual credits: 9,500
System thinks: 10,000

❌ Mismatch leads to:
- Incorrect vote weight calculations
- Cannot determine participation rate
- Budget miscalculations
```

**With refund (v2):**
```
Admin grants: 10,000 credits
Voter removed: 500 credits refunded
Actual credits: 9,500
System thinks: 9,500

✅ Accurate:
- Correct vote weights
- Accurate participation tracking
- Proper budget management
```

---

## 📝 Summary

**v2 Credit Refund System:**

1. ✅ **Automatic**: No special function needed, `removeVoter()` handles it
2. ✅ **Accurate**: `totalCreditsGranted` always matches reality
3. ✅ **Flexible**: Works with manual and batch operations
4. ✅ **Safe**: Cannot remove during Active state
5. ✅ **Auditable**: Events track all refunds

**Credit Lifecycle:**
- **Add** → `totalCreditsGranted` increases
- **Vote** → `totalCreditsUsed` increases, granted stays same
- **Remove** → `totalCreditsGranted` decreases (refund!)
- **Reset** → Everything zeroed

**Invariant Maintained:**
```
totalCreditsGranted = Σ voterCredit[eligible voters]
```

---

**Related Documentation:**
- [Voting Room Lifecycle](./VOTING_ROOM_LIFECYCLE.md)
- [v1 vs v2 Changes](./V1_VS_V2_CHANGES.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)

**Last Updated:** January 20, 2026  
**Version:** v2.0
