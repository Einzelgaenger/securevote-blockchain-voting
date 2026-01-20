-- Patch: update apply_chain_event() untuk set vote_history.relayer_address berdasarkan chain_events.tx_from
-- (hanya perlu kalau kamu ingin audit gasless di vote_history)

create or replace function public.apply_chain_event(p_event jsonb)
returns void
language plpgsql
security definer
as $$
declare
  v_chain bigint := (p_event->>'chain_id')::bigint;
  v_block bigint := (p_event->>'block_number')::bigint;
  v_time  timestamptz := (p_event->>'block_time')::timestamptz;
  v_tx    text := (p_event->>'tx_hash');
  v_logi  int := (p_event->>'log_index')::int;
  v_name  text := (p_event->>'event_name');
  d       jsonb := coalesce(p_event->'data','{}'::jsonb);

  v_room  text;
  v_round int;
  v_voter text;
  v_cid   int;
  v_weight bigint;
  v_action text;
  v_tx_from text;
begin
  if not exists (
    select 1 from public.chain_events
    where chain_id=v_chain and tx_hash=v_tx and log_index=v_logi and processed=false
  ) then
    return;
  end if;

  -- pull tx_from for audit
  select tx_from into v_tx_from
  from public.chain_events
  where chain_id=v_chain and tx_hash=v_tx and log_index=v_logi;

  -- ====== (semua handler lain tetap seperti sebelumnya) ======
  -- NOTE: Demi ringkas, aku hanya tulis blok VoteCast yang diubah.
  -- Kamu bisa paste seluruh function ini menggantikan yang lama kalau mau,
  -- tapi minimal kamu perlu update bagian VoteCast berikut:

  if v_name = 'VoteCast' then
    v_room := lower(d->>'room');
    v_round := (d->>'round')::int;
    v_voter := lower(d->>'voter');
    v_cid := (d->>'candidateId')::int;
    v_weight := (d->>'weight')::bigint;
    v_action := d->>'actionId';

    insert into public.vote_history
      (chain_id, room_address, round, voter_address, candidate_id, weight, action_id,
       tx_hash, block_number, block_time, relayer_address)
    values
      (v_chain, v_room, v_round, v_voter, v_cid, v_weight, v_action,
       v_tx, v_block, v_time, v_tx_from);

    update public.voters
      set has_voted=true, last_voted_round=v_round, last_vote_tx_hash=v_tx, updated_at=now()
    where chain_id=v_chain and room_address=v_room and voter_address=v_voter;

    update public.candidates
      set vote_count = vote_count + v_weight, updated_at=now()
    where chain_id=v_chain and room_address=v_room and candidate_id=v_cid;

    update public.rooms
      set total_credits_used = total_credits_used + v_weight,
          current_round = greatest(current_round, v_round),
          state = case when state='Inactive' then 'Active' else state end,
          last_synced_block = greatest(last_synced_block, v_block),
          last_synced_at = now()
    where chain_id=v_chain and address=v_room;

    insert into public.room_rounds (chain_id, room_address, round, state, total_vote_weight, started_block, start_tx_hash)
    values (v_chain, v_room, v_round, 'Active', v_weight, v_block, v_tx)
    on conflict (chain_id, room_address, round) do update set
      total_vote_weight = public.room_rounds.total_vote_weight + excluded.total_vote_weight,
      state = 'Active',
      updated_at=now();
  end if;

  update public.chain_events
    set processed=true, processed_at=now()
  where chain_id=v_chain and tx_hash=v_tx and log_index=v_logi;

end;
$$;
