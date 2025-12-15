-- Create lendings table
create table if not exists public.lendings (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    date date not null default current_date,
    amount numeric not null check (amount > 0),
    from_account_id uuid not null references public.user_accounts(id) on delete cascade,
    note text,
    status text not null default 'not settled' check (status in ('not settled', 'settled')),
    settled_amount numeric not null default 0 check (settled_amount >= 0),
    primary key (id)
);

-- Enable RLS
alter table public.lendings enable row level security;

-- Policies
create policy "Users can view their own lendings"
    on public.lendings for select
    using (auth.uid() = user_id);

create policy "Users can check their own lendings"
    on public.lendings for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own lendings"
    on public.lendings for update
    using (auth.uid() = user_id);

create policy "Users can delete their own lendings"
    on public.lendings for delete
    using (auth.uid() = user_id);


-- Function to create lending and deduct balance
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
    -- 1. Deduct from account
    update public.user_accounts
    set total_money = total_money - p_amount
    where id = p_from_account_id
    and user_id = auth.uid();
    
    if not found then
        raise exception 'Account not found or insufficient permissions';
    end if;

    -- 2. Insert lending
    insert into public.lendings (user_id, date, amount, from_account_id, note)
    values (auth.uid(), p_date, p_amount, p_from_account_id, p_note)
    returning id into v_lending_id;

    return v_lending_id;
end;
$$;


-- Function to settle lending (partial or full)
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
    -- 1. Get lending info
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

    -- 2. Update lending
    update public.lendings
    set 
        settled_amount = v_new_settled_amount,
        status = case when v_new_settled_amount >= v_lending.amount then 'settled' else 'not settled' end
    where id = p_lending_id;

    -- 3. Add money back to account
    update public.user_accounts
    set total_money = total_money + p_amount
    where id = v_lending.from_account_id;
    
end;
$$;
