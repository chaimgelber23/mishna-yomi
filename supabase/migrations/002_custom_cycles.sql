-- Mishna Yomi Database Schema
-- Migration 002: Custom learning cycles

-- A user's personal learning cycle (start anywhere, any pace, optional target date)
create table if not exists mishna_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references mishna_users(id) on delete cascade,
  name text not null default 'My Cycle',
  start_date date not null default current_date,
  pace integer not null default 2 check (pace >= 1 and pace <= 100),
  start_index integer not null default 0 check (start_index >= 0),
  target_date date,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists mishna_cycles_user_id_idx on mishna_cycles(user_id);
create index if not exists mishna_cycles_active_idx on mishna_cycles(user_id, is_active) where is_active = true;

-- Per-day completion within a cycle
create table if not exists mishna_cycle_progress (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references mishna_cycles(id) on delete cascade,
  user_id uuid not null references mishna_users(id) on delete cascade,
  day_number integer not null check (day_number >= 1),
  completed_at timestamptz default now(),
  unique(cycle_id, day_number)
);

create index if not exists mishna_cycle_progress_cycle_idx on mishna_cycle_progress(cycle_id);
create index if not exists mishna_cycle_progress_user_idx on mishna_cycle_progress(user_id);

-- RLS Policies

alter table mishna_cycles enable row level security;
create policy "Users can read own cycles" on mishna_cycles
  for select using (auth.uid() = user_id);
create policy "Users can insert own cycles" on mishna_cycles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own cycles" on mishna_cycles
  for update using (auth.uid() = user_id);
create policy "Users can delete own cycles" on mishna_cycles
  for delete using (auth.uid() = user_id);
create policy "Service role full access to cycles" on mishna_cycles
  for all using (auth.role() = 'service_role');

alter table mishna_cycle_progress enable row level security;
create policy "Users can read own cycle progress" on mishna_cycle_progress
  for select using (auth.uid() = user_id);
create policy "Users can insert own cycle progress" on mishna_cycle_progress
  for insert with check (auth.uid() = user_id);
create policy "Users can update own cycle progress" on mishna_cycle_progress
  for update using (auth.uid() = user_id);
create policy "Users can delete own cycle progress" on mishna_cycle_progress
  for delete using (auth.uid() = user_id);
create policy "Service role full access to cycle progress" on mishna_cycle_progress
  for all using (auth.role() = 'service_role');
