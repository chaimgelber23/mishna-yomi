-- Canonical Mishnah progress without duplicating the 4,192-item catalog.
-- Audio, manual self-study, and custom-cycle completion remain independent
-- evidence sources and are deduplicated by mishna_canonical_progress.

-- ---------------------------------------------------------------------------
-- Episode-to-Mishnah mapping and manual progress
-- ---------------------------------------------------------------------------

create table public.mishna_episode_units (
  episode_id uuid not null
    references public.mishna_episodes(id) on delete cascade,
  global_index integer not null
    check (global_index between 1 and 4192),
  sequence smallint not null
    check (sequence between 1 and 2),
  mapping_source text not null
    check (btrim(mapping_source) <> ''),
  verified_at timestamptz not null default now(),
  primary key (episode_id, global_index),
  unique (episode_id, sequence)
);

create index mishna_episode_units_global_index_idx
  on public.mishna_episode_units (global_index, sequence);

create table public.mishna_manual_progress (
  user_id uuid not null
    references public.mishna_users(id) on delete cascade,
  global_index integer not null
    check (global_index between 1 and 4192),
  self_studied_at timestamptz not null default now(),
  primary key (user_id, global_index)
);

create index mishna_manual_progress_global_index_idx
  on public.mishna_manual_progress (global_index);

-- ---------------------------------------------------------------------------
-- Existing source-table integrity
-- ---------------------------------------------------------------------------

do $migration_checks$
begin
  if exists (
    select 1
    from public.mishna_progress
    where user_id is null
       or episode_id is null
       or completed is null
       or position_seconds is null
       or position_seconds < 0
       or (completed and completed_at is null)
       or (not completed and completed_at is not null)
  ) then
    raise exception 'mishna_progress contains rows that violate the new invariants'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.mishna_cycle_progress cp
    join public.mishna_cycles c on c.id = cp.cycle_id
    where cp.user_id <> c.user_id
       or cp.completed_at is null
       or cp.day_number < 1
       or cp.day_number > ceil((4192 - c.start_index)::numeric / c.pace)
  ) then
    raise exception 'mishna_cycle_progress contains invalid owner or day data'
      using errcode = '23514';
  end if;
end
$migration_checks$;

alter table public.mishna_progress
  alter column user_id set not null,
  alter column episode_id set not null,
  alter column completed set not null,
  alter column position_seconds set not null;

alter table public.mishna_progress
  add constraint mishna_progress_position_nonnegative
    check (position_seconds >= 0),
  add constraint mishna_progress_completion_timestamp_consistent
    check (
      (completed and completed_at is not null)
      or
      (not completed and completed_at is null)
    );

alter table public.mishna_cycles
  drop constraint if exists mishna_cycles_start_index_check;

alter table public.mishna_cycles
  add constraint mishna_cycles_start_index_check
    check (start_index between 0 and 4191),
  add constraint mishna_cycles_id_user_id_unique
    unique (id, user_id);

alter table public.mishna_cycle_progress
  drop constraint if exists mishna_cycle_progress_day_number_check,
  drop constraint if exists mishna_cycle_progress_cycle_id_fkey;

alter table public.mishna_cycle_progress
  alter column completed_at set not null,
  add constraint mishna_cycle_progress_day_number_check
    check (day_number between 1 and 4192),
  add constraint mishna_cycle_progress_cycle_owner_fkey
    foreign key (cycle_id, user_id)
    references public.mishna_cycles(id, user_id)
    on delete restrict;

create or replace function public.protect_mishna_cycle_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id then
    raise exception 'cycle identity and owner cannot be changed'
      using errcode = '22023';
  end if;

  if (
    new.start_index is distinct from old.start_index
    or new.pace is distinct from old.pace
  ) and exists (
    select 1
    from public.mishna_cycle_progress cp
    where cp.cycle_id = old.id
  ) then
    raise exception 'cycle geometry cannot change after progress is recorded'
      using errcode = '22023';
  end if;

  return new;
end
$function$;

create trigger protect_mishna_cycle_history_before_update
before update on public.mishna_cycles
for each row execute function public.protect_mishna_cycle_history();

-- ---------------------------------------------------------------------------
-- RLS and least-privilege grants
-- ---------------------------------------------------------------------------

alter table public.mishna_episode_units enable row level security;
alter table public.mishna_manual_progress enable row level security;

create policy "Episode Mishnah mappings are publicly readable"
on public.mishna_episode_units
for select
to anon, authenticated
using (true);

