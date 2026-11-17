-- Stage 12: real business logic. Order items, stock movements, payments. Writes ONLY through role-checked functions.
create sequence public.order_seq start 1000;

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(18,3) not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0));
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty_delta numeric(18,3) not null check (qty_delta <> 0),
  reason text not null check (reason in ('sale','return','purchase','adjustment')),
  ref_id uuid, created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  method text not null default 'transfer', paid_on date not null default current_date,
  created_by uuid default auth.uid(), created_at timestamptz not null default now());
create index on public.sales_order_items (order_id);
create index on public.sales_order_items (product_id);
create index on public.stock_movements (product_id, created_at desc);
create index on public.stock_movements (company_id);
create index on public.payments (invoice_id);

alter table public.sales_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payments enable row level security;
-- Items follow the visibility of their parent order (the subquery is itself filtered by sales_orders RLS).
create policy soi_select on public.sales_order_items for select to authenticated using (exists (select 1 from public.sales_orders o where o.id = order_id));
create policy sm_select on public.stock_movements for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy pay_select on public.payments for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
revoke all on public.sales_order_items, public.stock_movements, public.payments from anon;
revoke insert, update, delete on public.sales_order_items, public.stock_movements, public.payments from authenticated;

-- Role check inside a company. Super Admin always passes.
create function public.has_role(cid uuid, codes text[]) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (select 1 from public.user_access ua join public.roles r on r.id = ua.role_id join public.profiles p on p.id = ua.user_id
    where ua.user_id = auth.uid() and ua.company_id = cid and p.status = 'active' and r.code = any(codes));
$$;

