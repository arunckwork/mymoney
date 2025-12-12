-- Rename table to user_income_expense_categories and add category_type

alter table if exists public.user_expense_categories
rename to user_income_expense_categories;

-- Add category_type column with allowed values income|expense
alter table if exists public.user_income_expense_categories
add column if not exists category_type text not null default 'expense'
  check (category_type in ('income', 'expense'));

-- Update unique index to reflect new table name
drop index if exists user_expense_categories_user_name_idx;
create unique index if not exists user_income_expense_categories_user_name_idx
  on public.user_income_expense_categories (user_id, category_name);

-- Optional: ensure status column still exists and remains constrained
alter table if exists public.user_income_expense_categories
alter column status set not null;

-- Ensure updated_at trigger still present (re-create for new table name)
drop trigger if exists user_expense_categories_set_updated_at on public.user_income_expense_categories;
create or replace function public.user_income_expense_categories_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_income_expense_categories_set_updated_at
before update on public.user_income_expense_categories
for each row execute procedure public.user_income_expense_categories_set_updated_at();
