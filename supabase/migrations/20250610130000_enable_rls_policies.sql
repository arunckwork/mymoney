-- Row-level security: users can only access their own rows

alter table public.user_accounts enable row level security;
alter table public.user_income_expense_categories enable row level security;
alter table public.user_expenses enable row level security;
alter table public.user_incomes enable row level security;

drop policy if exists "Users can view own accounts" on public.user_accounts;
drop policy if exists "Users can insert own accounts" on public.user_accounts;
drop policy if exists "Users can update own accounts" on public.user_accounts;
drop policy if exists "Users can delete own accounts" on public.user_accounts;

create policy "Users can view own accounts"
  on public.user_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own accounts"
  on public.user_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own accounts"
  on public.user_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own accounts"
  on public.user_accounts for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own categories" on public.user_income_expense_categories;
drop policy if exists "Users can insert own categories" on public.user_income_expense_categories;
drop policy if exists "Users can update own categories" on public.user_income_expense_categories;
drop policy if exists "Users can delete own categories" on public.user_income_expense_categories;

create policy "Users can view own categories"
  on public.user_income_expense_categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.user_income_expense_categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.user_income_expense_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.user_income_expense_categories for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own expenses" on public.user_expenses;
drop policy if exists "Users can insert own expenses" on public.user_expenses;
drop policy if exists "Users can update own expenses" on public.user_expenses;
drop policy if exists "Users can delete own expenses" on public.user_expenses;

create policy "Users can view own expenses"
  on public.user_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.user_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.user_expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.user_expenses for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own incomes" on public.user_incomes;
drop policy if exists "Users can insert own incomes" on public.user_incomes;
drop policy if exists "Users can update own incomes" on public.user_incomes;
drop policy if exists "Users can delete own incomes" on public.user_incomes;

create policy "Users can view own incomes"
  on public.user_incomes for select
  using (auth.uid() = user_id);

create policy "Users can insert own incomes"
  on public.user_incomes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own incomes"
  on public.user_incomes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own incomes"
  on public.user_incomes for delete
  using (auth.uid() = user_id);