create policy "Users can read own manual progress"
on public.mishna_manual_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own progress" on public.mishna_progress;
drop policy if exists "Users can write own progress" on public.mishna_progress;
drop policy if exists "Users can update own progress" on public.mishna_progress;
drop policy if exists "Service role full access to progress" on public.mishna_progress;

create policy "Users can read own progress"
on public.mishna_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own cycles" on public.mishna_cycles;
drop policy if exists "Users can insert own cycles" on public.mishna_cycles;
drop policy if exists "Users can update own cycles" on public.mishna_cycles;
drop policy if exists "Users can delete own cycles" on public.mishna_cycles;
drop policy if exists "Service role full access to cycles" on public.mishna_cycles;

create policy "Users can read own cycles"
on public.mishna_cycles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own cycles"
on public.mishna_cycles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own cycles"
on public.mishna_cycles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own empty cycles"
on public.mishna_cycles
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own cycle progress" on public.mishna_cycle_progress;
drop policy if exists "Users can insert own cycle progress" on public.mishna_cycle_progress;
drop policy if exists "Users can update own cycle progress" on public.mishna_cycle_progress;
drop policy if exists "Users can delete own cycle progress" on public.mishna_cycle_progress;
drop policy if exists "Service role full access to cycle progress" on public.mishna_cycle_progress;

create policy "Users can read own cycle progress"
on public.mishna_cycle_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.mishna_episode_units
from anon, authenticated, service_role;
grant select on table public.mishna_episode_units
to anon, authenticated, service_role;

revoke all on table public.mishna_manual_progress
from anon, authenticated, service_role;
grant select on table public.mishna_manual_progress
to authenticated, service_role;

revoke all on table public.mishna_progress
from anon, authenticated, service_role;
grant select on table public.mishna_progress
to authenticated, service_role;

revoke all on table public.mishna_cycle_progress
from anon, authenticated, service_role;
grant select on table public.mishna_cycle_progress
to authenticated, service_role;

revoke all on table public.mishna_cycles
from anon, authenticated, service_role;
grant select, insert, update, delete on table public.mishna_cycles
to authenticated;
grant select on table public.mishna_cycles
to service_role;

-- ---------------------------------------------------------------------------
-- Source-specific mutation RPCs
-- ---------------------------------------------------------------------------

create or replace function public.save_mishna_episode_position(
  p_episode_id uuid,
  p_position_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_episode_id is null
     or p_position_seconds is null
     or p_position_seconds < 0 then
    raise exception 'invalid episode position' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.mishna_users where id = v_user_id
  ) then
    raise exception 'progress profile missing' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.mishna_episodes where id = p_episode_id
  ) then
    raise exception 'episode not found' using errcode = '22023';
  end if;

  insert into public.mishna_progress (
    user_id,
    episode_id,
    completed,
    position_seconds,
    completed_at
  ) values (
    v_user_id,
    p_episode_id,
    false,
    p_position_seconds,
    null
  )
  on conflict (user_id, episode_id)
  do update set position_seconds = excluded.position_seconds;
end
$function$;

create or replace function public.set_mishna_episode_listened(
  p_episode_id uuid,
  p_listened boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_mapping_count integer;
  v_distinct_indices integer;
  v_distinct_sequences integer;
  v_min_index integer;
  v_max_index integer;
  v_min_sequence integer;
  v_max_sequence integer;
  v_min_offset integer;
  v_max_offset integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_episode_id is null or p_listened is null then
    raise exception 'episode and listened state are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.mishna_users where id = v_user_id
  ) then
    raise exception 'progress profile missing' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.mishna_episodes where id = p_episode_id
  ) then
    raise exception 'episode not found' using errcode = '22023';
  end if;

  if p_listened then
    select
      count(*)::integer,
      count(distinct global_index)::integer,
      count(distinct sequence)::integer,
      min(global_index),
      max(global_index),
      min(sequence),
      max(sequence),
      min(global_index - sequence),
      max(global_index - sequence)
    into
      v_mapping_count,
      v_distinct_indices,
      v_distinct_sequences,
      v_min_index,
      v_max_index,
      v_min_sequence,
      v_max_sequence,
      v_min_offset,
      v_max_offset
    from public.mishna_episode_units
    where episode_id = p_episode_id;

    if v_mapping_count not in (1, 2)
       or v_distinct_indices <> v_mapping_count
       or v_distinct_sequences <> v_mapping_count
       or v_min_sequence <> 1
       or v_max_sequence <> v_mapping_count
       or v_max_index - v_min_index <> v_mapping_count - 1
       or v_min_offset <> v_max_offset then
      raise exception 'episode mapping is missing or invalid'
        using errcode = 'P0001';
    end if;

    insert into public.mishna_progress (
      user_id,
      episode_id,
      completed,
      position_seconds,
      completed_at
    ) values (
      v_user_id,
      p_episode_id,
      true,
      0,
      now()
    )
    on conflict (user_id, episode_id)
    do update set
      completed = true,
      completed_at = coalesce(
        public.mishna_progress.completed_at,
        excluded.completed_at
      );
  else
    update public.mishna_progress
    set completed = false,
        completed_at = null
    where user_id = v_user_id
      and episode_id = p_episode_id;
  end if;
