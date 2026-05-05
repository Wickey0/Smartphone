-- MVP Supabase schema for StampLog
-- Safe to re-run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'merchant')),
  display_name text,
  avatar_key text not null default 'p01',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  location text not null,
  date text not null,
  description text not null,
  cover_color text not null default '#F4CC60',
  scan_secret text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.stamps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  img_key text not null default '01',
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.user_event_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(user_id, event_id)
);

create table if not exists public.stamp_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  stamp_id uuid not null references public.stamps(id) on delete cascade,
  collected_at timestamptz not null default now(),
  unique(user_id, event_id, stamp_id)
);

alter table public.profiles add column if not exists avatar_key text not null default 'p01';

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.stamps enable row level security;
alter table public.user_event_progress enable row level security;
alter table public.stamp_records enable row level security;

-- Automatically create a profile when a Supabase Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, display_name, avatar_key)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_key', 'p01')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Drop old policies first so this script can be re-run safely.
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "read all events" on public.events;
drop policy if exists "merchant owns events" on public.events;
drop policy if exists "read all stamps" on public.stamps;
drop policy if exists "merchant manages stamps" on public.stamps;
drop policy if exists "read own progress" on public.user_event_progress;
drop policy if exists "insert own progress" on public.user_event_progress;
drop policy if exists "update own progress" on public.user_event_progress;
drop policy if exists "read own stamp records" on public.stamp_records;
drop policy if exists "insert own stamp records" on public.stamp_records;
drop policy if exists "update own stamp records" on public.stamp_records;

-- Profiles
create policy "read own profile" on public.profiles
for select using (auth.uid() = id);

create policy "update own profile" on public.profiles
for update using (auth.uid() = id);

create policy "insert own profile" on public.profiles
for insert with check (auth.uid() = id);

-- Events
create policy "read all events" on public.events
for select using (true);

create policy "merchant owns events" on public.events
for all using (auth.uid() = merchant_id)
with check (auth.uid() = merchant_id);

-- Stamps
create policy "read all stamps" on public.stamps
for select using (true);

create policy "merchant manages stamps" on public.stamps
for all using (
  exists (
    select 1 from public.events e
    where e.id = event_id and e.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = event_id and e.merchant_id = auth.uid()
  )
);

-- Progress
create policy "read own progress" on public.user_event_progress
for select using (auth.uid() = user_id);

create policy "insert own progress" on public.user_event_progress
for insert with check (auth.uid() = user_id);

create policy "update own progress" on public.user_event_progress
for update using (auth.uid() = user_id);

-- Stamp records
create policy "read own stamp records" on public.stamp_records
for select using (auth.uid() = user_id);

create policy "insert own stamp records" on public.stamp_records
for insert with check (auth.uid() = user_id);

create policy "update own stamp records" on public.stamp_records
for update using (auth.uid() = user_id);
