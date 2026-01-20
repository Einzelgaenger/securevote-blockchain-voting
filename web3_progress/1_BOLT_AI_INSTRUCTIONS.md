# 🚀 BOLT AI - Detailed Project Instructions
# Blockchain Voting App v2 - Frontend Development

---

## ⚡ IMPORTANT: HOW TO WORK WITH BOLT AI

### **Best Practices for Reliable Editing**

1. **📌 Scope each prompt to a single change**
   - Focus on ONE specific feature or component at a time
   - Example: "Add RainbowKit ConnectButton to navbar" instead of "Setup wallet + routing + dashboard"
   - Avoid multi-step requests in larger applications

2. **📖 Always reference README.md**
   - Before each task, ask Bolt to read the README.md file
   - This helps Bolt understand project context and structure
   - Keep README.md updated with latest changes

3. **🔄 Reset context between major tasks**
   - Use `/clear` command in chatbox when switching to new area
   - After clearing: "Read README.md and then [your new instruction]"
   - This refreshes working context for better accuracy

4. **🐛 Use debug logging for errors**
   - Ask Bolt to add console.log() statements to relevant code
   - Open app in separate browser tab
   - Press `CTRL + SHIFT + I` (Windows) or `CMD + OPTION + J` (macOS)
   - Copy console logs and paste back to Bolt for investigation

5. **✂️ Break down large files (500+ lines)**
   - Request refactoring when files get too large
   - Prompt: "Please refactor [filename] by splitting it into multiple files. Add comments explaining the purpose of each new file. Keep the original file as a router so the app continues to function."
   - Smaller files = fewer editing errors

---

## 📌 PROJECT OVERVIEW

**Project Name:** SecureVote - Blockchain Voting Application  
**Version:** v2 (Production Ready)  
**Tech Stack:** React 18 + Vite, TypeScript, Wagmi v2, Viem, RainbowKit 2.2.10, Tailwind CSS, shadcn/ui, Supabase  
**Blockchain:** Ethereum Sepolia Testnet  
**Purpose:** Gasless credit-based weighted voting system for thesis project

**Current Status:**
- ✅ Smart contracts deployed on Sepolia
- ✅ Supabase database setup complete (9 tables, 3 views, 3 functions)
- ✅ Wagmi + RainbowKit configured
- ✅ Contract read hooks implemented (10 hooks)
- ✅ Supabase query hooks implemented (4 hooks)
- ✅ Basic UI pages created (7 routes)
- ⚠️ Write hooks needed (createRoom, addVoter, castVote, etc.)
- ⚠️ Gasless voting (EIP-2771) not implemented yet

---

## 🎯 CORE FUNCTIONALITY REQUIREMENTS

### **System Architecture**

This is a **multi-room voting platform** with 3 user roles:

1. **Platform Creator** (Factory Owner) - Controls RoomFactory contract
2. **Room Admin** - Creates and manages individual voting rooms
3. **Voter** - Participates in voting with weighted credits

### **Key Features**

✅ **Gasless Voting** - Voters pay 0 gas fees (relayer covers costs)  
✅ **Credit Pooling System** - Removed voter credits are recycled, not destroyed  
✅ **Batch Operations** - Upload 400+ voters/candidates via Excel in 1 transaction  
✅ **Real-Time Updates** - Live vote counting via Supabase subscriptions  
✅ **Multi-Round Support** - Same room can run multiple voting rounds  
✅ **State Machine** - 4 states: Inactive → Active → Ended → Closed  
✅ **Historical Data** - All rounds and transactions preserved on-chain + database

---

## 📁 PROJECT STRUCTURE & FILES

### **Important:** All file paths are relative to repository root: 
`c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\`

### **Frontend Source Code**

**Location:** `lovable_ai/vote-free-main/vote-free-main/src/`

```
src/
├── components/
│   ├── landing/          # Landing page components
│   │   ├── Navbar.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   └── Footer.tsx
│   ├── dashboard/        # Dashboard sidebar & header
│   └── ui/              # shadcn/ui components
├── config/
│   ├── wagmi.ts         # Wagmi + RainbowKit config
│   ├── contracts.ts     # Contract addresses
│   ├── abis.ts          # Contract ABIs
│   └── supabase.ts      # Supabase client
├── hooks/               # Custom React hooks
│   ├── useIsFactoryOwner.ts
│   ├── useRoomData.ts
│   ├── useFactorySettings.ts
│   ├── useVaultData.ts
│   ├── useRooms.ts      # Supabase query
│   ├── useLiveVoteTally.ts
│   └── ...
├── pages/
│   ├── Index.tsx        # Landing page
│   ├── CreatorDashboard.tsx
│   ├── RoomAdmin.tsx
│   ├── VoterDashboard.tsx
│   ├── RoomExplorer.tsx
│   ├── RoomDetails.tsx
│   └── CreateRoom.tsx
├── contracts/           # ABI JSON files
│   ├── MinimalForwarder.json
│   ├── SponsorVault.json
│   ├── VotingRoom.json
│   └── RoomFactory.json
├── App.tsx             # Main routing
├── main.tsx            # Entry point with providers
└── index.css           # Global styles
```

### **Smart Contracts (Already Deployed)**

**Location:** `contracts/v2/`

```
MinimalForwarder.sol  - ERC-2771 trusted forwarder for gasless transactions
SponsorVault.sol      - Escrow holding ETH deposits, pays relayers
VotingRoom.sol        - Core voting logic with credit pooling (EIP-1167 clone)
RoomFactory.sol       - Factory for creating voting room clones
```

### **Contract Addresses (Sepolia Testnet)**

**Location:** `addresses/2_productionReady.txt`

```
MinimalForwarder: 0xdE41F486df655AdA306166a601166DDA5e69e241
SponsorVault:     0x04d1BB5E8565DF62743212B39F3586d5A9965b67
VotingRoom:       0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF (implementation)
RoomFactory:      0x35404f230901488BFE187d7edCF31287396E6842