end
$function$;

create or replace function public.set_mishna_self_studied(
  p_global_index integer,
  p_self_studied boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_global_index is null
     or p_global_index not between 1 and 4192
     or p_self_studied is null then
    raise exception 'invalid Mishnah progress mutation' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.mishna_users where id = v_user_id
  ) then
    raise exception 'progress profile missing' using errcode = '23503';
  end if;

  if p_self_studied then
    insert into public.mishna_manual_progress (
      user_id,
      global_index,
      self_studied_at
    ) values (
      v_user_id,
      p_global_index,
      now()
    )
    on conflict (user_id, global_index) do nothing;
  else
    delete from public.mishna_manual_progress
    where user_id = v_user_id
      and global_index = p_global_index;
  end if;
end
$function$;

create or replace function public.set_mishna_cycle_day_complete(
  p_cycle_id uuid,
  p_day_number integer,
  p_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_start_index integer;
  v_pace integer;
  v_total_days integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_cycle_id is null
     or p_day_number is null
     or p_completed is null then
    raise exception 'cycle, day, and completion state are required'
      using errcode = '22023';
  end if;

  select start_index, pace
  into v_start_index, v_pace
  from public.mishna_cycles
  where id = p_cycle_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'cycle not found or not owned by user'
      using errcode = '42501';
  end if;

  v_total_days := ((4192 - v_start_index) + v_pace - 1) / v_pace;
  if p_day_number < 1 or p_day_number > v_total_days then
    raise exception 'cycle day is outside this cycle'
      using errcode = '22023';
  end if;

  if p_completed then
    insert into public.mishna_cycle_progress (
      cycle_id,
      user_id,
      day_number,
      completed_at
    ) values (
      p_cycle_id,
      v_user_id,
      p_day_number,
      now()
    )
    on conflict (cycle_id, day_number) do nothing;
  else
    delete from public.mishna_cycle_progress
    where cycle_id = p_cycle_id
      and user_id = v_user_id
      and day_number = p_day_number;
  end if;
end
$function$;

-- Atomically upsert one feed episode and replace its verified mapping.
create or replace function public.sync_mishna_episode(
  p_guid text,
  p_title text,
  p_description text,
  p_audio_url text,
  p_duration_seconds integer,
  p_published_at timestamptz,
  p_tractate text,
  p_chapter_from integer,
  p_mishna_from integer,
  p_chapter_to integer,
  p_mishna_to integer,
  p_mishna_day_number integer,
  p_global_indices integer[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_episode_id uuid;
  v_mapping_count integer;
  v_min_index integer;
  v_max_index integer;
begin
  if nullif(btrim(p_guid), '') is null
     or nullif(btrim(p_title), '') is null
     or nullif(btrim(p_audio_url), '') is null
     or p_published_at is null
     or nullif(btrim(p_tractate), '') is null
     or p_chapter_from is null
     or p_mishna_from is null
     or p_chapter_to is null
     or p_mishna_to is null then
    raise exception 'episode contains missing required fields'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    min(global_index),
    max(global_index)
  into
    v_mapping_count,
    v_min_index,
    v_max_index
  from unnest(coalesce(p_global_indices, array[]::integer[]))
    as mapping(global_index);

  if v_mapping_count not in (1, 2)
     or v_min_index < 1
     or v_max_index > 4192
     or v_max_index - v_min_index <> v_mapping_count - 1
     or exists (
       select 1
       from unnest(p_global_indices) with ordinality
         as ordered_mapping(global_index, sequence)
       where global_index <> v_min_index + sequence::integer - 1
     ) then
    raise exception 'episode mapping must contain one or two ordered consecutive Mishnayot'
      using errcode = '22023';
  end if;

  insert into public.mishna_episodes (
    guid,
    title,
    description,
    audio_url,
    duration_seconds,
    published_at,
    tractate,
    chapter_from,
    mishna_from,
    chapter_to,
    mishna_to,
    mishna_day_number
  ) values (
    p_guid,
    p_title,
    p_description,
    p_audio_url,
    p_duration_seconds,
    p_published_at,
    p_tractate,
    p_chapter_from,
    p_mishna_from,
    p_chapter_to,
    p_mishna_to,
    p_mishna_day_number
  )
  on conflict (guid)
  do update set
    title = excluded.title,
    description = excluded.description,
    audio_url = excluded.audio_url,
    duration_seconds = excluded.duration_seconds,
    published_at = excluded.published_at,
    tractate = excluded.tractate,
    chapter_from = excluded.chapter_from,
    mishna_from = excluded.mishna_from,
    chapter_to = excluded.chapter_to,
    mishna_to = excluded.mishna_to,
    mishna_day_number = excluded.mishna_day_number
  returning id into v_episode_id;

  delete from public.mishna_episode_units
  where episode_id = v_episode_id;

  insert into public.mishna_episode_units (
    episode_id,
    global_index,
    sequence,
    mapping_source,
    verified_at
  )
  select
    v_episode_id,
    ordered_mapping.global_index,
    ordered_mapping.sequence::smallint,
    'resolver_v1',
    now()
  from unnest(p_global_indices) with ordinality
    as ordered_mapping(global_index, sequence)
  order by ordered_mapping.sequence;

  return v_episode_id;
end
$function$;

-- ---------------------------------------------------------------------------
-- Canonical, deduplicated read model
-- ---------------------------------------------------------------------------

create or replace view public.mishna_canonical_progress
with (security_invoker = true)
as
with source_claims as (
  select
    progress.user_id,
    mapping.global_index,
    progress.completed_at as listened_at,
    null::timestamptz as self_studied_at,
    null::timestamptz as cycle_completed_at
  from public.mishna_progress progress
  join public.mishna_episode_units mapping
    on mapping.episode_id = progress.episode_id
  where progress.completed = true

  union all

  select
    manual.user_id,
    manual.global_index,
    null::timestamptz as listened_at,
    manual.self_studied_at,
    null::timestamptz as cycle_completed_at
  from public.mishna_manual_progress manual

  union all

  select
    cycle_progress.user_id,
    expanded.global_index,
    null::timestamptz as listened_at,
    null::timestamptz as self_studied_at,
    cycle_progress.completed_at as cycle_completed_at
  from public.mishna_cycle_progress cycle_progress
  join public.mishna_cycles cycle
    on cycle.id = cycle_progress.cycle_id
   and cycle.user_id = cycle_progress.user_id
  cross join lateral generate_series(
    cycle.start_index + ((cycle_progress.day_number - 1) * cycle.pace) + 1,
    least(4192, cycle.start_index + (cycle_progress.day_number * cycle.pace))
  ) as expanded(global_index)
)
select
  user_id,
  global_index,
  min(listened_at) as listened_at,
  min(self_studied_at) as self_studied_at,
  min(cycle_completed_at) as cycle_completed_at,
  min(coalesce(listened_at, self_studied_at, cycle_completed_at)) as learned_at,
  bool_or(listened_at is not null) as learned_by_listening,
  bool_or(self_studied_at is not null) as learned_by_self_study,
  bool_or(cycle_completed_at is not null) as learned_by_cycle,
  true as learned
from source_claims
group by user_id, global_index;

revoke all on table public.mishna_canonical_progress
from anon, authenticated, service_role;
grant select on table public.mishna_canonical_progress
to authenticated, service_role;

-- Functions default to EXECUTE for PUBLIC. Make each RPC's caller explicit.
revoke all on function public.save_mishna_episode_position(uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.save_mishna_episode_position(uuid, integer)
to authenticated;

revoke all on function public.set_mishna_episode_listened(uuid, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.set_mishna_episode_listened(uuid, boolean)
to authenticated;

revoke all on function public.set_mishna_self_studied(integer, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.set_mishna_self_studied(integer, boolean)
to authenticated;

revoke all on function public.set_mishna_cycle_day_complete(uuid, integer, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.set_mishna_cycle_day_complete(uuid, integer, boolean)
to authenticated;

revoke all on function public.sync_mishna_episode(
  text, text, text, text, integer, timestamptz, text,
  integer, integer, integer, integer, integer, integer[]
)
from public, anon, authenticated, service_role;
grant execute on function public.sync_mishna_episode(
  text, text, text, text, integer, timestamptz, text,
  integer, integer, integer, integer, integer, integer[]
)
to service_role;

revoke all on function public.protect_mishna_cycle_history()
from public, anon, authenticated, service_role;
