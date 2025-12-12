-- Create table to store expense categories per user
create table if not exists public.user_expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  status text not null check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: prevent duplicate category names per user
create unique index if not exists user_expense_categories_user_name_idx
  on public.user_expense_categories (user_id, category_name);

-- Maintain updated_at automatically
create or replace function public.user_expense_categories_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_expense_categories_set_updated_at on public.user_expense_categories;
create trigger user_expense_categories_set_updated_at
before update on public.user_expense_categories
for each row execute procedure public.user_expense_categories_set_updated_at();
