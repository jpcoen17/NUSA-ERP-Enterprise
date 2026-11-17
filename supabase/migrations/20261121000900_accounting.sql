-- Stage 14: double-entry general ledger. Journals are posted by triggers on business events (append-only; corrections are reversals).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null, name text not null,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  unique (company_id, code));
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_date date not null default current_date, memo text,
  source_type text not null, source_id uuid,
  created_by uuid default auth.uid(), is_demo boolean not null default false, created_at timestamptz not null default now());
create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit numeric(18,2) not null default 0, credit numeric(18,2) not null default 0,
  check (debit >= 0 and credit >= 0 and (debit = 0 or credit = 0)));
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  po_id uuid unique references public.purchase_orders(id),
  bill_no text not null, bill_date date not null, due_date date not null,
  amount numeric(18,2) not null check (amount >= 0), paid_amount numeric(18,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  created_at timestamptz not null default now(), unique (company_id, bill_no));
create index on public.accounts (company_id);
create index on public.journal_entries (company_id, entry_date desc);
create index on public.journal_entries (source_type, source_id);
create index on public.journal_lines (entry_id);
create index on public.journal_lines (account_id);
create index on public.bills (company_id, due_date);

alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.bills enable row level security;
create policy acc_select on public.accounts for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy acc_write on public.accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy je_select on public.journal_entries for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy jl_select on public.journal_lines for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy bill_select on public.bills for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
revoke all on public.accounts, public.journal_entries, public.journal_lines, public.bills from anon;
revoke insert, update, delete on public.journal_entries, public.journal_lines, public.bills from authenticated;

create function public._ensure_coa(p_company uuid) returns void language sql security definer set search_path = '' as $$
  insert into public.accounts (company_id, code, name, type)
  select p_company, v.code, v.name, v.type from (values ('1100','Cash & Bank','asset'),('1200','Accounts Receivable','asset'),('1300','Inventory','asset'),
    ('2100','Accounts Payable','liability'),('3000','Owner Equity','equity'),('4000','Sales Revenue','revenue'),('5000','Cost of Goods Sold','expense'),('6000','Operating Expenses','expense')) v(code,name,type)
  on conflict (company_id, code) do nothing;
$$;
create function public.trg_company_coa() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public._ensure_coa(new.id); return new; end $$;
create trigger company_coa after insert on public.companies for each row execute function public.trg_company_coa();
select public._ensure_coa(id) from public.companies;

-- Internal posting function (NOT callable by users). Lines: [{code|account_id, debit, credit}].
create function public._post(p_company uuid, p_date date, p_memo text, p_src text, p_src_id uuid, p_lines jsonb, p_demo boolean default false) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_entry uuid; l jsonb; v_acc uuid; v_d numeric; v_c numeric; td numeric := 0; tc numeric := 0; n int := 0;
begin
  perform public._ensure_coa(p_company);
  insert into public.journal_entries (company_id, entry_date, memo, source_type, source_id, is_demo) values (p_company, p_date, p_memo, p_src, p_src_id, p_demo) returning id into v_entry;
  for l in select * from jsonb_array_elements(p_lines) loop
    v_d := coalesce((l ->> 'debit')::numeric, 0); v_c := coalesce((l ->> 'credit')::numeric, 0);
    continue when v_d = 0 and v_c = 0;
    select id into v_acc from public.accounts where company_id = p_company
      and ((l ? 'account_id' and id = (l ->> 'account_id')::uuid) or (not (l ? 'account_id') and code = l ->> 'code'));
    if v_acc is null then raise exception 'account not found for this company'; end if;
    insert into public.journal_lines (entry_id, company_id, account_id, debit, credit) values (v_entry, p_company, v_acc, v_d, v_c);
    td := td + v_d; tc := tc + v_c; n := n + 1;
  end loop;
  if n = 0 then delete from public.journal_entries where id = v_entry; return null; end if;
  if td <> tc then raise exception 'journal not balanced (debit % vs credit %)', td, tc; end if;
  return v_entry;
