-- v1.2 第二档：稍后读状态
-- null = 未读（进入稍后读队列），有值 = 已读
alter table public.bookmarks add column read_at timestamptz;

-- 未读队列查询：我的收藏中 read_at is null 按时间倒序
create index bookmarks_unread_idx
  on public.bookmarks (user_id, created_at desc) where read_at is null;

-- OAuth 登录：完善新用户 username 来源
-- GitHub 提供 user_name / preferred_username，Google 只有邮箱
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
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
  );
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
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
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      final_username
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;
