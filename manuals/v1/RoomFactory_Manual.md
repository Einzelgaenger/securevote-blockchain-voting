# 📘 RoomFactory - User Manual

**Contract Type:** Room Deployment Factory  
**Purpose:** Create voting rooms dengan efficient clone pattern (EIP-1167)

---

## 🎯 Executive Summary

RoomFactory adalah "pabrik" untuk membuat voting room. Daripada deploy contract baru yang mahal (~2M gas), factory ini bikin "clone" murah (~45k gas) dari template. Setiap clone punya data terpisah tapi logic yang sama. Siapa saja bisa create room dengan bayar registration fee.

**Analogi:** Seperti franchise restaurant - template sama (menu, SOP), tapi tiap cabang punya data sendiri (staff, pelanggan, transaksi).

---

## 👥 Siapa yang Menggunakan?

### 🎓 Room Creator - Anyone Who Wants to Organize Voting
- Organizations (university, company, DAO)
- Event organizers
- Communities

### 🔍 Room Finder - Looking for Existing Rooms
- Public browsing rooms
- Find rooms by admin
- Verify room authenticity

### 📊 Platform Analyst - Analytics & Monitoring
- Track total rooms created
- Monitor platform growth
- Usage statistics

---

## 🔧 Fungsi-Fungsi Utama

---

## 🎓 Untuk Room Creator

### 1. `createRoom` 🟠 (Payable)

**Apa Itu?**  
Create voting room baru.

**Kenapa Ada?**  
Ini satu-satunya cara untuk bikin room baru di platform.

**Kapan Digunakan?**  
Saat mau organize voting event.

**Cost:**  
Harus bayar registration fee (default 0.01 ETH) - **non-refundable**.

**Cara Pakai:**

#### Scenario 1: University Create Room

```javascript
Situasi: University ABC mau voting BEM chairman

Step 1: Check registration fee
const fee = await factory.registrationFeeWei()
// fee = 10000000000000000 (0.01 ETH)

Step 2: Prepare payment
// Pastikan wallet punya ETH cukup

Step 3: Create room
const tx = await factory.createRoom("BEM Chairman Election 2026", {
  value: fee
})

Step 4: Wait transaction
const receipt = await tx.wait()

Step 5: Get room address dari event
const event = receipt.events.find(e => e.event === 'RoomRegistered')
const roomAddress = event.args.room

console.log(`Room created: ${roomAddress}`)
```

**Real Example - Remix:**
```
1. Expand RoomFactory contract
2. Find createRoom function
3. Parameters:
   - roomName: "University BEM 2026"
4. Value: 10000000000000000 wei (0.01 ETH)
5. Click "transact"
6. Check transaction logs:
   - Event: RoomRegistered
   - Args[0] = room address
7. Copy room address
8. Use this address untuk load VotingRoom contract
```

**Real Example - Web App:**
```
User flow:
1. Connect wallet (MetaMask)
2. Click "Create New Room"
3. Form:
   - Room Name: "Company Board Vote 2026"
   - Event Type: Corporate
   - Expected Voters: 100
4. Preview:
   - Cost: 0.01 ETH
   - Your balance: 0.5 ETH ✓
5. Click "Create Room"
6. Wallet popup: Confirm transaction
7. User approve → transaction sent
8. Wait confirmation (15 seconds)
9. Success! Redirect to room setup page
10. Room address: 0x1234...
```

**What Happens Behind the Scenes:**

```javascript
factory.createRoom("MyRoom", {value: fee}):

1. Validate fee:
   require(msg.value >= registrationFeeWei) ✓

2. Create clone (EIP-1167):
   clone = Clones.clone(votingRoomImplementation)
   // Cost: ~45k gas (cheap!)
   
3. Initialize clone:
   VotingRoom(clone).initialize({
     roomAdmin: msg.sender,
     roomName: "MyRoom",
     sponsorVault: vaultAddress,
     trustedForwarder: forwarderAddress
   })
   
4. Register room:
   roomOwner[clone] = msg.sender
   isRoom[clone] = true
   allRooms.push(clone)
   
5. Forward fee to vault:
   vault.acceptRegistrationFee{value: fee}()
   
6. Emit event:
   RoomRegistered(clone, msg.sender, fee, "MyRoom")
   
7. Return room address
```

