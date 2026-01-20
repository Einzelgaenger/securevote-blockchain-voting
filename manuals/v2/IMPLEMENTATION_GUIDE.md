# 🚀 Complete Implementation Guide

## Project: SecureVote - Blockchain Voting DApp

### Organization: razaqshaquille
### Supabase Project: securevote

---

## 📋 Table of Contents

1. [Batch Function Limits](#batch-function-limits)
2. [Supabase Setup](#supabase-setup)
3. [Excel Upload with Batch Functions](#excel-upload)
4. [RainbowKit Auto Network Switch](#rainbowkit-auto-network)
5. [Frontend Architecture](#frontend-architecture)

---

## 🔢 Batch Function Limits

### **Gas Limit Constraints**

Ethereum blocks have a **gas limit**: ~30,000,000 gas per block.

| Function | Gas per Item | Max Items (Safe) | Max Items (Theoretical) |
|----------|--------------|------------------|-------------------------|
| `batchAddVoters()` | ~50,000 gas | **500 voters** | 600 voters |
| `batchAddVotersWithCredits()` | ~70,000 gas | **400 voters** | 428 voters |
| `batchGrantCredits()` | ~50,000 gas | **500 voters** | 600 voters |
| `batchAddCandidates()` | ~80,000 gas | **350 candidates** | 375 candidates |
| `batchRemoveVoters()` | ~45,000 gas | **600 voters** | 666 voters |
| `batchRemoveCandidates()` | ~40,000 gas | **700 candidates** | 750 candidates |

### **Recommended Limits for Production:**

```javascript
const BATCH_LIMITS = {
  ADD_VOTERS: 500,
  ADD_VOTERS_WITH_CREDITS: 400,
  GRANT_CREDITS: 500,
  ADD_CANDIDATES: 350,
  REMOVE_VOTERS: 600,
  REMOVE_CANDIDATES: 700
};

// Chunking function for large uploads
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Usage
const voters = parseExcelVoters(file); // 1000 voters
const chunks = chunkArray(voters, BATCH_LIMITS.ADD_VOTERS_WITH_CREDITS);

for (const chunk of chunks) {
  await room.batchAddVotersWithCredits(
    chunk.map(v => v.address),
    chunk.map(v => v.credit)
  );
}
// Result: 3 transactions (400 + 400 + 200)
```

### **Why These Limits?**

1. **Block Gas Limit**: 30M gas (hard limit)
2. **Safety Margin**: Use ~50% to avoid out-of-gas errors
3. **Transaction Cost**: More items = higher cost
4. **UX Balance**: 400 items in 1 tx = still 1 popup (good UX)

---

## 🗄️ Supabase Setup

### **Step 1: Database Schema**

Go to Supabase Dashboard → SQL Editor → Run this:

```sql
-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE rooms (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('Inactive', 'Active', 'Ended', 'Closed')),
  current_round INTEGER DEFAULT 0,
  voter_count INTEGER DEFAULT 0,
  candidate_count INTEGER DEFAULT 0,
  total_credits_granted BIGINT DEFAULT 0,
  total_credits_used BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_rooms_admin ON rooms(admin);
CREATE INDEX idx_rooms_state ON rooms(state);

-- ============================================
-- VOTERS TABLE
-- ============================================
CREATE TABLE voters (
  id BIGSERIAL PRIMARY KEY,
  room_address TEXT NOT NULL REFERENCES rooms(address) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  credit BIGINT DEFAULT 0,
  eligible BOOLEAN DEFAULT true,
  has_voted BOOLEAN DEFAULT false,
  last_voted_round INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_address, voter_address)
);

-- Indexes
CREATE INDEX idx_voters_room ON voters(room_address);
CREATE INDEX idx_voters_address ON voters(voter_address);
CREATE INDEX idx_voters_room_eligible ON voters(room_address, eligible);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
CREATE TABLE candidates (
  id BIGSERIAL PRIMARY KEY,
  room_address TEXT NOT NULL REFERENCES rooms(address) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  votes BIGINT DEFAULT 0,
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_address, candidate_id)
);

-- Indexes
CREATE INDEX idx_candidates_room ON candidates(room_address);
CREATE INDEX idx_candidates_room_round ON candidates(room_address, current_round);

-- ============================================
-- VOTE HISTORY TABLE (for analytics)
-- ============================================
CREATE TABLE vote_history (
  id BIGSERIAL PRIMARY KEY,
  room_address TEXT NOT NULL REFERENCES rooms(address) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  voter_address TEXT NOT NULL,
  candidate_id INTEGER NOT NULL,
  weight BIGINT NOT NULL,
  action_id TEXT NOT NULL UNIQUE,
  tx_hash TEXT,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vote_history_room_round ON vote_history(room_address, round);
CREATE INDEX idx_vote_history_voter ON vote_history(voter_address);
CREATE INDEX idx_vote_history_action_id ON vote_history(action_id);

-- ============================================
-- RELAYER SETTLEMENTS TABLE (for tracking)
-- ============================================
CREATE TABLE settlements (
  id BIGSERIAL PRIMARY KEY,
  room_address TEXT NOT NULL,
  action_id TEXT NOT NULL UNIQUE,
  relayer_address TEXT NOT NULL,
  charged_amount TEXT NOT NULL,
  tx_hash TEXT,
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settlements_room ON settlements(room_address);
CREATE INDEX idx_settlements_relayer ON settlements(relayer_address);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES (Public Read, Authenticated Write)
-- ============================================

-- Rooms: Anyone can read, only service role can write
CREATE POLICY "Allow public read rooms"
ON rooms FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role to manage rooms"
ON rooms FOR ALL
TO service_role
USING (true);

-- Voters: Anyone can read, only service role can write
CREATE POLICY "Allow public read voters"
ON voters FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role to manage voters"
ON voters FOR ALL
TO service_role
USING (true);

-- Candidates: Anyone can read, only service role can write
CREATE POLICY "Allow public read candidates"
ON candidates FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role to manage candidates"
ON candidates FOR ALL
TO service_role
USING (true);

-- Vote History: Anyone can read, only service role can write
CREATE POLICY "Allow public read vote_history"
ON vote_history FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role to manage vote_history"
ON vote_history FOR ALL
TO service_role
USING (true);

-- Settlements: Anyone can read, only service role can write
CREATE POLICY "Allow public read settlements"
ON settlements FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow service role to manage settlements"
ON settlements FOR ALL
TO service_role
USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voters_updated_at
BEFORE UPDATE ON voters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### **Step 2: Get Credentials**

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy these values:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (use in backend only!)
```

### **Step 3: Install Dependencies**

```bash
npm install @supabase/supabase-js
```

### **Step 4: Create Supabase Client**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations (backend/API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Only use in server!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

---

## 📊 Excel Upload Implementation

### **Step 1: Install Dependencies**

```bash
npm install xlsx @types/node
```

### **Step 2: Excel Upload Component**

```typescript
// components/ExcelUpload.tsx
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseEther } from 'viem';

interface VoterData {
  address: string;
  credit: number;
}

interface CandidateData {
  id: number;
  name: string;
}

const BATCH_LIMITS = {
  VOTERS: 400,
  CANDIDATES: 350
};

export function ExcelUpload({ roomAddress }: { roomAddress: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  // Contract write hook
  const { data, write } = useContractWrite({
    address: roomAddress as `0x${string}`,
    abi: VOTING_ROOM_ABI,
    functionName: 'batchAddVotersWithCredits'
  });
  
  const { isLoading: isConfirming } = useWaitForTransaction({
    hash: data?.hash
  });
  
  const handleVoterUpload = async (file: File) => {
    try {
      setUploading(true);
      setProgress(10);
      setStatus('Parsing Excel file...');
      
      // 1. Read Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      setProgress(30);
      setStatus(`Validating ${json.length} voters...`);
      
      // 2. Validate and parse
      const voters: VoterData[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        
        // Validate address
        if (!row.Address || !/^0x[a-fA-F0-9]{40}$/.test(row.Address)) {
          errors.push(`Row ${i + 2}: Invalid address "${row.Address}"`);
          continue;
        }
        
        // Validate credit
        const credit = parseInt(row.Credit);
        if (isNaN(credit) || credit <= 0 || credit > 1000000) {
          errors.push(`Row ${i + 2}: Invalid credit "${row.Credit}"`);
          continue;
        }
        
        voters.push({
          address: row.Address,
          credit: credit
        });
      }
      
      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.join('\n')}`);
      }
      
      setProgress(50);
      setStatus(`Uploading ${voters.length} voters to blockchain...`);
      
      // 3. Chunk if needed
      const chunks = chunkArray(voters, BATCH_LIMITS.VOTERS);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const addresses = chunk.map(v => v.address);
        const credits = chunk.map(v => v.credit);
        
        setStatus(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} voters)...`);
        
        // Call contract
        await write({
          args: [addresses, credits]
        });
        
        // Wait for confirmation
        // (handled by useWaitForTransaction)
        
        setProgress(50 + (40 * (i + 1)) / chunks.length);
      }
      
      setProgress(90);
      setStatus('Syncing with database...');
      
      // 4. Update Supabase
      await syncVotersToDatabase(roomAddress, voters);
      
      setProgress(100);
      setStatus(`✅ Success! ${voters.length} voters added.`);
      
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };
  
  const handleCandidateUpload = async (file: File) => {
    try {
      setUploading(true);
      setProgress(10);
      setStatus('Parsing Excel file...');
      
      // Similar implementation for candidates
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      setProgress(30);
      setStatus(`Validating ${json.length} candidates...`);
      
      const candidates: CandidateData[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        
        // Validate ID
        const id = parseInt(row.ID);
        if (isNaN(id) || id < 1) {
          errors.push(`Row ${i + 2}: Invalid ID "${row.ID}"`);
          continue;
        }
        
        // Validate name
        if (!row.Name || row.Name.length === 0 || row.Name.length > 100) {
          errors.push(`Row ${i + 2}: Invalid name "${row.Name}"`);
          continue;
        }
        
        candidates.push({
          id: id,
          name: row.Name
        });
      }
      
      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.join('\n')}`);
      }
      
      setProgress(50);
      setStatus(`Uploading ${candidates.length} candidates...`);
      
      // Chunk and upload
      const chunks = chunkArray(candidates, BATCH_LIMITS.CANDIDATES);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const ids = chunk.map(c => c.id);
        const names = chunk.map(c => c.name);
        
        await write({
          functionName: 'batchAddCandidates',
          args: [ids, names]
        });
        
        setProgress(50 + (40 * (i + 1)) / chunks.length);
      }
      
      setProgress(90);
      await syncCandidatesToDatabase(roomAddress, candidates);
      
      setProgress(100);
      setStatus(`✅ Success! ${candidates.length} candidates added.`);
      
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Voter Upload */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">📋 Upload Voters</h3>
          <p className="text-sm text-gray-600 mb-4">
            Excel format: Address | Credit
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files && handleVoterUpload(e.target.files[0])}
            disabled={uploading}
            className="block w-full text-sm"
          />
          <a
            href="/templates/voters-template.xlsx"
            className="text-sm text-blue-600 hover:underline mt-2 block"
          >
            Download Template
          </a>
        </div>
        
        {/* Candidate Upload */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">🎯 Upload Candidates</h3>
          <p className="text-sm text-gray-600 mb-4">
            Excel format: ID | Name
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files && handleCandidateUpload(e.target.files[0])}
            disabled={uploading}
            className="block w-full text-sm"
          />
          <a
            href="/templates/candidates-template.xlsx"
            className="text-sm text-blue-600 hover:underline mt-2 block"
          >
            Download Template
          </a>
        </div>
      </div>
      
      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{status}</p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function syncVotersToDatabase(roomAddress: string, voters: VoterData[]) {
  const { supabaseAdmin } = await import('@/lib/supabase');
  
  const { error } = await supabaseAdmin
    .from('voters')
    .upsert(
      voters.map(v => ({
        room_address: roomAddress.toLowerCase(),
        voter_address: v.address.toLowerCase(),
        credit: v.credit,
        eligible: true,
        has_voted: false
      })),
      { onConflict: 'room_address,voter_address' }
    );
  
  if (error) throw error;
}

