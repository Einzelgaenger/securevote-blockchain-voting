# 🗄️ Supabase Setup Guide - Complete Walkthrough

## 📋 Overview

Supabase = PostgreSQL database + Real-time subscriptions + REST API

**Your Project:**
- Organization: razaqshaquille  
- Project: securevote
- URL: https://[your-project-id].supabase.co

---

## 🚀 Step-by-Step Setup

### Step 1: Access Supabase Dashboard

1. **Login:** https://supabase.com/
2. **Email:** (your email)
3. **Password:** (your password)
4. Klik project **"securevote"**

---

### Step 2: Get API Credentials

#### 2.1 Get Project URL
1. Di dashboard, klik **Settings** (icon gear, sidebar kiri bawah)
2. Klik **API**
3. Copy **Project URL**:
   ```
   https://[your-project-id].supabase.co
   ```
4. Save ke notepad

#### 2.2 Get API Keys
Di halaman yang sama (Settings → API):

**Public (anon) key:**
- Label: "anon public"
- Safe untuk frontend (tidak berbahaya jika leaked)
- Copy key (panjang, starts with `eyJ...`)

**Service Role key:**
- Label: "service_role secret"
- ⚠️ **JANGAN share/commit ke GitHub!**
- Hanya untuk backend/server
- Copy key (panjang, starts with `eyJ...`)

#### 2.3 Update Frontend .env

**Path:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\lovable_ai\vote-free-main\vote-free-main\.env
```

**Add these:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here

# DON'T commit this! For backend only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-key-here
```

---

### Step 3: Run Database Schema

#### 3.1 Open SQL Editor
1. Di dashboard Supabase
2. Klik **SQL Editor** (icon database, sidebar kiri)
3. Klik **New Query**

#### 3.2 Copy SQL Schema

**Path schema:**
```
c:\Users\shaquill.razaq\OneDrive - Bina Nusantara\Thesis\BlockchainVotingApp_1\database\SUPABASE_SCHEMA.sql
```

**Actions:**
1. Buka file `SUPABASE_SCHEMA.sql` di VS Code
2. **Copy ALL** (Ctrl+A → Ctrl+C)
3. Paste ke Supabase SQL Editor
4. Klik **Run** (tombol hijau, atau F5)
5. Wait ~2-3 detik
6. Check output:
   - ✅ **Success** = Green checkmark
   - ❌ **Error** = Red X (read error message)

**Expected output:**
```
Success. No rows returned
```

This is NORMAL! Schema creates tables, doesn't return data.

#### 3.3 Verify Tables Created

1. Klik **Table Editor** (icon table, sidebar kiri)
2. Check tables exist:
   - ✅ `rooms`
   - ✅ `voters`
   - ✅ `candidates`
   - ✅ `votes`
   - ✅ `rounds` (if exists)

3. Klik table `rooms` → See columns:
   - room_address
   - room_name
   - room_admin
   - state
   - current_round
   - total_credits_in_system
   - (etc.)

**All tables visible?** ✅ Schema success!

---

### Step 4: Enable Row Level Security (RLS)

⚠️ **Important for security!** RLS prevents unauthorized data access.

#### 4.1 Enable RLS for Each Table

1. Klik **Authentication** → **Policies**
2. Or go to Table Editor → Select table → Click "RLS" toggle

For each table (`rooms`, `voters`, `candidates`, `votes`):

**Option A: Allow Public Read (Simple, for MVP)**
1. Table Editor → Select table
2. Click **"Add RLS Policy"**
3. Template: **"Enable read access for all users"**
4. Name: `Public read access`
5. Policy:
   ```sql
   CREATE POLICY "Public read access" ON public.rooms
   FOR SELECT USING (true);
   ```
6. Click **Review** → **Save**

**Option B: Strict Policies (Production)**

**For `rooms` table:**
```sql
-- Anyone can read rooms
CREATE POLICY "Anyone can view rooms" ON rooms
  FOR SELECT USING (true);

-- Only admin can update their room
CREATE POLICY "Admin can update own room" ON rooms
  FOR UPDATE USING (room_admin = auth.uid());

-- Anyone can insert (for testing)
CREATE POLICY "Anyone can create room" ON rooms
  FOR INSERT WITH CHECK (true);
```

**For `voters` table:**
```sql
-- Anyone can read voters
CREATE POLICY "Public read voters" ON voters
  FOR SELECT USING (true);

-- Room admin can manage voters
CREATE POLICY "Admin manages voters" ON voters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.room_address = voters.room_address 
      AND rooms.room_admin = auth.uid()
    )
  );
```

