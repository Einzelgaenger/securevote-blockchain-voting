# 🔄 Credit Pooling System - VotingRoom v2

## 📊 Overview

The **Credit Pooling System** allows removed voter credits to be **reused** for new voters instead of being destroyed. This creates an efficient credit circulation system where credits only increase when the pool is exhausted.

---

## 🎯 Core Concept

### **Traditional System (v2 Old)**
```
Add 1000 credits → Remove 350 → Credits lost forever
Need 300 more? Add 300 new credits to system
Total credits added: 1300
```

### **Pooling System (v2 New)**
```
Add 1000 credits → Remove 350 → 350 goes to pool
Need 300 more? Use 300 from pool (50 remains)
Total credits added: 1000 ✅
```

---

## 📈 State Variables

### **1. `totalCreditsInSystem`**
- **Purpose:** Total credits ever added to the system
- **Behavior:** Only increases when pool is exhausted
- **Reset:** Only on `resetRoom()` (full reset)
- **Type:** `uint256 public`

### **2. `availableCreditsPool`**
- **Purpose:** Credits removed from voters, ready for reuse
- **Behavior:** Increases on remove, decreases on grant
- **Reset:** Only on `resetRoom()` (preserved on `prepareNextRound()`)
- **Type:** `uint256 public`

### **3. `totalCreditsGranted`**
- **Purpose:** Credits currently allocated to active voters
- **Behavior:** Sum of all `voterCredit[voter]` balances
- **Reset:** On `resetRoom()` and `prepareNextRound()`
- **Type:** `uint256 public`

### **4. `totalCreditsUsed`**
- **Purpose:** Credits spent on votes (consumed)
- **Behavior:** Only increases on `vote()`, never decreases
- **Reset:** On `resetRoom()` and `prepareNextRound()`
- **Type:** `uint256 public`

---

## 🔄 Credit Flow Examples

### **Example 1: Basic Flow with Pooling**

```solidity
// INITIAL STATE
totalCreditsInSystem = 0
availableCreditsPool = 0
totalCreditsGranted = 0
totalCreditsUsed = 0

// STEP 1: Grant 1000 credits to voters (Alice: 100, Bob: 150, Charlie: 100, others: 650)
grantCredit(alice, 100)
grantCredit(bob, 150)
grantCredit(charlie, 100)
// ... grant 650 to others

├─ voterCredit[alice] = 100
├─ voterCredit[bob] = 150
├─ voterCredit[charlie] = 100
├─ totalCreditsInSystem = 1000      ← Added from nothing
├─ availableCreditsPool = 0
├─ totalCreditsGranted = 1000
└─ totalCreditsUsed = 0

// STEP 2: Alice, Bob, Charlie vote (use all their credits)
vote(alice, candidateA, 100)    // Alice uses 100
vote(bob, candidateB, 150)      // Bob uses 150
vote(charlie, candidateC, 100)  // Charlie uses 100

├─ voterCredit[alice] = 0
├─ voterCredit[bob] = 0
├─ voterCredit[charlie] = 0
├─ totalCreditsInSystem = 1000      ← Unchanged
├─ availableCreditsPool = 0         ← Unchanged
├─ totalCreditsGranted = 1000       ← Unchanged (others still have credits)
└─ totalCreditsUsed = 350           ← Increased by 350!

// STEP 3: Remove Alice, Bob, Charlie (they already voted, credits = 0)
batchRemoveVoters([alice, bob, charlie])

├─ voterCredit[alice] = 0 (already 0)
├─ voterCredit[bob] = 0 (already 0)
├─ voterCredit[charlie] = 0 (already 0)
├─ totalCreditsInSystem = 1000      ← Unchanged
├─ availableCreditsPool = 0         ← No refund (they had 0 credits)
├─ totalCreditsGranted = 1000       ← Unchanged (others have credits)
└─ totalCreditsUsed = 350

// STEP 4: Remove David who has 200 unused credits
removeVoter(david)

├─ voterCredit[david] = 0
├─ totalCreditsInSystem = 1000      ← Unchanged
├─ availableCreditsPool = 200       ← David's 200 credits go to pool!
├─ totalCreditsGranted = 800        ← Reduced by 200 (david removed)
└─ totalCreditsUsed = 350

// STEP 5: Add new voter Eve and grant 150 credits
grantCredit(eve, 150)

├─ voterCredit[eve] = 150
├─ totalCreditsInSystem = 1000      ← Unchanged (used pool!)
├─ availableCreditsPool = 50        ← 200 - 150 = 50 left
├─ totalCreditsGranted = 950        ← 800 + 150
└─ totalCreditsUsed = 350

// STEP 6: Add Frank and grant 100 credits (exceeds pool!)
grantCredit(frank, 100)

├─ voterCredit[frank] = 100
├─ totalCreditsInSystem = 1050      ← Increased! (50 from pool + 50 new)
├─ availableCreditsPool = 0         ← Pool exhausted
├─ totalCreditsGranted = 1050       ← 950 + 100
└─ totalCreditsUsed = 350
```

