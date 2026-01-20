-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Blockchain Voting App - v2
-- ============================================
-- 
-- This schema supports:
-- - Multi-room voting system
-- - Credit pooling tracking
-- - Real-time vote updates
-- - Historical round data
-- - Admin analytics
--
-- Setup Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- 4. Enable Row Level Security (RLS) policies below
--
-- ============================================

-- ============================================
-- 1. ROOMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rooms (
    -- Primary Key
    room_address TEXT PRIMARY KEY,
    
    -- Room Info
    room_name TEXT NOT NULL,
    room_admin TEXT NOT NULL,
    
    -- Vault & Forwarder
    sponsor_vault TEXT NOT NULL,
    trusted_forwarder TEXT NOT NULL,
    
    -- State
    state TEXT NOT NULL DEFAULT 'Inactive', -- Inactive | Active | Ended | Closed
    current_round INTEGER NOT NULL DEFAULT 0,
    
    -- Registry Versions
    voter_registry_version INTEGER NOT NULL DEFAULT 1,
    candidate_registry_version INTEGER NOT NULL DEFAULT 1,
    
    -- Credit Tracking (NEW in v2!)
    total_credits_in_system BIGINT NOT NULL DEFAULT 0,
    available_credits_pool BIGINT NOT NULL DEFAULT 0,
    total_credits_granted BIGINT NOT NULL DEFAULT 0,
    total_credits_used BIGINT NOT NULL DEFAULT 0,
    
    -- Gas Settings
    max_cost_per_vote_wei BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for faster queries
    CONSTRAINT valid_state CHECK (state IN ('Inactive', 'Active', 'Ended', 'Closed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_admin ON rooms(room_admin);
CREATE INDEX IF NOT EXISTS idx_rooms_state ON rooms(state);
CREATE INDEX IF NOT EXISTS idx_rooms_created ON rooms(created_at DESC);

COMMENT ON TABLE rooms IS 'Voting rooms created via RoomFactory';
COMMENT ON COLUMN rooms.available_credits_pool IS 'Credits from removed voters, ready for reuse';

-- ============================================
-- 2. VOTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS voters (
    -- Composite Primary Key
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    voter_address TEXT NOT NULL,
    
    -- Voter Data
    voter_version INTEGER NOT NULL,
    voter_credit BIGINT NOT NULL DEFAULT 0,
    last_voted_round INTEGER DEFAULT NULL,
    
    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (room_address, voter_address)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_voters_address ON voters(voter_address);
CREATE INDEX IF NOT EXISTS idx_voters_credit ON voters(room_address, voter_credit) WHERE voter_credit > 0;
CREATE INDEX IF NOT EXISTS idx_voters_version ON voters(room_address, voter_version);

COMMENT ON TABLE voters IS 'Voters eligible to vote in each room';
COMMENT ON COLUMN voters.voter_version IS 'Match with room.voter_registry_version for eligibility';

-- ============================================
-- 3. CANDIDATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS candidates (
    -- Composite Primary Key
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    candidate_id BIGINT NOT NULL,
    
    -- Candidate Data
    candidate_name TEXT NOT NULL,
    candidate_version INTEGER NOT NULL,
    
    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (room_address, candidate_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_version ON candidates(room_address, candidate_version);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(room_address, candidate_name);

COMMENT ON TABLE candidates IS 'Candidates available for voting in each round';

-- ============================================
-- 4. VOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS votes (
    -- Primary Key
    vote_id BIGSERIAL PRIMARY KEY,
    
    -- Vote Data
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    voter_address TEXT NOT NULL,
    candidate_id BIGINT NOT NULL,
    vote_weight BIGINT NOT NULL,
    
    -- Transaction Data
    action_id TEXT NOT NULL UNIQUE, -- keccak256(room, round, voter)
    tx_hash TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    
    -- Timestamp
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Keys
    FOREIGN KEY (room_address, voter_address) REFERENCES voters(room_address, voter_address),
    FOREIGN KEY (room_address, candidate_id) REFERENCES candidates(room_address, candidate_id)
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_votes_room_round ON votes(room_address, round_number);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(room_address, round_number, candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_address);
CREATE INDEX IF NOT EXISTS idx_votes_action_id ON votes(action_id);
CREATE INDEX IF NOT EXISTS idx_votes_tx_hash ON votes(tx_hash);
CREATE INDEX IF NOT EXISTS idx_votes_time ON votes(voted_at DESC);

COMMENT ON TABLE votes IS 'All votes cast across all rooms and rounds';
COMMENT ON COLUMN votes.action_id IS 'Deterministic ID from smart contract event';

-- ============================================
-- 5. ROUNDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rounds (
    -- Composite Primary Key
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    
    -- Round Data
    winner_id BIGINT,
    winner_name TEXT,
    total_votes_weight BIGINT DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- State
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    
    PRIMARY KEY (room_address, round_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rounds_closed ON rounds(room_address, is_closed);
CREATE INDEX IF NOT EXISTS idx_rounds_winner ON rounds(room_address, winner_id);
CREATE INDEX IF NOT EXISTS idx_rounds_time ON rounds(started_at DESC);

COMMENT ON TABLE rounds IS 'Historical record of all voting rounds';
COMMENT ON COLUMN rounds.winner_name IS 'Snapshot of winner name (preserved even if candidate removed)';

-- ============================================
-- 6. TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    -- Primary Key
    tx_id BIGSERIAL PRIMARY KEY,
    
    -- Transaction Data
    tx_hash TEXT NOT NULL UNIQUE,
    room_address TEXT REFERENCES rooms(room_address) ON DELETE SET NULL,
    from_address TEXT NOT NULL,
    
    -- Transaction Type
    tx_type TEXT NOT NULL, -- vote | grantCredit | addVoter | startVoting | endVoting | etc.
    
    -- Blockchain Data
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    gas_used BIGINT,
    gas_price BIGINT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | failed
    
    -- Metadata (JSONB for flexibility)
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tx_type CHECK (tx_type IN (
        'vote', 'grantCredit', 'batchGrantCredits', 'addVoter', 'batchAddVoters', 
        'removeVoter', 'addCandidate', 'batchAddCandidates', 'removeCandidate',
        'startVoting', 'endVoting', 'closeRound', 'prepareNextRound', 'resetRoom',
        'createRoom', 'depositToVault', 'withdrawFromVault'
    )),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_room ON transactions(room_address);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(block_timestamp DESC);

COMMENT ON TABLE transactions IS 'All blockchain transactions related to voting system';
COMMENT ON COLUMN transactions.metadata IS 'Additional data like voter count, credit amount, etc.';

-- ============================================
-- 7. CREDIT_HISTORY TABLE (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS credit_history (
    -- Primary Key
    history_id BIGSERIAL PRIMARY KEY,
    
    -- Room & Voter
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    voter_address TEXT,
    
    -- Credit Change
    action TEXT NOT NULL, -- grant | remove | burn | vote | refund
    old_credit BIGINT NOT NULL,
    new_credit BIGINT NOT NULL,
    credit_change BIGINT NOT NULL, -- Signed: positive = increase, negative = decrease
    
    -- Pool Impact
    pool_before BIGINT NOT NULL,
    pool_after BIGINT NOT NULL,
    system_total_before BIGINT NOT NULL,
    system_total_after BIGINT NOT NULL,
    
    -- Transaction
    tx_hash TEXT,
    performed_by TEXT NOT NULL, -- Admin address
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_action CHECK (action IN (
        'grant', 'remove', 'burn', 'vote', 'refund', 'batch-grant', 'batch-add'
    ))
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_credit_history_room ON credit_history(room_address);
CREATE INDEX IF NOT EXISTS idx_credit_history_voter ON credit_history(voter_address);
CREATE INDEX IF NOT EXISTS idx_credit_history_action ON credit_history(action);
CREATE INDEX IF NOT EXISTS idx_credit_history_time ON credit_history(created_at DESC);

COMMENT ON TABLE credit_history IS 'Audit trail of all credit changes';
COMMENT ON COLUMN credit_history.credit_change IS 'Signed integer: +100 = grant, -50 = use';

-- ============================================
-- 8. POOL_SNAPSHOTS TABLE (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS pool_snapshots (
    -- Primary Key
    snapshot_id BIGSERIAL PRIMARY KEY,
    
    -- Room Data
    room_address TEXT NOT NULL REFERENCES rooms(room_address) ON DELETE CASCADE,
    
    -- Pool Metrics
    total_credits_in_system BIGINT NOT NULL,
    available_credits_pool BIGINT NOT NULL,
    total_credits_granted BIGINT NOT NULL,
    total_credits_used BIGINT NOT NULL,
    
    -- Calculated Metrics
    pool_utilization_percent INTEGER, -- (granted / system) * 100
    credits_in_circulation BIGINT, -- granted - used
    
    -- Snapshot Time
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pool_snapshots_room ON pool_snapshots(room_address);
CREATE INDEX IF NOT EXISTS idx_pool_snapshots_time ON pool_snapshots(snapshot_at DESC);

COMMENT ON TABLE pool_snapshots IS 'Periodic snapshots of pool status for trend analysis';

-- ============================================
-- 9. ADMIN_ACTIONS TABLE (Audit Log)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_actions (
    -- Primary Key
    action_id BIGSERIAL PRIMARY KEY,
    
    -- Action Data
    room_address TEXT REFERENCES rooms(room_address) ON DELETE SET NULL,
    admin_address TEXT NOT NULL,
    action_type TEXT NOT NULL,
    
    -- Details
    target_address TEXT, -- Voter or null
    old_value TEXT,
    new_value TEXT,
    
    -- Transaction
    tx_hash TEXT,
    
    -- Timestamp
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_admin_action CHECK (action_type IN (
        'create_room', 'grant_credit', 'add_voter', 'remove_voter',
        'add_candidate', 'remove_candidate', 'start_voting', 'end_voting',
        'close_round', 'reset_room', 'prepare_next_round', 'burn_credits',
        'set_max_cost', 'withdraw_deposit', 'batch_operation'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_room ON admin_actions(room_address);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_address);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions(performed_at DESC);

COMMENT ON TABLE admin_actions IS 'Audit log of all admin operations';

-- ============================================
-- 10. VIEWS (Helper Queries)
-- ============================================

-- View: Current Room Status
CREATE OR REPLACE VIEW v_room_status AS
SELECT 
    r.room_address,
    r.room_name,
    r.room_admin,
    r.state,
    r.current_round,
    r.total_credits_in_system,
    r.available_credits_pool,
    r.total_credits_granted,
    r.total_credits_used,
    -- Calculated metrics
    CASE 
        WHEN r.total_credits_in_system > 0 
        THEN ROUND((r.total_credits_granted::NUMERIC / r.total_credits_in_system::NUMERIC) * 100, 2)
        ELSE 0 
    END AS utilization_percent,
    r.total_credits_granted - r.total_credits_used AS credits_available_for_voting,
    -- Counts
    COUNT(DISTINCT v.voter_address) FILTER (WHERE v.voter_version = r.voter_registry_version) AS active_voters,
    COUNT(DISTINCT c.candidate_id) FILTER (WHERE c.candidate_version = r.candidate_registry_version) AS active_candidates,
    COUNT(DISTINCT vt.vote_id) FILTER (WHERE vt.round_number = r.current_round) AS votes_this_round,
    r.created_at,
    r.updated_at
FROM rooms r
LEFT JOIN voters v ON r.room_address = v.room_address
LEFT JOIN candidates c ON r.room_address = c.room_address
LEFT JOIN votes vt ON r.room_address = vt.room_address
GROUP BY r.room_address;

COMMENT ON VIEW v_room_status IS 'Comprehensive room status with metrics';

-- View: Live Vote Tally
CREATE OR REPLACE VIEW v_live_vote_tally AS
SELECT 
    v.room_address,
    v.round_number,
    v.candidate_id,
    c.candidate_name,
    SUM(v.vote_weight) AS total_votes,
    COUNT(DISTINCT v.voter_address) AS voter_count,
    RANK() OVER (PARTITION BY v.room_address, v.round_number ORDER BY SUM(v.vote_weight) DESC) AS rank
FROM votes v
JOIN candidates c ON v.room_address = c.room_address AND v.candidate_id = c.candidate_id
GROUP BY v.room_address, v.round_number, v.candidate_id, c.candidate_name;

COMMENT ON VIEW v_live_vote_tally IS 'Real-time vote counts per candidate per round';

-- View: Voter Participation
CREATE OR REPLACE VIEW v_voter_participation AS
SELECT 
    v.room_address,
    r.current_round,
    COUNT(DISTINCT v.voter_address) AS eligible_voters,
    COUNT(DISTINCT vt.voter_address) AS voted_voters,
    COUNT(DISTINCT v.voter_address) - COUNT(DISTINCT vt.voter_address) AS not_voted_yet,
    CASE 
        WHEN COUNT(DISTINCT v.voter_address) > 0 
        THEN ROUND((COUNT(DISTINCT vt.voter_address)::NUMERIC / COUNT(DISTINCT v.voter_address)::NUMERIC) * 100, 2)
        ELSE 0 
    END AS participation_rate
FROM voters v
JOIN rooms r ON v.room_address = r.room_address AND v.voter_version = r.voter_registry_version
LEFT JOIN votes vt ON v.room_address = vt.room_address 
    AND v.voter_address = vt.voter_address 
    AND vt.round_number = r.current_round
GROUP BY v.room_address, r.current_round;

COMMENT ON VIEW v_voter_participation IS 'Voter turnout statistics per room';

-- ============================================
-- 11. FUNCTIONS (Stored Procedures)
-- ============================================

-- Function: Get Pool Efficiency
CREATE OR REPLACE FUNCTION get_pool_efficiency(p_room_address TEXT)
RETURNS TABLE (
    reused_credits BIGINT,
    new_credits BIGINT,
    reuse_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT total_credits_granted FROM rooms WHERE room_address = p_room_address) AS granted,
        (SELECT total_credits_in_system FROM rooms WHERE room_address = p_room_address) AS system_total,
        CASE 
            WHEN (SELECT total_credits_granted FROM rooms WHERE room_address = p_room_address) > 0 
            THEN ROUND(
                (1 - ((SELECT total_credits_in_system FROM rooms WHERE room_address = p_room_address)::NUMERIC / 
                      (SELECT total_credits_granted FROM rooms WHERE room_address = p_room_address)::NUMERIC)) * 100, 
                2
            )
            ELSE 0 
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pool_efficiency IS 'Calculate how much pool was reused vs creating new credits';

-- Function: Record Credit Change
CREATE OR REPLACE FUNCTION record_credit_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if credit actually changed
    IF (TG_OP = 'UPDATE' AND OLD.voter_credit != NEW.voter_credit) OR TG_OP = 'INSERT' THEN
        INSERT INTO credit_history (
            room_address,
            voter_address,
            action,
            old_credit,
            new_credit,
            credit_change,
            pool_before,
            pool_after,
            system_total_before,
            system_total_after,
            performed_by
        )
        SELECT 
            NEW.room_address,
            NEW.voter_address,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'grant'
                WHEN NEW.voter_credit > OLD.voter_credit THEN 'grant'
                WHEN NEW.voter_credit < OLD.voter_credit THEN 'vote'
                ELSE 'refund'
            END,
            COALESCE(OLD.voter_credit, 0),
            NEW.voter_credit,
            NEW.voter_credit - COALESCE(OLD.voter_credit, 0),
            r.available_credits_pool,
            r.available_credits_pool,
            r.total_credits_in_system,
            r.total_credits_in_system,
            r.room_admin
        FROM rooms r
        WHERE r.room_address = NEW.room_address;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-track credit changes
CREATE TRIGGER trg_credit_history
AFTER INSERT OR UPDATE ON voters
FOR EACH ROW
EXECUTE FUNCTION record_credit_change();

COMMENT ON FUNCTION record_credit_change IS 'Automatically log credit changes to history';

-- Function: Take Pool Snapshot
CREATE OR REPLACE FUNCTION take_pool_snapshot(p_room_address TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO pool_snapshots (
        room_address,
        total_credits_in_system,
        available_credits_pool,
        total_credits_granted,
        total_credits_used,
        pool_utilization_percent,
        credits_in_circulation
    )
    SELECT 
        room_address,
        total_credits_in_system,
        available_credits_pool,
        total_credits_granted,
        total_credits_used,
        CASE 
            WHEN total_credits_in_system > 0 
            THEN ROUND((total_credits_granted::NUMERIC / total_credits_in_system::NUMERIC) * 100)::INTEGER
            ELSE 0 
        END,
        total_credits_granted - total_credits_used
    FROM rooms
    WHERE room_address = p_room_address;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION take_pool_snapshot IS 'Create snapshot of pool status for analytics';

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access for rooms
CREATE POLICY "Public can view rooms"
ON rooms FOR SELECT
USING (true);

-- Policy: Admins can modify their own rooms
CREATE POLICY "Admins can update own rooms"
ON rooms FOR UPDATE
USING (auth.jwt() ->> 'wallet_address' = room_admin);

-- Policy: Public can view voters (for transparency)
CREATE POLICY "Public can view voters"
ON voters FOR SELECT
USING (true);

-- Policy: Public can view candidates
CREATE POLICY "Public can view candidates"
ON candidates FOR SELECT
USING (true);

-- Policy: Public can view votes (for transparency)
CREATE POLICY "Public can view votes"
ON votes FOR SELECT
USING (true);

-- Policy: Public can view round summaries
CREATE POLICY "Public can view rounds"
ON rounds FOR SELECT
USING (true);

-- Policy: Public can view transactions
CREATE POLICY "Public can view transactions"
ON transactions FOR SELECT
USING (true);

-- Policy: Public can view credit history
CREATE POLICY "Public can view credit history"
ON credit_history FOR SELECT
USING (true);

-- Policy: Public can view pool snapshots
CREATE POLICY "Public can view pool snapshots"
ON pool_snapshots FOR SELECT
USING (true);

-- Policy: Only admins can view admin actions
CREATE POLICY "Only admins can view admin actions"
ON admin_actions FOR SELECT
USING (
    room_address IN (
        SELECT room_address FROM rooms 
        WHERE room_admin = auth.jwt() ->> 'wallet_address'
    )
);

-- ============================================
-- 13. INDEXES FOR REAL-TIME SUBSCRIPTIONS
-- ============================================

-- For real-time vote updates
CREATE INDEX IF NOT EXISTS idx_votes_realtime ON votes(room_address, round_number, voted_at DESC);

-- For real-time pool updates
CREATE INDEX IF NOT EXISTS idx_rooms_pool_realtime ON rooms(room_address, updated_at DESC);

-- ============================================
-- 14. SAMPLE QUERIES (For Reference)
-- ============================================

/*
-- Get room dashboard stats
SELECT * FROM v_room_status WHERE room_address = '0x123...';

-- Get live vote tally for current round
SELECT * FROM v_live_vote_tally 
WHERE room_address = '0x123...' AND round_number = 1
ORDER BY rank;

-- Get voter participation rate
SELECT * FROM v_voter_participation WHERE room_address = '0x123...';

-- Get pool efficiency
SELECT * FROM get_pool_efficiency('0x123...');

-- Get credit history for a voter
SELECT * FROM credit_history 
WHERE room_address = '0x123...' AND voter_address = '0xabc...'
ORDER BY created_at DESC;

-- Get pool snapshots (trend analysis)
SELECT * FROM pool_snapshots 
WHERE room_address = '0x123...'
ORDER BY snapshot_at DESC
LIMIT 100;

-- Real-time subscription (use in frontend)
SUBSCRIBE TO votes WHERE room_address = '0x123...' AND round_number = 1;
*/

-- ============================================
-- SETUP COMPLETE!
-- ============================================

SELECT 'Database schema created successfully!' AS status;
SELECT 'Total tables created: 9' AS info;
SELECT 'Total views created: 3' AS info;
SELECT 'Total functions created: 3' AS info;
SELECT 'Row Level Security (RLS): ENABLED' AS security;
