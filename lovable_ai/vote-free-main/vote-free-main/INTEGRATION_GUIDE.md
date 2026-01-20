# 🔧 Frontend Integration Guide

## 📋 What's Been Set Up

### ✅ Configuration (Complete)
- RainbowKit + Wagmi + Viem (Web3)
- Supabase client (Database)
- Contract addresses + ABIs
- Environment variables

### ✅ Custom Hooks Created
- `useContracts.ts` - Read blockchain data
- `useSupabase.ts` - Query Supabase database

### ✅ Components Updated
- `DashboardHeader.tsx` - Now uses RainbowKit ConnectButton
- `MyRoomsReal.tsx` - Fetches real data from Supabase

---

## 🚀 Next Steps to Complete Integration

### Step 1: Replace Dummy Data

**Current state:**
- `MyRooms.tsx` = Uses mock data ❌
- `MyRoomsReal.tsx` = Uses real Supabase data ✅

**Action needed:**
```bash
# Rename files
mv src/components/dashboard/MyRooms.tsx src/components/dashboard/MyRooms.backup.tsx
mv src/components/dashboard/MyRoomsReal.tsx src/components/dashboard/MyRooms.tsx
```

Or manually:
1. Backup current `MyRooms.tsx` → `MyRooms.backup.tsx`
2. Copy content from `MyRoomsReal.tsx` → `MyRooms.tsx`

---

### Step 2: Test Wallet Connection

**Open:** http://localhost:8080/

**Expected:**
1. See RainbowKit "Connect Wallet" button (top right)
2. Click → Beautiful modal appears
3. Select MetaMask
4. Approve connection
5. Button shows: [Sepolia icon] [0x1234...5678] [0.245 ETH]

**If not working:**
- Check browser console (F12)
- Verify `.env` has all values
- Restart dev server

---

### Step 3: Create First Room (Test Blockchain Write)

**Since database is empty, let's create room via smart contract:**

#### Option A: Via Remix (Easiest for testing)
1. Open Remix with RoomFactory deployed
2. Call `createRoom("Test Room 1")` with 0.01 ETH
3. Wait for transaction
4. Refresh frontend → Should show "No rooms yet" (because Supabase is empty)

#### Option B: Build Create Room Page
Create `src/pages/CreateRoom.tsx`:

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ABIS } from '@/config/abis';
import { parseEther } from 'viem';
import { useState } from 'react';

export function CreateRoomPage() {
  const [roomName, setRoomName] = useState('');
  const { writeContract, data: hash } = useWriteContract();
  
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ 
    hash 
  });

  const handleCreate = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.RoomFactory,
      abi: ABIS.RoomFactory,
      functionName: 'createRoom',
      args: [roomName],
      value: parseEther('0.01'), // Registration fee
    });
  };

  return (
    <div>
      <input 
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Room name"
      />
      <button onClick={handleCreate} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Room'}
      </button>
      {isSuccess && <p>Room created! TX: {hash}</p>}
    </div>
  );
}
```

---

### Step 4: Sync Blockchain → Supabase

**Problem:** Room created on blockchain, but Supabase is empty.

**Solution:** Need indexer/listener to sync events.

#### Quick Manual Sync (For Testing)
After creating room via Remix:

```sql
-- In Supabase SQL Editor
INSERT INTO rooms (
  room_address,
  room_name,
  room_admin,
  sponsor_vault,
  trusted_forwarder,
  state,
  current_round
) VALUES (
  '0x...',  -- Room clone address from Remix
  'Test Room 1',
  '0x04A3baCFd9D57E2fA661064c03C1c1774A8cEb97',  -- Your wallet
  '0x04d1BB5E8565DF62743212B39F3586d5A9965b67',  -- SponsorVault
  '0xdE41F486df655AdA306166a601166DDA5e69e241',  -- MinimalForwarder
  'Inactive',
  0
);
```

Now refresh frontend → Should show 1 room!

#### Automated Sync (Production)
Build event listener:

```typescript
// src/services/eventListener.ts
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ABIS } from '@/config/abis';
import { supabase } from '@/config/supabase';

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