---

### **Example 2: Remove Then Reuse Pool**

```solidity
// BEFORE batchRemoveVoters([alice, bob, charlie])
├─ voterCredit[alice] = 100
├─ voterCredit[bob] = 150
├─ voterCredit[charlie] = 100
├─ totalCreditsInSystem = 1000
├─ availableCreditsPool = 0
├─ totalCreditsGranted = 1000
└─ totalCreditsUsed = 300

// AFTER batchRemoveVoters([alice, bob, charlie])
├─ voterCredit[alice] = 0           ← Removed
├─ voterCredit[bob] = 0             ← Removed
├─ voterCredit[charlie] = 0         ← Removed
├─ totalCreditsInSystem = 1000      ← Unchanged!
├─ availableCreditsPool = 350       ← 100 + 150 + 100 refunded!
├─ totalCreditsGranted = 650        ← 1000 - 350 (removed)
└─ totalCreditsUsed = 300           ← Unchanged

// Grant 300 credits to new voters
batchGrantCredits([dave, eve], [200, 100])

├─ voterCredit[dave] = 200
├─ voterCredit[eve] = 100
├─ totalCreditsInSystem = 1000      ← Still unchanged! Used pool
├─ availableCreditsPool = 50        ← 350 - 300 = 50 remaining
├─ totalCreditsGranted = 950        ← 650 + 300
└─ totalCreditsUsed = 300

// Grant 100 to Frank (exceeds pool by 50)
grantCredit(frank, 100)

├─ voterCredit[frank] = 100
├─ totalCreditsInSystem = 1050      ← +50 new credits added!
├─ availableCreditsPool = 0         ← Pool used: 50 from pool + 50 new
├─ totalCreditsGranted = 1050       ← 950 + 100
└─ totalCreditsUsed = 300
```

---

## ⚙️ Function Behaviors

### **Grant Credit Functions**

#### **1. `grantCredit(voter, amount)`**
```solidity
Smart Allocation Logic:
1. Update voter balance: voterCredit[voter] += amount
2. Increase granted: totalCreditsGranted += amount
3. Check pool:
   - Pool >= amount → Use pool only
   - Pool < amount but > 0 → Use all pool + add remainder as new
   - Pool = 0 → Add all as new credits
```

**Example:**
```solidity
// Pool has 200, grant 150
├─ availableCreditsPool: 200 → 50 (used 150)
├─ totalCreditsInSystem: No change
└─ totalCreditsGranted: +150

// Pool has 50, grant 100
├─ availableCreditsPool: 50 → 0 (used all)
├─ totalCreditsInSystem: +50 (added remainder)
└─ totalCreditsGranted: +100

// Pool has 0, grant 100
├─ availableCreditsPool: Still 0
├─ totalCreditsInSystem: +100 (all new)
└─ totalCreditsGranted: +100
```

#### **2. `batchGrantCredits(voters[], amounts[])`**
Same logic as `grantCredit`, but:
- Calculates `totalGrantAmount = sum(amounts)`
- Applies pool allocation once for efficiency

#### **3. `batchAddVotersWithCredits(voters[], credits[])`**
Combines `addVoter()` + `grantCredit()` with pool logic.

---

### **Remove Credit Functions**