async function syncCandidatesToDatabase(roomAddress: string, candidates: CandidateData[]) {
  const { supabaseAdmin } = await import('@/lib/supabase');
  
  const { error } = await supabaseAdmin
    .from('candidates')
    .upsert(
      candidates.map(c => ({
        room_address: roomAddress.toLowerCase(),
        candidate_id: c.id,
        name: c.name,
        votes: 0
      })),
      { onConflict: 'room_address,candidate_id' }
    );
  
  if (error) throw error;
}
```

---

## 🌈 RainbowKit Auto Network Switch

### **Step 1: Install Dependencies**

```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x
```

### **Step 2: Configure Chains**

```typescript
// lib/wagmi.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

// Get deployed contract network from environment
const DEPLOYED_NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';

// Define which chain your contracts are deployed on
export const DEPLOYED_CHAIN = DEPLOYED_NETWORK === 'mainnet' ? mainnet : sepolia;

export const config = getDefaultConfig({
  appName: 'SecureVote',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!, // Get from https://cloud.walletconnect.com
  chains: [DEPLOYED_CHAIN], // Only support deployed network
  ssr: true // Enable if using Next.js SSR
});

// Contract addresses (auto-select based on network)
export const CONTRACT_ADDRESSES = {
  [sepolia.id]: {
    forwarder: process.env.NEXT_PUBLIC_FORWARDER_SEPOLIA!,
    vault: process.env.NEXT_PUBLIC_VAULT_SEPOLIA!,
    factory: process.env.NEXT_PUBLIC_FACTORY_SEPOLIA!
  },
  [mainnet.id]: {
    forwarder: process.env.NEXT_PUBLIC_FORWARDER_MAINNET!,
    vault: process.env.NEXT_PUBLIC_VAULT_MAINNET!,
    factory: process.env.NEXT_PUBLIC_FACTORY_MAINNET!
  }
};
```

### **Step 3: Auto Network Switch Component**

```typescript
// components/NetworkGuard.tsx
'use client';