end $$;
-- Defense in depth: even a direct insert cannot leave an unbalanced entry.
create function public.check_entry_balanced() returns trigger language plpgsql as $$
begin
  if (select coalesce(sum(debit) - sum(credit), 0) from public.journal_lines where entry_id = new.entry_id) <> 0 then raise exception 'unbalanced journal entry'; end if;
  return null;
end $$;
create constraint trigger journal_balanced after insert on public.journal_lines deferrable initially deferred for each row execute function public.check_entry_balanced();

create function public._reverse(p_company uuid, p_src text, p_src_id uuid, p_memo text) returns void language plpgsql security definer set search_path = '' as $$
declare v_old uuid; v_new uuid;
begin
  select id into v_old from public.journal_entries where company_id = p_company and source_type = p_src and source_id = p_src_id order by created_at limit 1;
  if v_old is null then return; end if;
  if exists (select 1 from public.journal_entries where source_type = p_src || '_reversal' and source_id = p_src_id) then return; end if;
  insert into public.journal_entries (company_id, memo, source_type, source_id) values (p_company, p_memo, p_src || '_reversal', p_src_id) returning id into v_new;
  insert into public.journal_lines (entry_id, company_id, account_id, debit, credit) select v_new, company_id, account_id, credit, debit from public.journal_lines where entry_id = v_old;
end $$;

-- Posting triggers
create function public.trg_sales_order_gl() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cogs numeric(18,2);
begin
  if old.status = 'draft' and new.status = 'confirmed' then
    select coalesce(sum(i.quantity * p.cost), 0) into v_cogs from public.sales_order_items i join public.products p on p.id = i.product_id where i.order_id = new.id;
    perform public._post(new.company_id, current_date, 'Sales ' || new.order_no, 'sales_order', new.id, jsonb_build_array(
      jsonb_build_object('code','1200','debit',new.total,'credit',0), jsonb_build_object('code','4000','debit',0,'credit',new.total),
      jsonb_build_object('code','5000','debit',v_cogs,'credit',0), jsonb_build_object('code','1300','debit',0,'credit',v_cogs)));
  elsif old.status = 'confirmed' and new.status = 'cancelled' then
    perform public._reverse(new.company_id, 'sales_order', new.id, 'Reversal ' || new.order_no);
  end if;
  return new;
end $$;
create trigger sales_order_gl after update of status on public.sales_orders for each row when (old.status is distinct from new.status) execute function public.trg_sales_order_gl();

create function public.trg_invoice_payment_gl() returns trigger language plpgsql security definer set search_path = '' as $$
declare d numeric := new.paid_amount - old.paid_amount;
begin
  perform public._post(new.company_id, current_date, 'Payment ' || new.invoice_no, 'payment', new.id, jsonb_build_array(
    jsonb_build_object('code','1100','debit',d,'credit',0), jsonb_build_object('code','1200','debit',0,'credit',d)));
  return new;
end $$;
create trigger invoice_payment_gl after update of paid_amount on public.invoices for each row when (new.paid_amount > old.paid_amount) execute function public.trg_invoice_payment_gl();

create function public.trg_po_received_gl() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public._post(new.company_id, current_date, 'Goods receipt ' || new.po_no, 'purchase_order', new.id, jsonb_build_array(
    jsonb_build_object('code','1300','debit',new.total,'credit',0), jsonb_build_object('code','2100','debit',0,'credit',new.total)));
  insert into public.bills (company_id, supplier_id, po_id, bill_no, bill_date, due_date, amount)
  values (new.company_id, new.supplier_id, new.id, 'BILL-' || substr(new.po_no, 4), current_date, current_date + 30, new.total) on conflict (po_id) do nothing;
  return new;
end $$;
create trigger po_received_gl after update of status on public.purchase_orders for each row when (old.status = 'approved' and new.status = 'received') execute function public.trg_po_received_gl();

