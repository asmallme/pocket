-- =============================================
-- Pocket MVP schema: profiles / bookmarks / comments / likes / follows
-- =============================================

-- Explicit grants: newer Supabase images no longer grant DML on new tables
-- by default; RLS policies below control the actual row access.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{2,20}$'),
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
  );
  base_username := substr(base_username, 1, 15);
  if length(base_username) < 2 then
    base_username := 'user';
  end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', final_username),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- bookmarks ----------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  url text,
  title text,
  description text,
  cover_image text,
  content_type text not null default 'link'
    check (content_type in ('link', 'text', 'image', 'video')),
  note text,
  is_public boolean not null default true,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index bookmarks_public_feed_idx
  on public.bookmarks (created_at desc, id desc) where is_public;
create index bookmarks_user_idx
  on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;

create policy "public bookmarks are viewable by everyone"
  on public.bookmarks for select
  using (is_public or auth.uid() = user_id);

create policy "users can insert own bookmarks"
  on public.bookmarks for insert with check (auth.uid() = user_id);

create policy "users can update own bookmarks"
  on public.bookmarks for update using (auth.uid() = user_id);

create policy "users can delete own bookmarks"
  on public.bookmarks for delete using (auth.uid() = user_id);

-- Helper used by comment/like policies to avoid recursive RLS lookups.
create or replace function public.bookmark_is_visible(bookmark_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.bookmarks b
    where b.id = bookmark_id
      and (b.is_public or b.user_id = auth.uid())
  );
$$;

-- ---------- comments ----------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid not null references public.bookmarks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_bookmark_idx on public.comments (bookmark_id, created_at);

alter table public.comments enable row level security;

create policy "comments on visible bookmarks are viewable"
  on public.comments for select
  using (public.bookmark_is_visible(bookmark_id));

create policy "users can comment on visible bookmarks"
  on public.comments for insert
  with check (auth.uid() = user_id and public.bookmark_is_visible(bookmark_id));

create policy "users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- ---------- likes ----------
create table public.likes (
  bookmark_id uuid not null references public.bookmarks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bookmark_id, user_id)
);

alter table public.likes enable row level security;

create policy "likes on visible bookmarks are viewable"
  on public.likes for select
  using (public.bookmark_is_visible(bookmark_id));

create policy "users can like visible bookmarks"
  on public.likes for insert
  with check (auth.uid() = user_id and public.bookmark_is_visible(bookmark_id));

create policy "users can remove own likes"
  on public.likes for delete using (auth.uid() = user_id);

-- ---------- follows ----------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follows are viewable by everyone"
  on public.follows for select using (true);

create policy "users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ---------- counter triggers ----------
create or replace function public.update_like_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.bookmarks set like_count = like_count + 1 where id = new.bookmark_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.bookmarks set like_count = greatest(like_count - 1, 0) where id = old.bookmark_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.update_like_count();

create or replace function public.update_comment_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.bookmarks set comment_count = comment_count + 1 where id = new.bookmark_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.bookmarks set comment_count = greatest(comment_count - 1, 0) where id = old.bookmark_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_comment_count();

-- ---------- storage: media bucket ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true);

create policy "media is publicly readable"
  on storage.objects for select using (bucket_id = 'media');

create policy "authenticated users can upload media to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete own media"
  on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
