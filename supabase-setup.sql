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

-- ---------- 9. Private feedback comments ----------
-- Comments on feedback posts are private: only the comment's author
-- (the reviewer) and the post's author (the person asking for feedback)
-- can read them. Comments on video/discussion posts stay public.
-- A RESTRICTIVE policy is AND-ed with the existing permissive select
-- policy, so it works regardless of that policy's name.

-- parent_id must exist before the policy below can reference it
alter table comments
  add column if not exists parent_id uuid references comments(id) on delete cascade;

create index if not exists comments_parent_id_idx on comments (parent_id);

-- looks up a parent comment's author without re-triggering RLS on comments —
-- referencing "comments" directly inside its own select policy causes
-- Postgres to recurse into the policy infinitely ("infinite recursion
-- detected in policy for relation comments"). security definer runs this
-- as the (RLS-bypassing) function owner, breaking the recursion.
create or replace function public.is_reply_to_own_comment(check_parent_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from comments c
    where c.id = check_parent_id
      and c.author_id = auth.uid()
  );
$$;

drop policy if exists "Feedback comments are private" on comments;
create policy "Feedback comments are private"
  on comments as restrictive for select
  using (
    author_id = auth.uid()
    or exists (
      select 1 from posts p
      where p.id = comments.post_id
        and (p.type <> 'feedback' or p.author_id = auth.uid())
    )
    or public.is_reply_to_own_comment(comments.parent_id)
  );

-- ---------- 10. Feedback ratings (server-side, so authors can see an average) ----------
create table if not exists feedback_ratings (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table feedback_ratings enable row level security;

drop policy if exists "Anyone can view feedback ratings" on feedback_ratings;
create policy "Anyone can view feedback ratings"
  on feedback_ratings for select
  using (true);

drop policy if exists "Users can rate a post" on feedback_ratings;
create policy "Users can rate a post"
  on feedback_ratings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own rating" on feedback_ratings;
create policy "Users can update own rating"
  on feedback_ratings for update
  using (auth.uid() = user_id);

-- ---------- 12. Comment likes ----------
create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table comment_likes enable row level security;

drop policy if exists "Anyone can view comment likes" on comment_likes;
create policy "Anyone can view comment likes"
  on comment_likes for select
  using (true);

drop policy if exists "Users can like a comment" on comment_likes;
create policy "Users can like a comment"
  on comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own comment like" on comment_likes;
create policy "Users can unlike own comment like"
  on comment_likes for delete
  using (auth.uid() = user_id);

-- ---------- 13. Feedback ratings: per-category scores ----------
-- Previously only "rating" (Overall) was persisted — Accuracy/Dynamics/
-- Interpretation/Technique lived only in the reviewer's own localStorage,
-- so there was nothing to average across reviewers. These columns let the
-- author see a real per-category breakdown.
alter table feedback_ratings
  add column if not exists accuracy int check (accuracy between 1 and 10),
  add column if not exists dynamics int check (dynamics between 1 and 10),
  add column if not exists interpretation int check (interpretation between 1 and 10),
  add column if not exists technique int check (technique between 1 and 10);
