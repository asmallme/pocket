-- v1.1: 收藏来源标记 + 重复收藏检测索引

alter table public.bookmarks
  add column source text not null default 'web'
  check (source in ('web', 'extension', 'contextmenu', 'shortcut', 'pwa-share'));

-- 重复收藏检测：按 用户+URL 查询
create index bookmarks_user_url_idx
  on public.bookmarks (user_id, url) where url is not null;
