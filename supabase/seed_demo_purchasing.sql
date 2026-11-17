-- DEMO suppliers (is_demo = true). Re-runnable. Also removes the old generic placeholder records of module 16.
insert into public.suppliers (company_id, code, name, email, city, is_demo)
select c.id, 'SUP-' || lpad(g::text, 3, '0'), 'Demo Supplier ' || g, 'supplier' || g || '@demo.example',
       (array['Jakarta','Surabaya','Bandung','Medan','Semarang'])[1 + g % 5], true
from generate_series(1, 10) g join public.companies c on c.code = (array['NUSA-TRD','NUSA-MFG','NUSA-LOG'])[1 + g % 3]
on conflict do nothing;
delete from public.module_records where module_no = 16 and is_demo;
