-- Income records per user
create table if not exists public.user_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.user_accounts(id) on delete cascade,
  category_id uuid not null references public.user_income_expense_categories(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  entry_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_incomes_user_idx on public.user_incomes(user_id, entry_date desc);
create index if not exists user_incomes_account_idx on public.user_incomes(account_id);
create index if not exists user_incomes_category_idx on public.user_incomes(category_id);

-- Maintain updated_at automatically
create or replace function public.user_incomes_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_incomes_set_updated_at on public.user_incomes;
create trigger user_incomes_set_updated_at
before update on public.user_incomes
for each row execute procedure public.user_incomes_set_updated_at();

-- Add income amount to the linked account on insert
create or replace function public.user_incomes_increment_account()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money + new.amount,
        updated_at = now()
  where id = new.account_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_incomes_after_insert on public.user_incomes;
create trigger user_incomes_after_insert
after insert on public.user_incomes
for each row execute procedure public.user_incomes_increment_account();

-- Subtract income amount from account on delete
create or replace function public.user_incomes_decrement_account()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money - old.amount,
        updated_at = now()
  where id = old.account_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists user_incomes_after_delete on public.user_incomes;
create trigger user_incomes_after_delete
after delete on public.user_incomes
for each row execute procedure public.user_incomes_decrement_account();

-- Adjust account balances when income is updated (account or amount changes)
create or replace function public.user_incomes_update_account_balance()
returns trigger as $$
begin
  -- Subtract old amount from old account
  update public.user_accounts
    set total_money = total_money - old.amount,
        updated_at = now()
  where id = old.account_id;

  -- Add new amount to new account
  update public.user_accounts
    set total_money = total_money + new.amount,
        updated_at = now()
  where id = new.account_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists user_incomes_after_update on public.user_incomes;
create trigger user_incomes_after_update
after update on public.user_incomes
for each row execute procedure public.user_incomes_update_account_balance();
