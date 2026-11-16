-- Stage 6-7: customers, products, sales orders, invoices, expenses + dashboard function. RLS on all.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null, name text not null, email text, city text,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, code));
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sku text not null, name text not null, category text,
  unit_price numeric(18,2) not null default 0, cost numeric(18,2) not null default 0,
  stock_qty numeric(18,3) not null default 0, reorder_level numeric(18,3) not null default 0,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, sku));
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id),
  customer_id uuid not null references public.customers(id),
  order_no text not null, order_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft','confirmed','delivered','cancelled')),
  total numeric(18,2) not null default 0,
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, order_no));
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sales_order_id uuid references public.sales_orders(id),
  invoice_no text not null, issue_date date not null, due_date date not null,
  amount numeric(18,2) not null, paid_amount numeric(18,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  is_demo boolean not null default false, created_at timestamptz not null default now(),
  unique (company_id, invoice_no));
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  expense_date date not null, category text not null, description text,
  amount numeric(18,2) not null,
  is_demo boolean not null default false, created_at timestamptz not null default now());

create index on public.customers (company_id);
create index on public.products (company_id);
create index on public.sales_orders (company_id, order_date desc);
create index on public.sales_orders (customer_id);
create index on public.sales_orders (branch_id);
create index on public.invoices (company_id);
create index on public.expenses (company_id, expense_date);

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.sales_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;

create policy customers_select on public.customers for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy customers_write on public.customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_select on public.products for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy products_write on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy invoices_select on public.invoices for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy invoices_write on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy expenses_select on public.expenses for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy expenses_write on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Sales orders are branch-isolated: a branch-scoped user only sees orders of their branch.
create policy so_select on public.sales_orders for select to authenticated using (
  public.is_admin()
  or (branch_id is null and public.has_company_access(company_id))
  or (branch_id is not null and public.has_branch_access(company_id, branch_id)));
create policy so_write on public.sales_orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.customers, public.products, public.sales_orders, public.invoices, public.expenses from anon;

-- SECURITY INVOKER: RLS applies, so each user's dashboard only aggregates what they may see.
create function public.dashboard_summary(cid uuid default null) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with so as (select * from public.sales_orders where status in ('confirmed','delivered') and (cid is null or company_id = cid)),
       ex as (select * from public.expenses where cid is null or company_id = cid),
       mo as (select date_trunc('month', current_date::timestamp) - (n || ' month')::interval as m from generate_series(0,5) n)
  select jsonb_build_object(
    'revenue',     (select coalesce(sum(total),0) from so),
    'expenses',    (select coalesce(sum(amount),0) from ex),
    'receivables', (select coalesce(sum(amount - paid_amount),0) from public.invoices where cid is null or company_id = cid),
    'products',    (select count(*) from public.products where cid is null or company_id = cid),
    'low_stock',   (select count(*) from public.products where stock_qty <= reorder_level and (cid is null or company_id = cid)),
    'customers',   (select count(*) from public.customers where cid is null or company_id = cid),
    'monthly',     (select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m,'Mon'),
                      'revenue',  (select coalesce(sum(total),0) from so where date_trunc('month', order_date::timestamp) = m),
                      'expenses', (select coalesce(sum(amount),0) from ex where date_trunc('month', expense_date::timestamp) = m)) order by m), '[]'::jsonb) from mo),
    'recent',      (select coalesce(jsonb_agg(r), '[]'::jsonb) from (
                      select order_no, order_date, status, total from public.sales_orders
                      where cid is null or company_id = cid order by order_date desc, order_no desc limit 6) r));
$$;
revoke execute on function public.dashboard_summary(uuid) from public, anon;
grant execute on function public.dashboard_summary(uuid) to authenticated;
