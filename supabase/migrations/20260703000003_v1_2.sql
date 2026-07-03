-- v1.2: 举报与内容下架 + 收藏搜索基础

-- ---------- 内容下架 ----------
alter table public.bookmarks add column removed_at timestamptz;

-- 对他人隐藏已下架内容；作者仍可见自己的（会看到下架状态）
drop policy "public bookmarks are viewable by everyone" on public.bookmarks;
create policy "public bookmarks are viewable by everyone"
  on public.bookmarks for select
  using ((is_public and removed_at is null) or auth.uid() = user_id);

-- 同步更新评论/点赞的可见性判断
create or replace function public.bookmark_is_visible(bookmark_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.bookmarks b
    where b.id = bookmark_id
      and ((b.is_public and b.removed_at is null) or b.user_id = auth.uid())
  );
$$;

-- 防止作者自行解除下架：removed_at 只能由 service_role（管理端）修改
create or replace function public.protect_removed_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.removed_at is distinct from old.removed_at
     and coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'removed_at can only be changed by moderators';
  end if;
  return new;
end;
$$;

create trigger on_bookmark_protect_removed_at
  before update on public.bookmarks
  for each row execute function public.protect_removed_at();

-- ---------- 举报 ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid not null references public.bookmarks (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (bookmark_id, reporter_id)
);

create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- 仅本人可提交举报并查看自己的举报；处理走管理端（service_role 绕过 RLS）
create policy "users can report bookmarks"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "users can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ---------- 搜索 ----------
-- 标题/推荐语的模糊搜索索引（MVP 用 ilike + trigram 足够）
create extension if not exists pg_trgm;
create index bookmarks_title_trgm_idx
  on public.bookmarks using gin (title gin_trgm_ops);
create index bookmarks_note_trgm_idx
  on public.bookmarks using gin (note gin_trgm_ops);