**For `votes` table:**
```sql
-- Anyone can read votes
CREATE POLICY "Public read votes" ON votes
  FOR SELECT USING (true);

-- Only allow insert (voting)
CREATE POLICY "Anyone can vote" ON votes
  FOR INSERT WITH CHECK (true);
```

**Untuk MVP sekarang:** Pakai **Option A** (public read, simple).  
**Nanti production:** Upgrade ke **Option B**.

---

### Step 5: Test Database Connection

#### 5.1 Test via Supabase SQL Editor

Run this query:
```sql
-- Test insert a dummy room
INSERT INTO rooms (
  room_address,
  room_name,
  room_admin,
  sponsor_vault,
  trusted_forwarder,
  state
) VALUES (
  '0x1234567890123456789012345678901234567890',
  'Test Room',
  '0xabcdef0123456789012345678901234567890123',
  '0x0000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000002',
  'Inactive'
);

-- Query to verify
SELECT * FROM rooms;
```

**Expected:**
- Insert success ✅
- SELECT returns 1 row ✅

**Clean up:**
```sql
-- Delete test data
DELETE FROM rooms WHERE room_name = 'Test Room';
```

#### 5.2 Test via Frontend

Create test file di frontend:

**Path:**
```
lovable_ai/vote-free-main/vote-free-main/src/test-supabase.ts
```

**Content:**
```typescript
import { supabase } from './config/supabase';

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...');
  
  // Test 1: Fetch all rooms
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*');
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Rooms fetched:', rooms.length);
    console.log(rooms);
  }
  
  // Test 2: Real-time subscription
  const channel = supabase
    .channel('test-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'rooms' },
      (payload) => {
        console.log('🔔 Real-time update:', payload);
      }
    )
    .subscribe();
  
  console.log('📡 Subscribed to real-time updates');
}

testSupabase();
```

**Run test:**
```bash
cd lovable_ai/vote-free-main/vote-free-main
npm run dev
```

Open browser console → Should see:
```
🧪 Testing Supabase connection...
✅ Rooms fetched: 0
📡 Subscribed to real-time updates
```

**Working?** ✅ Supabase connected!

---

### Step 6: Setup Real-Time Subscriptions

#### 6.1 Enable Realtime for Tables

1. Dashboard → **Database** → **Replication**
2. Find tables: `rooms`, `voters`, `candidates`, `votes`
3. Toggle **Realtime** ON for each ✅
4. Click **Save**

#### 6.2 Test Real-Time

Open 2 browser tabs:

