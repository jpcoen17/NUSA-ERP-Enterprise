-- Stage 10b: approval workflow (module 58) + analytics functions (modules 50, 61, 64)
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null, description text,
  request_type text not null default 'general' check (request_type in ('general','purchase','expense','leave','discount')),
  amount numeric(18,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid default auth.uid() references public.profiles(id),
  decided_by uuid references public.profiles(id), decided_at timestamptz, decision_note text,
  is_demo boolean not null default false, created_at timestamptz not null default now());
create index on public.approval_requests (company_id, status, created_at desc);
create index on public.approval_requests (requested_by);
alter table public.approval_requests enable row level security;
create policy ar_select on public.approval_requests for select to authenticated using (public.is_admin() or requested_by = auth.uid());
create policy ar_insert on public.approval_requests for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and decided_by is null and public.has_company_access(company_id));
-- No UPDATE/DELETE policies: decisions go only through the functions below.
revoke all on public.approval_requests from anon;
revoke update, delete on public.approval_requests from authenticated;

create function public.approval_decide(p_id uuid, p_decision text, p_note text default null) returns void language plpgsql security definer set search_path = '' as $$
declare r public.approval_requests;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid decision'; end if;
  select * into r from public.approval_requests where id = p_id for update;
  if not found then raise exception 'request not found'; end if;
  if r.status <> 'pending' then raise exception 'request already %', r.status; end if;
  if r.requested_by = auth.uid() then raise exception 'cannot decide your own request'; end if;
  update public.approval_requests set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = p_id;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details)
  values (r.company_id, auth.uid(), 'approval_' || p_decision, 'approval_requests', p_id, jsonb_build_object('amount', r.amount));
end $$;
create function public.approval_cancel(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.approval_requests set status = 'cancelled' where id = p_id and requested_by = auth.uid() and status = 'pending';
  if not found then raise exception 'only your own pending requests can be cancelled'; end if;
  insert into public.audit_logs (user_id, action, table_name, record_id) values (auth.uid(), 'approval_cancelled', 'approval_requests', p_id);
end $$;
create function public.approval_submit_audit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details)
  values (new.company_id, auth.uid(), 'approval_submitted', 'approval_requests', new.id, jsonb_build_object('amount', new.amount));
  return new;
end $$;
create trigger approval_submitted after insert on public.approval_requests for each row execute function public.approval_submit_audit();
revoke execute on function public.approval_decide(uuid,text,text), public.approval_cancel(uuid) from public, anon;
grant execute on function public.approval_decide(uuid,text,text), public.approval_cancel(uuid) to authenticated;

-- Analytics: SECURITY INVOKER so RLS limits every number to what the caller may see.
create function public.analytics_summary(cid uuid default null) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
   'top_customers', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select c.name as label, sum(o.total) as value from public.sales_orders o join public.customers c on c.id = o.customer_id
       where o.status in ('confirmed','delivered') and (cid is null or o.company_id = cid) group by c.name order by value desc limit 5) t),
   'orders_by_status', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select status as label, sum(total) as value from public.sales_orders where cid is null or company_id = cid group by status order by status) t),
   'stock_by_category', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select coalesce(category,'Uncategorized') as label, sum(stock_qty * cost) as value from public.products where cid is null or company_id = cid group by 1 order by value desc) t),
   'receivable_aging', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select bucket as label, sum(outstanding) as value from (
       select case when due_date >= current_date then '1 Not due' when current_date - due_date <= 30 then '2 1-30 days' when current_date - due_date <= 60 then '3 31-60 days' else '4 60+ days' end as bucket,
              amount - paid_amount as outstanding from public.invoices where amount > paid_amount and (cid is null or company_id = cid)) x group by bucket order by bucket) t),
   'expenses_by_category', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select category as label, sum(amount) as value from public.expenses where cid is null or company_id = cid group by category order by value desc) t));
$$;
create function public.supply_chain_summary(cid uuid default null) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
   'records', (select coalesce(jsonb_object_agg(module_no, n), '{}'::jsonb) from (select module_no, count(*) n from public.module_records where module_no in (46,47,48,49) and (cid is null or company_id = cid) group by module_no) x),
   'deliveries_by_status', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select status as label, count(*) as value from public.module_records where module_no = 48 and (cid is null or company_id = cid) group by status) t),
   'low_stock', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select name, sku, stock_qty, reorder_level from public.products where stock_qty <= reorder_level and (cid is null or company_id = cid) order by stock_qty limit 10) t));
$$;
revoke execute on function public.analytics_summary(uuid), public.supply_chain_summary(uuid) from public, anon;
grant execute on function public.analytics_summary(uuid), public.supply_chain_summary(uuid) to authenticated;