create function public.trg_bill_payment_gl() returns trigger language plpgsql security definer set search_path = '' as $$
declare d numeric := new.paid_amount - old.paid_amount;
begin
  perform public._post(new.company_id, current_date, 'Bill payment ' || new.bill_no, 'bill_payment', new.id, jsonb_build_array(
    jsonb_build_object('code','2100','debit',d,'credit',0), jsonb_build_object('code','1100','debit',0,'credit',d)));
  return new;
end $$;
create trigger bill_payment_gl after update of paid_amount on public.bills for each row when (new.paid_amount > old.paid_amount) execute function public.trg_bill_payment_gl();

-- Extend the ledger guard to bills.paid_amount
create or replace function public.guard_ledger() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.ledger_fn', true), '') <> 'on' then
    if tg_table_name = 'products' then
      if new.stock_qty is distinct from old.stock_qty then raise exception 'stock_qty can only change through business functions (confirm/cancel order, adjust_stock)'; end if;
    elsif tg_table_name = 'invoices' then
      if new.paid_amount is distinct from old.paid_amount then raise exception 'paid_amount can only change through record_payment'; end if;
    elsif tg_table_name = 'bills' then
      if new.paid_amount is distinct from old.paid_amount then raise exception 'paid_amount can only change through pay_bill'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger bills_guard before update on public.bills for each row execute function public.guard_ledger();

create function public.pay_bill(p_bill uuid, p_amount numeric, p_method text default 'transfer') returns void language plpgsql security definer set search_path = '' as $$
declare b public.bills;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into b from public.bills where id = p_bill for update;
  if not found then raise exception 'bill not found'; end if;
  if not public.has_role(b.company_id, array['company_admin','finance_manager']) then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_amount > b.amount - b.paid_amount then raise exception 'payment exceeds outstanding (%)', b.amount - b.paid_amount; end if;
  update public.bills set paid_amount = paid_amount + p_amount, status = case when paid_amount + p_amount >= amount then 'paid' else 'partial' end where id = p_bill;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (b.company_id, auth.uid(), 'bill_paid', 'bills', p_bill, jsonb_build_object('amount', p_amount));
end $$;

create function public.create_manual_journal(p_company uuid, p_date date, p_memo text, p_lines jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.has_role(p_company, array['company_admin','finance_manager']) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then raise exception 'at least two lines required'; end if;
  if coalesce(trim(p_memo), '') = '' then raise exception 'memo required'; end if;
  v := public._post(p_company, coalesce(p_date, current_date), p_memo, 'manual', null, p_lines);
  if v is null then raise exception 'journal has no amounts'; end if;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id) values (p_company, auth.uid(), 'journal_manual', 'journal_entries', v);
  return v;
end $$;

create function public.trial_balance(cid uuid default null, p_from date default null, p_to date default null) returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(t order by t.code), '[]'::jsonb) from (
    select a.code, a.name, a.type, coalesce(sum(l.debit), 0) as debit, coalesce(sum(l.credit), 0) as credit
    from public.accounts a
    left join (select jl.account_id, jl.debit, jl.credit from public.journal_lines jl join public.journal_entries e on e.id = jl.entry_id
               where (p_from is null or e.entry_date >= p_from) and (p_to is null or e.entry_date <= p_to)) l on l.account_id = a.id
    where cid is null or a.company_id = cid group by a.code, a.name, a.type) t;
$$;
revoke execute on function public._ensure_coa(uuid), public._post(uuid,date,text,text,uuid,jsonb,boolean), public._reverse(uuid,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.pay_bill(uuid,numeric,text), public.create_manual_journal(uuid,date,text,jsonb), public.trial_balance(uuid,date,date) from public, anon;
grant execute on function public.pay_bill(uuid,numeric,text), public.create_manual_journal(uuid,date,text,jsonb), public.trial_balance(uuid,date,date) to authenticated;
