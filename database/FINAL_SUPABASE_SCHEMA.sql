-- =========================================================
-- GASLESS VOTING (ONCHAIN + SUPABASE) - FULL SCHEMA v1
-- Run this once on a fresh `public` schema
-- =========================================================

-- 0) EXTENSIONS
create extension if not exists pgcrypto;

-- 1) HELPERS
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- 2) CHAINS + CONTRACT REGISTRY
-- =========================================================
create table if not exists public.chains (
  chain_id bigint primary key,
  name text not null,
  rpc_url text,
  block_explorer text,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_registry (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null references public.chains(chain_id) on delete cascade,
  label text not null,                 -- 'RoomFactory' | 'SponsorVault' | 'MinimalForwarder' | 'VotingRoomImpl'
  address text not null,
  abi_version text,
  deployed_block bigint,
  deployed_tx_hash text,
  created_at timestamptz not null default now(),
  unique(chain_id, label),
  unique(chain_id, address)
);

-- Seed common chain (Sepolia default) - edit if needed
insert into public.chains (chain_id, name)
values (11155111, 'sepolia')
on conflict (chain_id) do nothing;

-- =========================================================
-- 3) RAW CHAIN EVENTS (source of truth for syncing)
-- =========================================================
create table if not exists public.chain_events (
  chain_id bigint not null references public.chains(chain_id) on delete cascade,
  block_number bigint not null,
  block_time timestamptz,
  tx_hash text not null,
  tx_index int,
  log_index int not null,
  contract_address text not null,
  event_name text not null,
  topics text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,     -- decoded payload (recommended)
  raw jsonb,                                   -- optionally store raw log
  processed boolean not null default false,
  processed_at timestamptz,
  primary key (chain_id, tx_hash, log_index)
);

create index if not exists idx_chain_events_contract_block
  on public.chain_events (contract_address, block_number desc);

create index if not exists idx_chain_events_name_block
  on public.chain_events (event_name, block_number desc);

create index if not exists idx_chain_events_processed
  on public.chain_events (processed, block_number desc);

-- =========================================================
-- 4) SYNC STATUS (cursor for webhook/cron/manual refresh)
-- =========================================================
create table if not exists public.sync_status (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null references public.chains(chain_id) on delete cascade,
  scope text not null,                       -- 'global' | 'factory' | 'vault' | 'room:<addr>'
  last_finalized_block bigint not null default 0,
  last_seen_block bigint not null default 0,
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  unique(chain_id, scope)
);

drop trigger if exists trg_sync_status_updated on public.sync_status;
create trigger trg_sync_status_updated
before update on public.sync_status
for each row execute function public.set_updated_at();

-- =========================================================
-- 5) CORE SNAPSHOT TABLES (what UI reads)
-- =========================================================

-- 5.1 ROOMS
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),

  -- identity
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  address text not null,                    -- VotingRoom address
  room_id text,                             -- optional offchain id / slug
  title text,
  description text,

  -- contract links (optional)
  factory_address text,
  vault_address text,
  forwarder_address text,

  -- on-chain config snapshot
  owner text,
  sponsor text,
  quorum bigint default 0,
  max_votes_per_voter bigint default 0,

  -- lifecycle snapshot
  state text not null default 'Inactive'
    check (state in ('Inactive','Active','Ended','Closed')),
  current_round int not null default 0,

  -- registry version pattern snapshot (for O(1) reset)
  voter_registry_version bigint not null default 0,
  candidate_registry_version bigint not null default 0,

  -- pool stats snapshot
  total_credits_in_system bigint not null default 0,
  available_credits_pool bigint not null default 0,
  total_credits_granted bigint not null default 0,
  total_credits_used bigint not null default 0,

  -- counts (derived)
  voter_count int not null default 0,
  candidate_count int not null default 0,

  -- vault balances snapshot
  deposit_balance_wei numeric(78,0) not null default 0,

  -- provenance
  created_block bigint,
  created_tx_hash text,
  created_log_index int,
  last_synced_block bigint not null default 0,
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(chain_id, address)
);

