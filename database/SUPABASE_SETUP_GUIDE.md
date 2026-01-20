# 🗄️ Supabase Database Setup Guide

## Overview

This guide walks you through setting up the complete Supabase database for the Blockchain Voting App v2. The database tracks all on-chain data, provides analytics, and enables real-time updates.

---

## 📋 Prerequisites

1. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Database Access**
   - Project URL: `https://[your-project].supabase.co`
   - Anon Public Key: For frontend read operations
   - Service Role Key: For backend write operations (keep secret!)

---

## 🚀 Step-by-Step Setup

### **Step 1: Create New Supabase Project**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Enter project details:
   - **Name:** `blockchain-voting-app`
   - **Database Password:** [Strong password - save this!]
   - **Region:** Choose closest to your users (e.g., Singapore for SEA)
   - **Plan:** Free tier (sufficient for thesis)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

---

### **Step 2: Run Database Schema**

1. **Open SQL Editor:**
   - In Supabase Dashboard, go to **SQL Editor** (left sidebar)
   - Click **"New Query"**

2. **Copy Schema:**
   - Open `database/SUPABASE_SCHEMA.sql` from this repo
   - Copy entire contents (850+ lines)

3. **Execute:**
   - Paste into SQL Editor
   - Click **"Run"** button
   - Wait for execution (~5-10 seconds)

4. **Verify:**
   - Check for success message: `"Database schema created successfully!"`
   - If errors appear, copy error message and check syntax

---

### **Step 3: Verify Tables Created**

1. Go to **Table Editor** (left sidebar)
2. You should see 9 tables:
   - ✅ `rooms` - Voting room data
   - ✅ `voters` - Voter registry
   - ✅ `candidates` - Candidate list
   - ✅ `votes` - All votes cast
   - ✅ `rounds` - Round history
   - ✅ `transactions` - Blockchain transactions
   - ✅ `credit_history` - Credit audit trail
   - ✅ `pool_snapshots` - Pool analytics
   - ✅ `admin_actions` - Admin audit log

3. Click each table to inspect columns and structure

---

### **Step 4: Enable Real-Time (Optional but Recommended)**

Real-time updates allow live vote counting without page refresh.

1. Go to **Database** → **Replication** (left sidebar)
2. Find these tables and toggle **"Enable"**:
   - ✅ `votes` - For live vote updates
   - ✅ `rooms` - For pool status updates
   - ✅ `voters` - For voter list updates

3. These tables will now broadcast changes to connected clients

---

### **Step 5: Configure Row Level Security (RLS)**

RLS is already enabled by the schema. Verify policies:

1. Go to **Authentication** → **Policies**
2. Check each table has policies:
   - **Public Read:** Everyone can view data (transparency)
   - **Admin Write:** Only room admins can modify their rooms
   - **Service Write:** Backend can write via service role key

---

### **Step 6: Get API Credentials**

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:

```env
# For .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public, safe to expose
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Secret! Server-side only
```

3. Save to `.env.local` in your Next.js project

---

## 🔍 Testing Database

### **Test Query 1: Check Tables**

Run in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: 9 tables listed

---

### **Test Query 2: Insert Sample Room**

```sql
INSERT INTO rooms (
    room_address,
    room_name,
    room_admin,
    sponsor_vault,
    trusted_forwarder,
    state,
    current_round
) VALUES (
    '0x1234567890123456789012345678901234567890',
    'Test Voting Room',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0xdef1def1def1def1def1def1def1def1def1def1',
    '0x9876543210987654321098765432109876543210',
    'Inactive',
    0
);
```

---

### **Test Query 3: View Sample Data**

```sql
SELECT * FROM rooms LIMIT 1;
```

Expected: Your test room appears

---

### **Test Query 4: Check Views**

```sql
SELECT * FROM v_room_status LIMIT 5;
```

Expected: Room status with calculated metrics

---

### **Test Query 5: Delete Test Data**

```sql
DELETE FROM rooms WHERE room_name = 'Test Voting Room';
```

---

## 📊 Database Schema Overview

### **Core Tables (Transaction Data)**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `rooms` | Voting rooms | address, name, state, credit pools |
| `voters` | Eligible voters | address, credit, version |
| `candidates` | Voting options | id, name, version |
| `votes` | Cast votes | voter, candidate, weight, tx_hash |
| `rounds` | Round history | winner, votes, timestamps |

### **Analytics Tables**

| Table | Purpose | Use Case |
|-------|---------|----------|
| `transactions` | All blockchain txs | Transaction history, gas tracking |
| `credit_history` | Credit changes | Audit trail, analytics |
| `pool_snapshots` | Pool metrics over time | Trend analysis, charts |
| `admin_actions` | Admin operations | Security audit, compliance |

### **Views (Virtual Tables)**

| View | Purpose | Query |
|------|---------|-------|
| `v_room_status` | Room dashboard | Current state + metrics |
| `v_live_vote_tally` | Vote counting | Real-time results |
| `v_voter_participation` | Turnout stats | Participation rate |

---

## 🔗 Connecting from Frontend

### **Install Supabase Client**

```bash
npm install @supabase/supabase-js
```

### **Create Supabase Client**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Example: Fetch Room Data**

```typescript
// Get room status
const { data: rooms, error } = await supabase
  .from('v_room_status')
  .select('*')
  .eq('room_address', roomAddress)
  .single()

if (error) console.error('Error:', error)
else console.log('Room:', rooms)
```

