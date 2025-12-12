-- Function to safely transfer funds between accounts
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
  -- Check for valid amount
  if p_amount <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;

  -- Check if source and destination are the same
  if p_source_account_id = p_destination_account_id then
    raise exception 'Cannot transfer to the same account';
  end if;

  -- Get source balance and lock the row to prevent race conditions
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

  -- Verify destination exists and lock it
  perform 1
  from public.user_accounts
  where id = p_destination_account_id
  for update;

  if not found then
    raise exception 'Destination account not found';
  end if;

  -- Perform transfer
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