drop trigger if exists trg_rooms_updated on public.rooms;
create trigger trg_rooms_updated
before update on public.rooms
for each row execute function public.set_updated_at();

create index if not exists idx_rooms_chain_state
  on public.rooms(chain_id, state);

-- 5.2 VOTERS
create table if not exists public.voters (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  voter_address text not null,

  -- on-chain snapshot
  credit bigint not null default 0,
  has_voted boolean not null default false,
  last_voted_round int not null default 0,

  -- registry version + lifecycle
  registry_version bigint not null default 0,
  is_active boolean not null default true,
  added_block bigint,
  removed_block bigint,
  last_vote_tx_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(chain_id, room_address, voter_address),
  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

drop trigger if exists trg_voters_updated on public.voters;
create trigger trg_voters_updated
before update on public.voters
for each row execute function public.set_updated_at();

create index if not exists idx_voters_room_active
  on public.voters (chain_id, room_address, is_active);

-- 5.3 CANDIDATES
create table if not exists public.candidates (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  candidate_id int not null,               -- on-chain id (if exists)
  name text not null,
  metadata jsonb not null default '{}'::jsonb,

  -- on-chain snapshot
  vote_count bigint not null default 0,

  -- registry version + lifecycle
  registry_version bigint not null default 0,
  is_active boolean not null default true,
  added_block bigint,
  removed_block bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(chain_id, room_address, candidate_id),
  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

drop trigger if exists trg_candidates_updated on public.candidates;
create trigger trg_candidates_updated
before update on public.candidates
for each row execute function public.set_updated_at();

create index if not exists idx_candidates_room_active
  on public.candidates (chain_id, room_address, is_active);

-- 5.4 VOTE HISTORY (append-only)
create table if not exists public.vote_history (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  round int not null,
  voter_address text not null,
  candidate_id int not null,
  weight bigint not null default 1,

  action_id text,                          -- if your contracts have actionId
  tx_hash text,
  block_number bigint,
  block_time timestamptz,

  created_at timestamptz not null default now(),

  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

create index if not exists idx_vote_history_room_round
  on public.vote_history (chain_id, room_address, round desc);

create index if not exists idx_vote_history_voter
  on public.vote_history (chain_id, room_address, voter_address);

create index if not exists idx_vote_history_tx
  on public.vote_history (chain_id, tx_hash);

-- 5.5 SETTLEMENTS / WITHDRAWALS (append-only)
create table if not exists public.settlements (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  round int not null,

  winner_candidate_id int,
  charged_amount_wei numeric(78,0) not null default 0,
  platform_fee_wei numeric(78,0) not null default 0,

  action_id text,
  tx_hash text,
  block_number bigint,
  block_time timestamptz,

  created_at timestamptz not null default now(),

  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

create index if not exists idx_settlements_room_round
  on public.settlements (chain_id, room_address, round desc);

-- 5.6 ROUND SUMMARY (mutable per round; derived from events)
create table if not exists public.room_rounds (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  round int not null,

  state text not null default 'Inactive'
    check (state in ('Inactive','Active','Ended','Closed')),

  started_block bigint,
  ended_block bigint,
  closed_block bigint,
  start_tx_hash text,
  end_tx_hash text,
  close_tx_hash text,

  winner_candidate_id int,
  winner_name text,
  winner_votes bigint,
  total_vote_weight bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(chain_id, room_address, round),
  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

drop trigger if exists trg_room_rounds_updated on public.room_rounds;
create trigger trg_room_rounds_updated
before update on public.room_rounds
for each row execute function public.set_updated_at();

create index if not exists idx_room_rounds_room_round
  on public.room_rounds (chain_id, room_address, round desc);

-- 5.7 VAULT SNAPSHOT (optional, for dashboard)
create table if not exists public.vault_snapshot (
  id bigserial primary key,
  chain_id bigint not null default 11155111 references public.chains(chain_id),
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

  created_at timestamptz not null default now()
);

create index if not exists idx_vault_snapshot_chain_block
  on public.vault_snapshot (chain_id, vault_address, block_number desc);

-- =========================================================
-- 6) DERIVED COUNTERS (DB triggers for UI convenience)
--    These run ONLY when rows change in Supabase (not on-chain directly)
-- =========================================================
create or replace function public.recompute_room_counters(p_chain bigint, p_room text)
returns void as $$
begin
  update public.rooms r set
    voter_count = (select count(*) from public.voters v
                  where v.chain_id = p_chain and v.room_address = p_room and v.is_active = true),
    candidate_count = (select count(*) from public.candidates c
                      where c.chain_id = p_chain and c.room_address = p_room and c.is_active = true),
    updated_at = now()
  where r.chain_id = p_chain and r.address = p_room;
end;
$$ language plpgsql;

create or replace function public.trg_voters_recount()
returns trigger as $$
declare
  _chain bigint;
  _room text;
begin
  _chain := coalesce(new.chain_id, old.chain_id);
  _room := coalesce(new.room_address, old.room_address);
  perform public.recompute_room_counters(_chain, _room);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists voters_recount_after on public.voters;
create trigger voters_recount_after
after insert or update or delete on public.voters
for each row execute function public.trg_voters_recount();

create or replace function public.trg_candidates_recount()
returns trigger as $$
declare
  _chain bigint;
  _room text;
begin
  _chain := coalesce(new.chain_id, old.chain_id);
  _room := coalesce(new.room_address, old.room_address);
  perform public.recompute_room_counters(_chain, _room);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists candidates_recount_after on public.candidates;
create trigger candidates_recount_after
after insert or update or delete on public.candidates
for each row execute function public.trg_candidates_recount();

-- =========================================================
-- 7) ROW LEVEL SECURITY (recommended defaults)
-- =========================================================
alter table public.chains enable row level security;
alter table public.contract_registry enable row level security;
alter table public.chain_events enable row level security;
alter table public.sync_status enable row level security;

alter table public.rooms enable row level security;
alter table public.voters enable row level security;
alter table public.candidates enable row level security;
alter table public.vote_history enable row level security;
alter table public.settlements enable row level security;
alter table public.room_rounds enable row level security;
alter table public.vault_snapshot enable row level security;

-- Public read for UI (adjust as you like)
create policy "public read rooms" on public.rooms
for select to public using (true);

create policy "public read voters" on public.voters
for select to public using (true);

create policy "public read candidates" on public.candidates
for select to public using (true);

create policy "public read vote_history" on public.vote_history
for select to public using (true);

create policy "public read settlements" on public.settlements
for select to public using (true);

create policy "public read room_rounds" on public.room_rounds
for select to public using (true);

create policy "public read vault_snapshot" on public.vault_snapshot
for select to public using (true);

-- Lock down write access to service_role only
create policy "service_role full access chains" on public.chains
for all to service_role using (true);

create policy "service_role full access contract_registry" on public.contract_registry
for all to service_role using (true);

create policy "service_role full access chain_events" on public.chain_events
for all to service_role using (true);

create policy "service_role full access sync_status" on public.sync_status
for all to service_role using (true);

create policy "service_role full access rooms" on public.rooms
for all to service_role using (true);

create policy "service_role full access voters" on public.voters
for all to service_role using (true);

create policy "service_role full access candidates" on public.candidates
for all to service_role using (true);

create policy "service_role full access vote_history" on public.vote_history
for all to service_role using (true);

create policy "service_role full access settlements" on public.settlements
for all to service_role using (true);

create policy "service_role full access room_rounds" on public.room_rounds
for all to service_role using (true);

create policy "service_role full access vault_snapshot" on public.vault_snapshot
for all to service_role using (true);

-- Optional: allow authenticated users to insert "manual refresh request" into sync_status?
-- Better approach: create a dedicated RPC function with security definer.
-- Keeping it locked for now.

-- =========================================================
-- DONE
-- =========================================================
