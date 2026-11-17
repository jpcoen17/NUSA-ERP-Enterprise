-- Stage 13: suppliers, purchase orders, goods receipt (stock in + weighted average cost). Writes only through role-checked functions.
create sequence public.po_seq start 1000;
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null, name text not null, email text, city text,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, code));
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  po_no text not null, order_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft','approved','received','cancelled')),
  total numeric(18,2) not null default 0,
  created_by uuid default auth.uid(), approved_by uuid, received_at timestamptz,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, po_no));
create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(18,3) not null check (quantity > 0),
  unit_cost numeric(18,2) not null check (unit_cost >= 0));
create index on public.suppliers (company_id);
create index on public.purchase_orders (company_id, order_date desc);
create index on public.purchase_orders (supplier_id);
create index on public.purchase_order_items (po_id);
create index on public.purchase_order_items (product_id);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
create policy sup_select on public.suppliers for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy sup_write on public.suppliers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy po_select on public.purchase_orders for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy poi_select on public.purchase_order_items for select to authenticated using (exists (select 1 from public.purchase_orders o where o.id = po_id));
revoke all on public.suppliers, public.purchase_orders, public.purchase_order_items from anon;
revoke insert, update, delete on public.purchase_orders, public.purchase_order_items from authenticated;

create function public.create_purchase_order(p_company uuid, p_supplier uuid, p_items jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_po uuid; v_total numeric(18,2) := 0; it jsonb; v_qty numeric; v_cost numeric; v_prod uuid;
begin
  if not public.has_role(p_company, array['company_admin','procurement_manager']) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'items required'; end if;
  if not exists (select 1 from public.suppliers where id = p_supplier and company_id = p_company) then raise exception 'supplier not found in this company'; end if;
  insert into public.purchase_orders (company_id, supplier_id, po_no, status) values (p_company, p_supplier, 'PO-' || to_char(current_date, 'YYMM') || '-' || nextval('public.po_seq'), 'draft') returning id into v_po;
  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it ->> 'quantity')::numeric; v_cost := (it ->> 'unit_cost')::numeric; v_prod := (it ->> 'product_id')::uuid;
    if v_qty is null or v_qty <= 0 then raise exception 'invalid quantity'; end if;
    if v_cost is null or v_cost < 0 then raise exception 'invalid unit cost'; end if;
    if not exists (select 1 from public.products where id = v_prod and company_id = p_company) then raise exception 'product not found in this company'; end if;
    insert into public.purchase_order_items (company_id, po_id, product_id, quantity, unit_cost) values (p_company, v_po, v_prod, v_qty, v_cost);
    v_total := v_total + v_qty * v_cost;
  end loop;
  update public.purchase_orders set total = v_total where id = v_po;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (p_company, auth.uid(), 'po_created', 'purchase_orders', v_po, jsonb_build_object('total', v_total));
  return v_po;
end $$;

create function public.approve_purchase_order(p_po uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o public.purchase_orders;
begin
  select * into o from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'purchase order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','procurement_manager']) then raise exception 'forbidden'; end if;
  if o.status <> 'draft' then raise exception 'purchase order is already %', o.status; end if;
  if o.created_by = auth.uid() and not public.is_admin() then raise exception 'cannot approve your own purchase order'; end if;
  update public.purchase_orders set status = 'approved', approved_by = auth.uid() where id = p_po;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details) values (o.company_id, auth.uid(), 'po_approved', 'purchase_orders', p_po, jsonb_build_object('total', o.total));
end $$;

create function public.receive_purchase_order(p_po uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o public.purchase_orders; it record; p public.products;
begin
  perform set_config('app.ledger_fn', 'on', true);
  select * into o from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'purchase order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','inventory_manager','procurement_manager']) then raise exception 'forbidden'; end if;
  if o.status <> 'approved' then raise exception 'only approved purchase orders can be received (now %)', o.status; end if;
  for it in select product_id, quantity, unit_cost from public.purchase_order_items where po_id = p_po order by product_id loop
    select * into p from public.products where id = it.product_id for update;
    update public.products set
      cost = round((p.stock_qty * p.cost + it.quantity * it.unit_cost) / (p.stock_qty + it.quantity), 2),
      stock_qty = p.stock_qty + it.quantity
    where id = it.product_id;
    insert into public.stock_movements (company_id, product_id, qty_delta, reason, ref_id) values (o.company_id, it.product_id, it.quantity, 'purchase', p_po);
  end loop;
  update public.purchase_orders set status = 'received', received_at = now() where id = p_po;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id) values (o.company_id, auth.uid(), 'po_received', 'purchase_orders', p_po);
end $$;

create function public.cancel_purchase_order(p_po uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o public.purchase_orders;
begin
  select * into o from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'purchase order not found'; end if;
  if not public.has_role(o.company_id, array['company_admin','procurement_manager']) then raise exception 'forbidden'; end if;
  if o.status not in ('draft','approved') then raise exception 'cannot cancel a purchase order that is %', o.status; end if;
  update public.purchase_orders set status = 'cancelled' where id = p_po;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id) values (o.company_id, auth.uid(), 'po_cancelled', 'purchase_orders', p_po);
end $$;
revoke execute on function public.create_purchase_order(uuid,uuid,jsonb), public.approve_purchase_order(uuid), public.receive_purchase_order(uuid), public.cancel_purchase_order(uuid) from public, anon;
grant execute on function public.create_purchase_order(uuid,uuid,jsonb), public.approve_purchase_order(uuid), public.receive_purchase_order(uuid), public.cancel_purchase_order(uuid) to authenticated;
