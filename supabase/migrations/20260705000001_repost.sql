-- v1.4: 转存他人收藏（repost）

-- ---------- bookmarks 扩展 ----------
alter table public.bookmarks
  add column reposted_from uuid references public.bookmarks (id) on delete set null,
  add column reposted_from_user_id uuid references public.profiles (id) on delete set null,
  add column repost_count integer not null default 0;

comment on column public.bookmarks.reposted_from is '转存来源收藏 id，原收藏删除后置空';
comment on column public.bookmarks.reposted_from_user_id is '来源收藏者快照，原收藏删除后仍可显示出处';

-- source 枚举增加 repost
alter table public.bookmarks drop constraint bookmarks_source_check;
alter table public.bookmarks add constraint bookmarks_source_check
  check (source in ('web', 'extension', 'contextmenu', 'shortcut', 'pwa-share', 'repost'));

-- 查"我是否转存过这条"
create index bookmarks_reposted_from_idx
  on public.bookmarks (reposted_from) where reposted_from is not null;

-- ---------- repost_count 维护 ----------
create or replace function public.update_repost_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.reposted_from is not null then
    update public.bookmarks set repost_count = repost_count + 1
      where id = new.reposted_from;
  elsif tg_op = 'DELETE' and old.reposted_from is not null then
    update public.bookmarks set repost_count = greatest(repost_count - 1, 0)
      where id = old.reposted_from;
  elsif tg_op = 'UPDATE'
    and old.reposted_from is not null and new.reposted_from is null then
    -- 解除出处（含源收藏删除时 FK set null 级联）；源行已删则 0 行受影响
    update public.bookmarks set repost_count = greatest(repost_count - 1, 0)
      where id = old.reposted_from;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_bookmark_repost_change
  after insert or delete or update of reposted_from on public.bookmarks
  for each row execute function public.update_repost_count();

-- ---------- 防伪造出处 ----------
-- 插入时校验来源真实可转存；更新时出处只允许置空、不允许改指向
create or replace function public.protect_repost_columns()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.reposted_from is not null then
      if not exists (
        select 1 from public.bookmarks b
        where b.id = new.reposted_from
          and b.is_public
          and b.removed_at is null
          and b.user_id = new.reposted_from_user_id
          and b.user_id <> new.user_id
      ) then
        raise exception 'invalid repost source';
      end if;
    elsif new.reposted_from_user_id is not null then
      raise exception 'reposted_from_user_id requires reposted_from';
    end if;
  else
    if new.reposted_from is distinct from old.reposted_from
       and new.reposted_from is not null then
      raise exception 'reposted_from can only be cleared';
    end if;
    if new.reposted_from_user_id is distinct from old.reposted_from_user_id
       and new.reposted_from_user_id is not null then
      raise exception 'reposted_from_user_id can only be cleared';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_bookmark_protect_repost
  before insert or update on public.bookmarks
  for each row execute function public.protect_repost_columns();

-- ---------- 转存 RPC：原子完成 校验 + 查重 + 复制 + 复制标签 ----------
create or replace function public.repost_bookmark(p_bookmark_id uuid)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_src public.bookmarks%rowtype;
  v_existing uuid;
  v_new_id uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- 仅公开且未下架的收藏可转存
  select * into v_src from public.bookmarks
    where id = p_bookmark_id and is_public and removed_at is null;
  if not found then
    raise exception 'NOT_AVAILABLE';
  end if;
  if v_src.user_id = v_user then
    raise exception 'CANNOT_REPOST_OWN';
  end if;

  -- 查重：同 URL 已收藏，或已从同一源转存过（覆盖无 url 的收藏）
  select id into v_existing from public.bookmarks
    where user_id = v_user
      and ((v_src.url is not null and url = v_src.url)
           or reposted_from = p_bookmark_id)
    limit 1;
  if v_existing is not null then
    return jsonb_build_object('id', v_existing, 'duplicate', true);
  end if;

  -- 转存默认私密；note 是原作者的观点，不复制
  insert into public.bookmarks
    (user_id, url, title, description, cover_image, content_type,
     is_public, source, ai_summary, reposted_from, reposted_from_user_id)
  values
    (v_user, v_src.url, v_src.title, v_src.description, v_src.cover_image,
     v_src.content_type, false, 'repost', v_src.ai_summary,
     v_src.id, v_src.user_id)
  returning id into v_new_id;

  insert into public.bookmark_tags (bookmark_id, tag_id)
    select v_new_id, tag_id from public.bookmark_tags
    where bookmark_id = p_bookmark_id
  on conflict do nothing;

  return jsonb_build_object('id', v_new_id, 'duplicate', false);
end;
$$;

revoke execute on function public.repost_bookmark(uuid) from anon;
