-- =========================================================
-- 0) EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- 1) CHAIN + CONTRACT REGISTRY (biar multi-network siap)
-- =========================================================
create table if not exists chains (
  chain_id bigint primary key,
  name text not null,
  rpc_url text,
  block_explorer text,
  created_at timestamptz default now()
);

create table if not exists contract_registry (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null references chains(chain_id) on delete cascade,
  label text not null,                -- 'RoomFactory' | 'SponsorVault' | 'MinimalForwarder' | 'VotingRoomImpl'
  address text not null,
  abi_version text,
  deployed_block bigint,
  deployed_tx_hash text,
  created_at timestamptz default now(),
  unique(chain_id, label),
  unique(chain_id, address)
);

-- =========================================================
-- 2) RAW EVENT LOG (idempotency + audit + replay)
--    Kunci utama agar Supabase selalu bisa "rebuild state"
-- =========================================================
create table if not exists chain_events (
  chain_id bigint not null references chains(chain_id) on delete cascade,
  block_number bigint not null,
  block_time timestamptz,
  tx_hash text not null,
  log_index int not null,
  contract_address text not null,
  event_name text not null,
  topics text[] default '{}',
  data jsonb not null default '{}'::jsonb,   -- decoded payload
  processed boolean not null default false,
  processed_at timestamptz,
  primary key (chain_id, tx_hash, log_index)
);

create index if not exists idx_chain_events_contract_block
  on chain_events(contract_address, block_number desc);

create index if not exists idx_chain_events_name_block
  on chain_events(event_name, block_number desc);

-- =========================================================
-- 3) SYNC CURSOR (untuk webhook / cron / manual refresh)
-- =========================================================
create table if not exists sync_status (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null references chains(chain_id) on delete cascade,
  scope text not null,                      -- 'global' | 'room:<addr>' | 'vault' | 'factory'
  last_finalized_block bigint default 0,
  last_seen_block bigint default 0,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz default now(),
  unique(chain_id, scope)
);

-- auto update timestamp
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_status_updated on sync_status;
create trigger trg_sync_status_updated
before update on sync_status
for each row execute function set_updated_at();

-- =========================================================
-- 4) EXTEND rooms: simpan snapshot state on-chain lengkap
-- =========================================================
alter table rooms
  add column if not exists chain_id bigint default 11155111, -- sepolia default
  add column if not exists factory_address text,
  add column if not exists vault_address text,
  add column if not exists forwarder_address text,

  -- registry version pattern (penting untuk reset O(1))
  add column if not exists voter_registry_version bigint default 0,
  add column if not exists candidate_registry_version bigint default 0,

  -- pool stats snapshot
  add column if not exists total_credits_in_system bigint default 0,
  add column if not exists available_credits_pool bigint default 0,

  -- escrow/deposit snapshot (dari vault.roomBalance / depositedBalance)
  add column if not exists deposit_balance_wei numeric(78,0) default 0,

  -- provenance
  add column if not exists created_block bigint,
  add column if not exists created_tx_hash text,
  add column if not exists created_log_index int,
  add column if not exists last_synced_block bigint default 0,
  add column if not exists last_synced_at timestamptz;

create index if not exists idx_rooms_chain on rooms(chain_id);

-- =========================================================
-- 5) EXTEND voters: simpan registry_version + lifecycle
-- =========================================================
alter table voters
  add column if not exists registry_version bigint default 0,
  add column if not exists is_active boolean default true,
  add column if not exists added_block bigint,
  add column if not exists removed_block bigint,
  add column if not exists last_vote_tx_hash text;

create index if not exists idx_voters_room_active on voters(room_address, is_active);

-- =========================================================
-- 6) EXTEND candidates: registry_version + lifecycle
-- =========================================================
alter table candidates
  add column if not exists registry_version bigint default 0,
  add column if not exists is_active boolean default true,
  add column if not exists added_block bigint,
  add column if not exists removed_block bigint;

create index if not exists idx_candidates_room_active on candidates(room_address, is_active);

-- =========================================================
-- 7) ROUND SUMMARY TABLE (winner, totals, timestamps)
-- =========================================================
create table if not exists room_rounds (
  id bigserial primary key,
  room_address text not null references rooms(address) on delete cascade,
  round int not null,
  state text not null check (state in ('Inactive','Active','Ended','Closed')),
  started_block bigint,
  ended_block bigint,
  closed_block bigint,
  winner_candidate_id int,
  winner_name text,
  winner_votes bigint,
  total_vote_weight bigint default 0,
  start_tx_hash text,
  end_tx_hash text,
  close_tx_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(room_address, round)
);

drop trigger if exists trg_room_rounds_updated on room_rounds;
create trigger trg_room_rounds_updated
before update on room_rounds
for each row execute function set_updated_at();

create index if not exists idx_room_rounds_room_round
  on room_rounds(room_address, round desc);

-- =========================================================
-- 8) OPTIONAL: VAULT SNAPSHOT (config + global stats)
-- =========================================================
create table if not exists vault_snapshot (
  id bigserial primary key,
  chain_id bigint not null references chains(chain_id) on delete cascade,
  vault_address text not null,
  owner text,
  overhead_bps bigint,
  platform_fee_bps bigint,
  registration_fee_wei numeric(78,0),
  platform_fee_accrued_wei numeric(78,0),
  total_locked_wei numeric(78,0),
  rooms_deposits_wei numeric(78,0),
  block_number bigint,
  block_time timestamptz,
  tx_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_vault_snapshot_chain_block
  on vault_snapshot(chain_id, block_number desc);

-- =========================================================
-- 9) DERIVED AGGREGATES TRIGGERS (opsional, untuk konsistensi UI)
--    Saat voters/candidates berubah, update counter di rooms.
-- =========================================================
create or replace function recompute_room_counters(p_room text)
returns void as $$
begin
  update rooms r set
    voter_count = (select count(*) from voters v where v.room_address = p_room and v.is_active = true),
    candidate_count = (select count(*) from candidates c where c.room_address = p_room and c.is_active = true),
    updated_at = now()
  where r.address = p_room;
end;
$$ language plpgsql;

create or replace function trg_voters_recount()
returns trigger as $$
begin
  perform recompute_room_counters(coalesce(new.room_address, old.room_address));
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists voters_recount_after on voters;
create trigger voters_recount_after
after insert or update or delete on voters
for each row execute function trg_voters_recount();

create or replace function trg_candidates_recount()
returns trigger as $$
begin
  perform recompute_room_counters(coalesce(new.room_address, old.room_address));
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists candidates_recount_after on candidates;
create trigger candidates_recount_after
after insert or update or delete on candidates
for each row execute function trg_candidates_recount();

-- =========================================================
-- 10) RLS: chain_events & sync_status sebaiknya hanya service_role
-- =========================================================
alter table chain_events enable row level security;
alter table sync_status enable row level security;
alter table room_rounds enable row level security;
alter table vault_snapshot enable row level security;

-- Public boleh read (opsional). Biasanya cukup read untuk UI.
create policy "Public read chain_events (optional)"
on chain_events for select to public
using (true);

create policy "Service role manage chain_events"
on chain_events for all to service_role
using (true);

create policy "Public read room_rounds"
on room_rounds for select to public
using (true);

create policy "Service role manage room_rounds"
on room_rounds for all to service_role
using (true);

create policy "Service role manage sync_status"
on sync_status for all to service_role
using (true);

create policy "Service role manage vault_snapshot"
on vault_snapshot for all to service_role
using (true);
