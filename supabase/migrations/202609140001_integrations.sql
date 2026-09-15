-- Scriptis: histórico de abordagens por usuário (Supabase)
-- Habilite RLS e crie as políticas antes de usar em produção.

create table if not exists public.scriptis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists scriptis_history_user_created_idx
  on public.scriptis_history (user_id, created_at desc);

alter table public.scriptis_history enable row level security;

create policy "Users can read their own history"
  on public.scriptis_history for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own history"
  on public.scriptis_history for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own history"
  on public.scriptis_history for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own history"
  on public.scriptis_history for delete
  to authenticated
  using (auth.uid() = user_id);

-- Quota para geração paga (opcional) - 30 requisições por usuário
create or replace function public.consume_scriptis_quota() returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  _count bigint;
begin
  select count(*) into _count
  from public.scriptis_history
  where user_id = auth.uid()
    and created_at > now() - interval '1 hour';
  if _count >= 30 then
    return false;
  end if;
  return true;
end; $$;

-- Limite de tamanho do registro (64KB)
alter table public.scriptis_history
  add constraint scriptis_history_record_size
  check (octet_length(record::text) <= 65536);