Platform Creator: 0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97 (for testing)
```

**Key Configuration:**
- Registration Fee: 0.01 ETH (to create a room)
- Overhead: 10% (1000 bps)
- Platform Fee: 5% (500 bps)

### **ABIs**

**Location:** `lovable_ai/vote-free-main/vote-free-main/src/contracts/`

```
MinimalForwarder.json
SponsorVault.json
VotingRoom.json
RoomFactory.json
```

**Usage:** Already imported in `src/config/abis.ts`

### **RPC Provider**

**Location:** `.env.local` (already configured)

```
Network: Ethereum Sepolia Testnet
RPC URL: https://eth-sepolia.g.alchemy.com/v2/bzeNYEyzUnid7G8Yu0C35
Chain ID: 11155111
API Key: bzeNYEyzUnid7G8Yu0C35
```

### **Database (Supabase - Already Setup)**

**Location:** `database/SUPABASE_SCHEMA.sql` (already executed)
```

**Tables Created (9 tables):**
- `rooms` - Voting room data + credit pools
- `voters` - Voter registry with credits
- `candidates` - Candidate list
- `votes` - All votes cast (immutable record)
- `rounds` - Round history with winners
- `transactions` - All blockchain transactions
- `credit_history` - Credit audit trail
- `pool_snapshots` - Pool analytics over time
- `admin_actions` - Admin operation audit log

**Views (3 virtual tables):**
- `v_room_status` - Room dashboard with metrics
- `v_live_vote_tally` - Real-time vote counting
- `v_voter_participation` - Turnout statistics

**Schema:** `/database/SUPABASE_SCHEMA.sql` (850+ lines, already executed)

### **Documentation**

**Location:** `/manuals/v2/`

**Key Documents:**
- `VOTING_ROOM_LIFECYCLE.md` - Complete state machine guide
- `CREDIT_POOLING_SYSTEM.md` - Credit recycling logic
- `V1_VS_V2_CHANGES.md` - What's new in v2
- `FINAL_AUDIT_REPORT.md` - Security audit results
- `OFF_CHAIN_INDEXING_GUIDE.md` - Supabase integration guide

### **Excel Templates**

**Location:** `/templates/`

```
voters-template.csv      - Columns: Address, Credit
candidates-template.csv  - Columns: ID, Name
```

---

## 🏗️ UI/UX REQUIREMENTS

### **Design System**