**Benefits of Clone Pattern:**

| Metric | Traditional Deploy | Clone (EIP-1167) |
|--------|-------------------|------------------|
| Gas Cost | ~2,000,000 gas | ~45,000 gas |
| ETH Cost (50 gwei) | ~0.1 ETH | ~0.00225 ETH |
| Deploy Time | ~20 seconds | ~3 seconds |
| Scalability | Limited | High |

**Important Notes:**
- ✅ Registration fee is **non-refundable** (goes to platform)
- ✅ Room admin = address yang call createRoom
- ✅ Room langsung ready untuk setup (addVoter, addCandidate, etc)
- ⚠️ Gas cost + registration fee (total ~0.013 ETH di testnet)

---

## 🔍 Untuk Room Finder / Public

### 2. `getRoomCount` 🔵 (View)

**Apa Itu?**  
Total jumlah room yang pernah dibuat.

**Kenapa Ada?**  
Metrics - track platform growth & usage.

**Cara Pakai:**

```javascript
// Check total rooms
const count = await factory.getRoomCount()
console.log(`Platform has ${count} rooms`)

// Loop through all rooms
for (let i = 0; i < count; i++) {
  const roomAddress = await factory.getRoomAt(i)
  console.log(`Room ${i}: ${roomAddress}`)
}
```

**Real Example - Platform Dashboard:**
```
┌──────────────────────────────┐
│  Platform Statistics         │
├──────────────────────────────┤
│  Total Rooms: 1,234          │
│  Active Voting: 45           │
│  Completed: 1,150            │
│  This Month: 89 new          │
└──────────────────────────────┘
```

---

### 3. `getRoomAt` 🔵 (View)

**Apa Itu?**  
Get room address by index.

**Cara Pakai:**

```javascript
// Get room 0 (first room ever created)
const firstRoom = await factory.getRoomAt(0)

// Get latest room
const count = await factory.getRoomCount()
const latestRoom = await factory.getRoomAt(count - 1)
```

**Real Example - Browse All Rooms:**
```javascript
async function listAllRooms() {
  const count = await factory.getRoomCount()
  
  for (let i = 0; i < count; i++) {
    const roomAddr = await factory.getRoomAt(i)
    const room = VotingRoom.at(roomAddr)
    
    const name = await room.roomName()
    const admin = await room.roomAdmin()
    const state = await room.state()
    
    console.log(`
      Room ${i}:
      - Name: ${name}
      - Address: ${roomAddr}
      - Admin: ${admin}
      - State: ${state}
    `)
  }
}
```

---

### 4. `getRoomsByAdmin` 🔵 (View)

**Apa Itu?**  
Get semua room yang dibuat oleh admin tertentu.

**Kenapa Ada?**  
User want to see "My Rooms" - rooms yang mereka buat.

**Cara Pakai:**

```javascript
// Get rooms created by current user
const myRooms = await factory.getRoomsByAdmin(myAddress)

console.log(`You have created ${myRooms.length} rooms:`)
myRooms.forEach((addr, i) => {
  console.log(`${i + 1}. ${addr}`)
})
```

**Real Example - User Dashboard:**
```
Web App: "My Rooms" page

User: 0x5B38Da...
┌────────────────────────────────────┐
│  Your Voting Rooms                 │
├────────────────────────────────────┤
│  1. BEM Election 2026              │
│     Status: Active (45/100 voted)  │
│     [Manage Room]                  │
├────────────────────────────────────┤
│  2. Festival Band Competition      │
│     Status: Closed (Winner: BandA) │
│     [View Results]                 │
├────────────────────────────────────┤
│  3. Department Head Selection      │
│     Status: Inactive (Setup)       │
│     [Continue Setup]               │
└────────────────────────────────────┘
```

**Implementation:**
```javascript
async function loadMyRooms(userAddress) {
  const rooms = await factory.getRoomsByAdmin(userAddress)
  
  const roomDetails = await Promise.all(
    rooms.map(async (addr) => {
      const room = VotingRoom.at(addr)
      return {
        address: addr,
        name: await room.roomName(),
        state: await room.state(),
        round: await room.currentRound()
      }
    })
  )
  
  return roomDetails
}
```

---

