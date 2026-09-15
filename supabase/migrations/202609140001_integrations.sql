-- Scriptis: histórico isolado por usuário e quota atômica.

create table if not exists public.scriptis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scriptis_history
  add column if not exists updated_at timestamptz not null default now();

create index if not exists scriptis_history_user_created_idx
  on public.scriptis_history (user_id, created_at desc);

alter table public.scriptis_history enable row level security;

revoke all on table public.scriptis_history from public, anon;
grant select, insert, update, delete on table public.scriptis_history to authenticated;

drop policy if exists "Users can read their own history" on public.scriptis_history;
create policy "Users can read their own history" on public.scriptis_history for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own history" on public.scriptis_history;
create policy "Users can insert their own history" on public.scriptis_history for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own history" on public.scriptis_history;
create policy "Users can update their own history" on public.scriptis_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own history" on public.scriptis_history;
create policy "Users can delete their own history" on public.scriptis_history for delete to authenticated using ((select auth.uid()) = user_id);

-- Contador privado: no máximo 30 gerações pagas por usuário a cada 24 horas.
create table if not exists public.scriptis_generation_quota (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count between 0 and 30)
);

revoke all on table public.scriptis_generation_quota from public, anon, authenticated;

create or replace function public.consume_scriptis_quota() returns boolean
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
  _allowed boolean;
begin
  if _user_id is null then
    return false;
  end if;

  insert into public.scriptis_generation_quota as quota (
    user_id,
    window_started_at,
    request_count
  ) values (
    _user_id,
    now(),
    1
  )
  on conflict (user_id) do update
  set window_started_at = case
        when quota.window_started_at <= now() - interval '24 hours' then now()
        else quota.window_started_at
      end,
      request_count = case
        when quota.window_started_at <= now() - interval '24 hours' then 1
        else quota.request_count + 1
      end
  where quota.window_started_at <= now() - interval '24 hours'
     or quota.request_count < 30
  returning true into _allowed;

  return coalesce(_allowed, false);
end;
$$;

revoke all on function public.consume_scriptis_quota() from public, anon;
grant execute on function public.consume_scriptis_quota() to authenticated;

-- Limite de 64 KiB por registro, adicionado de forma idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scriptis_history_record_size'
      and conrelid = 'public.scriptis_history'::regclass
  ) then
    alter table public.scriptis_history
      add constraint scriptis_history_record_size
      check (octet_length(record::text) <= 65536);
  end if;
end;
$$;
