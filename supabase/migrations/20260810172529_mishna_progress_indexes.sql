-- Supporting indexes for foreign-key maintenance and episode cleanup.
create index if not exists mishna_cycle_progress_cycle_owner_idx
  on public.mishna_cycle_progress (cycle_id, user_id);

create index if not exists mishna_progress_episode_id_idx
  on public.mishna_progress (episode_id);
