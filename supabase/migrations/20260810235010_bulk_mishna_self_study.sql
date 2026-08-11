-- Atomically record manual self-study for one canonical perek or masechta.
-- The API resolves the public scope to a contiguous global-index range; the
-- database enforces today's largest canonical masechta (Kelim, 254).

create or replace function public.mark_mishna_self_studied_range(
  p_start_global_index integer,
  p_end_global_index integer
)
returns table (
  user_id uuid,
  global_index integer,
  listened_at timestamptz,
  self_studied_at timestamptz,
  cycle_completed_at timestamptz,
  learned_at timestamptz,
  learned_by_listening boolean,
  learned_by_self_study boolean,
  learned_by_cycle boolean,
  learned boolean,
  newly_self_studied integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_inserted_count integer := 0;
  v_self_studied_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_start_global_index is null
     or p_end_global_index is null
     or p_start_global_index not between 1 and 4192
     or p_end_global_index not between 1 and 4192
     or p_start_global_index > p_end_global_index
     or p_end_global_index::bigint - p_start_global_index::bigint + 1 > 254 then
    raise exception 'invalid bulk Mishnah progress range' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.mishna_users where id = v_user_id
  ) then
    raise exception 'progress profile missing' using errcode = '23503';
  end if;

  insert into public.mishna_manual_progress as manual (
    user_id,
    global_index,
    self_studied_at
  )
  select
    v_user_id,
    generated.global_index,
    v_self_studied_at
  from pg_catalog.generate_series(
    p_start_global_index,
    p_end_global_index
  ) as generated(global_index)
  on conflict on constraint mishna_manual_progress_pkey do nothing;

  get diagnostics v_inserted_count = row_count;

  if (
    select count(*)
    from public.mishna_canonical_progress as canonical
    where canonical.user_id = v_user_id
      and canonical.global_index between p_start_global_index and p_end_global_index
  ) <> p_end_global_index::bigint - p_start_global_index::bigint + 1 then
    raise exception 'canonical progress range incomplete' using errcode = 'P0001';
  end if;

  return query
  select
    canonical.user_id,
    canonical.global_index,
    canonical.listened_at,
    canonical.self_studied_at,
    canonical.cycle_completed_at,
    canonical.learned_at,
    canonical.learned_by_listening,
    canonical.learned_by_self_study,
    canonical.learned_by_cycle,
    canonical.learned,
    v_inserted_count as newly_self_studied
  from public.mishna_canonical_progress as canonical
  where canonical.user_id = v_user_id
    and canonical.global_index between p_start_global_index and p_end_global_index
  order by canonical.global_index;
end
$function$;

revoke all on function public.mark_mishna_self_studied_range(integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.mark_mishna_self_studied_range(integer, integer)
to authenticated;