#### **1. `removeVoter(voter)`**
```solidity
Pool Return Logic:
1. Save refundAmount = voterCredit[voter]
2. Set voterCredit[voter] = 0
3. If refundAmount > 0:
   - totalCreditsGranted -= refundAmount
   - availableCreditsPool += refundAmount ← TO POOL!
```

**Example:**
```solidity
// Remove voter with 100 credits
├─ voterCredit[voter]: 100 → 0
├─ totalCreditsGranted: -100
├─ availableCreditsPool: +100 ← Credits go here!
└─ totalCreditsInSystem: No change
```

#### **2. `batchRemoveVoters(voters[])`**
- Accumulates `totalRefund` from all voters
- Single pool update: `availableCreditsPool += totalRefund`
- More gas efficient than individual removes

#### **3. `removeVoterWithRefund(voter)`**
Identical to `removeVoter()` (both refund to pool now).

---

### **Reset Functions**

#### **1. `resetRoom()` - FULL RESET**
```solidity
Clears EVERYTHING:
├─ totalCreditsInSystem = 0     ← RESET
├─ availableCreditsPool = 0     ← RESET
├─ totalCreditsGranted = 0      ← RESET
├─ totalCreditsUsed = 0         ← RESET
├─ voterRegistryVersion++       ← All voters invalidated
└─ candidateRegistryVersion++   ← All candidates invalidated
```

#### **2. `prepareNextRound()` - SOFT RESET**
```solidity
Preserves pool and system total:
├─ totalCreditsInSystem         ← PRESERVED
├─ availableCreditsPool         ← PRESERVED
├─ totalCreditsGranted = 0      ← RESET (for new allocation)
├─ totalCreditsUsed = 0         ← RESET (for new votes)
├─ voterRegistryVersion         ← UNCHANGED (keep voters)
└─ candidateRegistryVersion     ← UNCHANGED (keep candidates)
```

---

## 📊 Accounting Invariants

### **Invariant 1: Granted Credits**
```solidity
totalCreditsGranted == Σ voterCredit[all eligible voters]
```
**Meaning:** Granted credits always equals sum of individual balances.

### **Invariant 2: System Total**
```solidity
totalCreditsInSystem >= totalCreditsGranted
totalCreditsInSystem >= totalCreditsUsed
```
**Meaning:** System total is highest watermark.

### **Invariant 3: Pool Availability**
```solidity
availableCreditsPool = totalCreditsInSystem - totalCreditsGranted - (totalCreditsInSystem_added_beyond_pool)
```
**Simplified:**
```solidity
availableCreditsPool = credits that were removed but not yet reused
```

### **Invariant 4: Credit Conservation**
```solidity
totalCreditsInSystem = totalCreditsGranted + availableCreditsPool + extraCreditsAdded
```
**Where:**
- `totalCreditsGranted` = currently with voters
- `availableCreditsPool` = removed but reusable
- `extraCreditsAdded` = new credits added when pool exhausted

---

## 🧮 Calculation Examples

### **Scenario 1: Pool Exactly Covers**
```solidity
State:
├─ availableCreditsPool = 500
├─ totalCreditsInSystem = 2000
└─ totalCreditsGranted = 1500

grantCredit(alice, 500)

Result:
├─ availableCreditsPool = 0          (500 - 500)
├─ totalCreditsInSystem = 2000       (unchanged)
└─ totalCreditsGranted = 2000        (1500 + 500)
```

### **Scenario 2: Pool Partially Covers**
```solidity
State:
├─ availableCreditsPool = 200
├─ totalCreditsInSystem = 2000
└─ totalCreditsGranted = 1800

grantCredit(bob, 500)

Result:
├─ availableCreditsPool = 0          (used all 200)
├─ totalCreditsInSystem = 2300       (2000 + 300 new)
└─ totalCreditsGranted = 2300        (1800 + 500)

Calculation:
- Need: 500
- From pool: 200
- New credits: 300
```

