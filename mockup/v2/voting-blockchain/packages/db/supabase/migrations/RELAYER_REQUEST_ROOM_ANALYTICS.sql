-- =========================================================
-- FINAL ADD-ONS (from scratch)
-- 1) Room flags: is_active / is_archived
-- 2) relayer_requests: anti-spam + idempotency + audit
-- 3) Unique vote: 1 voter per round
-- 4) Analytics views + optional materialized view (no RLS, use GRANT/REVOKE with TABLE)
-- Safe to run multiple times
-- =========================================================


-- ---------------------------------------------------------
-- 1) ROOM FLAGS
-- ---------------------------------------------------------
alter table public.rooms
  add column if not exists is_active boolean not null default true,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists idx_rooms_active_archived
  on public.rooms (chain_id, is_active, is_archived);


-- ---------------------------------------------------------
-- 2) RELAYER REQUESTS
-- ---------------------------------------------------------
create table if not exists public.relayer_requests (
  id uuid primary key default gen_random_uuid(),

  chain_id bigint not null default 11155111 references public.chains(chain_id),
  room_address text not null,
  voter_address text not null,

  -- request intent
  round int,                        -- optional if known at request-time
  candidate_id int not null,

  -- meta-tx payload / audit
  forwarder_address text,
  target_address text,              -- VotingRoom
  request jsonb not null default '{}'::jsonb,
  signature text not null,

  -- idempotency keys
  action_id text,                   -- optional if computed/known
  request_hash text not null,       -- hash(chain, room, voter, round, candidate, nonce, deadline...)

  -- lifecycle
  status text not null default 'received'
    check (status in ('received','verified','rejected','broadcasted','mined','failed')),
  reject_reason text,

  -- tx result
  tx_hash text,
  relayer_address text,
  gas_used bigint,
  effective_gas_price numeric(78,0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (chain_id, room_address) references public.rooms(chain_id, address) on delete cascade
);

-- updated_at trigger (assumes public.set_updated_at() exists)
drop trigger if exists trg_relayer_requests_updated on public.relayer_requests;
create trigger trg_relayer_requests_updated
before update on public.relayer_requests
for each row execute function public.set_updated_at();

-- Strong idempotency
create unique index if not exists uq_relayer_requests_request_hash
  on public.relayer_requests (chain_id, request_hash);

-- Helpful indexes
create index if not exists idx_relayer_requests_room_voter_time
  on public.relayer_requests (chain_id, room_address, voter_address, created_at desc);

create index if not exists idx_relayer_requests_status_time
  on public.relayer_requests (status, created_at desc);

-- RLS (optional: public read)
alter table public.relayer_requests enable row level security;

drop policy if exists "public read relayer_requests" on public.relayer_requests;
create policy "public read relayer_requests"
  on public.relayer_requests for select to public
  using (true);

drop policy if exists "service_role full access relayer_requests" on public.relayer_requests;
create policy "service_role full access relayer_requests"
  on public.relayer_requests for all to service_role
  using (true);


-- ---------------------------------------------------------
-- 3) UNIQUE VOTE PER (chain, room, round, voter)
-- NOTE: only if 1 voter = 1 vote per round
-- ---------------------------------------------------------
create unique index if not exists uq_vote_once_per_round
  on public.vote_history (chain_id, room_address, round, voter_address);


-- ---------------------------------------------------------
-- 4) ANALYTICS VIEWS (for UI)
-- ---------------------------------------------------------

-- gasless stats per room
create or replace view public.v_gasless_stats_room as
select
  chain_id,
  room_address,
  count(*) filter (where relayer_address is not null) as gasless_votes,
  count(*) as total_votes,
  round(
    (count(*) filter (where relayer_address is not null)::numeric / nullif(count(*)::numeric,0)) * 100,
    2
  ) as gasless_percent,
  max(block_time) as last_vote_time
from public.vote_history
group by chain_id, room_address;

-- gasless stats per voter
create or replace view public.v_gasless_stats_voter as
select
  chain_id,
  voter_address,
  count(*) filter (where relayer_address is not null) as gasless_votes,
  count(*) as total_votes,
  round(
    (count(*) filter (where relayer_address is not null)::numeric / nullif(count(*)::numeric,0)) * 100,
    2
  ) as gasless_percent,
  max(block_time) as last_vote_time
from public.vote_history
group by chain_id, voter_address;

-- votes per room per day (trend)
create or replace view public.v_votes_daily as
select
  chain_id,
  room_address,
  date_trunc('day', block_time) as day,
  count(*) as votes,
  count(*) filter (where relayer_address is not null) as gasless_votes,
  sum(weight) as total_weight
from public.vote_history
where block_time is not null
group by chain_id, room_address, date_trunc('day', block_time);


-- ---------------------------------------------------------
-- 5) OPTIONAL MATERIALIZED VIEW (backend only)
-- IMPORTANT:
-- - Materialized view cannot have RLS
-- - Access control uses GRANT/REVOKE ON TABLE (not "materialized view")
-- ---------------------------------------------------------
create materialized view if not exists public.mv_room_vote_totals as
select
  chain_id,
  room_address,
  round,
  count(*) as votes,
  sum(weight) as total_weight,
  max(block_time) as last_vote_time
from public.vote_history
group by chain_id, room_address, round;

create index if not exists idx_mv_room_vote_totals
  on public.mv_room_vote_totals (chain_id, room_address, round desc);

-- Restrict MV access to service_role only
-- NOTE: use "ON TABLE" (Postgres syntax)
revoke all on table public.mv_room_vote_totals from anon, authenticated;
grant select on table public.mv_room_vote_totals to service_role;
grant all on table public.mv_room_vote_totals to postgres;

-- Refresh function (safe, non-concurrent)
create or replace function public.refresh_mv_room_vote_totals()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view public.mv_room_vote_totals;
end;
$$;
