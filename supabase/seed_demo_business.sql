-- DEMO business data (is_demo = true). Run AFTER seed.sql and the business migration.
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