**Tab 1:** Frontend app (http://localhost:8080/)
**Tab 2:** Supabase Table Editor

**Actions:**
1. Tab 1: Open browser console
2. Tab 2: Insert row manually in `rooms` table
3. Tab 1: Console should show real-time update! 🔔

**Works?** ✅ Real-time enabled!

---

### Step 7: Create Database Functions (Optional but Recommended)

These functions help with complex queries.

#### 7.1 Function: Get Room Stats

```sql
CREATE OR REPLACE FUNCTION get_room_stats(room_addr TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_voters', (SELECT COUNT(*) FROM voters WHERE room_address = room_addr),
    'total_candidates', (SELECT COUNT(*) FROM candidates WHERE room_address = room_addr),
    'total_votes', (SELECT COUNT(*) FROM votes WHERE room_address = room_addr),
    'voters_participated', (SELECT COUNT(DISTINCT voter_address) FROM votes WHERE room_address = room_addr),
    'credits_used', (SELECT COALESCE(SUM(vote_weight), 0) FROM votes WHERE room_address = room_addr)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT get_room_stats('0x1234...');
```

#### 7.2 Function: Get Vote Results

```sql
CREATE OR REPLACE FUNCTION get_vote_results(room_addr TEXT, round_num INT)
RETURNS TABLE(
  candidate_id BIGINT,
  candidate_name TEXT,
  total_votes BIGINT,
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.candidate_id,
    c.candidate_name,
    COALESCE(SUM(v.vote_weight), 0) as total_votes,
    COUNT(v.vote_id) as vote_count
  FROM candidates c
  LEFT JOIN votes v ON v.candidate_id = c.candidate_id 
    AND v.room_address = c.room_address
    AND v.round_number = round_num
  WHERE c.room_address = room_addr
  GROUP BY c.candidate_id, c.candidate_name
  ORDER BY total_votes DESC;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
SELECT * FROM get_vote_results('0x1234...', 1);
```

---

## 📊 Database Schema Overview

### Tables Created:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **rooms** | Voting rooms | room_address, room_name, state, credits |
| **voters** | Eligible voters | voter_address, voter_credit, last_voted_round |
| **candidates** | Candidates | candidate_id, candidate_name |
| **votes** | Vote records | voter, candidate, vote_weight, tx_hash |

### Relationships:
```
rooms (1) ─── (many) voters
rooms (1) ─── (many) candidates
rooms (1) ─── (many) votes
voters (1) ─── (many) votes
candidates (1) ─── (many) votes
```

---

## 🔧 Configuration Summary

Save this info securely:

```
===========================================
Supabase Configuration
===========================================

Organization: razaqshaquille
Project Name: securevote
Project ID: [your-project-id]

URL: https://[your-project-id].supabase.co
Anon Key: eyJ... (safe for frontend)
Service Key: eyJ... (SECRET! server only)

Database: PostgreSQL 15
Region: [your region]

Tables:
- rooms ✅
- voters ✅
- candidates ✅
- votes ✅

RLS: Enabled ✅
Realtime: Enabled ✅

API Endpoint:
https://[your-project-id].supabase.co/rest/v1/

Realtime Endpoint:
wss://[your-project-id].supabase.co/realtime/v1/

===========================================
```

---

## 🧪 Testing Checklist

- [ ] ✅ SQL schema executed
- [ ] ✅ All 4 tables created
- [ ] ✅ RLS policies enabled
- [ ] ✅ Realtime enabled
- [ ] ✅ API credentials in .env
- [ ] ✅ Test query via SQL Editor
- [ ] ✅ Test connection from frontend
- [ ] ✅ Test real-time subscription
- [ ] ✅ (Optional) Database functions created

**All checked?** Database ready! 🎉

---

## ❌ Troubleshooting

### Error: "relation does not exist"
**Solution:** Schema not executed. Run SQL again.

### Error: "permission denied"
**Solution:** RLS blocking. Check policies or temporarily disable RLS.

### Error: "Invalid API key"
**Solution:** 
1. Check .env file (correct key?)
2. Check for extra spaces
3. Regenerate key in dashboard

### Real-time not working
**Solution:**
1. Check Replication enabled
2. Check RLS allows SELECT
3. Check subscription code

### Can't insert data
**Solution:**
1. Check RLS policies
2. For testing, disable RLS temporarily:
   ```sql
   ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
   ```

---

## 📚 Useful SQL Queries

### View all rooms:
```sql
SELECT room_address, room_name, state, current_round 
FROM rooms 
ORDER BY created_at DESC;
```

### View voters for a room:
```sql
SELECT voter_address, voter_credit, last_voted_round
FROM voters
WHERE room_address = '0x...';
```

### View vote results:
```sql
SELECT 
  c.candidate_name,
  COUNT(v.vote_id) as vote_count,
  SUM(v.vote_weight) as total_weight
FROM votes v
JOIN candidates c ON v.candidate_id = c.candidate_id
WHERE v.room_address = '0x...' AND v.round_number = 1
GROUP BY c.candidate_name
ORDER BY total_weight DESC;
```

### Delete all data (reset):
```sql
DELETE FROM votes;
DELETE FROM candidates;
DELETE FROM voters;
DELETE FROM rooms;
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` to GitHub**
   - Add to `.gitignore`
   - Use `.env.example` for template

2. **Use anon key in frontend**
   - Safe for public exposure
   - Limited by RLS policies

3. **Keep service_role key secret**
   - Only in backend/server
   - Never in frontend code
   - Can bypass RLS (dangerous!)

4. **Enable RLS on all tables**
   - Prevents unauthorized access
   - Test policies thoroughly

5. **Use prepared statements**
   - Supabase does this automatically
   - Prevents SQL injection

6. **Monitor usage**
   - Dashboard → Usage
   - Check for unusual activity

---

## 🚀 Next Steps

After Supabase setup:

1. ✅ Database ready
2. ⏳ Deploy smart contracts (get addresses)
3. ⏳ Update frontend .env (contracts + supabase)
4. ⏳ Build indexer to sync blockchain → database
5. ⏳ Test full flow (create room → vote → results)

---

## 📞 Support

**Supabase Docs:** https://supabase.com/docs  
**Discord:** https://discord.supabase.com  
**GitHub:** https://github.com/supabase/supabase

Your database is ready to store voting data! 💾