### **Example: Real-Time Vote Updates**

```typescript
// Subscribe to vote changes
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
      // Update UI with new vote
    }
  )
  .subscribe()

// Cleanup
return () => subscription.unsubscribe()
```

---

## 📈 Sample Queries for Analytics

### **1. Room Dashboard**

```sql
SELECT * FROM v_room_status 
WHERE room_address = '0x123...';
```

Returns:
- Room name, admin, state
- Credit pools (system, pool, granted, used)
- Utilization percentage
- Voter/candidate counts
- Votes this round

---

### **2. Live Vote Tally**

```sql
SELECT * FROM v_live_vote_tally
WHERE room_address = '0x123...' 
  AND round_number = 1
ORDER BY rank;
```

Returns:
- Candidate name
- Total votes (weighted)
- Voter count
- Rank (1st, 2nd, 3rd...)

---

### **3. Credit Pool Efficiency**

```sql
SELECT * FROM get_pool_efficiency('0x123...');
```

Returns:
- Reused credits (from pool)
- New credits (freshly created)
- Reuse percentage

---

### **4. Voter Participation Rate**

```sql
SELECT * FROM v_voter_participation
WHERE room_address = '0x123...';
```

Returns:
- Eligible voters
- Voted count
- Not voted count
- Participation rate (%)

---

### **5. Credit History (Audit)**

```sql
SELECT * FROM credit_history
WHERE room_address = '0x123...'
  AND voter_address = '0xabc...'
ORDER BY created_at DESC;
```

Returns:
- All credit changes for a voter
- Old/new values
- Pool impact
- Transaction hash

---

### **6. Pool Trends (Time Series)**

```sql
SELECT 
    snapshot_at,
    total_credits_in_system,
    available_credits_pool,
    pool_utilization_percent
FROM pool_snapshots
WHERE room_address = '0x123...'
ORDER BY snapshot_at DESC
LIMIT 100;
```

Use for charts showing pool usage over time.

---

## 🔐 Security Best Practices

### **1. API Key Management**

✅ **DO:**
- Use `NEXT_PUBLIC_` prefix for client-side keys (anon key)
- Keep service role key server-side only (API routes)
- Use `.env.local` (never commit to Git)
- Add `.env*.local` to `.gitignore`

❌ **DON'T:**
- Expose service role key in frontend code
- Commit keys to GitHub
- Share keys in Discord/Telegram

---

### **2. Row Level Security (RLS)**

The schema enables RLS with these policies:

| Table | Read | Write |
|-------|------|-------|
| `rooms` | Public | Admin only |
| `voters` | Public | Admin only |
| `candidates` | Public | Admin only |
| `votes` | Public | Smart contract only |
| `transactions` | Public | Backend only |

**How it works:**
- Public can view all data (transparency)
- Only admins can modify their rooms
- Only authenticated backend can write transactions

---

### **3. Data Validation**

All tables have `CHECK` constraints:

```sql
-- Example: State validation
CONSTRAINT valid_state CHECK (state IN ('Inactive', 'Active', 'Ended', 'Closed'))

-- Example: Transaction type validation
CONSTRAINT valid_tx_type CHECK (tx_type IN ('vote', 'grantCredit', ...))
```

This prevents invalid data insertion.

---

## 🛠️ Maintenance Tasks

### **Weekly: Take Pool Snapshot**

For analytics, take periodic snapshots:

```sql
SELECT take_pool_snapshot('0x123...');
```

Recommendation: Run via cron job every 24 hours.

---

### **Monthly: Archive Old Data**

For performance, archive old rounds:

```sql
-- Create archive table
CREATE TABLE votes_archive AS SELECT * FROM votes WHERE round_number < 10;

-- Delete archived votes
DELETE FROM votes WHERE round_number < 10;
```

---

### **Monitor Database Size**

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

Free tier limit: 500 MB. Votes table will be largest.

---

## 🐛 Troubleshooting

### **Error: "relation already exists"**

**Cause:** Schema already run before

**Solution:**
```sql
-- Drop all tables (CAUTION: deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then re-run schema
```

---

### **Error: "permission denied"**

**Cause:** RLS blocking write operation

**Solution:**
- Use service role key for backend writes
- Check RLS policies match your use case
- Disable RLS temporarily for testing (re-enable after!)

---

### **Error: "tuple concurrently updated"**

**Cause:** Race condition on high-traffic table

**Solution:**
- Use optimistic locking
- Add retry logic in frontend
- Consider queue for writes

---

### **Real-time not working**

**Checklist:**
1. ✅ Replication enabled for table?
2. ✅ Client subscribed to correct channel?
3. ✅ Filter matches inserted data?
4. ✅ Network allows WebSocket connections?

---

## 📚 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

---

## ✅ Setup Checklist

Before proceeding to frontend development:

- [ ] Supabase project created
- [ ] Database schema executed successfully
- [ ] All 9 tables visible in Table Editor
- [ ] Real-time enabled for `votes`, `rooms`, `voters`
- [ ] RLS policies verified
- [ ] API credentials saved to `.env.local`
- [ ] Test query successful
- [ ] Sample room inserted and queried
- [ ] Views returning data
- [ ] Functions working (test `get_pool_efficiency`)

---

**Status:** Ready for frontend integration! 🚀

---

*Last Updated: January 20, 2026*  
*Version: v2.0*