create function public.create_sales_order(p_company uuid, p_customer uuid, p_items jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order uuid; v_total numeric(18,2) := 0; it jsonb; v_prod public.products; v_qty numeric;
begin
  if not public.has_role(p_company, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'items required'; end if;
  if not exists (select 1 from public.customers where id = p_customer and company_id = p_company) then raise exception 'customer not found in this company'; end if;
  insert into public.sales_orders (company_id, customer_id, order_no, status, total)
  values (p_company, p_customer, 'SO-' || to_char(current_date, 'YYMM') || '-' || nextval('public.order_seq'), 'draft', 0) returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'invalid quantity'; end if;
    select * into v_prod from public.products where id = (it ->> 'product_id')::uuid and company_id = p_company;
    if not found then raise exception 'product not found in this company'; end if;
    insert into public.sales_order_items (company_id, order_id, product_id, quantity, unit_price) values (p_company, v_order, v_prod.id, v_qty, v_prod.unit_price);
    v_total := v_total + v_qty * v_prod.unit_price;
  end loop;
  update public.sales_orders set total = v_total where id = v_order;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (p_company, auth.uid(), 'order_created', 'sales_orders', v_order, jsonb_build_object('total', v_total));
  return v_order;
end $$;

create function public.confirm_sales_order(p_order uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.sales_orders; it record; v_stock numeric; v_inv uuid;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into o from public.sales_orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if o.status <> 'draft' then raise exception 'order is already %', o.status; end if;
  if not exists (select 1 from public.sales_order_items where order_id = p_order) then raise exception 'order has no items'; end if;
  for it in select i.product_id, i.quantity, p.name as product_name from public.sales_order_items i join public.products p on p.id = i.product_id where i.order_id = p_order order by i.product_id loop
    select stock_qty into v_stock from public.products where id = it.product_id for update;
    if v_stock < it.quantity then raise exception 'insufficient stock for % (have %, need %)', it.product_name, v_stock, it.quantity; end if;
    update public.products set stock_qty = stock_qty - it.quantity where id = it.product_id;
    insert into public.stock_movements (company_id, product_id, qty_delta, reason, ref_id) values (o.company_id, it.product_id, -it.quantity, 'sale', p_order);
  end loop;
  update public.sales_orders set status = 'confirmed' where id = p_order;
  insert into public.invoices (company_id, sales_order_id, invoice_no, issue_date, due_date, amount, status)
  values (o.company_id, p_order, 'INV-' || substr(o.order_no, 4), current_date, current_date + 30, o.total, 'unpaid') returning id into v_inv;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (o.company_id, auth.uid(), 'order_confirmed', 'sales_orders', p_order, jsonb_build_object('invoice_id', v_inv));
  return v_inv;
end $$;

create function public.deliver_sales_order(p_order uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o public.sales_orders;
begin
  select * into o from public.sales_orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if o.status <> 'confirmed' then raise exception 'only confirmed orders can be delivered (now %)', o.status; end if;
  update public.sales_orders set status = 'delivered' where id = p_order;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id) values (o.company_id, auth.uid(), 'order_delivered', 'sales_orders', p_order);
end $$;

create function public.cancel_sales_order(p_order uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o public.sales_orders; it record;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into o from public.sales_orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','sales_manager']) then raise exception 'forbidden'; end if;
  if o.status not in ('draft','confirmed') then raise exception 'cannot cancel an order that is %', o.status; end if;
  if o.status = 'confirmed' then
    if exists (select 1 from public.payments p join public.invoices v on v.id = p.invoice_id where v.sales_order_id = p_order) then raise exception 'order already has payments'; end if;
    for it in select product_id, quantity from public.sales_order_items where order_id = p_order loop
      update public.products set stock_qty = stock_qty + it.quantity where id = it.product_id;
      insert into public.stock_movements (company_id, product_id, qty_delta, reason, ref_id) values (o.company_id, it.product_id, it.quantity, 'return', p_order);
    end loop;
    delete from public.invoices where sales_order_id = p_order;
  end if;
  update public.sales_orders set status = 'cancelled' where id = p_order;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id) values (o.company_id, auth.uid(), 'order_cancelled', 'sales_orders', p_order);
end $$;

create function public.record_payment(p_invoice uuid, p_amount numeric, p_method text default 'transfer') returns void language plpgsql security definer set search_path = '' as $$
declare v public.invoices;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into v from public.invoices where id = p_invoice for update;
  if not found then raise exception 'invoice not found'; end if;
  if not public.has_role(v.company_id, array['company_admin','finance_manager']) then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_amount > v.amount - v.paid_amount then raise exception 'payment exceeds outstanding (%)', v.amount - v.paid_amount; end if;
  insert into public.payments (company_id, invoice_id, amount, method) values (v.company_id, p_invoice, p_amount, coalesce(nullif(p_method, ''), 'transfer'));
  update public.invoices set paid_amount = paid_amount + p_amount, status = case when paid_amount + p_amount >= amount then 'paid' else 'partial' end where id = p_invoice;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (v.company_id, auth.uid(), 'payment_recorded', 'invoices', p_invoice, jsonb_build_object('amount', p_amount));
end $$;

create function public.adjust_stock(p_product uuid, p_delta numeric, p_reason text default 'adjustment') returns void language plpgsql security definer set search_path = '' as $$
declare p public.products;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into p from public.products where id = p_product for update;
  if not found then raise exception 'product not found'; end if;
  if not public.has_role(p.company_id, array['company_admin','inventory_manager']) then raise exception 'forbidden'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'delta must be non-zero'; end if;
  if p_reason not in ('adjustment','purchase') then raise exception 'invalid reason'; end if;
  if p.stock_qty + p_delta < 0 then raise exception 'stock cannot go negative (have %)', p.stock_qty; end if;
  update public.products set stock_qty = stock_qty + p_delta where id = p_product;
  insert into public.stock_movements (company_id, product_id, qty_delta, reason) values (p.company_id, p_product, p_delta, p_reason);
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (p.company_id, auth.uid(), 'stock_adjusted', 'products', p_product, jsonb_build_object('delta', p_delta));
end $$;


-- Ledger guards: stock_qty and paid_amount can only change inside the business functions above (even for Super Admin).
create function public.guard_ledger() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.ledger_fn', true), '') <> 'on' then
    if tg_table_name = 'products' then
      if new.stock_qty is distinct from old.stock_qty then
        raise exception 'stock_qty can only change through business functions (confirm/cancel order, adjust_stock)'; end if;
    elsif tg_table_name = 'invoices' then
      if new.paid_amount is distinct from old.paid_amount then
        raise exception 'paid_amount can only change through record_payment'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger products_guard before update on public.products for each row execute function public.guard_ledger();
create trigger invoices_guard before update on public.invoices for each row execute function public.guard_ledger();

revoke execute on function public.has_role(uuid,text[]), public.create_sales_order(uuid,uuid,jsonb), public.confirm_sales_order(uuid), public.deliver_sales_order(uuid),
  public.cancel_sales_order(uuid), public.record_payment(uuid,numeric,text), public.adjust_stock(uuid,numeric,text) from public, anon;
grant execute on function public.has_role(uuid,text[]), public.create_sales_order(uuid,uuid,jsonb), public.confirm_sales_order(uuid), public.deliver_sales_order(uuid),
  public.cancel_sales_order(uuid), public.record_payment(uuid,numeric,text), public.adjust_stock(uuid,numeric,text) to authenticated;