### 5. `isRoom` 🔵 (View)

**Apa Itu?**  
Verify apakah address adalah room valid dari factory ini.

**Kenapa Ada?**  
Security - prevent fake rooms.

**Cara Pakai:**

```javascript
// User input room address
const userInput = "0x1234567890abcdef..."

// Validate
const isValid = await factory.isRoom(userInput)

if (!isValid) {
  alert("Warning: This is not a verified room!")
  alert("It might be a scam or wrong address")
  return
}

// Load room
const room = VotingRoom.at(userInput)
```

**Real Example - QR Code Voting:**
```
Scenario: Event voting via QR code

1. Admin print QR code with room address
2. Voters scan QR → open web app
3. Web app parse room address from URL
4. Before load:
   const valid = await factory.isRoom(addressFromQR)
   
5. If valid → load room
6. If not valid → show warning
   "This is not an official voting room!"
```

---

### 6. `roomOwner` 🔵 (View)

**Apa Itu?**  
Get address yang create room.

**Cara Pakai:**

```javascript
const owner = await factory.roomOwner(roomAddress)
console.log(`Room owned by: ${owner}`)

// Verify ownership
if (owner === myAddress) {
  console.log("You are the admin")
  // Show admin controls
} else {
  console.log("You are a viewer/voter")
  // Show voter controls only
}
```

---

### 7. `predictRoomAddress` 🔵 (View)

**Apa Itu?**  
Predict address room sebelum create (deterministic).

**Kenapa Ada?**  
Advanced feature - prepare infrastructure sebelum room created.

**Limitasi:**  
Basic clone (non-deterministic), prediction terbatas.

**Cara Pakai:**

```javascript
// Predict next room address
const predicted = await factory.predictRoomAddress(someNonce)

// Note: This is simplified, actual prediction complex
// Lebih berguna untuk salt-based deterministic clone
```

---

## 🔧 Metadata View Functions

### 8. `votingRoomImplementation` 🔵

**Apa Itu?**  
Address dari VotingRoom template (logic contract).

**Cara Pakai:**

```javascript
const implementation = await factory.votingRoomImplementation()
console.log(`All rooms clone from: ${implementation}`)
```

**Use Case:**  
Verify contract source code - all rooms use same verified logic.

---

### 9. `sponsorVault` 🔵

**Apa Itu?**  
Address SponsorVault contract.

```javascript
const vault = await factory.sponsorVault()
console.log(`Platform vault: ${vault}`)
```

---

### 10. `trustedForwarder` 🔵

**Apa Itu?**  
Address MinimalForwarder contract.

```javascript
const forwarder = await factory.trustedForwarder()
console.log(`Meta-tx forwarder: ${forwarder}`)
```

---

## 📋 Complete Use Cases

### Use Case 1: Organization Create & Setup Room

**Organization:** Tech Startup  
**Goal:** Vote for company direction

```
Step 1: Create Room
User: CEO (0x5B38...)
Action:
- Connect wallet
- Click "Create Room"
- Name: "Q1 2026 Strategy Vote"
- Pay: 0.01 ETH
- Confirm transaction

Result:
- Room created: 0xABCD...
- CEO becomes room admin
- Redirect to setup page

Step 2: Setup Room (now in VotingRoom contract)
- Load room at 0xABCD...
- Add voters (20 employees)
- Add candidates (3 strategies)
- Grant credit (equal: 1 each)
- Topup deposit (0.2 ETH)

Step 3: Launch Voting
- startVoting()
- Email to employees
- Voting period: 24 hours

Step 4: Results
- endVoting()
- closeRound(winnerId)
- Announce decision

Step 5: Archive
- Room state = Closed
- History preserved on-chain
- Can view via getRoundSummary
```

---

### Use Case 2: Platform Analytics

**Actor:** Platform Owner / Data Analyst  
**Goal:** Track platform growth

