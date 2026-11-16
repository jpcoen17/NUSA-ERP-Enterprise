-- DEMO DATA ONLY (is_demo = true). No real company data.
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

-- After you register your FIRST user in the app, make that user Super Admin (run in SQL Editor):
-- insert into public.user_access (user_id, company_id, role_id)
-- select u.id, c.id, r.id from auth.users u, public.companies c, public.roles r
-- where u.email = 'YOUR_EMAIL' and r.code = 'super_admin' and c.is_demo;
-- 10 demo users must be created via Supabase Auth (not by SQL); planned for Stage 4 admin tooling.

-- role -> permission mapping
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on
  r.code = 'super_admin' or (r.code = 'viewer' and p.code like '%.read')
  or (r.code = 'sales_manager' and p.code like 'sales.%') or (r.code = 'inventory_manager' and p.code like 'inventory.%')
  or (r.code = 'finance_manager' and p.code like 'finance.%') or (r.code = 'company_admin' and p.code like 'companies.%')
on conflict do nothing;
