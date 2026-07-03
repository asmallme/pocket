-- v1.3: 标签体系、标签订阅、星标、AI 摘要、安静模式

-- ---------- profiles 扩展 ----------
alter table public.profiles
  add column quiet_mode boolean not null default false,
  add column ai_summary_enabled boolean not null default true,
  add column ai_auto_tag_enabled boolean not null default true;

-- ---------- bookmarks 扩展 ----------
alter table public.bookmarks
  add column ai_summary text,
  add column is_starred boolean not null default false;

create index bookmarks_starred_idx
  on public.bookmarks (user_id, created_at desc) where is_starred;

-- ---------- tags ----------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  slug text not null unique check (char_length(slug) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.bookmark_tags (
  bookmark_id uuid not null references public.bookmarks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (bookmark_id, tag_id)
);

create index bookmark_tags_tag_idx on public.bookmark_tags (tag_id);

create table public.tag_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index tag_subscriptions_tag_idx on public.tag_subscriptions (tag_id);

alter table public.tags enable row level security;
alter table public.bookmark_tags enable row level security;
alter table public.tag_subscriptions enable row level security;

-- tags 全员可读
create policy "tags are viewable by everyone"
  on public.tags for select using (true);

-- 登录用户可创建 tag（通过 upsert slug）
create policy "authenticated users can insert tags"
  on public.tags for insert with check (auth.role() = 'authenticated');

-- bookmark_tags：随 bookmark 可见性
create policy "bookmark_tags on visible bookmarks are viewable"
  on public.bookmark_tags for select
  using (public.bookmark_is_visible(bookmark_id));

create policy "users can tag own bookmarks"
  on public.bookmark_tags for insert
  with check (
    exists (
      select 1 from public.bookmarks b
      where b.id = bookmark_id and b.user_id = auth.uid()
    )
  );

create policy "users can untag own bookmarks"
  on public.bookmark_tags for delete
  using (
    exists (
      select 1 from public.bookmarks b
      where b.id = bookmark_id and b.user_id = auth.uid()
    )
  );

-- tag_subscriptions
create policy "tag subscriptions are viewable by everyone"
  on public.tag_subscriptions for select using (true);

create policy "users can subscribe tags"
  on public.tag_subscriptions for insert with check (auth.uid() = user_id);

create policy "users can unsubscribe tags"
  on public.tag_subscriptions for delete using (auth.uid() = user_id);

-- 热门标签视图辅助（公开收藏上的 tag 计数）
create or replace function public.tag_public_count(p_tag_id uuid)
returns bigint
language sql
security definer set search_path = ''
stable
as $$
  select count(distinct bt.bookmark_id)
  from public.bookmark_tags bt
  join public.bookmarks b on b.id = bt.bookmark_id
  where bt.tag_id = p_tag_id
    and b.is_public
    and b.removed_at is null;
$$;
