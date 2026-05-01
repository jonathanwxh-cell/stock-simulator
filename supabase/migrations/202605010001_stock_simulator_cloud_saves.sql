create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null default 'auto',
  game_state jsonb not null,
  player_name text,
  difficulty text,
  current_turn integer not null default 0,
  net_worth numeric,
  is_game_over boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slot)
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty text not null,
  starting_cash numeric,
  final_net_worth numeric,
  final_grade text,
  turns_played integer,
  game_state jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  difficulty text not null,
  final_net_worth numeric not null,
  final_grade text,
  alpha numeric,
  risk_score numeric,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists game_saves_touch_updated_at on public.game_saves;
create trigger game_saves_touch_updated_at
before update on public.game_saves
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.runs enable row level security;
alter table public.leaderboard_entries enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists game_saves_select_own on public.game_saves;
create policy game_saves_select_own on public.game_saves
for select using (auth.uid() = user_id);

drop policy if exists game_saves_insert_own on public.game_saves;
create policy game_saves_insert_own on public.game_saves
for insert with check (auth.uid() = user_id);

drop policy if exists game_saves_update_own on public.game_saves;
create policy game_saves_update_own on public.game_saves
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists runs_select_own on public.runs;
create policy runs_select_own on public.runs
for select using (auth.uid() = user_id);

drop policy if exists runs_insert_own on public.runs;
create policy runs_insert_own on public.runs
for insert with check (auth.uid() = user_id);

drop policy if exists leaderboard_public_read on public.leaderboard_entries;
create policy leaderboard_public_read on public.leaderboard_entries
for select using (true);

drop policy if exists leaderboard_insert_own on public.leaderboard_entries;
create policy leaderboard_insert_own on public.leaderboard_entries
for insert with check (auth.uid() = user_id);

create index if not exists game_saves_user_updated_idx on public.game_saves(user_id, updated_at desc);
create index if not exists leaderboard_difficulty_net_worth_idx on public.leaderboard_entries(difficulty, final_net_worth desc);
