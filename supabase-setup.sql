-- ============================================================
-- Riff — database setup for new features
-- Run this in your Supabase dashboard: SQL Editor → New query
-- Safe to run more than once.
-- ============================================================

-- ---------- 1. Notifications: unread badge ----------
alter table notifications
  add column if not exists read boolean not null default false;

-- allow receivers to mark their notifications as read
drop policy if exists "Receivers can update own notifications" on notifications;
create policy "Receivers can update own notifications"
  on notifications for update
  using (auth.uid() = receiver_id);

-- ---------- 2. Profiles: bio, instruments, avatar ----------
alter table profiles
  add column if not exists bio text,
  add column if not exists instruments text[],
  add column if not exists avatar_url text;

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- ---------- 3. Delete policies (fixes silent delete failures) ----------
drop policy if exists "Authors can delete own comments" on comments;
create policy "Authors can delete own comments"
  on comments for delete
  using (auth.uid() = author_id);

drop policy if exists "Authors can delete own posts" on posts;
create policy "Authors can delete own posts"
  on posts for delete
  using (auth.uid() = author_id);

-- ---------- 4. Practice log ----------
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  instrument text not null,
  duration_minutes int not null check (duration_minutes > 0),
  notes text,
  practised_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table practice_sessions enable row level security;

drop policy if exists "Anyone can view practice sessions" on practice_sessions;
create policy "Anyone can view practice sessions"
  on practice_sessions for select
  using (true);

drop policy if exists "Users can log own sessions" on practice_sessions;
create policy "Users can log own sessions"
  on practice_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sessions" on practice_sessions;
create policy "Users can delete own sessions"
  on practice_sessions for delete
  using (auth.uid() = user_id);

-- ---------- 5. Avatar storage bucket ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- 6. Auto-create profile on signup ----------
-- Fixes the orphaned-account edge case: the profile row is created by the
-- database (from the username passed in signup metadata) even when email
-- confirmation delays the user's first session.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'user_' || left(new.id::text, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 7. Posts: genre, instruments, WIP/finished status ----------
alter table posts
  add column if not exists genre text,
  add column if not exists instruments text[],
  add column if not exists status text not null default 'finished'
    check (status in ('wip', 'finished'));

create index if not exists posts_genre_idx on posts (genre);
create index if not exists posts_status_idx on posts (status);

-- ---------- 8. Practice goals ----------
create table if not exists practice_goals (
  user_id uuid primary key references profiles(id) on delete cascade,
  weekly_minutes_target int not null check (weekly_minutes_target > 0),
  updated_at timestamptz not null default now()
);

alter table practice_goals enable row level security;

drop policy if exists "Anyone can view practice goals" on practice_goals;
create policy "Anyone can view practice goals"
  on practice_goals for select
  using (true);

drop policy if exists "Users can set own goal" on practice_goals;
create policy "Users can set own goal"
  on practice_goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own goal" on practice_goals;
create policy "Users can update own goal"
  on practice_goals for update
  using (auth.uid() = user_id);
