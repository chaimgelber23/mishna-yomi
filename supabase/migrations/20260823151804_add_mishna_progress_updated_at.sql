-- A true resume target needs the time an episode was last touched. Historical
-- rows stay NULL because the old schema did not record enough information to
-- infer an honest timestamp.
alter table public.mishna_progress
  add column if not exists updated_at timestamptz;

comment on column public.mishna_progress.updated_at is
  'When playback position or listened state was last changed; NULL for untouched legacy rows.';

create or replace function public.set_mishna_progress_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end
$function$;

drop trigger if exists set_mishna_progress_updated_at_before_write
on public.mishna_progress;

create trigger set_mishna_progress_updated_at_before_write
before insert or update on public.mishna_progress
for each row execute function public.set_mishna_progress_updated_at();

-- Trigger functions are internal implementation details, not Data API RPCs.
revoke all on function public.set_mishna_progress_updated_at()
from public, anon, authenticated, service_role;
