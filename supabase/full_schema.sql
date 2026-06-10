-- MyMoney full schema bootstrap
-- Safe to re-run: drops existing app tables first, then recreates everything.

drop table if exists public.lendings cascade;
drop table if exists public.user_incomes cascade;
drop table if exists public.user_expenses cascade;
drop table if exists public.user_income_expense_categories cascade;
drop table if exists public.user_expense_categories cascade;
drop table if exists public.user_accounts cascade;

drop function if exists public.transfer_funds(uuid, uuid, numeric);
drop function if exists public.create_lending(date, numeric, uuid, text);
drop function if exists public.settle_lending(uuid, numeric);
drop function if exists public.user_accounts_set_updated_at() cascade;
drop function if exists public.user_income_expense_categories_set_updated_at() cascade;
drop function if exists public.user_expense_categories_set_updated_at() cascade;
drop function if exists public.user_expenses_set_updated_at() cascade;
drop function if exists public.user_expenses_decrement_account() cascade;
drop function if exists public.user_expenses_increment_account() cascade;
drop function if exists public.user_expenses_update_account_balance() cascade;
drop function if exists public.user_incomes_set_updated_at() cascade;
drop function if exists public.user_incomes_increment_account() cascade;
drop function if exists public.user_incomes_decrement_account() cascade;
drop function if exists public.user_incomes_update_account_balance() cascade;

-- Accounts
create table public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  total_money numeric(14,2) not null default 0,
  status text not null check (status in ('primary', 'secondary')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_accounts_primary_unique
  on public.user_accounts (user_id)
  where status = 'primary';

create or replace function public.user_accounts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_accounts_set_updated_at
before update on public.user_accounts
for each row execute procedure public.user_accounts_set_updated_at();

-- Categories (income + expense)
create table public.user_income_expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  status text not null check (status in ('active', 'inactive')),
  category_type text not null default 'expense'
    check (category_type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_income_expense_categories_user_name_idx
  on public.user_income_expense_categories (user_id, category_name);

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

-- Expenses
create table public.user_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.user_accounts(id) on delete cascade,
  category_id uuid not null references public.user_income_expense_categories(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  entry_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_expenses_user_idx on public.user_expenses(user_id, entry_date desc);
create index user_expenses_account_idx on public.user_expenses(account_id);
create index user_expenses_category_idx on public.user_expenses(category_id);

create or replace function public.user_expenses_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_expenses_set_updated_at
before update on public.user_expenses
for each row execute procedure public.user_expenses_set_updated_at();

create or replace function public.user_expenses_decrement_account()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money - new.amount,
        updated_at = now()
  where id = new.account_id;
  return new;
end;
$$ language plpgsql;

create trigger user_expenses_after_insert
after insert on public.user_expenses
for each row execute procedure public.user_expenses_decrement_account();

create or replace function public.user_expenses_increment_account()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money + old.amount,
        updated_at = now()
  where id = old.account_id;
  return old;
end;
$$ language plpgsql;

create trigger user_expenses_after_delete
after delete on public.user_expenses
for each row execute procedure public.user_expenses_increment_account();

create or replace function public.user_expenses_update_account_balance()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money + old.amount,
        updated_at = now()
  where id = old.account_id;

  update public.user_accounts
    set total_money = total_money - new.amount,
        updated_at = now()
  where id = new.account_id;

  return new;
end;
$$ language plpgsql;

create trigger user_expenses_after_update
after update on public.user_expenses
for each row execute procedure public.user_expenses_update_account_balance();

-- Incomes
create table public.user_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.user_accounts(id) on delete cascade,
  category_id uuid not null references public.user_income_expense_categories(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  entry_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_incomes_user_idx on public.user_incomes(user_id, entry_date desc);
create index user_incomes_account_idx on public.user_incomes(account_id);
create index user_incomes_category_idx on public.user_incomes(category_id);

create or replace function public.user_incomes_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_incomes_set_updated_at
before update on public.user_incomes
for each row execute procedure public.user_incomes_set_updated_at();

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

create trigger user_incomes_after_insert
after insert on public.user_incomes
for each row execute procedure public.user_incomes_increment_account();

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

create trigger user_incomes_after_delete
after delete on public.user_incomes
for each row execute procedure public.user_incomes_decrement_account();

create or replace function public.user_incomes_update_account_balance()
returns trigger as $$
begin
  update public.user_accounts
    set total_money = total_money - old.amount,
        updated_at = now()
  where id = old.account_id;

  update public.user_accounts
    set total_money = total_money + new.amount,
        updated_at = now()
  where id = new.account_id;

  return new;
end;
$$ language plpgsql;

create trigger user_incomes_after_update
after update on public.user_incomes
for each row execute procedure public.user_incomes_update_account_balance();

-- Transfer funds
create or replace function public.transfer_funds(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_source_balance numeric;
begin
  if p_amount <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;

  if p_source_account_id = p_destination_account_id then
    raise exception 'Cannot transfer to the same account';
  end if;

  select total_money into v_source_balance
  from public.user_accounts
  where id = p_source_account_id
  for update;

  if not found then
    raise exception 'Source account not found';
  end if;

  if v_source_balance < p_amount then
    raise exception 'Insufficient funds in source account';
  end if;

  perform 1
  from public.user_accounts
  where id = p_destination_account_id
  for update;

  if not found then
    raise exception 'Destination account not found';
  end if;

  update public.user_accounts
  set total_money = total_money - p_amount,
      updated_at = now()
  where id = p_source_account_id;

  update public.user_accounts
  set total_money = total_money + p_amount,
      updated_at = now()
  where id = p_destination_account_id;
end;
$$;

-- Lendings
create table public.lendings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  date date not null default current_date,
  amount numeric not null check (amount > 0),
  from_account_id uuid not null references public.user_accounts(id) on delete cascade,
  note text,
  status text not null default 'not settled' check (status in ('not settled', 'settled')),
  settled_amount numeric not null default 0 check (settled_amount >= 0)
);

alter table public.lendings enable row level security;

create policy "Users can view their own lendings"
  on public.lendings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lendings"
  on public.lendings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lendings"
  on public.lendings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own lendings"
  on public.lendings for delete
  using (auth.uid() = user_id);

create or replace function public.create_lending(
  p_date date,
  p_amount numeric,
  p_from_account_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_lending_id uuid;
begin
  update public.user_accounts
  set total_money = total_money - p_amount
  where id = p_from_account_id
  and user_id = auth.uid();

  if not found then
    raise exception 'Account not found or insufficient permissions';
  end if;

  insert into public.lendings (user_id, date, amount, from_account_id, note)
  values (auth.uid(), p_date, p_amount, p_from_account_id, p_note)
  returning id into v_lending_id;

  return v_lending_id;
end;
$$;

create or replace function public.settle_lending(
  p_lending_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_lending record;
  v_new_settled_amount numeric;
begin
  select * into v_lending
  from public.lendings
  where id = p_lending_id
  and user_id = auth.uid();

  if not found then
    raise exception 'Lending record not found';
  end if;

  if p_amount <= 0 then
    raise exception 'Settlement amount must be positive';
  end if;

  if v_lending.settled_amount + p_amount > v_lending.amount then
    raise exception 'Settlement amount exceeds remaining lending amount';
  end if;

  v_new_settled_amount := v_lending.settled_amount + p_amount;

  update public.lendings
  set
    settled_amount = v_new_settled_amount,
    status = case when v_new_settled_amount >= v_lending.amount then 'settled' else 'not settled' end
  where id = p_lending_id;

  update public.user_accounts
  set total_money = total_money + p_amount
  where id = v_lending.from_account_id;
end;
$$;
