-- iOS Shortcuts: personal mobile share tokens

create table public.mobile_share_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'iOS 快捷指令',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index mobile_share_tokens_active_user_idx
  on public.mobile_share_tokens (user_id)
  where revoked_at is null;

create index mobile_share_tokens_hash_idx
  on public.mobile_share_tokens (token_hash)
  where revoked_at is null;

alter table public.mobile_share_tokens enable row level security;

create policy "users can view own mobile share tokens"
  on public.mobile_share_tokens for select
  using (auth.uid() = user_id);

create policy "users can create own mobile share tokens"
  on public.mobile_share_tokens for insert
  with check (auth.uid() = user_id);

create policy "users can revoke own mobile share tokens"
  on public.mobile_share_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