```javascript
async function getPlatformMetrics() {
  const factory = await ethers.getContractAt("RoomFactory", factoryAddr)
  
  // Total rooms
  const totalRooms = await factory.getRoomCount()
  
  // Loop through all rooms
  let activeCount = 0
  let closedCount = 0
  let totalVotes = 0
  
  for (let i = 0; i < totalRooms; i++) {
    const roomAddr = await factory.getRoomAt(i)
    const room = await ethers.getContractAt("VotingRoom", roomAddr)
    
    const state = await room.state()
    const round = await room.currentRound()
    
    if (state === 1) activeCount++ // Active
    if (state === 3) closedCount++ // Closed
    
    if (round > 0) {
      const summary = await room.getRoundSummary(round)
      totalVotes += summary.totalVotesWeight
    }
  }
  
  return {
    totalRooms,
    activeRooms: activeCount,
    completedRooms: closedCount,
    totalVotesCast: totalVotes,
    avgVotesPerRoom: totalVotes / totalRooms
  }
}

// Run monthly report
const metrics = await getPlatformMetrics()
console.log(`
Platform Report - January 2026:
- Total Rooms: ${metrics.totalRooms}
- Active: ${metrics.activeRooms}
- Completed: ${metrics.completedRooms}
- Total Votes: ${metrics.totalVotesCast}
- Avg Votes/Room: ${metrics.avgVotesPerRoom}
`)
```

---

### Use Case 3: User Find & Join Voting

**User:** Student looking for university voting

```
Scenario: Student heard about voting, looking for room

Option A: Direct Link
- Friend send link: app.vote.com/room/0xABCD...
- Click link → auto-load room
- Factory verify: isRoom(0xABCD...) → true ✓
- Check eligible: isVoterEligible(student) → true ✓
- Student can vote

Option B: Browse Rooms
- Go to platform homepage
- Click "Active Voting Events"
- App load:
  const count = await factory.getRoomCount()
  for (i = 0; i < count; i++) {
    const room = await factory.getRoomAt(i)
    if (state === Active) {
      // Display in list
    }
  }
- Student see list of active rooms
- Click "BEM Election" → redirect to room
- Vote

Option C: Admin Invite
- Admin get room address: myRooms[0]
- Share QR code with room address
- Student scan QR
- App validate: isRoom(address) ✓
- Student vote
```

---

### Use Case 4: Multi-Organization Platform

**Platform:** VoteChain (multi-tenant SaaS)

```
Organizations using platform:
1. University A (10 rooms)
2. University B (15 rooms)
3. Company C (5 rooms)
4. DAO D (8 rooms)

Each organization query their rooms:
const uniA_rooms = await factory.getRoomsByAdmin(uniA_admin)
const uniB_rooms = await factory.getRoomsByAdmin(uniB_admin)
const compC_rooms = await factory.getRoomsByAdmin(compC_admin)
const daoD_rooms = await factory.getRoomsByAdmin(daoD_admin)

Platform dashboard:
┌─────────────────────────────────────┐
│  VoteChain Platform                 │
├─────────────────────────────────────┤
│  University A         10 rooms      │
│  University B         15 rooms      │
│  Company C            5 rooms       │
│  DAO D                8 rooms       │
├─────────────────────────────────────┤
│  Total Organizations: 4             │
│  Total Rooms: 38                    │
│  Total Votes: 15,234                │
└─────────────────────────────────────┘

Benefits:
- Isolated data per organization
- Shared infrastructure (factory, vault, forwarder)
- Scalable (cheap clone deployment)
- Traceable (all rooms in factory registry)
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "InsufficientRegistrationFee"

**Cause:** Sent ETH < registration fee

**Solution:**
```javascript
// Check fee first
const requiredFee = await factory.registrationFeeWei()

// Send exact or more
await factory.createRoom("MyRoom", {
  value: requiredFee
})
```

---

### Issue 2: "RoomCreationFailed"

**Cause:** Clone deployment failed (rare)

**Solutions:**
- Check gas limit (increase if needed)
- Check network congestion
- Retry transaction

---

### Issue 3: Room Address Not Found

**Cause:** Transaction success but event not parsed

**Solution:**
```javascript
// Method 1: Parse event
const tx = await factory.createRoom(name, {value: fee})
const receipt = await tx.wait()
const event = receipt.events.find(e => e.event === 'RoomRegistered')
const roomAddr = event.args.room

