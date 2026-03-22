-- Mishna Yomi Database Schema
-- Migration 001: Core tables

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Episodes synced from RSS feed
create table if not exists mishna_episodes (
  id uuid primary key default gen_random_uuid(),
  guid text unique not null,
  title text not null,
  description text,
  audio_url text not null,
  duration_seconds integer,
  published_at timestamptz not null,
  tractate text,
  chapter_from integer,
  mishna_from integer,
  chapter_to integer,
  mishna_to integer,
  mishna_day_number integer, -- sequential day number in the cycle
  created_at timestamptz default now()
);

create index if not exists mishna_episodes_published_at_idx on mishna_episodes(published_at desc);
create index if not exists mishna_episodes_tractate_idx on mishna_episodes(tractate);
create index if not exists mishna_episodes_day_number_idx on mishna_episodes(mishna_day_number);

-- User profiles / preferences
create table if not exists mishna_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  daily_reminder_time time,
  daily_reminder_tz text default 'America/New_York',
  learning_mode text default 'follow_rabbi',
  subscribed_to_emails boolean default true,
  created_at timestamptz default now()
);

-- Quick email subscribers (no auth required)
create table if not exists mishna_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  daily_reminder_time time default '08:00:00',
  daily_reminder_tz text default 'America/New_York',
  subscribed boolean default true,
  unsubscribe_token text default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now()
);

create index if not exists mishna_email_subscribers_email_idx on mishna_email_subscribers(email);
create index if not exists mishna_email_subscribers_reminder_time_idx on mishna_email_subscribers(daily_reminder_time) where subscribed = true;

-- User progress per episode
create table if not exists mishna_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references mishna_users(id) on delete cascade,
  episode_id uuid references mishna_episodes(id) on delete cascade,
  completed boolean default false,
  position_seconds integer default 0,
  completed_at timestamptz,
  unique(user_id, episode_id)
);

create index if not exists mishna_progress_user_id_idx on mishna_progress(user_id);
create index if not exists mishna_progress_completed_idx on mishna_progress(user_id, completed);

-- RLS Policies

-- Episodes: publicly readable
alter table mishna_episodes enable row level security;
create policy "Episodes are publicly readable" on mishna_episodes
  for select using (true);
create policy "Service role can manage episodes" on mishna_episodes
  for all using (auth.role() = 'service_role');

-- Users: own row only
alter table mishna_users enable row level security;
create policy "Users can read own profile" on mishna_users
  for select using (auth.uid() = id);
create policy "Users can update own profile" on mishna_users
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on mishna_users
  for insert with check (auth.uid() = id);
create policy "Service role full access to users" on mishna_users
  for all using (auth.role() = 'service_role');

-- Progress: own rows only
alter table mishna_progress enable row level security;
create policy "Users can read own progress" on mishna_progress
  for select using (auth.uid() = user_id);
create policy "Users can write own progress" on mishna_progress
  for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on mishna_progress
  for update using (auth.uid() = user_id);
create policy "Service role full access to progress" on mishna_progress
  for all using (auth.role() = 'service_role');

-- Email subscribers: service role only (no user auth needed for subscribe)
alter table mishna_email_subscribers enable row level security;
create policy "Service role manages subscribers" on mishna_email_subscribers
  for all using (auth.role() = 'service_role');
create policy "Anyone can insert subscriber" on mishna_email_subscribers
  for insert with check (true);
