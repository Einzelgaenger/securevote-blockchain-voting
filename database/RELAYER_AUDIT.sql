-- 1) Simpan alamat relayer (untuk audit gasless voting)
alter table public.vote_history
add column if not exists relayer_address text;

-- 2) Simpan tx.from (EOA relayer atau user biasa)
alter table public.chain_events
add column if not exists tx_from text;

-- Optional index (kalau mau analytics gasless)
create index if not exists idx_vote_history_relayer
on public.vote_history (relayer_address);

create index if not exists idx_chain_events_tx_from
on public.chain_events (tx_from);