// Method 2: Query by admin
const myRooms = await factory.getRoomsByAdmin(myAddress)
const latestRoom = myRooms[myRooms.length - 1]
```

---

## 💡 Best Practices

### Untuk Room Creator:

1. **Before Create:**
   - ✅ Plan event details (voters, candidates, timeline)
   - ✅ Estimate cost (registration fee + deposit + gas)
   - ✅ Prepare wallet dengan ETH cukup
   - ✅ Choose descriptive room name

2. **After Create:**
   - ✅ Save room address immediately
   - ✅ Start setup right away (momentum)
   - ✅ Test dengan dummy voter
   - ✅ Announce room address to participants

3. **Room Naming:**
   - ✅ Include event name & year
   - ✅ Clear & descriptive
   - ✅ Example: "University BEM Election 2026"
   - ❌ Avoid: "Room1", "Test", "abc"

### Untuk Platform:

1. **Factory Management:**
   - 📊 Monitor factory metrics daily
   - 🔍 Audit room quality (spam detection)
   - 💰 Review registration fee quarterly
   - 🔐 Secure factory owner key

2. **User Experience:**
   - 🎨 Nice UI for createRoom
   - 📱 Mobile-friendly
   - 📖 Clear documentation
   - 💬 Support chat

3. **Scalability:**
   - ⚡ Optimize gas (already efficient with clones)
   - 🗄️ Index events untuk fast queries
   - 📈 Plan for 10k+ rooms
   - 🌐 Multi-chain deployment

---

## 📊 Gas Cost Analysis

### createRoom Transaction Breakdown

```
Component                  Gas Cost
─────────────────────────────────────
Clone deployment          ~45,000
Initialize call           ~80,000
Storage writes            ~65,000
Event emission            ~2,000
Registration fee forward  ~21,000
─────────────────────────────────────
Total                     ~213,000 gas

At 50 gwei:
213,000 × 50 gwei = 0.01065 ETH (~$21 @ $2000/ETH)

Plus registration fee:
0.01065 + 0.01 = 0.02065 ETH total

Compare to full deploy:
~2,000,000 gas = 0.1 ETH (~$200)

Savings: ~90% cheaper ✨
```

---

## 🔗 Integration Flow

### Frontend Integration

```javascript
// 1. Connect wallet
const provider = new ethers.providers.Web3Provider(window.ethereum)
await provider.send("eth_requestAccounts", [])
const signer = provider.getSigner()

// 2. Load factory
const factory = new ethers.Contract(
  factoryAddress,
  factoryABI,
  signer
)

// 3. Create room
const fee = await factory.registrationFeeWei()
const tx = await factory.createRoom("Event Name", {
  value: fee,
  gasLimit: 300000 // Safety buffer
})

// 4. Wait & get address
const receipt = await tx.wait()
const roomAddr = receipt.events.find(
  e => e.event === 'RoomRegistered'
).args.room

// 5. Redirect to room setup
window.location.href = `/room/${roomAddr}/setup`
```

### Backend Integration (Indexing)

```javascript
// Listen to RoomRegistered events
factory.on("RoomRegistered", (room, admin, fee, name, event) => {
  console.log("New room created!")
  
  // Save to database
  db.rooms.insert({
    address: room,
    admin: admin,
    name: name,
    fee: fee,
    createdAt: event.blockNumber,
    txHash: event.transactionHash
  })
  
  // Send notification
  notifyAdmin(admin, `Room ${name} created successfully`)
  
  // Analytics
  analytics.track("RoomCreated", {
    admin: admin,
    name: name
  })
})
```

---

## 📖 Summary

**RoomFactory Responsibilities:**

✅ Deploy new rooms (cheap clones)  
✅ Register rooms (mapping & array)  
✅ Track room ownership  
✅ Collect registration fees  
✅ Provide discovery (list all rooms)  
✅ Verify room authenticity  

**Key Benefits:**

🚀 **Efficient:** Clone pattern = 90% cheaper  
📦 **Scalable:** Can handle thousands of rooms  
🔒 **Secure:** Registry prevents fake rooms  
📊 **Transparent:** All rooms queryable  
🎯 **Simple:** One function to create room  

**Perfect For:**

- Multi-tenant voting platforms
- Organizations needing multiple voting events
- Decentralized governance systems
- Any use case requiring many independent voting instances

---

**Kesimpulan:**  
RoomFactory adalah entry point ke platform - efficient, scalable, dan simple. Create room sekali, ready untuk organize voting event profesional.