import { useEffect } from 'react';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { DEPLOYED_CHAIN } from '@/lib/wagmi';

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  
  useEffect(() => {
    // Auto-switch if on wrong network
    if (chain && chain.id !== DEPLOYED_CHAIN.id && switchNetwork) {
      switchNetwork(DEPLOYED_CHAIN.id);
    }
  }, [chain, switchNetwork]);
  
  // Show warning if on wrong network
  if (chain && chain.id !== DEPLOYED_CHAIN.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Wrong Network</h2>
            <p className="text-gray-600 mb-4">
              This app is deployed on <strong>{DEPLOYED_CHAIN.name}</strong>.
              <br />
              You are currently on <strong>{chain.name}</strong>.
            </p>
            <button
              onClick={() => switchNetwork?.(DEPLOYED_CHAIN.id)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Switch to {DEPLOYED_CHAIN.name}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

### **Step 4: Root Layout Setup**

```typescript
// app/layout.tsx
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { config } from '@/lib/wagmi';
import { NetworkGuard } from '@/components/NetworkGuard';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WagmiConfig config={config}>
          <RainbowKitProvider>
            <NetworkGuard>
              {children}
            </NetworkGuard>
          </RainbowKitProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
```

### **Step 5: Environment Variables**

```env
# .env.local

# WalletConnect (Get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Network Configuration
NEXT_PUBLIC_NETWORK=sepolia  # or mainnet

# Contract Addresses - Sepolia
NEXT_PUBLIC_FORWARDER_SEPOLIA=0x...
NEXT_PUBLIC_VAULT_SEPOLIA=0x...
NEXT_PUBLIC_FACTORY_SEPOLIA=0x...

# Contract Addresses - Mainnet (when ready)
NEXT_PUBLIC_FORWARDER_MAINNET=0x...
NEXT_PUBLIC_VAULT_MAINNET=0x...
NEXT_PUBLIC_FACTORY_MAINNET=0x...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Server-side only!
```

---

## 🏗️ Complete Frontend Architecture

```
securevote-frontend/
├── app/
│   ├── layout.tsx                 # RainbowKit + Wagmi provider
│   ├── page.tsx                   # Landing page
│   ├── rooms/
│   │   ├── page.tsx              # Room list
│   │   ├── [address]/
│   │   │   ├── page.tsx          # Room detail
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx      # Admin dashboard
│   │   │   │   ├── voters/       # Manage voters
│   │   │   │   └── candidates/   # Manage candidates
│   │   │   └── vote/
│   │   │       └── page.tsx      # Voting interface
│   │   └── create/
│   │       └── page.tsx          # Create room
│   └── api/
│       ├── sync/
│       │   └── route.ts          # Blockchain → Supabase sync
│       └── export/
│           └── route.ts          # Export results to Excel
├── components/
│   ├── NetworkGuard.tsx          # Auto network switch
│   ├── ExcelUpload.tsx           # Batch upload
│   ├── RoomCard.tsx              # Room display
│   ├── VoterTable.tsx            # Voter management
│   └── CandidateTable.tsx        # Candidate management
├── lib/
│   ├── wagmi.ts                  # Wagmi config
│   ├── supabase.ts               # Supabase clients
│   ├── contracts/
│   │   ├── abis.ts               # Contract ABIs
│   │   └── addresses.ts          # Contract addresses
│   └── utils/
│       ├── excel.ts              # Excel helpers
│       └── validation.ts         # Input validation
└── public/
    └── templates/
        ├── voters-template.xlsx
        └── candidates-template.xlsx
```

---

## 🚀 Next Steps

1. **Deploy Contracts to Sepolia**
   ```bash
   # In Remix
   # 1. Deploy MinimalForwarder
   # 2. Deploy SponsorVault
   # 3. Deploy VotingRoom (implementation)
   # 4. Deploy RoomFactory
   # 5. Save addresses to .env
   ```

2. **Create WalletConnect Project**
   - Go to https://cloud.walletconnect.com
   - Create project
   - Copy Project ID to `.env`

3. **Setup Supabase**
   - Already done: `securevote` project
   - Run SQL schema from above
   - Copy credentials to `.env`

4. **Test Excel Upload**
   - Create template files
   - Test with 10 voters first
   - Then test with 400+ voters

5. **Test Auto Network Switch**
   - Connect wallet on Mainnet
   - Should auto-prompt to switch to Sepolia

---

## 📚 Additional Resources

- RainbowKit Docs: https://rainbowkit.com
- Wagmi Docs: https://wagmi.sh
- Supabase Docs: https://supabase.com/docs
- XLSX Library: https://docs.sheetjs.com

