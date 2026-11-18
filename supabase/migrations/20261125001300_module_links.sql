-- Stage 18: cross-module links. Generic records become real business events through role-checked functions.
create sequence public.cust_seq start 1000;

-- CRM -> Sales: Lead (12) becomes a Customer (11).
create function public.convert_lead_to_customer(p_record uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.module_records; v_cust uuid; v_name text; v_email text;
begin
  select * into r from public.module_records where id = p_record and module_no = 12 for update;
  if not found then raise exception 'lead not found'; end if;
  if not public.has_role(r.company_id, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if r.status = 'done' then raise exception 'lead already converted'; end if;
  v_name := coalesce(nullif(trim(r.data ->> 'company'), ''), nullif(trim(r.data ->> 'lead_name'), ''));
  if v_name is null then raise exception 'lead has no name'; end if;
  v_email := nullif(trim(r.data ->> 'email'), '');
  select id into v_cust from public.customers where company_id = r.company_id and v_email is not null and lower(email) = lower(v_email) limit 1;
  if v_cust is null then
    insert into public.customers (company_id, code, name, email) values (r.company_id, 'CUS-L' || nextval('public.cust_seq'), v_name, v_email) returning id into v_cust;
  end if;
  update public.module_records set status = 'done', data = data || jsonb_build_object('customer_id', v_cust) where id = p_record;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (r.company_id, auth.uid(), 'lead_converted', 'module_records', p_record, jsonb_build_object('customer_id', v_cust));
  return v_cust;
end $$;

-- HR -> Finance: a Payroll record (34) is posted to the general ledger once.
create function public.post_payroll(p_record uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.module_records; v_basic numeric; v_ded numeric; v_entry uuid;
begin
  select * into r from public.module_records where id = p_record and module_no = 34 for update;
  if not found then raise exception 'payroll record not found'; end if;
  if not public.has_role(r.company_id, array['company_admin','finance_manager']) then raise exception 'forbidden'; end if;
  if r.status = 'done' then raise exception 'payroll already posted'; end if;
  begin
    v_basic := (r.data ->> 'basic_salary')::numeric; v_ded := coalesce((r.data ->> 'deductions')::numeric, 0);
  exception when others then raise exception 'basic salary and deductions must be numbers'; end;
  if v_basic is null or v_basic <= 0 then raise exception 'basic salary must be positive'; end if;
  if v_ded < 0 or v_ded > v_basic then raise exception 'deductions must be between 0 and basic salary'; end if;
  v_entry := public._post(r.company_id, current_date, 'Payroll ' || coalesce(r.data ->> 'employee', '?') || ' ' || coalesce(r.data ->> 'period', ''), 'payroll', p_record, jsonb_build_array(
    jsonb_build_object('code','6000','debit',v_basic,'credit',0),
    jsonb_build_object('code','1100','debit',0,'credit',v_basic - v_ded),
    jsonb_build_object('code','2100','debit',0,'credit',v_ded)));
  update public.module_records set status = 'done', data = data || jsonb_build_object('journal_entry_id', v_entry) where id = p_record;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (r.company_id, auth.uid(), 'payroll_posted', 'module_records', p_record, jsonb_build_object('net', v_basic - v_ded));
  return v_entry;
end $$;

-- Logistics -> Sales: completing a Delivery (48) marks its sales order delivered.
create function public.complete_delivery(p_record uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.module_records; o public.sales_orders;
begin
  select * into r from public.module_records where id = p_record and module_no = 48 for update;
  if not found then raise exception 'delivery not found'; end if;
  if not public.has_role(r.company_id, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if r.status = 'done' then raise exception 'delivery already completed'; end if;
  select * into o from public.sales_orders where company_id = r.company_id and order_no = trim(r.data ->> 'order_no');
  if not found then raise exception 'sales order "%" not found in this company', coalesce(r.data ->> 'order_no', ''); end if;
  if o.status = 'draft' then raise exception 'sales order must be confirmed first'; end if;
  if o.status = 'cancelled' then raise exception 'sales order is cancelled'; end if;
  if o.status = 'confirmed' then perform public.deliver_sales_order(o.id); end if;
  update public.module_records set status = 'done', data = data || jsonb_build_object('order_id', o.id) where id = p_record;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (r.company_id, auth.uid(), 'delivery_completed', 'module_records', p_record, jsonb_build_object('order_id', o.id));
  return o.id;
end $$;
revoke execute on function public.convert_lead_to_customer(uuid), public.post_payroll(uuid), public.complete_delivery(uuid) from public, anon;
grant execute on function public.convert_lead_to_customer(uuid), public.post_payroll(uuid), public.complete_delivery(uuid) to authenticated;
