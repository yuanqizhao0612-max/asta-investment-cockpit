create table if not exists public.investment_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.investment_state enable row level security;

create policy if not exists "service role can manage investment state"
on public.investment_state
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
