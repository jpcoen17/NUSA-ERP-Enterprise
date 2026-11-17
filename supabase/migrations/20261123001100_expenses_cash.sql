-- Stage 16: expenses recorded through a role-checked function that also posts the journal (Dr Operating Expenses / Cr Cash & Bank).
create function public.record_expense(p_company uuid, p_date date, p_category text, p_description text, p_amount numeric) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.has_role(p_company, array['company_admin','finance_manager']) then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if coalesce(trim(p_category), '') = '' then raise exception 'category required'; end if;
  insert into public.expenses (company_id, expense_date, category, description, amount) values (p_company, coalesce(p_date, current_date), trim(p_category), nullif(trim(p_description), ''), p_amount) returning id into v_id;
  perform public._post(p_company, coalesce(p_date, current_date), 'Expense: ' || trim(p_category), 'expense', v_id, jsonb_build_array(
    jsonb_build_object('code','6000','debit',p_amount,'credit',0), jsonb_build_object('code','1100','debit',0,'credit',p_amount)));
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (p_company, auth.uid(), 'expense_recorded', 'expenses', v_id, jsonb_build_object('amount', p_amount));
  return v_id;
end $$;
revoke execute on function public.record_expense(uuid,date,text,text,numeric) from public, anon;
grant execute on function public.record_expense(uuid,date,text,text,numeric) to authenticated;