**Colors:**
- Primary: Blue (#3B82F6) - Trust, blockchain theme
- Secondary: Purple (#8B5CF6) - Voting, decision
- Success: Green (#10B981) - Confirmed actions
- Warning: Yellow (#F59E0B) - Pending states
- Error: Red (#EF4444) - Errors, rejections
- Neutral: Gray (#6B7280) - Text, backgrounds

**Layout:**
- Sidebar navigation (persistent)
- Top bar with wallet connection
- Main content area (responsive)
- Toast notifications for feedback

**Typography:**
- Headings: Inter Bold
- Body: Inter Regular
- Code/Addresses: JetBrains Mono

---

## 📱 PAGE STRUCTURE

### **1. Landing Page** `/`

**Purpose:** Public homepage explaining the platform

**Sections:**
- Hero section with "Connect Wallet" CTA
- Features overview (gasless voting, credit pooling, Excel upload)
- How it works (3 steps: Connect → Create/Join → Vote)
- Statistics (total rooms, total votes, active users)
- Footer with links

**No Authentication Required**

---

### **2. Platform Creator Dashboard** `/creator`

**Purpose:** Manage RoomFactory contract (only for contract owner)

**Access Control:**
```typescript
// Check if connected wallet = 0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97
if (address !== FACTORY_OWNER) {
  redirect('/') // Not authorized
}
```

**Tabs:**

#### **Tab 1: Factory Settings**
- View current registration fee (0.01 ETH)
- Update registration fee (input + button)
- View platform fee (5%)
- View overhead (10%)
- Update fees (with confirmation modal)
- Transaction history

#### **Tab 2: All Rooms**
- Table showing ALL rooms created via factory:
  - Room Address (clickable link)
  - Room Name
  - Admin Address
  - State (Inactive/Active/Ended/Closed)
  - Current Round
  - Total Voters
  - Total Candidates
  - Created At
  - Actions: View Details
- Pagination (20 per page)
- Search by room name/address
- Filter by state

#### **Tab 3: Vault Management**
- View total ETH deposited in SponsorVault
- View platform fees collected
- Withdraw platform fees (owner only)
- Transaction log

#### **Tab 4: Analytics**
- Total rooms created (chart over time)
- Total ETH collected (registration fees)
- Active rooms count
- Total votes cast across all rooms
- Credit pool efficiency (reuse percentage)

**Functions Available:**
```solidity
// RoomFactory (owner only)
setRegistrationFee(uint256 newFee)

// SponsorVault (owner only)
updatePlatformFee(uint256 newFeeBps)
updateOverhead(uint256 newOverheadBps)
collectPlatformFees(uint256 amount)
```

**Important:** This dashboard should be HIDDEN for non-owner addresses

---

### **3. Room Admin Dashboard** `/admin/[roomAddress]`

**Purpose:** Manage a specific voting room

**Access Control:**
```typescript
// Check if connected wallet = room.roomAdmin
const room = await readContract({ address: roomAddress, abi: VotingRoomABI, functionName: 'roomAdmin' })
if (address !== room) {
  redirect('/') // Not authorized
}
```

**State-Aware UI:** Show different panels based on room state

#### **State: Inactive** (Setup Phase)

**Header:**
- Room name
- Room address (copy button)
- Current state badge
- Current round number
- Admin address (you)

**Sidebar Navigation:**
- Dashboard (overview)
- Voters Management
- Candidates Management
- Credit Pool
- Settings
- Vault & Gas Budget

**Tab 1: Dashboard**
- Quick stats cards:
  - Total Voters: 24
  - Total Candidates: 5
  - Credits in Pool: 1,200
  - Vault Balance: 0.5 ETH
- State machine diagram (visual)
- Next action button: "Start Voting →" (large, prominent)

**Tab 2: Voters Management**

**Sub-section A: Add Voters**
- **Manual Add:**
  - Input: Wallet Address
  - Input: Credit Amount
  - Button: "Add Voter"
- **Batch Add (Excel Upload):**
  - Button: "Download Voters Template" (downloads voters-template.csv)
  - File upload area (drag & drop or click)
  - Preview table showing parsed data
  - Validation errors (invalid address, duplicate, etc.)
  - Button: "Upload [X] Voters" (shows count)
  - Progress bar during upload
  - Note: "Max 400 voters per batch. File will auto-split if needed."

**Sub-section B: Voter List**
- Table with columns:
  - Wallet Address (truncated with copy button)
  - Credit Balance
  - Last Voted Round
  - Status (Eligible/Not Eligible)
  - Actions: Edit Credit | Remove
- Pagination
- Search by address
- Filter: All / With Credits / No Credits
- Bulk actions: Select multiple → Remove | Grant Credits

**Functions:**
```solidity
addVoter(address voter)
removeVoter(address voter)
grantCredit(address voter, uint256 amount) // SET behavior, not ADD
batchAddVoters(address[] voters)
batchAddVotersWithCredits(address[] voters, uint256[] credits)
batchGrantCredits(address[] voters, uint256[] amounts)
batchRemoveVoters(address[] voters)
```

**Tab 3: Candidates Management**

**Sub-section A: Add Candidates**
- **Manual Add:**
  - Input: Candidate ID (integer)
  - Input: Candidate Name
  - Button: "Add Candidate"
- **Batch Add (Excel Upload):**
  - Button: "Download Candidates Template"
  - File upload area
  - Preview table
  - Button: "Upload [X] Candidates"

**Sub-section B: Candidate List**
- Table with columns:
  - ID
  - Name
  - Version (registry version)
  - Status (Active/Removed)
  - Actions: Edit Name | Remove
- Search by name/ID
- Bulk actions: Select multiple → Remove

**Functions:**
```solidity
addCandidate(uint256 candidateId, string name)
removeCandidate(uint256 candidateId)
batchAddCandidates(uint256[] ids, string[] names)
batchRemoveCandidates(uint256[] ids)
```

**Tab 4: Credit Pool**

**Overview Cards:**
- **Total Credits in System:** 10,000
- **Available in Pool:** 1,200 (credits ready for reuse)
- **Currently Granted:** 8,800 (held by voters)
- **Total Used:** 3,200 (consumed in votes)

**Pool Utilization Chart:**
- Pie chart: Granted vs Pool vs Used
- Line chart: Pool size over time (from pool_snapshots table)

**Actions:**
- **Grant Credits Section:**
  - Select voter dropdown
  - Input: New credit amount (SET, not add!)
  - Button: "Set Credit"
  - Note: "Pool credits will be used first before creating new ones"
- **Burn Pool Credits:**
  - Input: Amount to burn
  - Button: "Burn Credits" (with confirmation)
  - Warning: "This permanently removes credits from the system"

**Functions:**
```solidity
getPoolStatus() returns (systemTotal, poolAvailable, currentlyGranted, totalUsed)
canPoolCover(uint256 amount) returns (bool)
calculateCreditAllocation(uint256 amount) returns (fromPool, newCredits)
burnPoolCredits(uint256 amount)
getCreditUtilization() returns (uint256 percentage)
```

**Tab 5: Settings**

- **Room Name:** (display only, cannot change)
- **Max Cost Per Vote:**
  - Current: 0.001 ETH
  - Input: New value (in ETH, auto-convert to wei)
  - Button: "Update Max Cost"
- **Voter Registry Version:** 1 (display only)
- **Candidate Registry Version:** 1 (display only)
- **Trusted Forwarder:** 0xdE41... (display only)
- **Sponsor Vault:** 0x04d1... (display only)

**Functions:**
```solidity
setMaxCostPerVote(uint256 newCost)
```

**Tab 6: Vault & Gas Budget**

- **Current Vault Balance:** 0.5 ETH
- **Estimated Votes Remaining:** ~500 votes (calculated)
- **Top Up Section:**
  - Input: Amount to deposit (ETH)
  - Button: "Deposit to Vault"
- **Withdraw Section:**
  - Input: Amount to withdraw (ETH)
  - Button: "Withdraw" (only when state != Active)
  - Note: "Cannot withdraw during active voting"

**Functions:**
```solidity
// SponsorVault
topup(address room) payable
roomBalance(address room) view returns (uint256)

// VotingRoom
withdrawDeposit(uint256 amount) // Only when not Active
```

**Action Button (Bottom Right, Floating):**
- **"Start Voting →"** (large, primary color)
- Confirmation modal:
  - "Are you sure you want to start voting?"
  - Shows checklist:
    - ✅ 24 voters added
    - ✅ 5 candidates added
    - ✅ 8,800 credits granted
    - ✅ Vault balance: 0.5 ETH
  - Button: "Confirm Start"

---

#### **State: Active** (Voting in Progress)

**Changed UI Elements:**

**Header:**
- State badge: "🟢 Active"
- Timer: "Voting ends in: --:--:--" (if endTime set) OR "Manual end"
- Voters who voted: 12/24 (50%)

**Tabs Disabled/Modified:**
- ❌ Voters Management: "Locked - Cannot modify during voting"
- ❌ Candidates Management: "Locked - Cannot modify during voting"
- ❌ Credit Pool: "Read-only during voting"
- ✅ Dashboard: Live updates enabled

**Tab 1: Dashboard (Live Mode)**

**Real-Time Vote Tally:**
- Table showing candidates with live vote counts:
  - Rank
  - Candidate Name
  - Total Votes (weighted)
  - Voter Count
  - Percentage Bar
  - 🏆 Leading indicator on #1
- Auto-refresh every 2 seconds (Supabase subscription)
- Chart: Vote progression over time

**Voter Participation:**
- Progress bar: 12/24 voted (50%)
- List of voters:
  - Address
  - Credit Balance
  - Status: ✅ Voted | ⏳ Pending
  - Voted At (timestamp)
- Filter: All / Voted / Not Voted

**Recent Votes Feed:**
- Real-time list of votes as they come in:
  - "0x742d... voted for Alice with 100 credits"
  - Timestamp
  - Transaction hash (link to Etherscan)

**Action Buttons:**
- **"Stop Voting"** - Pause voting temporarily
- **"End Voting →"** - Finalize voting and move to Ended state

**Functions:**
```solidity
// VotingRoom
stopVoting() // State: Active → Ended (pause)
endVoting()  // State: Active → Ended (finalize)

// Read-only queries
getVotes(uint256 round, uint256 candidateId) view returns (uint256)
getRoundSummary(uint256 round) view returns (RoundSummary)
```

**Real-Time Subscription (Supabase):**
```typescript
// Subscribe to new votes
supabase
  .channel('votes-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'votes',
    filter: `room_address=eq.${roomAddress}`
  }, (payload) => {
    // Update vote tally in UI
  })
  .subscribe()
```

---

#### **State: Ended** (Counting/Results)

**Changed UI Elements:**

**Header:**
- State badge: "🔴 Ended"
- Note: "Voting closed, ready to declare winner"

**Tab 1: Dashboard**

**Final Results:**
- Same vote tally table (no longer updating)
- **Winner Highlight:** Top candidate with 🏆 icon
- Total votes cast: 3,200 credits
- Participation rate: 50%

**Action Section:**
- **Select Winner:**
  - Dropdown: Choose candidate ID (auto-select top candidate)
  - Button: "Close Round & Declare Winner"
  - Confirmation modal with summary

**Tab 2: Round Summary (New Tab)**
- Round number
- Started at: Jan 20, 10:00 AM
- Ended at: Jan 20, 11:30 AM
- Duration: 1h 30m
- Winner: Alice (ID: 1)
- Winning votes: 1,200 credits
- Total votes: 3,200 credits
- Voter turnout: 12/24 (50%)

**Functions:**
```solidity
closeRound(uint256 winnerId) // State: Ended → Closed
```

**Important:** After closeRound(), winner name is saved as snapshot. Even if admin removes candidate later, historical data is preserved.

---

#### **State: Closed** (Round Complete)

**Changed UI Elements:**

**Header:**
- State badge: "⚫ Closed"
- Round complete message

**Tab 1: Dashboard**

**Round Results (Final):**
- Winner announced with celebration animation
- Complete statistics
- Download results as PDF/CSV

**Next Actions:**
- **Option A: "Prepare Next Round →"**
  - Keeps all voters and candidates
  - Preserves credit balances
  - Resets only totalCreditsUsed
  - Increments currentRound
- **Option B: "Reset Room →"**
  - Clears everything
  - Back to Round 0
  - Fresh start

**Functions:**
```solidity
prepareNextRound() // State: Closed → Inactive (keep setup)
resetRoom()        // State: Closed → Inactive (clear all)
```

---

### **4. Voter Dashboard** `/voter`

**Purpose:** View eligible rooms and cast votes

**Access:** Any connected wallet

**Layout:**

#### **Tab 1: My Rooms**

**Room List:**
- Cards showing rooms where user is eligible voter:
  - Room Name
  - Admin: 0x123...
  - State: Active/Inactive/Ended/Closed
  - Round: 3
  - My Credit Balance: 100
  - Last Voted: Round 2
  - Button: "View Room"

**Filters:**
- All Rooms
- Active (can vote now)
- Participated (voted before)
- Pending (not voted yet)

**Empty State:**
- "You are not registered as a voter in any room"
- "Contact room admins to get added"

#### **Tab 2: Vote** (Room Details)

**When user clicks "View Room" on an Active room:**

**Header:**
- Room Name
- State: Active
- Round: 3
- My Credits: 100
- Voting ends: [Timer or "Manual"]

**Voting Interface:**

**If user hasn't voted this round:**
- List of candidates as cards:
  - Candidate Name
  - Current Votes: 450 (live count)
  - Radio button to select
- User's credit balance shown: "You have 100 credits to vote"
- Selected candidate highlighted
- **Button: "Cast Vote (Use All 100 Credits)"**
  - Large, primary
  - Confirmation modal:
    - "Confirm your vote?"
    - Candidate: Alice
    - Weight: 100 credits
    - Note: "This action cannot be undone"
    - Button: "Confirm Vote"

**After vote cast:**
- Success animation
- "Vote recorded!"
- Show transaction hash
- Show updated vote tally
- "Thank you for voting" message
- Disable voting interface

**If user already voted:**
- "✅ You voted in this round"
- Show:
  - Voted for: Alice
  - Weight: 100 credits
  - Voted at: Jan 20, 10:15 AM
  - Transaction: 0xabc... (link to Etherscan)
- Show live vote tally (read-only)

**If user has 0 credits:**
- "❌ You have no voting credits"
- "Contact room admin to receive credits"

**If room state is not Active:**
- "Voting is not currently active"
- Show current state and expected actions

**Functions:**
```solidity
vote(uint256 candidateId) // Gasless via MinimalForwarder
getVoterCredit(address voter) view returns (uint256)
isVoterEligible(address voter) view returns (bool)
isCandidateValid(uint256 candidateId) view returns (bool)
```

**Gasless Implementation:**
```typescript
// User signs meta-transaction (no gas)
const signature = await signTypedData({ ... })

// Relayer (your backend) submits on-chain
await relayer.execute({
  from: voterAddress,
  to: roomAddress,
  data: encodeFunctionData({ functionName: 'vote', args: [candidateId] }),
  signature
})
```

#### **Tab 3: History**

**Voting History:**
- Table showing all votes user has cast:
  - Room Name
  - Round
  - Candidate Voted For
  - Weight Used
  - Voted At
  - Transaction Hash
  - Status: Confirmed
- Pagination
- Filter by room

---

### **5. Room Explorer** `/explore`

**Purpose:** Public page showing all rooms

**Access:** No wallet required

**Layout:**

**Room Cards Grid:**
- Cards showing all rooms:
  - Room Name
  - Admin: 0x123...
  - State: Active/Inactive/etc.
  - Current Round
  - Total Votes This Round
  - Total Voters
  - Created: 2 days ago
  - Button: "View Details"

**Filters:**
- All States
- Active Only
- By Admin Address
- Search by name

**Sorting:**
- Newest First
- Most Active
- Most Voters

**Room Details Page:** `/explore/[roomAddress]`

**Public View (No Authentication):**
- Room information
- Current state
- Vote tally (if Active or Ended)
- Round history
- Statistics

**Note:** Cannot vote from here, must go to Voter Dashboard

---

## 🔌 TECHNICAL IMPLEMENTATION

### **Wallet Connection**

**Library:** RainbowKit + Wagmi v2

```typescript
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/bzeNYEyzUnid7G8Yu0C35')
  }
})
```

**Connect Button:** Should be in top-right corner of every page

---

### **Contract Interactions**

**Read Operations (No Gas):**

```typescript
import { useReadContract } from 'wagmi'

const { data: roomAdmin } = useReadContract({
  address: roomAddress,
  abi: VotingRoomABI,
  functionName: 'roomAdmin'
})

const { data: voterCredit } = useReadContract({
  address: roomAddress,
  abi: VotingRoomABI,
  functionName: 'getVoterCredit',
  args: [voterAddress]
})

const { data: poolStatus } = useReadContract({
  address: roomAddress,
  abi: VotingRoomABI,
  functionName: 'getPoolStatus'
})
// Returns: [systemTotal, poolAvailable, currentlyGranted, totalUsed]
```

**Write Operations (Requires Gas):**

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

const { data: hash, writeContract } = useWriteContract()

// Grant credit to voter
await writeContract({
  address: roomAddress,
  abi: VotingRoomABI,
  functionName: 'grantCredit',
  args: [voterAddress, 100n]
})

// Wait for confirmation
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })
```

**Batch Operations (Excel Upload):**

```typescript
// Parse CSV file
const parseCSV = (file: File) => {
  // Use Papa Parse or similar
  return { voters: address[], credits: uint256[] }
}

// Chunk if > 400 items
const chunkArray = (arr, size = 400) => { ... }

// Upload each chunk
for (const chunk of chunks) {
  await writeContract({
    address: roomAddress,
    abi: VotingRoomABI,
    functionName: 'batchAddVotersWithCredits',
    args: [chunk.voters, chunk.credits]
  })
  // Wait for confirmation before next chunk
}
```

**Gasless Voting (Meta-Transaction):**

```typescript
// 1. User signs typed data (EIP-712)
const signature = await signTypedData({
  domain: {
    name: 'MinimalForwarder',
    version: '1',
    chainId: 11155111,
    verifyingContract: '0xdE41F486df655AdA306166a601166DDA5e69e241'
  },
  types: {
    ForwardRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'gas', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ]
  },
  primaryType: 'ForwardRequest',
  message: {
    from: voterAddress,
    to: roomAddress,
    value: 0,
    gas: 1000000,
    nonce: await getNonce(voterAddress),
    data: encodeFunctionData({
      abi: VotingRoomABI,
      functionName: 'vote',
      args: [candidateId]
    })
  }
})

// 2. Send to relayer (your backend API)
const response = await fetch('/api/relay', {
  method: 'POST',
  body: JSON.stringify({ request, signature })
})

// 3. Relayer executes on-chain
// Backend code (Next.js API route):
const tx = await walletClient.writeContract({
  address: FORWARDER_ADDRESS,
  abi: MinimalForwarderABI,
  functionName: 'execute',
  args: [request, signature]
})
```

---

### **Supabase Integration**

**Client Setup:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Read Data:**

```typescript
// Get room status with metrics
const { data: room } = await supabase
  .from('v_room_status')
  .select('*')
  .eq('room_address', roomAddress)
  .single()

// Get live vote tally
const { data: tally } = await supabase
  .from('v_live_vote_tally')
  .select('*')
  .eq('room_address', roomAddress)
  .eq('round_number', currentRound)
  .order('rank', { ascending: true })

// Get voter participation
const { data: participation } = await supabase
  .from('v_voter_participation')
  .select('*')
  .eq('room_address', roomAddress)
  .single()
```

**Real-Time Subscriptions:**

```typescript
// Subscribe to new votes
useEffect(() => {
  const subscription = supabase
    .channel('votes-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `room_address=eq.${roomAddress}`
      },
      (payload) => {
        console.log('New vote:', payload.new)
        // Update vote tally state
        setVotes(prev => [...prev, payload.new])
      }
    )
    .subscribe()

  return () => subscription.unsubscribe()
}, [roomAddress])
```

**Write Data (Indexing):**

```typescript
// After transaction confirmed on-chain, index to database
const { error } = await supabase
  .from('votes')
  .insert({
    room_address: roomAddress,
    round_number: currentRound,
    voter_address: voterAddress,
    candidate_id: candidateId,
    vote_weight: weight,
    action_id: actionId,
    tx_hash: hash,
    block_number: receipt.blockNumber
  })
```

---

### **Excel Upload Flow**

**1. Download Template:**

```typescript
const downloadTemplate = (type: 'voters' | 'candidates') => {
  const csv = type === 'voters' 
    ? 'Address,Credit\n0x742d35Cc6634C0532925a3b844Bc454e4438f44e,100\n...'
    : 'ID,Name\n1,John Doe\n2,Jane Smith\n...'
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}-template.csv`
  a.click()
}
```

**2. Parse Uploaded File:**

```typescript
import Papa from 'papaparse'

const handleFileUpload = (file: File) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      // results.data = [{ Address: '0x...', Credit: '100' }, ...]
      validateData(results.data)
      setPreviewData(results.data)
    }
  })
}
```

**3. Validate Data:**

```typescript
const validateVoters = (data: any[]) => {
  const errors = []
  
  data.forEach((row, index) => {
    // Check address format
    if (!isAddress(row.Address)) {
      errors.push(`Row ${index + 1}: Invalid address`)
    }
    
    // Check credit is positive integer
    if (isNaN(row.Credit) || row.Credit <= 0) {
      errors.push(`Row ${index + 1}: Invalid credit amount`)
    }
  })
  
  return errors
}
```

**4. Upload to Contract:**

```typescript
const uploadVoters = async () => {
  const chunks = chunkArray(data, 400)
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    setProgress({ current: i + 1, total: chunks.length })
    
    const voters = chunk.map(r => r.Address)
    const credits = chunk.map(r => BigInt(r.Credit))
    
    const hash = await writeContract({
      address: roomAddress,
      abi: VotingRoomABI,
      functionName: 'batchAddVotersWithCredits',
      args: [voters, credits]
    })
    
    // Wait for confirmation
    await waitForTransactionReceipt({ hash })
  }
  
  toast.success('All voters uploaded successfully!')
}
```

---

### **State Machine Implementation**

**Get Current State:**

```typescript
const { data: state } = useReadContract({
  address: roomAddress,
  abi: VotingRoomABI,
  functionName: 'state'
})

// state = 0 (Inactive) | 1 (Active) | 2 (Ended) | 3 (Closed)

const STATE_NAMES = ['Inactive', 'Active', 'Ended', 'Closed']
```

**Conditional Rendering:**

```typescript
{state === 0 && <InactiveView />}  // Setup phase
{state === 1 && <ActiveView />}     // Voting phase
{state === 2 && <EndedView />}      // Results phase
{state === 3 && <ClosedView />}     // Complete phase
```

**State Transitions:**

```typescript
// Start voting (Inactive → Active)
const startVoting = async () => {
  await writeContract({
    address: roomAddress,
    abi: VotingRoomABI,
    functionName: 'startVoting'
  })
}

// End voting (Active → Ended)
const endVoting = async () => {
  await writeContract({
    address: roomAddress,
    abi: VotingRoomABI,
    functionName: 'endVoting'
  })
}

// Close round (Ended → Closed)
const closeRound = async (winnerId: number) => {
  await writeContract({
    address: roomAddress,
    abi: VotingRoomABI,
    functionName: 'closeRound',
    args: [BigInt(winnerId)]
  })
}

// Prepare next round (Closed → Inactive)
const prepareNextRound = async () => {
  await writeContract({
    address: roomAddress,
    abi: VotingRoomABI,
    functionName: 'prepareNextRound'
  })
}
```

---

## ⚠️ IMPORTANT CONSTRAINTS & RULES

### **1. Credit System Rules**

❌ **WRONG:** Adding credits
```typescript
// Don't do this
grantCredit(voter, currentCredit + 100) // ❌
```

✅ **CORRECT:** Setting credits (SET behavior)
```typescript
// Set absolute value
grantCredit(voter, 100) // ✅ Sets to 100, regardless of current
```

**Why:** `grantCredit()` uses SET behavior, not ADD. It handles pool allocation automatically.

---

### **2. Batch Limits**

**Max items per batch:** 400 (to prevent out-of-gas errors)

```typescript
// Auto-chunk large files
if (voters.length > 400) {
  const chunks = chunkArray(voters, 400)
  // Upload each chunk separately
}
```

---

### **3. State Restrictions**

**Cannot modify voters/candidates during Active state:**

```typescript
if (state === 1) { // Active
  return <div>Locked - Voting in progress</div>
}
```

**Cannot withdraw deposit during Active state:**

```typescript
if (state === 1) {
  disabled = true
  tooltip = "Cannot withdraw during active voting"
}
```

---

### **4. Access Control**

**Check ownership before showing admin panels:**

```typescript
const { data: roomAdmin } = useReadContract({ ... })
const { address } = useAccount()

if (address !== roomAdmin) {
  return <div>Not authorized</div>
}
```

**Platform creator dashboard only for factory owner:**

```typescript
const FACTORY_OWNER = '0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97'

if (address !== FACTORY_OWNER) {
  redirect('/')
}
```

---

### **5. Gasless Voting**

**Voters NEVER pay gas for voting:**

- User signs message (free)
- Relayer submits transaction
- Gas paid from room's vault balance

**Implementation:**
- Use EIP-712 typed data signing
- Backend relayer with wallet
- MinimalForwarder contract as proxy

---

### **6. Real-Time Updates**

**Enable for:**
- ✅ Vote counting (Active state)
- ✅ Voter participation stats
- ✅ Pool status changes

**Disable for:**
- ❌ Historical data (static)
- ❌ Inactive rooms

---

### **7. Address Display**

**Always truncate long addresses:**

```typescript
const truncate = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
// → 0x742d...f44e
```

**Add copy button** to all addresses

---

### **8. Transaction Feedback**

**Show status for every transaction:**

```typescript
// 1. Loading
toast.loading('Transaction pending...')

// 2. Success
toast.success('Transaction confirmed!')

// 3. Error
toast.error('Transaction failed: User rejected')
```

**Show transaction hash** with Etherscan link

---

### **9. Error Handling**

**Handle all possible errors:**

```typescript
try {
  await writeContract({ ... })
} catch (error) {
  if (error.code === 4001) {
    toast.error('User rejected transaction')
  } else if (error.message.includes('VoterNotEligible')) {
    toast.error('You are not eligible to vote')
  } else if (error.message.includes('AlreadyVotedThisRound')) {
    toast.error('You already voted in this round')
  } else {
    toast.error('Transaction failed')
  }
}
```

---

### **10. Data Consistency**

**After on-chain transaction, update database:**

```typescript
// 1. Write to contract
const hash = await writeContract({ ... })

// 2. Wait for confirmation
const receipt = await waitForTransactionReceipt({ hash })

// 3. Index to Supabase
await supabase.from('votes').insert({ ... })
```

**Use database as source of truth for UI** (faster than querying blockchain)

---

## 📊 ANALYTICS & METRICS

### **Platform Creator Dashboard**

**Charts to Display:**
1. Total Rooms Created Over Time (line chart)
2. ETH Collected (registration fees) (area chart)
3. Active vs Inactive Rooms (pie chart)
4. Total Votes Cast Across All Rooms (bar chart)
5. Credit Pool Efficiency (gauge: % reused vs new)

**Data Sources:**
- Supabase views and aggregation queries
- Real-time calculations from contract reads

---

### **Room Admin Dashboard**

**Charts to Display:**
1. Pool Utilization (pie: granted vs pool vs used)
2. Pool Size Over Time (line chart from pool_snapshots)
3. Credit Distribution (bar chart of voters by credit amount)
4. Vote Progression (line chart during Active state)
5. Participation Rate (gauge: % voted)

---

### **Voter Dashboard**

**Metrics to Display:**
- Total rooms participated: 5
- Total votes cast: 12
- Total credits used: 1,200
- Success rate: 75% (voted for winners)

---

## 🎨 UI/UX BEST PRACTICES

### **Loading States**

- Skeleton loaders for data fetching
- Spinner for transactions
- Progress bars for multi-step operations (Excel upload)

### **Empty States**

- Friendly messages with illustrations
- Call-to-action buttons
- Help text explaining next steps

### **Error States**

- Clear error messages
- Retry buttons
- Link to documentation

### **Success States**

- Celebration animations
- Confetti for important actions (voting, winning)
- Share buttons

### **Responsive Design**

- Mobile-first approach
- Sidebar collapses to hamburger menu on mobile
- Tables convert to cards on mobile
- Touch-friendly button sizes

### **Accessibility**

- ARIA labels
- Keyboard navigation
- Focus indicators
- Color contrast (WCAG AA)

---

## 🚨 CRITICAL DO's AND DON'Ts

### **✅ DO:**

1. **Validate all user inputs** (addresses, amounts, file uploads)
2. **Show transaction confirmations** with Etherscan links
3. **Use Supabase for read operations** (faster than blockchain)
4. **Implement real-time updates** for Active voting
5. **Chunk large batch operations** (max 400 items)
6. **Check access control** before showing admin panels
7. **Handle all error cases** with user-friendly messages
8. **Show loading states** during async operations
9. **Truncate addresses** with copy buttons
10. **Use typed contracts** (import ABIs as const)

### **❌ DON'T:**

1. **Don't expose private keys** anywhere in frontend
2. **Don't skip transaction confirmations** (always wait)
3. **Don't query blockchain for lists** (use Supabase views)
4. **Don't allow admin actions during Active state** (voting lockdown)
5. **Don't forget to update database** after contract writes
6. **Don't use ADD behavior** for credits (use SET via grantCredit)
7. **Don't hardcode contract addresses** (use env variables)
8. **Don't skip validation** on Excel uploads
9. **Don't show platform creator dashboard** to non-owners
10. **Don't forget gasless voting** implementation

---

## 📦 DELIVERABLES

### **Required Pages:**

1. ✅ Landing Page `/`
2. ✅ Platform Creator Dashboard `/creator`
3. ✅ Room Admin Dashboard `/admin/[roomAddress]`
4. ✅ Voter Dashboard `/voter`
5. ✅ Room Explorer `/explore`
6. ✅ Room Details `/explore/[roomAddress]`

### **Required Components:**

1. ✅ Wallet Connection (RainbowKit)
2. ✅ Navigation Bar
3. ✅ Sidebar (for admin dashboards)
4. ✅ Room State Badge
5. ✅ Vote Tally Table (with real-time)
6. ✅ Voter List Table
7. ✅ Candidate List Table
8. ✅ Excel Upload Modal
9. ✅ Transaction Confirmation Modal
10. ✅ Credit Pool Visualization
11. ✅ Analytics Charts
12. ✅ Toast Notifications

### **Required Hooks:**

1. ✅ `useRoomAdmin` - Check if user is admin
2. ✅ `useRoomState` - Get current state
3. ✅ `useVoterCredit` - Get voter's credit balance
4. ✅ `usePoolStatus` - Get pool metrics
5. ✅ `useLiveVotes` - Real-time vote subscription
6. ✅ `useFactoryOwner` - Check if user is factory owner

### **Required Utils:**

1. ✅ `truncateAddress(address)` - Format addresses
2. ✅ `parseCSV(file)` - Parse Excel uploads
3. ✅ `validateVoters(data)` - Validate voter data
4. ✅ `validateCandidates(data)` - Validate candidate data
5. ✅ `chunkArray(arr, size)` - Split large arrays
6. ✅ `formatEth(wei)` - Format ETH amounts
7. ✅ `getStateName(stateId)` - Convert state ID to name

---

## 🔧 ENVIRONMENT VARIABLES

Create `.env.local` file:

```env
# Blockchain
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/bzeNYEyzUnid7G8Yu0C35

# Contract Addresses
NEXT_PUBLIC_FORWARDER_ADDRESS=0xdE41F486df655AdA306166a601166DDA5e69e241
NEXT_PUBLIC_SPONSOR_VAULT_ADDRESS=0x04d1BB5E8565DF62743212B39F3586d5A9965b67
NEXT_PUBLIC_VOTING_ROOM_IMPLEMENTATION=0xc6e866069dc20c0ABAD2a74509Ac9aA928f2f0cF
NEXT_PUBLIC_ROOM_FACTORY_ADDRESS=0x35404f230901488BFE187d7edCF31287396E6842

# Platform
NEXT_PUBLIC_FACTORY_OWNER=0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Server-side only

# Relayer (for gasless voting)
RELAYER_PRIVATE_KEY=0x... # Backend only, never expose
```

---

## 📚 REFERENCE DOCUMENTATION

**Read these for detailed information:**

1. **Contract Lifecycle:** `manuals/v2/VOTING_ROOM_LIFECYCLE.md`
2. **Credit Pooling:** `manuals/v2/CREDIT_POOLING_SYSTEM.md`
3. **v1 vs v2 Changes:** `manuals/v2/V1_VS_V2_CHANGES.md`
4. **Security Audit:** `manuals/v2/FINAL_AUDIT_REPORT.md`
5. **Database Schema:** `database/SUPABASE_SCHEMA.sql`
6. **Setup Guide:** `database/SUPABASE_SETUP_GUIDE.md`
7. **Integration Progress:** `web3_progress/2_INTEGRATION_COMPLETE.md`
8. **UI Fixes:** `web3_progress/3_UI_FIXES_AND_WALLET_INTEGRATION.md`

---

## ⚡ WORKING WITH BOLT AI - TASK BREAKDOWN

### **IMPORTANT:** Break work into single-task prompts

❌ **DON'T DO THIS (too broad):**
> "Build the complete voting system with wallet connection, room creation, and voting functionality"

✅ **DO THIS (single-focused tasks):**

**Task 1:** "Add a 'Create Room' button to the CreatorDashboard header that navigates to /create-room"

**Task 2:** "Implement the createRoom transaction in CreateRoom.tsx using useWriteContract hook with RoomFactory ABI"

**Task 3:** "Add toast notification when room creation succeeds with room address and Etherscan link"

### **Recommended Task Sequence:**

#### **Phase 1: Write Hooks (Each task = 1 hook)**
1. Create `hooks/useCreateRoom.ts` - Hook for creating room transaction
2. Create `hooks/useAddVoter.ts` - Hook for adding single voter
3. Create `hooks/useBatchAddVoters.ts` - Hook for batch voter upload
4. Create `hooks/useAddCandidate.ts` - Hook for adding candidate
5. Create `hooks/useGrantCredit.ts` - Hook for granting credits
6. Create `hooks/useCastVote.ts` - Hook for voting transaction

#### **Phase 2: CreatorDashboard Features**
1. Add "Change Registration Fee" form with transaction
2. Add "Update Platform Fee" form with transaction
3. Add withdrawal functionality for vault
4. Connect real data to all stats cards

#### **Phase 3: RoomAdmin Features**
1. Add Excel upload component for voters
2. Implement batch voter addition with transaction
3. Add candidate management with add/remove
4. Add state transition buttons (Activate/End/Close)
5. Add credit pool management panel

#### **Phase 4: VoterDashboard Features**
1. Fetch and display eligible rooms from Supabase
2. Implement voting interface with credit allocation
3. Add vote history table
4. Add real-time vote tally updates

#### **Phase 5: Gasless Voting (Advanced)**
1. Setup EIP-712 typed data signing
2. Create backend relayer API route
3. Integrate meta-transaction submission
4. Add loading states for gasless flow

### **After Each Task:**
- Test in browser
- Check console for errors
- If errors occur, use debug logging (ask Bolt to add console.log)
- Use `/clear` command before starting next major phase

---

## 🛠️ DEBUGGING WITH BOLT AI

When you encounter errors:

1. **Ask Bolt to add debug logging:**
   ```
   "Add console.log statements to track the createRoom transaction flow. 
   Log the input parameters, contract address, and transaction hash."
   ```

2. **Open browser console:**
   - Press `CTRL + SHIFT + I` (Windows) or `CMD + OPTION + J` (macOS)
   - Reproduce the error
   - Copy all console output

3. **Provide logs to Bolt:**
   ```
   "The createRoom transaction failed. Here are the console logs:
   [paste full console output]
   
   Please investigate and fix the issue."
   ```

4. **Check Wagmi hooks:**
   - Look for `error` object in hook returns
   - Check `isLoading`, `isSuccess`, `isError` states
   - Verify contract address and ABI are correct

---

## ✅ VALIDATION CHECKLIST

Before considering the project complete:

### **Functionality:**
- [ ] Wallet connection works (RainbowKit)
- [ ] Factory owner sees CreatorDashboard (auto-redirect from landing)
- [ ] Regular wallet sees VoterDashboard (auto-redirect)
- [ ] Create room works with 0.01 ETH payment
- [ ] Excel upload works for voters/candidates (400+ items)
- [ ] Credit pooling system displays correctly
- [ ] Voting transaction works (with gas initially, gasless later)
- [ ] Real-time vote updates work (Supabase subscriptions)
- [ ] State transitions work (Activate → End → Close)
- [ ] Multi-round support works
- [ ] Historical data preserved in Supabase

### **UI/UX:**
- [ ] All pages responsive (mobile + desktop)
- [ ] Loading states for all transactions (spinners)
- [ ] Error handling with user-friendly messages
- [ ] Success confirmations with toast notifications
- [ ] Addresses truncated with copy buttons (0x1234...5678)
- [ ] Transaction links to Sepolia Etherscan
- [ ] Charts display correctly (if implemented)
- [ ] Empty states have helpful messages

### **Security:**
- [ ] Access control enforced (useIsFactoryOwner, useIsRoomAdmin)
- [ ] No private keys in frontend code
- [ ] Transaction confirmations required (user must sign)
- [ ] Input validation on all forms
- [ ] Error boundaries catch React errors

### **Performance:**
- [ ] Supabase used for listing rooms (not blockchain iteration)
- [ ] Real-time subscriptions working efficiently
- [ ] Large voter lists paginated or virtualized
- [ ] Code split by route (lazy loading)

---

## 🎯 SUCCESS CRITERIA

The project is complete when:

1. ✅ **Platform Creator** can:
   - Auto-redirect to `/creator` after wallet connection
   - View all rooms in table with real data
   - See live vault balance from SponsorVault contract
   - Change registration fee (transaction)
   - Collect platform fees (transaction)

2. ✅ **Room Admin** can:
   - Create rooms (pay 0.01 ETH, get room address)
   - Navigate to `/admin/:roomAddress` to manage room
   - Upload 400+ voters via Excel → batch transaction
   - Add/remove voters individually
   - Grant/revoke credits with pool recalculation
   - See pool metrics (total, available, used)
   - Change room state (buttons: Activate, End, Close)
   - Withdraw vault balance

3. ✅ **Voter** can:
   - Auto-redirect to `/voter` after wallet connection
   - See list of rooms where eligible (voterCredit > 0)
   - Click room to see voting interface
   - Allocate credits to candidates (quadratic cost: k^2)
   - Submit vote transaction (initially with gas, later gasless)
   - See confirmation with tx hash → Etherscan link
   - View voting history

4. ✅ **Public** can:
   - Browse `/explore` to see all rooms
   - Click room to see `/explore/:roomAddress` details
   - View live vote tally (real-time updates)
   - See room state and round info

5. ✅ **System**:
   - Credit pooling works (removed credits → available pool)
   - Real-time updates via Supabase subscriptions
   - Multi-round support (can restart voting after ending)
   - Data consistency (events indexed to Supabase)
   - Mobile responsive
   - Error handling robust

---

## 🚀 DEPLOYMENT NOTES

1. **Frontend:** Deploy to Vercel / Netlify
2. **Database:** Already on Supabase (production-ready)
3. **Contracts:** Already deployed to Sepolia testnet
4. **Relayer (Future):** Deploy backend API for gasless transactions

**ENV variables:**
- Already in `.env.local` for local development
- Must be set in hosting platform dashboard for production

---

## 💬 WORKING WITH BOLT AI - REMEMBER

### **Before Each Task:**
1. Use `/clear` if switching to new feature area
2. Ask Bolt to read this instruction file (or README.md)
3. Give ONE specific task at a time

### **Example Good Prompts:**

✅ "Add a submit button to CreateRoom.tsx that calls the createRoom function from RoomFactory contract. Show loading spinner while transaction pending."

✅ "Create a new hook `hooks/useVoterRooms.ts` that queries Supabase voters table for rooms where voter_address matches connected wallet and voter_credit > 0"

✅ "In RoomExplorer.tsx, add a filter dropdown for room state (All, Active, Inactive, Ended, Closed) that updates the useRooms hook query"

✅ "Add error boundary to App.tsx that catches React errors and shows friendly error message instead of white screen"

### **If File Gets Too Large (500+ lines):**

Ask Bolt:
> "Please refactor CreatorDashboard.tsx by splitting it into multiple files:
> - CreatorDashboard.tsx (main router)
> - components/creator/FactorySettings.tsx (factory settings tab)
> - components/creator/RoomsList.tsx (rooms table tab)
> - components/creator/VaultManagement.tsx (vault tab)
> 
> Add comments explaining each file's purpose. Keep the original file as router."

---

**Status:** Ready for Bolt AI implementation 🚀  
**Version:** v2.0 (Updated for Bolt AI)  
**Last Updated:** January 20, 2026
