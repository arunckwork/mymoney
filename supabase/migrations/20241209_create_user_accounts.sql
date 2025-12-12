-- Create table to store user money accounts
create table if not exists public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  total_money numeric(14,2) not null default 0,
  status text not null check (status in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep a single primary account per user
create unique index if not exists user_accounts_primary_unique
  on public.user_accounts (user_id)
  where status = 'primary';

-- Maintain updated_at automatically
create or replace function public.user_accounts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_accounts_set_updated_at on public.user_accounts;
create trigger user_accounts_set_updated_at
before update on public.user_accounts
for each row execute procedure public.user_accounts_set_updated_at();
