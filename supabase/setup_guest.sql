-- GUEST ACCOUNT SETUP. Run in Supabase SQL Editor AFTER creating the user in
-- Dashboard -> Authentication -> Users -> Add user -> Create new user (tick "Auto Confirm User").
-- 1) Replace the email below (twice) with the exact email you created. Re-runnable.
do $$
declare v_email text := 'demo.guest@example.com'; v_id uuid;
begin
  select id into v_id from auth.users where email = v_email;
  if v_id is null then raise exception 'User % not found. Create it in Dashboard -> Authentication -> Users first.', v_email; end if;
  update public.profiles set is_guest = true, full_name = 'Guest Demo', status = 'active' where id = v_id;
  -- Read-only access (Viewer role) to every DEMO company. No admin, no write roles.
  delete from public.user_access where user_id = v_id;
  insert into public.user_access (user_id, company_id, role_id)
  select v_id, c.id, r.id from public.companies c cross join public.roles r where c.is_demo and r.code = 'viewer';
end $$;

-- Check: expect is_guest = true and 4 access rows (all with role Viewer)
select p.is_guest, count(*) as access_rows, string_agg(distinct r.name, ',') as roles
from public.profiles p join public.user_access ua on ua.user_id = p.id join public.roles r on r.id = ua.role_id
where p.is_guest group by p.is_guest;

-- OPTIONAL (only if you want visitors to try transactions): uncomment to also let guests run the sales flow on NUSA Demo Trading.
-- Trade-off: the shared demo data gets messy; re-run setup_demo.sql / seed files to reset it.
-- insert into public.user_access (user_id, company_id, role_id)
-- select p.id, c.id, r.id from public.profiles p, public.companies c, public.roles r
-- where p.is_guest and c.code = 'NUSA-TRD' and r.code = 'sales_manager';