### **Scenario 3: Pool Empty**
```solidity
State:
├─ availableCreditsPool = 0
├─ totalCreditsInSystem = 2000
└─ totalCreditsGranted = 2000

grantCredit(charlie, 300)

Result:
├─ availableCreditsPool = 0          (still empty)
├─ totalCreditsInSystem = 2300       (2000 + 300 new)
└─ totalCreditsGranted = 2300        (2000 + 300)
```

---

## 🔍 Query Functions for Monitoring

### **Check Pool Status**
```solidity
function getPoolStatus() public view returns (
    uint256 systemTotal,
    uint256 poolAvailable,
    uint256 currentlyGranted,
    uint256 totalUsed
) {
    return (
        totalCreditsInSystem,
        availableCreditsPool,
        totalCreditsGranted,
        totalCreditsUsed
    );
}
```

### **Check if Pool Can Cover Amount**
```solidity
function canPoolCover(uint256 amount) public view returns (bool) {
    return availableCreditsPool >= amount;
}
```

### **Calculate New Credits Needed**
```solidity
function newCreditsNeeded(uint256 amount) public view returns (uint256) {
    if (availableCreditsPool >= amount) {
        return 0; // Pool covers all
    }
    return amount - availableCreditsPool; // Remainder needed
}
```

---

## 📈 Benefits of Pooling System

### **1. Cost Efficiency**
- Reuses credits instead of creating new ones
- Reduces unnecessary system growth
- Optimizes credit circulation

### **2. Transparency**
- `totalCreditsInSystem` shows true credit creation
- `availableCreditsPool` shows reusable credits
- Easy to audit credit flow

### **3. Flexibility**
- Admin can see available pool before granting
- Can plan credit distribution efficiently
- Reduces need to constantly add new credits

### **4. Accounting Clarity**
```
totalCreditsInSystem = Total ever created (minus resets)
availableCreditsPool = Ready for reuse
totalCreditsGranted = Currently allocated
totalCreditsUsed = Consumed in votes
```

---

## ⚠️ Important Notes

### **When Pool Grows**
✅ `removeVoter()` - Returns unused credits to pool
✅ `batchRemoveVoters()` - Batch returns to pool
✅ `removeVoterWithRefund()` - Returns to pool

### **When Pool Shrinks**
✅ `grantCredit()` - Uses pool first
✅ `batchGrantCredits()` - Uses pool first
✅ `batchAddVotersWithCredits()` - Uses pool first

### **When Pool Resets**
✅ `resetRoom()` - Pool becomes 0 (full reset)
❌ `prepareNextRound()` - Pool PRESERVED!

### **Pool Does NOT Change On**
- `vote()` - Only affects totalCreditsUsed and voterCredit
- `startRound()` - State change only
- `endRound()` - State change only
- `closeRound()` - State change only

---

## 🎯 Best Practices

### **1. Check Pool Before Granting**
```solidity
// Frontend: Show admin available pool
uint256 pool = votingRoom.availableCreditsPool();
if (pool >= amountNeeded) {
    console.log("Will use pool credits");
} else {
    console.log(`Need ${amountNeeded - pool} new credits`);
}
```

### **2. Monitor System Growth**
```solidity
// Track if system is growing unnecessarily
uint256 systemTotal = votingRoom.totalCreditsInSystem();
uint256 poolAvailable = votingRoom.availableCreditsPool();
uint256 utilization = (systemTotal - poolAvailable) * 100 / systemTotal;
console.log(`Credit utilization: ${utilization}%`);
```

### **3. Optimize Removal Timing**
```solidity
// Remove inactive voters to grow pool
// This makes their credits available for new voters
```

### **4. Plan Multi-Round Usage**
```solidity
// Use prepareNextRound() to preserve pool across rounds
// Pool credits can be redistributed to same or different voters
```

---

## 📚 Related Documentation

- [CREDIT_REFUND_LOGIC.md](./CREDIT_REFUND_LOGIC.md) - Original refund system
- [VOTING_ROOM_LIFECYCLE.md](./VOTING_ROOM_LIFECYCLE.md) - State machine
- [V1_VS_V2_CHANGES.md](./V1_VS_V2_CHANGES.md) - Version comparison

---

**Updated:** January 20, 2026  
**Version:** VotingRoom v2 with Credit Pooling System
