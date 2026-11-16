-- ONE-SHOT DEMO SETUP. Safe to run multiple times. Run in Supabase SQL Editor (new query).
-- Requires both migrations already applied. Change the email below if you registered with another one.
insert into public.roles (code, name) values
 ('super_admin','Super Admin'),('company_admin','Company Admin'),('finance_manager','Finance Manager'),
 ('sales_manager','Sales Manager'),('inventory_manager','Inventory Manager'),
 ('procurement_manager','Procurement Manager'),('hr_manager','HR Manager'),('viewer','Viewer')
on conflict (code) do nothing;

insert into public.permissions (code, description) values
 ('companies.read','View companies'),('companies.write','Manage companies'),
 ('sales.read','View sales'),('sales.write','Manage sales'),
 ('inventory.read','View inventory'),('inventory.write','Manage inventory'),
 ('finance.read','View finance'),('finance.write','Manage finance')
on conflict (code) do nothing;

insert into public.companies (code, name, is_demo) values ('NUSA-GRP','NUSA Demo Corporate Group',true)
on conflict (code) do nothing;
insert into public.companies (code, name, parent_id, is_demo)
select v.code, v.name, g.id, true from (values
  ('NUSA-TRD','NUSA Demo Trading'),('NUSA-MFG','NUSA Demo Manufacturing'),('NUSA-LOG','NUSA Demo Logistics')) v(code,name)
join public.companies g on g.code = 'NUSA-GRP'
on conflict (code) do nothing;

insert into public.branches (company_id, code, name, city, is_demo)
select c.id, v.bcode, v.bname, v.city, true from (values
  ('NUSA-TRD','JKT','Jakarta HQ','Jakarta'),('NUSA-TRD','SBY','Surabaya','Surabaya'),
  ('NUSA-MFG','BKS','Bekasi Plant','Bekasi'),('NUSA-MFG','SMG','Semarang Plant','Semarang'),
  ('NUSA-LOG','MDN','Medan Hub','Medan')) v(ccode,bcode,bname,city)
join public.companies c on c.code = v.ccode
on conflict (company_id, code) do nothing;


insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on
  r.code = 'super_admin' or (r.code = 'viewer' and p.code like '%.read')
  or (r.code = 'sales_manager' and p.code like 'sales.%') or (r.code = 'inventory_manager' and p.code like 'inventory.%')
  or (r.code = 'finance_manager' and p.code like 'finance.%') or (r.code = 'company_admin' and p.code like 'companies.%')
on conflict do nothing;

-- Make your account Super Admin on all demo companies
insert into public.user_access (user_id, company_id, role_id)
select u.id, c.id, r.id
from auth.users u cross join public.companies c cross join public.roles r
where u.email = 'muhammadiklil520@gmail.com' and r.code = 'super_admin' and c.is_demo
  and not exists (select 1 from public.user_access ua where ua.user_id = u.id and ua.company_id = c.id and ua.role_id = r.id);

-- Business demo data (expenses are cleared first so re-running does not duplicate them)
delete from public.expenses where is_demo;
insert into public.customers (company_id, code, name, email, city, is_demo)
select c.id, 'CUS-'||lpad(g::text,3,'0'), 'Demo Customer '||g, 'customer'||g||'@demo.example',
       (array['Jakarta','Surabaya','Bandung','Medan','Semarang'])[1+g%5], true
from generate_series(1,20) g join public.companies c on c.code = (array['NUSA-TRD','NUSA-MFG','NUSA-LOG'])[1+g%3]
on conflict do nothing;

insert into public.products (company_id, sku, name, category, unit_price, cost, stock_qty, reorder_level, is_demo)
select c.id, 'SKU-'||lpad(g::text,3,'0'), 'Demo Product '||g,
       (array['Electronics','Packaging','Raw Material','Spare Parts','Consumables'])[1+g%5],
       50000 + g*17500, round((50000 + g*17500)*0.7), (g*13)%120, 25, true
from generate_series(1,30) g join public.companies c on c.code = (array['NUSA-TRD','NUSA-MFG','NUSA-LOG'])[1+g%3]
on conflict do nothing;

insert into public.sales_orders (company_id, branch_id, customer_id, order_no, order_date, status, total, is_demo)
select cu.company_id, b.id, cu.id, 'SO-'||lpad(g::text,4,'0'), (current_date - ((g*3)%170))::date,
       (array['draft','confirmed','delivered','delivered','delivered'])[1+g%5],
       (1000000 + ((g*137)%50)*250000)::numeric, true
from generate_series(1,60) g
join lateral (select * from public.customers where is_demo order by code offset (g%20) limit 1) cu on true
left join lateral (select id from public.branches where company_id = cu.company_id order by code limit 1) b on true
on conflict do nothing;

insert into public.invoices (company_id, sales_order_id, invoice_no, issue_date, due_date, amount, paid_amount, status, is_demo)
select company_id, id, 'INV-'||substr(order_no,4), order_date, order_date + 30, total,
       case n%3 when 0 then total when 1 then round(total/2) else 0 end,
       case n%3 when 0 then 'paid' when 1 then 'partial' else 'unpaid' end, true
from (select *, row_number() over (order by order_no) n from public.sales_orders
      where is_demo and status in ('confirmed','delivered')) s
on conflict do nothing;

insert into public.expenses (company_id, expense_date, category, description, amount, is_demo)
select c.id, (current_date - ((g*4)%170))::date,
       (array['Salary','Rent','Utilities','Logistics','Marketing'])[1+g%5], 'Demo expense '||g,
       (400000 + ((g*91)%30)*100000)::numeric, true
from generate_series(1,40) g join public.companies c on c.code = (array['NUSA-TRD','NUSA-MFG','NUSA-LOG'])[1+g%3];

-- RESULT CHECK: expect users_found=1, access_rows=4, companies=4, branches=5, customers=20, products=30, orders=60, expenses=40
select (select count(*) from auth.users where email = 'muhammadiklil520@gmail.com') users_found,
       (select count(*) from public.user_access) access_rows,
       (select count(*) from public.companies) companies,
       (select count(*) from public.branches) branches,
       (select count(*) from public.customers) customers,
       (select count(*) from public.products) products,
       (select count(*) from public.sales_orders) orders,
       (select count(*) from public.expenses) expenses;