// Listen to RoomRegistered events
const unwatch = client.watchContractEvent({
  address: CONTRACT_ADDRESSES.RoomFactory,
  abi: ABIS.RoomFactory,
  eventName: 'RoomRegistered',
  onLogs: async (logs) => {
    for (const log of logs) {
      const { room, admin, name } = log.args;
      
      // Insert into Supabase
      await supabase.from('rooms').insert({
        room_address: room.toLowerCase(),
        room_name: name,
        room_admin: admin.toLowerCase(),
        sponsor_vault: CONTRACT_ADDRESSES.SponsorVault.toLowerCase(),
        trusted_forwarder: CONTRACT_ADDRESSES.MinimalForwarder.toLowerCase(),
        state: 'Inactive',
        current_round: 0,
      });
      
      console.log('✅ Room synced to Supabase:', room);
    }
  },
});
```

**Where to run this:**
- Option A: In frontend (runs only when app is open)
- Option B: Separate backend service (always running) ← Recommended

---

### Step 5: Implement Create Room UI

**File:** `src/components/dashboard/CreateRoom.tsx`

**Features needed:**
1. Form: Room name input
2. ETH amount selector (default 0.01 ETH)
3. Transaction status modal
4. Success/error handling
5. Redirect to room detail after creation

**Steps:**
1. User fills form
2. Click "Create Room"
3. `writeContract()` called
4. MetaMask prompts signature
5. Wait for transaction
6. Show success + room address
7. Event listener catches RoomRegistered
8. Auto-insert to Supabase
9. Frontend refetches rooms
10. New room appears in dashboard ✅

---

### Step 6: Build Other Features

**Priority order:**

1. **Excel Upload** ⏳
   - Download template (voters.csv, candidates.csv)
   - Parse uploaded file
   - Validate data
   - Batch upload to contract (400-500 items)

2. **Room Detail Page** ⏳
   - Show room info
   - Tabs: Voters | Candidates | Votes | Analytics
   - Start/Stop voting buttons
   - Real-time vote feed

3. **Voting Page** ⏳
   - Display candidates (card grid)
   - Vote button
   - Gasless meta-transaction
   - Success animation

4. **Results Page** ⏳
   - Leaderboard
   - Charts
   - Export PDF/CSV

---

## 🔍 Current Status

```
✅ Setup Complete:
- Smart contracts deployed
- Database configured
- Frontend running
- Wallet connection working

⏳ In Progress:
- Replace mock data with real data
- Test blockchain writes
- Build event listener
- Create room functionality

⏳ To Do:
- Excel upload
- Voting flow
- Results page
- Relayer backend
```

---

## 📂 File Structure

```
src/
├── config/
│   ├── wagmi.ts          ✅ RainbowKit config
│   ├── contracts.ts      ✅ Contract addresses
│   ├── abis.ts           ✅ ABI exports
│   └── supabase.ts       ✅ Supabase client
├── hooks/
│   ├── useContracts.ts   ✅ Blockchain read hooks
│   └── useSupabase.ts    ✅ Database query hooks
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx  ✅ RainbowKit integrated
│   │   ├── MyRooms.tsx          ❌ Still uses mock data
│   │   └── MyRoomsReal.tsx      ✅ Uses real data
│   └── ui/              ✅ Lovable AI components
└── pages/
    ├── Dashboard.tsx    ✅ Main dashboard
    └── CreateRoom.tsx   ⏳ To be built
```

---

## 🧪 Testing Checklist

- [ ] Wallet connects via RainbowKit
- [ ] Network switches to Sepolia
- [ ] Contract read works (registrationFeeWei)
- [ ] Supabase query works (fetch rooms)
- [ ] Create room transaction succeeds
- [ ] Event synced to Supabase
- [ ] Room appears in dashboard
- [ ] Room detail page loads
- [ ] Can add voters/candidates
- [ ] Voting works (gasless)
- [ ] Results displayed correctly

---

## 💡 Tips

**For blockchain writes:**
```typescript
const { writeContract, data: hash, error } = useWriteContract();
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

// Always check isSuccess before updating UI
useEffect(() => {
  if (isSuccess) {
    // Refetch data, show toast, redirect, etc.
  }
}, [isSuccess]);
```

**For real-time Supabase:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('rooms-changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'rooms' },
      (payload) => {
        // New room added! Refetch or optimistically update UI
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

**For error handling:**
```typescript
if (error) {
  console.error('Contract error:', error);
  // Show user-friendly message
  if (error.message.includes('insufficient funds')) {
    toast.error('Not enough ETH for gas');
  }
}
```

---

## 🚀 Quick Start Commands

```bash
# Start dev server
npm run dev

# Open browser
http://localhost:8080/

# Check wallet connection
# Click "Connect Wallet" in top right

# Test contract read (browser console)
import { useRegistrationFee } from '@/hooks/useContracts';
const { data } = useRegistrationFee();
console.log('Fee:', data); // 10000000000000000 (0.01 ETH)

# Test Supabase query (browser console)
import { supabase } from '@/config/supabase';
const { data } = await supabase.from('rooms').select('*');
console.log('Rooms:', data); // []
```

---

**Next immediate action:** Replace `MyRooms.tsx` with real data version! 🎯
