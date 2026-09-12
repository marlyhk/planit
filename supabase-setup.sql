-- Planit private cloud database
-- Run this once in Supabase → SQL Editor.

create table if not exists public.planit_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planit_state enable row level security;

drop policy if exists "Users can read their own Planit state" on public.planit_state;
create policy "Users can read their own Planit state"
on public.planit_state for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own Planit state" on public.planit_state;
create policy "Users can insert their own Planit state"
on public.planit_state for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Planit state" on public.planit_state;
create policy "Users can update their own Planit state"
on public.planit_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.planit_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planit_state_updated_at on public.planit_state;
create trigger planit_state_updated_at
before update on public.planit_state
for each row execute function public.planit_set_updated_at();
